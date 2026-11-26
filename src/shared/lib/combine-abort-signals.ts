export function combineAbortSignals(signals: AbortSignal[]) {
  if (typeof AbortSignal.any === 'function') {
    return { signal: AbortSignal.any(signals), dispose() {} };
  }

  const controller = new AbortController();
  const aborted = signals.find((signal) => signal.aborted);
  if (aborted) {
    controller.abort(aborted.reason);
    return { signal: controller.signal, dispose() {} };
  }

  const unsubscribe = signals.map((signal) => {
    const abort = () => controller.abort(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    return () => signal.removeEventListener('abort', abort);
  });
  return {
    signal: controller.signal,
    dispose() {
      for (const remove of unsubscribe) remove();
    },
  };
}
