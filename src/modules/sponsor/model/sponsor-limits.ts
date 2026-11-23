/** Page size for the local "load more" expansion. */
export const SPONSOR_PAGE_SIZE = 24;
/**
 * Browser-side cache TTL for sponsor reads. Mirrors the service's
 * `Cache-Control: max-age=900` minus headroom so the browser refetches just before
 * the server snapshot revalidates.
 */
export const SPONSOR_BROWSER_CACHE_TTL_MS = 300_000;
/** Bound for a single sponsor request; the service is lightweight and public. */
export const SPONSOR_REQUEST_TIMEOUT_MS = 15_000;
