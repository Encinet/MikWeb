import { isApiErrorPayload } from '@/shared/api/api-error-payload';
import { withRequestTimeout } from '@/shared/lib/request-timeout';

interface FetchValidatedJsonOptions<TData> {
  url: string;
  validate: (value: unknown) => value is TData;
  validateHeaders?: (headers: Headers) => boolean;
  timeoutMs: number;
  cache?: RequestCache;
  request?: Omit<RequestInit, 'cache' | 'signal'>;
  browserCache?: {
    force?: boolean;
    key?: string;
    ttlMs: number;
  };
  fallbackErrorMessage: string;
  invalidDataMessage?: string;
}

interface FetchSuccessResult<TData> {
  status: 'success';
  data: TData;
}

interface FetchApiErrorResult {
  status: 'api-error';
  error: string;
}

interface FetchHttpErrorResult {
  status: 'http-error';
  error: string;
}

interface FetchInvalidDataResult {
  status: 'invalid-data';
  error: string;
}

interface FetchNetworkErrorResult {
  status: 'network-error';
  error: string;
  cause: unknown;
}

type FetchValidatedJsonResult<TData> =
  | FetchSuccessResult<TData>
  | FetchApiErrorResult
  | FetchHttpErrorResult
  | FetchInvalidDataResult
  | FetchNetworkErrorResult;

interface BrowserCacheEntry {
  expiresAt: number;
  data: unknown;
}

const MAX_BROWSER_CACHE_ENTRIES = 64;
const browserCacheStore = new Map<string, BrowserCacheEntry>();
const browserInFlightRequests = new Map<string, Promise<FetchValidatedJsonResult<unknown>>>();

export async function fetchValidatedJson<TData>(
  options: FetchValidatedJsonOptions<TData>,
): Promise<FetchValidatedJsonResult<TData>> {
  const { url, validate, browserCache, invalidDataMessage } = options;
  const browserCacheKey = browserCache?.key ?? url;
  if (!browserCacheKey || !browserCache || browserCache.ttlMs <= 0 || typeof window === 'undefined') {
    return fetchAndValidateJson(options);
  }

  if (!browserCache.force) {
    const cached = browserCacheStore.get(browserCacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      if (validate(cached.data)) {
        return { status: 'success', data: cached.data };
      }
      browserCacheStore.delete(browserCacheKey);
    }

    const inFlight = browserInFlightRequests.get(browserCacheKey);
    if (inFlight) {
      const result = await inFlight;
      if (result.status !== 'success') return result;
      return validate(result.data)
        ? { status: 'success', data: result.data }
        : invalidData(invalidDataMessage);
    }
  }

  const request = fetchAndValidateJson(options);
  browserInFlightRequests.set(browserCacheKey, request);

  try {
    const result = await request;
    if (result.status === 'success' && browserInFlightRequests.get(browserCacheKey) === request) {
      storeBrowserCacheData(browserCacheKey, result.data, browserCache.ttlMs);
    }
    return result;
  } finally {
    if (browserInFlightRequests.get(browserCacheKey) === request) {
      browserInFlightRequests.delete(browserCacheKey);
    }
  }
}

async function fetchAndValidateJson<TData>({
  url,
  validate,
  timeoutMs,
  cache = 'default',
  request,
  fallbackErrorMessage,
  invalidDataMessage,
  validateHeaders,
}: FetchValidatedJsonOptions<TData>): Promise<FetchValidatedJsonResult<TData>> {
  try {
    const { response, payload } = await withRequestTimeout(timeoutMs, async (signal) => {
      const response = await fetch(url, { ...request, cache, signal });
      const payload: unknown = await response.json();
      return { response, payload };
    });

    if (isApiErrorPayload(payload)) {
      return {
        status: 'api-error',
        error: payload.message ?? payload.error,
      };
    }

    if (!response.ok) {
      return {
        status: 'http-error',
        error: fallbackErrorMessage,
      };
    }

    if ((validateHeaders && !validateHeaders(response.headers)) || !validate(payload)) {
      return invalidData(invalidDataMessage);
    }

    return {
      status: 'success',
      data: payload,
    };
  } catch (cause) {
    return {
      status: 'network-error',
      error: fallbackErrorMessage,
      cause,
    };
  }
}

function invalidData(error = 'Invalid data format'): FetchInvalidDataResult {
  return { status: 'invalid-data', error };
}

export function clearFetchValidatedJsonBrowserCache({
  key,
  prefix,
}: {
  key?: string;
  prefix?: string;
} = {}) {
  for (const store of [browserCacheStore, browserInFlightRequests]) {
    if (!key && !prefix) store.clear();
    if (key) store.delete(key);
    if (prefix) {
      for (const cacheKey of store.keys()) {
        if (cacheKey.startsWith(prefix)) store.delete(cacheKey);
      }
    }
  }
}

export function writeFetchValidatedJsonBrowserCache<TData>({
  data,
  key,
  ttlMs,
}: {
  data: TData;
  key: string;
  ttlMs: number;
}) {
  if (typeof window === 'undefined' || ttlMs <= 0) {
    return;
  }

  browserInFlightRequests.delete(key);
  storeBrowserCacheData(key, data, ttlMs);
}

function storeBrowserCacheData(key: string, data: unknown, ttlMs: number) {
  const now = Date.now();
  for (const [cacheKey, entry] of browserCacheStore) {
    if (entry.expiresAt <= now) {
      browserCacheStore.delete(cacheKey);
    }
  }
  browserCacheStore.set(key, { expiresAt: now + ttlMs, data });
  while (browserCacheStore.size > MAX_BROWSER_CACHE_ENTRIES) {
    const oldestKey = browserCacheStore.keys().next().value;
    if (oldestKey === undefined) break;
    browserCacheStore.delete(oldestKey);
  }
}
