/** A live checkpoint covers every earlier record in its channel, including writes still in flight. */
export class ChatLiveProgress {
  history?: Promise<void>;
  private failed = false;
  private pending = new Set<Promise<unknown>>();
  private tail = Promise.resolve();
  private queued = 0;

  private observed?: string;
  private probeAfter = 0;

  // A second active tab may already own the shared cursor. Take over only when it stops moving.
  async needsCatchup(read: () => Promise<string | undefined>, now = Date.now()) {
    if (now < this.probeAfter) return false;
    this.probeAfter = now + 30_000;
    const stored = await read();
    const stalled = stored !== undefined && this.observed === stored;
    this.observed = stored;
    return stalled;
  }

  track(write: Promise<boolean>) {
    if (this.failed) return;
    if (this.pending.size >= 256) {
      this.failed = true;
      return;
    }
    const done = write.then(saved => { if (!saved) this.failed = true; }, () => { this.failed = true; });
    this.pending.add(done);
    void done.then(() => this.pending.delete(done));
  }

  checkpoint(commit: () => Promise<void>, onError: (error: unknown) => void) {
    if (this.failed) return;
    if (this.queued >= 16) {
      this.failed = true;
      return;
    }
    this.queued++;
    const ready = Promise.all([this.history, this.tail, ...this.pending]);
    this.tail = ready.then(async () => {
      if (!this.failed) await commit();
    }).catch(error => {
      this.failed = true;
      onError(error);
    }).finally(() => { this.queued--; });
  }
}
