'use client';

import { Gamepad2, Globe, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChatDestination, ChatPeer } from '@/modules/chat/model/chat-protocol';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';

export function ChatPlayerList({
  players,
  owner,
  onChoose,
  emptyText,
}: {
  players: ChatPeer[];
  owner: string;
  onChoose: (destination: ChatDestination) => void;
  emptyText: string;
}) {
  const t = useTranslations('chat');
  return (
    <div className="chat-people__list">
      {players.map((player) => (
        <button
          type="button"
          className="chat-peer"
          key={player.playerUuid}
          disabled={player.playerUuid === owner}
          aria-label={
            player.playerUuid === owner
              ? t('yourPresence', { name: player.name })
              : t('startPrivate', { name: player.name })
          }
          onClick={() =>
            onChoose({ channel: 'private', targetUuid: player.playerUuid, name: player.name })
          }
        >
          <MinecraftAvatar uuid={player.playerUuid} name={player.name} size={30} />
          <span>
            <strong>
              {player.name}
              {player.playerUuid === owner ? <small> {t('you')}</small> : null}
            </strong>
            <PeerPresence player={player} />
          </span>
          {player.playerUuid !== owner ? <MessageCircle size={16} aria-hidden="true" /> : null}
        </button>
      ))}
      {!players.length ? <p className="chat-list-empty">{emptyText}</p> : null}
    </div>
  );
}

export function PeerPresence({ player }: { player: ChatPeer }) {
  const t = useTranslations('chat');
  return (
    <span className="chat-peer-presence">
      {player.game ? (
        <span title={t('game')}>
          <Gamepad2 size={13} aria-hidden="true" />
          <span>{t('game')}</span>
        </span>
      ) : null}
      {player.webConnections ? (
        <span title={t('webCount', { count: player.webConnections })}>
          <Globe size={12} aria-hidden="true" />
          <span>{t('webCount', { count: player.webConnections })}</span>
        </span>
      ) : null}
    </span>
  );
}
