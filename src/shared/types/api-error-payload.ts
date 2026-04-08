export interface ApiErrorPayload {
  error: string;
  message?: string;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return isObjectRecord(value) && typeof value.error === 'string';
}
