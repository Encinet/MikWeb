import type { ApiErrorPayload } from '@/shared/types/api-error-payload';
import { isApiErrorPayload } from '@/shared/types/api-error-payload';

interface FetchValidatedJsonOptions<TData> {
  url: string;
  validate: (value: unknown) => value is TData;
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
  payload: ApiErrorPayload;
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

export type FetchValidatedJsonResult<TData> =
  | FetchSuccessResult<TData>
  | FetchApiErrorResult
  | FetchHttpErrorResult
  | FetchInvalidDataResult
  | FetchNetworkErrorResult;

interface BrowserCacheEntry {
  expiresAt: number;
  result: FetchSuccessResult<unknown>;
}

const MAX_BROWSER_CACHE_ENTRIES = 64;
const browserCacheStore = new Map<string, BrowserCacheEntry>();
const browserInFlightRequests = new Map<string, Promise<FetchValidatedJsonResult<unknown>>>();

export async function fetchValidatedJson<TData>({
  url,
  validate,
  timeoutMs,
  cache = 'default',
  request: requestInit,
  browserCache,
  fallbackErrorMessage,
  invalidDataMessage = 'Invalid data format',
}: FetchValidatedJsonOptions<TData>): Promise<FetchValidatedJsonResult<TData>> {
  const browserCacheKey = getBrowserCacheKey(url, browserCache);

  if (browserCacheKey && !browserCache?.force) {
    const cached = browserCacheStore.get(browserCacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result as FetchSuccessResult<TData>;
    }

    const inFlight = browserInFlightRequests.get(browserCacheKey);
    if (inFlight) {
      return (await inFlight) as FetchValidatedJsonResult<TData>;
    }
  }

  const request = fetchAndValidateJson({
    cache,
    fallbackErrorMessage,
    invalidDataMessage,
    request: requestInit,
    timeoutMs,
    url,
    validate,
  });

  if (!browserCacheKey) {
    return request;
  }

  browserInFlightRequests.set(
    browserCacheKey,
    request as Promise<FetchValidatedJsonResult<unknown>>,
  );

  try {
    const result = await request;
    if (result.status === 'success') {
      pruneBrowserCache();
      browserCacheStore.set(browserCacheKey, {
        expiresAt: Date.now() + (browserCache?.ttlMs ?? 0),
        result,
      });
      trimBrowserCache();
    }
    return result;
  } finally {
    browserInFlightRequests.delete(browserCacheKey);
  }
}

async function fetchAndValidateJson<TData>({
  url,
  validate,
  timeoutMs,
  cache,
  request,
  fallbackErrorMessage,
  invalidDataMessage,
}: Required<
  Pick<
    FetchValidatedJsonOptions<TData>,
    'fallbackErrorMessage' | 'invalidDataMessage' | 'timeoutMs' | 'url' | 'validate'
  >
> &
  Pick<FetchValidatedJsonOptions<TData>, 'cache' | 'request'>): Promise<
  FetchValidatedJsonResult<TData>
> {
  try {
    const response = await fetch(url, {
      ...request,
      cache,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const payload: unknown = await response.json();

    if (isApiErrorPayload(payload)) {
      return {
        status: 'api-error',
        error: payload.message ?? payload.error,
        payload,
      };
    }

    if (!response.ok) {
      return {
        status: 'http-error',
        error: fallbackErrorMessage,
      };
    }

    if (!validate(payload)) {
      return {
        status: 'invalid-data',
        error: invalidDataMessage,
      };
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

function getBrowserCacheKey(
  url: string,
  browserCache: FetchValidatedJsonOptions<unknown>['browserCache'],
): string | null {
  if (!browserCache || browserCache.ttlMs <= 0 || typeof window === 'undefined') {
    return null;
  }

  return browserCache.key ?? url;
}

export function clearFetchValidatedJsonBrowserCache({
  key,
  prefix,
}: {
  key?: string;
  prefix?: string;
} = {}) {
  if (!key && !prefix) {
    browserCacheStore.clear();
    browserInFlightRequests.clear();
    return;
  }

  if (key) {
    browserCacheStore.delete(key);
    browserInFlightRequests.delete(key);
  }

  if (prefix) {
    for (const cacheKey of browserCacheStore.keys()) {
      if (cacheKey.startsWith(prefix)) {
        browserCacheStore.delete(cacheKey);
      }
    }
    for (const cacheKey of browserInFlightRequests.keys()) {
      if (cacheKey.startsWith(prefix)) {
        browserInFlightRequests.delete(cacheKey);
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

  pruneBrowserCache();
  browserCacheStore.set(key, {
    expiresAt: Date.now() + ttlMs,
    result: {
      status: 'success',
      data,
    },
  });
  trimBrowserCache();
}

function pruneBrowserCache() {
  const now = Date.now();
  for (const [key, entry] of browserCacheStore) {
    if (entry.expiresAt <= now) {
      browserCacheStore.delete(key);
    }
  }
}

function trimBrowserCache() {
  while (browserCacheStore.size > MAX_BROWSER_CACHE_ENTRIES) {
    const oldestKey = browserCacheStore.keys().next().value;
    if (oldestKey === undefined) break;
    browserCacheStore.delete(oldestKey);
  }
}
