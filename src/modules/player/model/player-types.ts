export interface PlayerIdentity {
  name: string;
  uuid: string;
}

export interface Player extends PlayerIdentity {
  joinedAt: string;
}

export interface PlayerStatus {
  online: number;
  peakOnline?: number;
  players: Player[];
}
