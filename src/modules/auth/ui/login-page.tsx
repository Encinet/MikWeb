'use client';

import { ArrowRight, Gamepad2, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/modules/auth/model/use-auth';
import { useAuthenticationFlow } from '@/modules/auth/model/use-authentication-flow';
import {
  AuthenticationCode,
  AuthenticationFeedback,
  AuthenticationMethods,
  AuthenticationProgress,
} from '@/modules/auth/ui/authentication-flow';
import { Link, useRouter } from '@/shared/i18n/navigation';
import { AppDialog } from '@/shared/ui/dialog/app-dialog';

export function LoginPage() {
  const t = useTranslations('auth.login');
  const authenticationT = useTranslations('auth.authentication');
  const router = useRouter();
  const { authenticated } = useAuth();
  const flow = useAuthenticationFlow({
    purpose: 'login',
    onAuthenticated: () => router.replace(loginDestination()),
  });
  const progress =
    flow.phase === 'completing' || flow.phase === 'done'
      ? authenticationT('completingLogin')
      : flow.phase === 'passkey'
        ? authenticationT('passkeyStarting')
        : null;
  return (
    <div className="auth-login-page">
      <div className="auth-login-backdrop" aria-hidden="true" />
      <div className="auth-login-stage">
        {progress ? (
          <AuthenticationProgress
            title={progress}
            heading="h1"
            onCancel={flow.phase === 'passkey' ? () => void flow.cancel() : undefined}
          />
        ) : (
          <>
            <section className="auth-login-copy">
              <div className="auth-login-mark" aria-hidden="true">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h1>{t('title')}</h1>
              <p>{t('subtitle')}</p>
            </section>
            <AuthenticationMethods flow={flow} />
            <AuthenticationFeedback
              error={flow.challenge ? null : flow.error}
              className="auth-login-feedback"
            />
            {authenticated ? (
              <Link className="auth-login-account-link" href="/account">
                {t('actions.account')}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            ) : null}
          </>
        )}
      </div>
      <AppDialog
        isOpen={Boolean(flow.challenge) && !progress}
        onClose={flow.cancel}
        title={authenticationT('codePanel.title')}
        icon={<Gamepad2 className="h-5 w-5" />}
        className="auth-flow-dialog"
      >
        <AuthenticationCode flow={flow} />
      </AppDialog>
    </div>
  );
}

function loginDestination(): '/account' | '/account/security' {
  return new URLSearchParams(window.location.search).get('next') === 'security'
    ? '/account/security'
    : '/account';
}
