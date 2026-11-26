import type { ChatHistoryRequest } from '@/modules/chat/lib/connection/chat-transport';
import { isRecord } from '@/shared/lib/is-record';

/** A server FIN follows the last reply. Late records stay on the cancelled stream. */
export class HistoryStreams {
  private streams = new Map<string, (event: Record<string, unknown>) => void>();

  run(
    request: ChatHistoryRequest,
    signal: AbortSignal,
    receive: (event: unknown) => void,
    start: () => void,
  ) {
    const ids =
      request.type === 'resume'
        ? Object.keys(request.positions).map((channel) => request.requestId + '-' + channel)
        : [request.requestId];
    const pending = new Set(ids);
    const result = Promise.withResolvers<void>();
    const abort = () => result.reject(new Error('cancelled'));
    const push = (event: Record<string, unknown>) => {
      if (signal.aborted) return;
      try {
        receive(event);
        if (Array.isArray(event.channels))
          for (const channel of event.channels) pending.delete(request.requestId + '-' + channel);
        else pending.delete(String(event.requestId));
        if (!pending.size) result.resolve();
      } catch (e) {
        result.reject(e);
      }
    };
    for (const id of [request.requestId, ...ids]) this.streams.set(id, push);
    signal.addEventListener('abort', abort, { once: true });
    start();
    return result.promise.finally(() => {
      signal.removeEventListener('abort', abort);
      for (const id of [request.requestId, ...ids]) this.streams.delete(id);
    });
  }

  receive(event: unknown): boolean {
    if (!isRecord(event)) return false;
    const handler = this.streams.get(String(event.requestId));
    if (handler) handler(event);
    return Boolean(handler) || event.type === 'history' || event.type === 'historyCurrent';
  }
}
