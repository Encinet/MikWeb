export interface JoinCode {
  code: string;
  serverTime: number;
  expiresAt: number;
  period: number;
}

export type JoinCodeError =
  | 'unavailable'
  | 'request_failed'
  | 'request_timeout'
  | 'captcha_failed'
  | 'captcha_unavailable'
  | 'code_expired';

export interface JoinCodeResponse extends JoinCode {
  processingTimeMs: number;
}

export function isJoinCodeResponse(value: unknown): value is JoinCodeResponse {
  return (
    isJoinCode(value) &&
    'processingTimeMs' in value &&
    typeof value.processingTimeMs === 'number' &&
    Number.isInteger(value.processingTimeMs) &&
    value.processingTimeMs >= 0 &&
    value.processingTimeMs <= 20_000
  );
}

export function minimumJoinCodeLifetime(period: number): number {
  return Math.min(10_000, period * 500);
}

export function isJoinCode(value: unknown): value is JoinCode {
  if (!value || typeof value !== 'object') return false;
  const code = value as Record<string, unknown>;
  return (
    typeof code.code === 'string' &&
    /^\d{6}$/.test(code.code) &&
    typeof code.serverTime === 'number' &&
    Number.isFinite(code.serverTime) &&
    typeof code.expiresAt === 'number' &&
    Number.isFinite(code.expiresAt) &&
    code.expiresAt > code.serverTime &&
    typeof code.period === 'number' &&
    Number.isInteger(code.period) &&
    code.period >= 15 &&
    code.period <= 300 &&
    code.expiresAt - code.serverTime <= code.period * 1000
  );
}
