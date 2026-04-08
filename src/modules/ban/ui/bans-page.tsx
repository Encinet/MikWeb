'use client';

import { AlertTriangle, Calendar, Clock, Shield, User } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import type { BanItem } from '@/modules/ban/model/ban-types';
import { isBanItemArray } from '@/modules/ban/model/ban-types';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';
import { fetchValidatedJson } from '@/shared/api/fetch-validated-json';
import { SectionMessage } from '@/shared/ui/feedback/async-state';

function BansLoadingState({ message }: { message: string }) {
  return (
    <div className="py-20 text-center">
      <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-red-400 border-t-transparent" />
      <p className="mt-6 text-lg" style={{ color: 'var(--theme-text-muted)' }}>
        {message}
      </p>
    </div>
  );
}

export default function BansPage() {
  const bansT = useTranslations('bans');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const [banEntries, setBanEntries] = useState<BanItem[]>([]);
  const [isLoadingBanEntries, setIsLoadingBanEntries] = useState(true);
  const [banEntriesError, setBanEntriesError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBans = async () => {
      const bansResult = await fetchValidatedJson({
        url: '/api/bans',
        validate: isBanItemArray,
        timeoutMs: 15_000,
        fallbackErrorMessage: commonT('states.error'),
      });

      if (bansResult.status === 'success') {
        setBanEntries(
          [...bansResult.data].sort(
            (leftBanEntry, rightBanEntry) =>
              new Date(rightBanEntry.bannedAt).getTime() -
              new Date(leftBanEntry.bannedAt).getTime(),
          ),
        );
        setBanEntriesError(null);
      } else {
        if (bansResult.status === 'network-error') {
          console.error('Failed to fetch bans:', bansResult.cause);
        }
        setBanEntriesError(bansResult.error);
        setBanEntries([]);
      }
      setIsLoadingBanEntries(false);
    };
    fetchBans();
  }, [commonT]);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="page-shell page-shell-stable">
      <div className="page-shell-content max-w-7xl mx-auto">
        {/* ── Header ── */}
        <div className="text-center mb-8 sm:mb-12 animate-fadeIn">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-linear-to-br from-red-500/20 to-red-600/20 backdrop-blur-sm border border-red-400/30 shadow-lg">
              <Shield className="w-8 h-8 text-red-400" />
            </div>
            <h1
              className="text-4xl sm:text-5xl font-bold"
              style={{ color: 'var(--theme-text-heading)' }}
            >
              {bansT('hero.title')}
            </h1>
          </div>
          <p
            className="text-base sm:text-lg max-w-2xl mx-auto"
            style={{ color: 'var(--theme-text-muted-soft)' }}
          >
            {bansT('hero.description')}
          </p>
        </div>

        {/* ── States ── */}
        <div className="page-state-region">
          {isLoadingBanEntries ? (
            <BansLoadingState message={bansT('states.loading')} />
          ) : banEntriesError ? (
            <SectionMessage
              body={banEntriesError}
              icon={Shield}
              iconColor="#f87171"
              title={commonT('states.error')}
            />
          ) : banEntries.length === 0 ? (
            <SectionMessage
              body={bansT('states.empty')}
              icon={Shield}
              iconColor="var(--theme-text-faint)"
            />
          ) : (
            /* Masonry: cards flow naturally by content height */
            <div className="columns-1 sm:columns-2 xl:columns-3 gap-4">
              {banEntries.map((banEntry, banEntryIndex) => (
                <div
                  key={banEntry.playerUuid}
                  className="glass-card animate-card-enter group mb-4 break-inside-avoid overflow-hidden rounded-2xl transition-all duration-300 hover:border-red-400/30"
                  style={{
                    WebkitBackdropFilter: 'blur(16px) saturate(150%)',
                    animationDelay: `${banEntryIndex * 0.04}s`,
                  }}
                >
                  <div className="p-5">
                    {/* ── Avatar + name + uuid ── */}
                    <div className="flex items-center gap-3 mb-4">
                      <MinecraftAvatar
                        uuid={banEntry.playerUuid}
                        name={banEntry.playerName}
                        size={56}
                        className="w-14 h-14 rounded-xl shrink-0"
                        style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                      />
                      <div className="min-w-0">
                        <h3
                          className="text-lg font-bold leading-tight"
                          style={{ color: 'var(--theme-text-heading)' }}
                        >
                          {banEntry.playerName}
                        </h3>
                        <p
                          className="text-xs font-mono mt-0.5 select-all"
                          style={{ color: 'var(--theme-text-muted)', wordBreak: 'break-all' }}
                        >
                          {banEntry.playerUuid}
                        </p>
                      </div>
                    </div>

                    {/* ── Divider ── */}
                    <div
                      className="mb-3"
                      style={{ height: '1px', background: 'var(--theme-border-glass)' }}
                    />

                    {/* ── Reason ── */}
                    <div className="flex items-start gap-2 mb-4">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <span style={{ color: 'var(--theme-text-muted)' }}>
                          {bansT('fields.reason')}:{' '}
                        </span>
                        <span style={{ color: 'var(--theme-text-primary)' }}>
                          {banEntry.reason}
                        </span>
                      </div>
                    </div>

                    {/* ── Meta ── */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User
                          className="w-4 h-4 shrink-0"
                          style={{ color: 'var(--theme-accent-purple)' }}
                        />
                        <span style={{ color: 'var(--theme-text-muted)' }}>
                          {bansT('fields.bannedBy')}:
                        </span>
                        <span
                          className="font-medium"
                          style={{ color: 'var(--theme-accent-purple)' }}
                        >
                          {banEntry.bannedBy}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Calendar
                          className="w-4 h-4 shrink-0"
                          style={{ color: 'var(--theme-accent-blue)' }}
                        />
                        <span style={{ color: 'var(--theme-text-muted)' }}>
                          {bansT('fields.bannedAt')}:
                        </span>
                        <span style={{ color: 'var(--theme-accent-blue)' }}>
                          {formatDate(banEntry.bannedAt)}
                        </span>
                      </div>

                      {!banEntry.isPermanent && banEntry.expiresAt ? (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 shrink-0 text-amber-400" />
                          <span style={{ color: 'var(--theme-text-muted)' }}>
                            {bansT('fields.expiresAt')}:
                          </span>
                          <span className="text-amber-400">{formatDate(banEntry.expiresAt)}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
