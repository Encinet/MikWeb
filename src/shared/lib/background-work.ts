interface BackgroundConnection extends EventTarget {
  saveData?: boolean;
  effectiveType?: string;
}

/** Run one step after load/when idle. Returning true schedules another step. */
export function scheduleBackgroundWork(
  step: () => Promise<boolean>,
  onPause?: () => void,
): () => void {
  const connection = (navigator as Navigator & { connection?: BackgroundConnection }).connection;
  let current = true;
  let running = false;
  let finished = false;
  let cancelScheduled: (() => void) | undefined;
  const allowed = () =>
    current &&
    document.visibilityState !== 'hidden' &&
    navigator.onLine !== false &&
    !connection?.saveData &&
    !['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '');
  const schedule = () => {
    cancelScheduled?.();
    if (running || finished || !allowed() || document.readyState !== 'complete') return;
    if (typeof window.requestIdleCallback === 'function') {
      const handle = window.requestIdleCallback(run, { timeout: 2000 });
      cancelScheduled = () => window.cancelIdleCallback(handle);
    } else {
      const handle = window.setTimeout(run, 1000);
      cancelScheduled = () => window.clearTimeout(handle);
    }
  };
  const run = () => {
    cancelScheduled = undefined;
    if (running || !allowed()) return;
    running = true;
    void Promise.resolve()
      .then(() => (allowed() ? step() : true))
      .then((more) => {
        finished = more !== true;
      })
      .catch(() => {
        finished = true;
      })
      .finally(() => {
        running = false;
        if (finished) cleanup();
        else if (current) schedule();
      });
  };
  const resume = () => {
    cancelScheduled?.();
    if (!allowed()) onPause?.();
    else schedule();
  };
  window.addEventListener('load', resume);
  window.addEventListener('online', resume);
  window.addEventListener('offline', resume);
  document.addEventListener('visibilitychange', resume);
  connection?.addEventListener('change', resume);
  const cleanup = () => {
    current = false;
    cancelScheduled?.();
    window.removeEventListener('load', resume);
    window.removeEventListener('online', resume);
    window.removeEventListener('offline', resume);
    document.removeEventListener('visibilitychange', resume);
    connection?.removeEventListener('change', resume);
  };
  schedule();
  return cleanup;
}
