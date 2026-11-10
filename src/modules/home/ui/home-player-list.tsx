'use client';

import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import type { Player } from '@/modules/player/model/player-types';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';
import { LoadingState } from '@/shared/ui/feedback/loading-state';

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
  const homeT = useTranslations('home');

  return (
    <section className="home-player-list" aria-label={homeT('live.playerListTitle')}>
      {/* Header */}
      <div className="home-player-list__header">
        <Users className="h-4 w-4" aria-hidden="true" />
        <h2>{homeT('live.playerListTitle')}</h2>
        {isOnline && !isLoading && !networkError ? (
          <strong className="home-player-list__count">{playerCount}</strong>
        ) : null}
      </div>

      {/* States */}
      {isLoading ? (
        <div className="home-player-list__state">
          <LoadingState message={homeT('live.status.loading')} variant="inline" />
        </div>
      ) : networkError ? (
        <div className="home-player-list__state">
          <p>{homeT('live.status.networkError')}</p>
        </div>
      ) : !isOnline ? (
        <div className="home-player-list__state">
          <span className="home-player-list__dot" />
          <p>{homeT('live.status.offline')}</p>
        </div>
      ) : players.length === 0 ? (
        <div className="home-player-list__state">
          <p>{homeT('live.noPlayersOnline')}</p>
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
