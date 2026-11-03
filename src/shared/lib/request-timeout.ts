/** Scope cancellation to the whole request, including its response body, without newer AbortSignal APIs. */
export async function withRequestTimeout<T>(
  timeoutMs: number,
  request: (signal: AbortSignal) => Promise<T>,
  parent?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const cancel = () => controller.abort(parent?.reason);
  const timer = setTimeout(
    () => controller.abort(new DOMException('Request timed out', 'TimeoutError')),
    timeoutMs,
  );
  if (parent?.aborted) cancel();
  else parent?.addEventListener('abort', cancel, { once: true });
  try {
    return await request(controller.signal);
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener('abort', cancel);
  }
}
