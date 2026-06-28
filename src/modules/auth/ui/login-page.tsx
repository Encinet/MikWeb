'use client';

import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { startAuthentication } from '@simplewebauthn/browser';
import { ArrowRight, Gamepad2, KeyRound, Loader2, ShieldCheck, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/modules/auth/model/use-auth';
import { Link, useRouter } from '@/shared/i18n/routing';
import { useToast } from '@/shared/ui/feedback/toast-provider';

interface LoginChallenge {
  challengeId: string;
  displayCode: string;
  expiresAt: string;
}

export function LoginPage() {
  const t = useTranslations('auth.login');
  const router = useRouter();
  const { authenticated, refresh } = useAuth();
  const { showToast, updateToast } = useToast();
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);
  const [isCompletingChallenge, setIsCompletingChallenge] = useState(false);
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const completingChallengeRef = useRef(false);
  const expiredChallengeRef = useRef<string | null>(null);

  const expireChallenge = useCallback(
    (challengeId: string) => {
      if (expiredChallengeRef.current === challengeId) {
        return;
      }

      expiredChallengeRef.current = challengeId;
      setChallenge((current) => (current?.challengeId === challengeId ? null : current));
      showToast({ title: t('states.expired'), variant: 'error' });
    },
    [showToast, t],
  );

  const completeChallenge = useCallback(
    async (challengeId: string) => {
      if (completingChallengeRef.current) {
        return;
      }

      completingChallengeRef.current = true;
      setIsCompletingChallenge(true);
      const toastId = showToast({
        title: t('states.completing'),
        variant: 'loading',
      });

      try {
        const response = await fetch(
          `/api/auth/challenges/${encodeURIComponent(challengeId)}/complete`,
          {
            method: 'POST',
            cache: 'no-store',
          },
        );

        if (!response.ok) {
          updateToast(toastId, {
            title: t('states.memberRequired'),
            variant: 'error',
          });
          return;
        }

        await refresh();
        updateToast(toastId, {
          title: t('states.loginSuccess'),
          variant: 'success',
        });
        router.replace('/account');
      } finally {
        setIsCompletingChallenge(false);
        completingChallengeRef.current = false;
      }
    },
    [refresh, router, showToast, t, updateToast],
  );

  useEffect(() => {
    if (!challenge) {
      return;
    }

    const timer = window.setInterval(async () => {
      const response = await fetch(
        `/api/auth/challenges/${encodeURIComponent(challenge.challengeId)}`,
        {
          cache: 'no-store',
        },
      );
      const payload = (await response.json().catch(() => null)) as { status?: string } | null;

      if (payload?.status === 'confirmed') {
        window.clearInterval(timer);
        await completeChallenge(challenge.challengeId);
      } else if (payload?.status === 'expired' || payload?.status === 'not_found') {
        window.clearInterval(timer);
        expireChallenge(challenge.challengeId);
      }
    }, 2500);

    return () => window.clearInterval(timer);
  }, [challenge, completeChallenge, expireChallenge]);

  useEffect(() => {
    if (!challenge) {
      setRemainingSeconds(0);
      return;
    }

    const updateRemaining = () => {
      const seconds = Math.max(
        0,
        Math.ceil((new Date(challenge.expiresAt).getTime() - Date.now()) / 1000),
      );
      setRemainingSeconds(seconds);

      if (seconds === 0) {
        expireChallenge(challenge.challengeId);
      }
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [challenge, expireChallenge]);

  const copyLoginCommand = async (code: string) => {
    try {
      await navigator.clipboard.writeText(`/weblogin ${code}`);
    } catch {
      showToast({ title: t('states.copyFailed'), variant: 'error' });
      return;
    }

    showToast({ title: t('states.copied'), variant: 'success' });
  };

  const createChallenge = async () => {
    setIsCreatingChallenge(true);
    try {
      const response = await fetch('/api/auth/challenges', {
        method: 'POST',
        cache: 'no-store',
      });
      const payload = (await response.json()) as LoginChallenge;

      if (!response.ok) {
        showToast({ title: t('states.unavailable'), variant: 'error' });
        return;
      }

      expiredChallengeRef.current = null;
      setChallenge(payload);
    } finally {
      setIsCreatingChallenge(false);
    }
  };

  const loginWithPasskey = async () => {
    setIsPasskeyLoading(true);
    const toastId = showToast({
      title: t('states.passkeyStarting'),
      variant: 'loading',
    });

    try {
      const optionsResponse = await fetch('/api/auth/passkeys/options/login', {
        method: 'POST',
        cache: 'no-store',
      });
      const optionsPayload = (await optionsResponse.json()) as {
        options?: PublicKeyCredentialRequestOptionsJSON;
      };

      if (!optionsResponse.ok || !optionsPayload.options) {
        updateToast(toastId, {
          title: t('states.passkeyUnavailable'),
          variant: 'error',
        });
        return;
      }

      const credential = await startAuthentication({ optionsJSON: optionsPayload.options });
      const loginResponse = await fetch('/api/auth/passkeys/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
        cache: 'no-store',
      });

      if (!loginResponse.ok) {
        updateToast(toastId, {
          title: t('states.passkeyFailed'),
          variant: 'error',
        });
        return;
      }

      await refresh();
      updateToast(toastId, {
        title: t('states.loginSuccess'),
        variant: 'success',
      });
      router.replace('/account');
    } catch (error) {
      updateToast(toastId, {
        title: t(passkeyAuthenticationErrorMessageKey(error)),
        variant: 'info',
      });
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  return (
    <div className="auth-login-page">
      <div className="auth-login-backdrop" aria-hidden="true" />
      <main className="auth-login-stage">
        <section className="auth-login-copy">
          <div className="auth-login-mark">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1>{t('title')}</h1>
          <p>{t('subtitle')}</p>
        </section>

        <fieldset className="auth-login-methods">
          <legend className="sr-only">{t('title')}</legend>
          <button
            type="button"
            className="auth-login-method auth-login-method--primary"
            disabled={isCreatingChallenge || isCompletingChallenge}
            onClick={createChallenge}
          >
            <span className="auth-login-method__icon">
              {isCreatingChallenge ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Gamepad2 className="h-5 w-5" />
              )}
            </span>
            <span className="auth-login-method__copy">
              <strong>{t('minecraft.title')}</strong>
              <span>{t('minecraft.description')}</span>
            </span>
            <ArrowRight className="auth-login-method__arrow h-4 w-4" />
          </button>

          <button
            type="button"
            className="auth-login-method"
            disabled={isPasskeyLoading}
            onClick={loginWithPasskey}
          >
            <span className="auth-login-method__icon">
              {isPasskeyLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <KeyRound className="h-5 w-5" />
              )}
            </span>
            <span className="auth-login-method__copy">
              <strong>{t('passkey.title')}</strong>
              <span>{t('passkey.description')}</span>
            </span>
            <ArrowRight className="auth-login-method__arrow h-4 w-4" />
          </button>
        </fieldset>

        {authenticated ? (
          <Link className="auth-login-account-link" href="/account">
            {t('actions.account')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </main>

      {challenge ? (
        <div className="auth-login-code-overlay" role="presentation">
          <div
            className="auth-login-code-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-login-code-title"
          >
            <button
              type="button"
              className="auth-login-code-close"
              aria-label="Close"
              onClick={() => setChallenge(null)}
            >
              <X className="h-4 w-4" />
            </button>
            <div className="auth-login-code-head">
              <span>
                <Gamepad2 className="h-4 w-4" />
              </span>
              <strong id="auth-login-code-title">{t('codePanel.title')}</strong>
            </div>
            <button
              type="button"
              className="auth-login-code-value"
              aria-label={t('codePanel.copyLabel')}
              title={t('codePanel.copyLabel')}
              onClick={() => void copyLoginCommand(challenge.displayCode)}
            >
              <span className="auth-login-code-command">/weblogin</span>
              <span className="auth-login-code-number">{challenge.displayCode}</span>
            </button>
            <time dateTime={challenge.expiresAt}>
              {t('codePanel.remaining', { time: formatRemainingTime(remainingSeconds) })}
            </time>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function passkeyAuthenticationErrorMessageKey(error: unknown): `states.${string}` {
  const code = readErrorCode(error);
  if (code === 'ERROR_INVALID_DOMAIN' || code === 'ERROR_INVALID_RP_ID') {
    return 'states.passkeyDomainMismatch';
  }
  if (error instanceof Error && error.message === 'WebAuthn is not supported in this browser') {
    return 'states.passkeyBrowserUnsupported';
  }
  return 'states.passkeyCancelled';
}

function readErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return '';
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : '';
}

function formatRemainingTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
