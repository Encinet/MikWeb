/** canShare is optional for links, but required to establish file-sharing support. */
export function canNativeShare(data: ShareData): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  if (typeof navigator.canShare !== 'function') return !data.files?.length;
  try {
    return navigator.canShare(data);
  } catch {
    return false;
  }
}

/** DOM errors can come from another realm, so instanceof Error is not sufficient. */
export function isShareCancellation(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  );
}
