export interface BanItem {
  playerName: string;
  playerUuid: string;
  reason: string;
  bannedBy: string;
  bannedAt: string;
  expiresAt: string | null;
  isPermanent: boolean;
}
