export interface AuthAccount {
  playerUuid: string;
  currentName: string;
  role: string;
  updatedAt: string;
  passkeyCount?: number;
}

export interface AuthSession {
  id: string;
  current: boolean;
  issuedAt: string;
  lastSeenAt: string;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
  authMethod: 'minecraft-challenge' | 'passkey';
}

export interface AuthPasskey {
  credentialId: string;
  createdAt: string;
  lastUsedAt?: string;
  displayName?: string;
}

export interface AuthMeResponse {
  authenticated: boolean;
  account?: AuthAccount;
}

export interface AccountSecurityResponse {
  account: AuthAccount;
  session: AuthSession;
  sessions: AuthSession[];
  passkeys: AuthPasskey[];
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isAuthAccount(value: unknown): value is AuthAccount {
  return (
    isObjectRecord(value) &&
    typeof value.playerUuid === 'string' &&
    typeof value.currentName === 'string' &&
    typeof value.role === 'string' &&
    typeof value.updatedAt === 'string' &&
    (value.passkeyCount === undefined || typeof value.passkeyCount === 'number')
  );
}

export function isAuthSession(value: unknown): value is AuthSession {
  return (
    isObjectRecord(value) &&
    typeof value.id === 'string' &&
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
    isObjectRecord(value) &&
    typeof value.credentialId === 'string' &&
    typeof value.createdAt === 'string' &&
    (value.lastUsedAt === undefined || typeof value.lastUsedAt === 'string') &&
    (value.displayName === undefined || typeof value.displayName === 'string')
  );
}

export function isAccountSecurityResponse(value: unknown): value is AccountSecurityResponse {
  return (
    isObjectRecord(value) &&
    isAuthAccount(value.account) &&
    isAuthSession(value.session) &&
    Array.isArray(value.sessions) &&
    value.sessions.every(isAuthSession) &&
    Array.isArray(value.passkeys) &&
    value.passkeys.every(isAuthPasskey)
  );
}
