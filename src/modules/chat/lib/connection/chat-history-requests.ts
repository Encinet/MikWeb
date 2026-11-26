import {
  chatServerEventSchema,
  historyToken,
  mayReadMessage,
  messageConversation,
  type ChatAccess,
  type ChatServerEvent,
} from '@/modules/chat/model/chat-protocol';
import type { ChatHistoryRequest, ChatTransport } from './chat-transport';

export type ChatHistoryPage = Extract<ChatServerEvent, { type: 'history' }>;
export interface ChatHistoryQuery {
  channel: ChatHistoryPage['channel'];
  targetUuid?: string;
  since?: string;
  page?: string;
}

interface Read {
  id: string;
  query: ChatHistoryQuery;
  response?: ChatHistoryPage | Error;
  revoked: boolean;
  resolve: (page: ChatHistoryPage) => void;
  reject: (error: Error) => void;
}

interface Job {
  id: string;
  batch: boolean;
  reads: Read[];
  controller: AbortController;
  cleanup: () => void;
  active: boolean;
  attempts: number;
  credit?: { expires: number };
}

type Schedule = (run: () => void, delay: number) => () => void;

/** A stream owns its replies. Only requests with disjoint channel cursors can run together. */
export class ChatHistoryRequests {
  private jobs = new Set<Job>();
  private credits: { expires: number; pages: number }[] = [];
  private retryAfter = 0;
  private cancelWait?: () => void;

  constructor(
    private readonly transport: Pick<ChatTransport, 'history'>,
    private readonly access: () => ChatAccess | null,
    private readonly now: () => number,
    private readonly schedule: Schedule,
  ) {}

  read(queries: ChatHistoryQuery[], signal?: AbortSignal): Promise<ChatHistoryPage>[] {
    const access = this.access();
    if (!access || signal?.aborted)
      return queries.map(() => Promise.reject(new Error('history_unavailable')));
    const indexed = queries.map((query, index) => ({ query, index }));
    const seen = new Set<ChatHistoryQuery['channel']>();
    const repeated = new Set<ChatHistoryQuery['channel']>();
    for (const { channel } of queries) {
      if (seen.has(channel)) repeated.add(channel);
      seen.add(channel);
    }
    const eligible = indexed.filter(
      ({ query }) =>
        !repeated.has(query.channel) &&
        !query.page &&
        !query.targetUuid &&
        historyToken.safeParse(query.since).success &&
        (query.channel !== 'staff' || access?.staff),
    );
    const group = eligible.length > 1 ? eligible : [];
    const results: Promise<ChatHistoryPage>[] = [];
    const batches = indexed.filter((item) => !group.includes(item)).map((item) => [item]);
    if (group.length) batches.unshift(group);
    let outstanding = [...this.jobs].reduce((total, job) => total + job.reads.length, 0);
    for (const items of batches) {
      let error: string | undefined;
      if (items.some(({ query }) => query.channel === 'staff' && !access.staff))
        error = 'staff_required';
      else if (outstanding + items.length > 8) error = 'chat_busy';
      if (error) {
        for (const { index } of items) results[index] = Promise.reject(new Error(error));
        continue;
      }
      const id = crypto.randomUUID();
      const batch = items.length > 1;
      const reads = items.map(({ query, index }) => {
        const { promise, resolve, reject } = Promise.withResolvers<ChatHistoryPage>();
        results[index] = promise;
        return {
          id: batch ? id + '-' + query.channel : id,
          query: query.page ? { ...query, since: undefined } : { ...query },
          revoked: false,
          resolve,
          reject,
        };
      });
      outstanding += reads.length;
      const job: Job = {
        id,
        reads,
        batch,
        controller: new AbortController(),
        active: false,
        attempts: 0,
        cleanup: () => {
          cancelTimeout();
          signal?.removeEventListener('abort', cancel);
        },
      };
      const cancel = () => this.end(job, 'history_unavailable');
      const cancelTimeout = this.schedule(cancel, 15_000);
      signal?.addEventListener('abort', cancel, { once: true });
      this.jobs.add(job);
    }
    this.pump();
    return results;
  }

  // The server charges a reconnect receipt lookup against the same per-player read budget.
  recordReceiptLookup(): void {
    this.credits.push({ pages: 1, expires: this.now() + 1000 });
  }

  revokeStaff(): void {
    for (const job of this.jobs) {
      for (const read of job.reads) {
        if (!read.revoked && read.query.channel === 'staff') {
          read.revoked = true;
          read.response = undefined;
          read.reject(new Error('staff_required'));
        }
      }
      if (!job.reads.some((read) => !read.revoked)) this.end(job, 'staff_required', false);
    }
    this.pump();
  }

  close(): void {
    for (const job of this.jobs) this.end(job, 'connection_failed', false);
    this.cancelWait?.();
    this.cancelWait = undefined;
  }

