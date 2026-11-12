import { isMemberRole } from '@/modules/auth/model/auth-access';
import type {
  AccountSecurityResponse,
  AuthAccount,
  AuthMeResponse,
  AuthPasskey,
  AuthSession,
} from '@/modules/auth/model/auth-types';
import { isRecord } from '@/shared/lib/is-record';

export function isAuthAccount(value: unknown): value is AuthAccount {
  return (
    isRecord(value) &&
    typeof value.playerUuid === 'string' &&
    typeof value.currentName === 'string' &&
    (value.role === 'default' || isMemberRole(value.role)) &&
    typeof value.updatedAt === 'string' &&
    typeof value.passkeyCount === 'number' &&
    Number.isSafeInteger(value.passkeyCount) &&
    value.passkeyCount >= 0
  );
}

export function isAuthMeResponse(value: unknown): value is AuthMeResponse {
  return (
    isRecord(value) &&
    typeof value.authenticated === 'boolean' &&
    (!value.authenticated || isAuthAccount(value.account))
  );
}

export function isAuthSession(value: unknown): value is AuthSession {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    (value.displayName === undefined || typeof value.displayName === 'string') &&
    typeof value.current === 'boolean' &&
    typeof value.issuedAt === 'string' &&
    typeof value.lastSeenAt === 'string' &&
    typeof value.idleExpiresAt === 'string' &&
    typeof value.absoluteExpiresAt === 'string' &&
    (value.authMethod === 'minecraft-challenge' || value.authMethod === 'passkey')
  );
}

export function isAuthPasskey(value: unknown): value is AuthPasskey {
  return (
    isRecord(value) &&
    typeof value.credentialId === 'string' &&
    typeof value.createdAt === 'string' &&
    (value.lastUsedAt === undefined || typeof value.lastUsedAt === 'string') &&
    (value.displayName === undefined || typeof value.displayName === 'string')
  );
}

export function isAccountSecurityResponse(value: unknown): value is AccountSecurityResponse {
  return (
    isRecord(value) &&
    isAuthAccount(value.account) &&
    isAuthSession(value.session) &&
    Array.isArray(value.sessions) &&
    value.sessions.every(isAuthSession) &&
    Array.isArray(value.passkeys) &&
    value.passkeys.every(isAuthPasskey)
  );
}
