import { isRecord } from '@/shared/lib/is-record';

export interface ApiErrorPayload {
  error: string;
  message?: string;
}

export function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return (
    isRecord(value) &&
    typeof value.error === 'string' &&
    (value.message === undefined || typeof value.message === 'string')
  );
}
