'use client';

import { AlertTriangle, Calendar, Clock, Shield, User } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import MinecraftAvatar from '@/components/MinecraftAvatar';
import { fetchValidatedJson } from '@/lib/clientApi';
import type { BanItem } from '@/lib/types';
import { isBanItemArray } from '@/lib/types';

export default function BansPage() {
  const t = useTranslations('bans');
  const commonT = useTranslations('common');
  const locale = useLocale();
  const [bans, setBans] = useState<BanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBans = async () => {
      const result = await fetchValidatedJson({
        url: '/api/bans',
        validate: isBanItemArray,
        timeoutMs: 15_000,
        fallbackErrorMessage: commonT('states.error'),
      });

      if (result.status === 'success') {
        setBans(
          [...result.data].sort(
            (leftBan, rightBan) =>
              new Date(rightBan.bannedAt).getTime() - new Date(leftBan.bannedAt).getTime(),
          ),
        );
        setError(null);
      } else {
        if (result.status === 'network-error') {
          console.error('Failed to fetch bans:', result.cause);
        }
        setError(result.error);
        setBans([]);
      }
      setIsLoading(false);
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
    <div className="page-shell">
      <div className="max-w-7xl mx-auto">
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
              {t('hero.title')}
            </h1>
          </div>
          <p
            className="text-base sm:text-lg max-w-2xl mx-auto"
            style={{ color: 'var(--theme-text-muted-soft)' }}
          >
            {t('hero.description')}
          </p>
        </div>

        {/* ── States ── */}
        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-red-400 border-t-transparent rounded-full animate-spin" />
            <p className="mt-6 text-lg" style={{ color: 'var(--theme-text-muted)' }}>
              {t('states.loading')}
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <Shield className="w-16 h-16 mx-auto mb-4 text-red-400" />
            <p
              className="text-lg font-semibold mb-2"
              style={{ color: 'var(--theme-text-heading)' }}
            >
              {commonT('states.error')}
            </p>
            <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
              {error}
            </p>
          </div>
        ) : bans.length === 0 ? (
          <div className="text-center py-20">
            <Shield
              className="w-16 h-16 mx-auto mb-4"
              style={{ color: 'var(--theme-text-faint)' }}
            />
            <p className="text-lg" style={{ color: 'var(--theme-text-muted)' }}>
              {t('states.empty')}
            </p>
          </div>
        ) : (
          /* Masonry: cards flow naturally by content height */
          <div className="columns-1 sm:columns-2 xl:columns-3 gap-4">
            {bans.map((ban, i) => (
              <div
                key={ban.playerUuid}
                className="break-inside-avoid mb-4 rounded-2xl hover:border-red-400/30 transition-all duration-300 overflow-hidden group"
                style={{
                  backdropFilter: 'blur(16px) saturate(150%)',
                  'WebkitBackdropFilter': 'blur(16px) saturate(150%)',
                  background: 'var(--theme-surface-glass)',
                  border: '1px solid var(--theme-border-glass)',
                  boxShadow: 'var(--theme-shadow-card)',
                  animation: 'slideIn 0.5s ease-out both',
                  animationDelay: `${i * 0.05}s`,
                }}
              >
                <div className="p-5">
                  {/* ── Avatar + name + uuid ── */}
                  <div className="flex items-center gap-3 mb-4">
                    <MinecraftAvatar
                      uuid={ban.playerUuid}
                      name={ban.playerName}
                      size={56}
                      className="w-14 h-14 rounded-xl shrink-0"
                      style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
                    />
                    <div className="min-w-0">
                      <h3
                        className="text-lg font-bold leading-tight"
                        style={{ color: 'var(--theme-text-heading)' }}
                      >
                        {ban.playerName}
                      </h3>
                      <p
                        className="text-xs font-mono mt-0.5 select-all"
                        style={{ color: 'var(--theme-text-muted)', wordBreak: 'break-all' }}
                      >
                        {ban.playerUuid}
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
                        {t('fields.reason')}:{' '}
                      </span>
                      <span style={{ color: 'var(--theme-text-primary)' }}>{ban.reason}</span>
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
                        {t('fields.bannedBy')}:
                      </span>
                      <span className="font-medium" style={{ color: 'var(--theme-accent-purple)' }}>
                        {ban.bannedBy}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Calendar
                        className="w-4 h-4 shrink-0"
                        style={{ color: 'var(--theme-accent-blue)' }}
                      />
                      <span style={{ color: 'var(--theme-text-muted)' }}>
                        {t('fields.bannedAt')}:
                      </span>
                      <span style={{ color: 'var(--theme-accent-blue)' }}>
                        {formatDate(ban.bannedAt)}
                      </span>
                    </div>

                    {!ban.isPermanent && ban.expiresAt && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                        <span style={{ color: 'var(--theme-text-muted)' }}>
                          {t('fields.expiresAt')}:
                        </span>
                        <span className="text-amber-400">{formatDate(ban.expiresAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 1s ease-out;
        }
      `}</style>
    </div>
  );
}
