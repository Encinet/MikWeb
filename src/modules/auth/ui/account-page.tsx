'use client';

import { useTranslations } from 'next-intl';
import { useAuth } from '@/modules/auth/model/use-auth';
import { AccountLayout } from '@/modules/auth/ui/account-layout';
import { Link } from '@/shared/i18n/routing';

export function AccountPage() {
  const t = useTranslations('auth.account');
  const { account } = useAuth();

  return (
    <AccountLayout>
      <section className="account-section" aria-labelledby="account-overview-title">
        <header className="account-page-heading">
          <h1 id="account-overview-title">{t('subtitle')}</h1>
        </header>
        <dl className="account-facts">
          <div>
            <dt>{t('fields.passkeys')}</dt>
            <dd>
              <span>{account?.passkeyCount ?? '—'}</span>
              <Link href="/account/security" className="account-text-link">
                {t('actions.managePasskeys')}
              </Link>
            </dd>
          </div>
          <div>
            <dt>{t('fields.uuid')}</dt>
            <dd className="account-facts__uuid">{account?.playerUuid ?? '—'}</dd>
          </div>
        </dl>
      </section>
    </AccountLayout>
  );
}
