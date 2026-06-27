'use client';

import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Player } from '@/modules/player/model/player-types';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';

interface HomePlayerListProps {
  players: Player[];
  playerCount: number;
  isOnline: boolean;
  isLoading: boolean;
  networkError: boolean;
}

export default function HomePlayerList({
  players,
  playerCount,
  isOnline,
  isLoading,
  networkError,
}: HomePlayerListProps) {
  const t = useTranslations();

  return (
    <section className="home-player-list" aria-label={t('home.live.playerListTitle')}>
      {/* Header */}
      <div className="home-player-list__header">
        <Users className="h-4 w-4" />
        <span>{t('home.live.playerListTitle')}</span>
        {isOnline && !isLoading ? (
          <strong className="home-player-list__count">{playerCount}</strong>
        ) : null}
      </div>

      {/* States */}
      {isLoading ? (
        <div className="home-player-list__state">
          <div className="home-player-list__spinner" />
          <p>{t('home.live.status.loading')}</p>
        </div>
      ) : networkError ? (
        <div className="home-player-list__state">
          <p>{t('home.live.status.networkError')}</p>
        </div>
      ) : !isOnline ? (
        <div className="home-player-list__state">
          <span className="home-player-list__dot" />
          <p>{t('home.live.status.offline')}</p>
        </div>
      ) : players.length === 0 ? (
        <div className="home-player-list__state">
          <p>{t('home.live.noPlayersOnline')}</p>
        </div>
      ) : (
        <ul className="home-player-list__list">
          {players.map((player) => (
            <li key={player.uuid} className="home-player-list__item">
              <MinecraftAvatar
                uuid={player.uuid}
                name={player.name}
                size={32}
                className="home-player-list__avatar"
              />
              <span className="home-player-list__name">{player.name}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
