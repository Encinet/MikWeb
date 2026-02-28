'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Shield, User, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import MinecraftAvatar from '@/components/MinecraftAvatar';

interface Ban {
  id: number;
  playerName: string;
  playerUuid: string;
  reason: {
    [locale: string]: string;
  };
  bannedBy: string;
  bannedAt: string;
  expiresAt: string | null;
  isPermanent: boolean;
}

export default function BansPage() {
  const t = useTranslations('bans');
  const locale = useLocale();
  const [bans, setBans] = useState<Ban[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBans = async () => {
      try {
        const response = await fetch('/api/bans');
        const data = await response.json();
        setBans(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch bans:', error);
        setIsLoading(false);
      }
    };

    fetchBans();
  }, []);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12 animate-fadeIn">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-linear-to-br from-red-500/20 to-red-600/20 backdrop-blur-sm border border-red-400/30 shadow-lg">
              <Shield className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black" style={{ color: 'var(--text-secondary)' }}>{t('title')}</h1>
          </div>
          <p className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-muted-light)' }}>
            {t('description')}
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-4 border-red-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-6 text-lg" style={{ color: 'var(--text-muted)' }}>{t('loading')}</p>
          </div>
        ) : bans.length === 0 ? (
          <div className="text-center py-20">
            <Shield className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-very-dimmed)' }} />
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>{t('empty')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bans.map((ban, i) => (
              <div
                key={ban.id}
                className="backdrop-blur-lg bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 hover:border-red-400/30 transition-all duration-300 overflow-hidden group"
                style={{
                  animation: 'slideIn 0.5s ease-out',
                  animationDelay: `${i * 0.05}s`,
                  animationFillMode: 'both'
                }}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <MinecraftAvatar
                      uuid={ban.playerUuid}
                      name={ban.playerName}
                      size={64}
                      className="w-16 h-16 rounded-lg"
                      style={{
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold" style={{ color: 'var(--text-secondary)' }}>
                          {ban.playerName}
                        </h3>
                        {ban.isPermanent ? (
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400 border border-red-400/30">
                            {t('permanent')}
                          </span>
                        ) : isExpired(ban.expiresAt) ? (
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400 border border-green-400/30">
                            {t('expired')}
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400 border border-amber-400/30">
                            {t('temporary')}
                          </span>
                        )}
                      </div>

                      <div className="flex items-start gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('reason')}: </span>
                          <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                            {ban.reason[locale] || ban.reason['en'] || Object.values(ban.reason)[0]}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-purple-400 shrink-0" />
                          <span style={{ color: 'var(--text-muted)' }}>{t('bannedBy')}: </span>
                          <span className="text-purple-400 font-medium">{ban.bannedBy}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
                          <span style={{ color: 'var(--text-muted)' }}>{t('bannedAt')}: </span>
                          <span className="text-blue-400">{formatDate(ban.bannedAt)}</span>
                        </div>

                        {!ban.isPermanent && ban.expiresAt && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                            <span style={{ color: 'var(--text-muted)' }}>{t('expiresAt')}: </span>
                            <span className="text-amber-400">{formatDate(ban.expiresAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 1s ease-out;
        }
      `}</style>
    </div>
  );
}
