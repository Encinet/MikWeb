'use client';

import { KeyRound, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useAuth } from '@/modules/auth/model/use-auth';
import { AccountLayout } from '@/modules/auth/ui/account-layout';

export function AccountPage() {
  const t = useTranslations('auth.account');
  const { account } = useAuth();

  return (
    <AccountLayout>
      <section className="account-detail-panel">
        <div className="account-detail-panel__header">
          <div className="account-detail-panel__title">
            <span>
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <h1>{t('subtitle')}</h1>
              <p>{t('overview.description')}</p>
            </div>
          </div>
        </div>

        <div className="account-settings-list">
          <InfoRow
            icon={<KeyRound className="h-4 w-4" />}
            label={t('fields.passkeys')}
            value={String(account?.passkeyCount ?? 0)}
          />
          <InfoRow
            icon={<ShieldCheck className="h-4 w-4" />}
            label={t('fields.uuid')}
            value={account?.playerUuid ?? '-'}
            monospace
          />
        </div>
      </section>
    </AccountLayout>
  );
}

function InfoRow({
  icon,
  label,
  monospace = false,
  value,
}: {
  icon?: ReactNode;
  label: string;
  monospace?: boolean;
  value: string;
}) {
  return (
    <div className="account-setting-row">
      <div className="account-setting-row__label">
        <span>{icon}</span>
        <strong>{label}</strong>
      </div>
      <div
        className={
          monospace
            ? 'account-setting-row__value account-setting-row__value--mono'
            : 'account-setting-row__value'
        }
      >
        {value}
      </div>
    </div>
  );
}
