import type { ChatDestination, ChatPeer, ChatPresence } from '@/modules/chat/model/chat-protocol';

/** One channel projection for rosters, counts and mention completion. */
export function channelPlayers(
  presence: ChatPresence,
  destination: ChatDestination,
  owner: string,
): ChatPeer[] {
  switch (destination.channel) {
    case 'public':
      return presence.players;
    case 'staff': {
      const staff = new Set(presence.staffPlayers);
      return presence.players.filter((player) => staff.has(player.playerUuid));
    }
    case 'private':
      return presence.players.filter(
        (player) => player.playerUuid === owner || player.playerUuid === destination.targetUuid,
      );
  }
}
