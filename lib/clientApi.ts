import type { ApiErrorPayload } from '@/lib/types';
import { isApiErrorPayload } from '@/lib/types';

interface FetchValidatedJsonOptions<TData> {
  url: string;
  validate: (value: unknown) => value is TData;
  timeoutMs: number;
  cache?: RequestCache;
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

export async function fetchValidatedJson<TData>({
  url,
  validate,
  timeoutMs,
  cache = 'default',
  fallbackErrorMessage,
  invalidDataMessage = 'Invalid data format',
}: FetchValidatedJsonOptions<TData>): Promise<FetchValidatedJsonResult<TData>> {
  try {
    const response = await fetch(url, {
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
