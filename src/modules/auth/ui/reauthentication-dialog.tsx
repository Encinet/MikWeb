'use client';

import { ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AuthAccount } from '@/modules/auth/model/auth-types';
import { useAuthenticationFlow } from '@/modules/auth/model/use-authentication-flow';
import {
  AuthenticationCode,
  AuthenticationFeedback,
  AuthenticationIdentity,
  AuthenticationMethods,
  AuthenticationProgress,
} from '@/modules/auth/ui/authentication-flow';
import { Link } from '@/shared/i18n/navigation';
import { AppDialog } from '@/shared/ui/dialog/app-dialog';

export function ReauthenticationDialog({
  account,
  onVerified,
  onClose,
}: {
  account: AuthAccount;
  onVerified: () => void;
  onClose: () => void;
}) {
  const t = useTranslations('auth.authentication');
  const commonT = useTranslations('common');
  const flow = useAuthenticationFlow({
    purpose: 'reauthenticate',
    expectedPlayerUuid: account.playerUuid,
    onAuthenticated: onVerified,
  });
  const progress =
    flow.phase === 'completing' || flow.phase === 'done'
      ? t('completingVerification')
      : flow.phase === 'passkey'
        ? t('passkeyStarting')
        : null;
  return (
    <AppDialog
      isOpen
      onClose={() => {
        if (flow.cancel()) onClose();
      }}
      dismissible={flow.phase !== 'completing' && flow.phase !== 'done'}
      title={t('verifyTitle')}
      icon={<ShieldCheck className="h-5 w-5" />}
      className={`auth-flow-dialog${progress ? ' auth-flow-dialog--pending' : ''}`}
    >
      {progress ? (
        <AuthenticationProgress
          title={progress}
          onCancel={flow.phase === 'passkey' ? () => void flow.cancel() : undefined}
        />
      ) : (
        <>
          <AuthenticationIdentity account={account} />
          {flow.challenge ? (
            <>
              <AuthenticationCode flow={flow} />
              <button className="auth-flow-other-method" type="button" onClick={flow.cancel}>
                {t('otherMethod')}
              </button>
            </>
          ) : (
            <>
              <AuthenticationMethods
                flow={flow}
                methods={account.passkeyCount > 0 ? ['passkey', 'minecraft'] : ['minecraft']}
              />
              <AuthenticationFeedback error={flow.error} />
              {flow.error === 'unauthenticated' ? (
                <Link
                  className="ui-action-button ui-action-button--primary"
                  href="/login?next=security"
                >
                  {commonT('actions.login')}
                </Link>
              ) : null}
            </>
          )}
        </>
      )}
    </AppDialog>
  );
}
