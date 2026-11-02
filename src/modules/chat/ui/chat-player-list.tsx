'use client';

import { Gamepad2, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChatDestination } from '@/modules/chat/model/chat-destination';
import type { ChatPeer } from '@/modules/chat/model/chat-protocol';
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
    <ul className="chat-people__list">
      {players.map((player) => {
        const self = player.playerUuid === owner;
        const content = (
          <>
            <span className="chat-peer__avatar" aria-hidden="true">
              <MinecraftAvatar uuid={player.playerUuid} name={player.name} size={32} />
            </span>
            <span className="chat-peer__name">
              {player.name}
              {self ? <small> {t('you')}</small> : null}
            </span>
            <PeerPresence player={player} />
          </>
        );
        return (
          <li key={player.playerUuid}>
            {self ? (
              <div className="chat-peer">{content}</div>
            ) : (
              <button
                type="button"
                className="chat-peer"
                data-chat-panel-result
                aria-label={t('startPrivate', { name: player.name })}
                onClick={() =>
                  onChoose({ channel: 'private', targetUuid: player.playerUuid, name: player.name })
                }
              >
                {content}
              </button>
            )}
          </li>
        );
      })}
      {!players.length ? (
        <li className="chat-list-empty">
          <p role="status">{emptyText}</p>
        </li>
      ) : null}
    </ul>
  );
}

export function PeerPresence({ player }: { player: ChatPeer }) {
  const t = useTranslations('chat');
  return (
    <span className="chat-peer-presence">
      {player.game ? (
        <span title={t('game')}>
          <Gamepad2 size={13} aria-hidden="true" />
          <span className="sr-only">{t('game')}</span>
        </span>
      ) : null}
      {player.webConnections ? (
        <span title={t('webCount', { count: player.webConnections })}>
          <Globe size={12} aria-hidden="true" />
          <span className="sr-only">{t('webCount', { count: player.webConnections })}</span>
          {player.webConnections > 1 ? (
            <span aria-hidden="true">×{player.webConnections}</span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