  private pump(): void {
    this.cancelWait?.();
    this.cancelWait = undefined;
    const now = this.now();
    this.credits = this.credits.filter((credit) => now < credit.expires);
    if (now < this.retryAfter && [...this.jobs].some((job) => !job.active)) {
      this.cancelWait = this.schedule(() => this.pump(), this.retryAfter - now);
      return;
    }
    let used = this.credits.reduce((sum, credit) => sum + credit.pages, 0);
    const busy = new Set<ChatHistoryQuery['channel']>();
    let count = 0;
    for (const job of this.jobs)
      if (job.active) {
        count++;
        for (const read of job.reads) busy.add(read.query.channel);
      }
    for (const job of this.jobs) {
      if (count >= 2) break;
      if (job.active) continue;
      const reads = job.reads.filter((read) => !read.revoked);
      const overlaps = reads.some((read) => busy.has(read.query.channel));
      // Reserve a waiting batch's channels so a later query cannot overtake its cursor.
      for (const read of reads) busy.add(read.query.channel);
      if (overlaps) continue;
      if (used + reads.length > 8) {
        const next = Math.min(...this.credits.map((credit) => credit.expires));
        if (Number.isFinite(next)) this.cancelWait ??= this.schedule(() => this.pump(), next - now);
        continue;
      }
      job.active = true;
      count++;
      job.attempts++;
      used += reads.length;
      const credit = { pages: reads.length, expires: Infinity };
      this.credits.push(credit);
      job.credit = credit;
      const request: ChatHistoryRequest = job.batch
        ? {
            type: 'resume',
            requestId: job.id,
            positions: Object.fromEntries(reads.map(({ query }) => [query.channel, query.since])),
          }
        : { type: 'history', requestId: job.id, ...reads[0].query };
      void this.run(job, request, credit);
    }
  }

  private async run(job: Job, request: ChatHistoryRequest, credit: { expires: number }) {
    let error: string | undefined;
    try {
      await this.transport.history(request, job.controller.signal, (record) => {
        if (job.controller.signal.aborted) return;
        const access = this.access();
        if (!access) throw new Error('history_unavailable');
        const event = chatServerEventSchema.safeParse(record);
        if (!event.success) throw new Error('invalid_response');
        this.receive(job, event.data, access);
      });
    } catch (cause) {
      error =
        cause instanceof Error && cause.message === 'invalid_response'
          ? cause.message
          : 'history_unavailable';
    } finally {
      // The completion record arrives after every server-side admission in this batch, even across variable RTTs.
      credit.expires = this.now() + 1000;
      if (this.jobs.has(job)) this.end(job, error);
      else this.pump();
    }
  }

  private receive(job: Job, event: ChatServerEvent, access: ChatAccess) {
    if (event.type !== 'history' && event.type !== 'historyCurrent' && event.type !== 'error')
      throw new Error('invalid_response');
    const grouped = event.type === 'historyCurrent' && event.channels;
    if (grouped && (!job.batch || event.requestId !== job.id)) throw new Error('invalid_response');
    const ids = grouped ? grouped.map((channel) => job.id + '-' + channel) : [event.requestId];
    for (const id of ids) {
      const read = job.reads.find((item) => item.id === id);
      if (!read) throw new Error('invalid_response');
      if (read.revoked) continue;
      const query = read.query;
      if (read.response || (query.channel === 'staff' && !access.staff))
        throw new Error('invalid_response');
      if (event.type === 'error') {
        read.response = new Error(event.error);
      } else if (event.type === 'historyCurrent') {
        if (query.page || !query.since || !historyToken.safeParse(query.since).success)
          throw new Error('invalid_response');
        read.response = {
          type: 'history',
          requestId: id,
          channel: query.channel,
          messages: [],
          reset: false,
          checkpoint: query.since,
        };
      } else {
        if (
          event.channel !== query.channel ||
          (event.aligned && !query.page) ||
          (event.nextPage && event.nextPage === query.page) ||
          event.messages.some(
            (message) =>
              message.channel !== query.channel ||
              !mayReadMessage(message, access.owner, access.staff) ||
              (query.targetUuid &&
                messageConversation(message, access.owner) !== 'private:' + query.targetUuid),
          )
        ) {
          throw new Error('invalid_response');
        }
        read.response = event;
      }
    }
  }

  private end(job: Job, reason?: string, pump = true) {
    if (!this.jobs.has(job)) return;
    const pending = job.reads.filter((read) => !read.revoked);
    const access = this.access();
    if (!access || pending.some((read) => !read.response)) reason ??= 'history_unavailable';
    const retry: Read[] = [];
    // No checkpoint becomes eligible for storage until the complete stream terminates with FIN.
    for (const read of pending) {
      const response = read.response;
      if (reason || !response) read.reject(new Error(reason));
      else if (read.query.channel === 'staff' && !access?.staff)
        read.reject(new Error('staff_required'));
      else if (response instanceof Error && response.message === 'chat_busy' && job.attempts < 3) {
        read.response = undefined;
        retry.push(read);
      } else if (response instanceof Error) read.reject(response);
      else read.resolve(response);
    }
    if (retry.length) {
      job.reads = retry;
      job.active = false;
      this.retryAfter = this.now() + 1000 * job.attempts;
    } else {
      this.jobs.delete(job);
      job.cleanup();
      if (reason) {
        if (job.credit) job.credit.expires = this.now() + 1000;
        job.controller.abort();
      }
    }
    if (pump) this.pump();
  }
}
