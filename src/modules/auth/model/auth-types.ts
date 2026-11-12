export interface AuthAccount {
  playerUuid: string;
  currentName: string;
  role: 'default' | 'member' | 'moderator' | 'custodian';
  updatedAt: string;
  passkeyCount: number;
}

export interface AuthSession {
  id: string;
  displayName?: string;
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

export type AuthMeResponse =
  | { authenticated: false }
  | { authenticated: true; account: AuthAccount };

export interface AccountSecurityResponse {
  account: AuthAccount;
  session: AuthSession;
  sessions: AuthSession[];
  passkeys: AuthPasskey[];
}
