import { isRecord } from '@/shared/lib/is-record';
/** QQ verifies the current 30-second step and the immediately preceding step. */
export const JOIN_CODE_PERIOD_SECONDS = 30;
export const MAX_JOIN_CODE_LIFETIME_MS = JOIN_CODE_PERIOD_SECONDS * 2 * 1000;

export interface JoinCode {
  code: string;
  serverTime: number;
  expiresAt: number;
}

export type JoinCodeError =
  | 'unavailable'
  | 'request_failed'
  | 'request_timeout'
  | 'captcha_failed'
  | 'captcha_unavailable'
  | 'code_expired';

export function isJoinCode(value: unknown): value is JoinCode {
  if (!isRecord(value)) return false;
  const code = value;
  return (
    typeof code.code === 'string' &&
    /^\d{6}$/.test(code.code) &&
    typeof code.serverTime === 'number' &&
    Number.isFinite(code.serverTime) &&
    typeof code.expiresAt === 'number' &&
    Number.isFinite(code.expiresAt) &&
    code.expiresAt > code.serverTime &&
    code.expiresAt - code.serverTime <= MAX_JOIN_CODE_LIFETIME_MS
  );
}
