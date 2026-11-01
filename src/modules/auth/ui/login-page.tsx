'use client';

import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser';
import { startAuthentication } from '@simplewebauthn/browser';
import { ArrowRight, Check, Copy, Gamepad2, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/modules/auth/model/use-auth';
import { useCopyFeedback } from '@/shared/hooks/use-copy-feedback';
import { Link, useRouter } from '@/shared/i18n/routing';
import { AppDialog } from '@/shared/ui/dialog/app-dialog';
import type { InlineFeedbackValue } from '@/shared/ui/feedback/async-state';
import { InlineFeedback } from '@/shared/ui/feedback/async-state';

interface LoginChallenge {
  challengeId: string;
  displayCode: string;
  expiresAt: string;
}

export function LoginPage() {
  const t = useTranslations('auth.login');
  const router = useRouter();
  const { authenticated, refresh } = useAuth();
  const [feedback, setFeedback] = useState<InlineFeedbackValue | null>(null);
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null);
  const command = challenge ? `/weblogin ${challenge.displayCode}` : '';
  const { status: copyStatus, copying, copy } = useCopyFeedback(command);
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
      setFeedback({ message: t('states.expired'), kind: 'error' });
    },
    [t],
  );

  const finishLogin = useCallback(async () => {
    if (!(await refresh())) return false;
    setChallenge(null);
    setFeedback({ message: t('states.loginSuccess'), kind: 'success' });
    router.replace(loginDestination());
    return true;
  }, [refresh, router, t]);

  const completeChallenge = useCallback(
    async (challengeId: string) => {
      if (completingChallengeRef.current) {
        return;
      }

      completingChallengeRef.current = true;
      setIsCompletingChallenge(true);
      setFeedback({
        message: t('states.completing'),
        kind: 'loading',
      });

      try {
        const response = await fetch(
          `/api/auth/challenges/${encodeURIComponent(challengeId)}/complete`,
          {
            method: 'POST',
            cache: 'no-store',
            signal: AbortSignal.timeout(10_000),
          },
        );

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          const terminal =
            response.status >= 400 && response.status < 500 && response.status !== 429;
          if (terminal) setChallenge(null);
          setFeedback({
            message: t(
              payload.error === 'member_required'
                ? 'states.memberRequired'
                : response.status === 429
                  ? 'states.rateLimited'
                  : 'states.loginFailed',
            ),
            kind: 'error',
          });
          return terminal;
        }

        if (await finishLogin()) return true;
        setChallenge(null);
        setFeedback({ message: t('states.loginFailed'), kind: 'error' });
        return true;
      } catch {
        setFeedback({ message: t('states.loginFailed'), kind: 'error' });
        return false;
      } finally {
        setIsCompletingChallenge(false);
        completingChallengeRef.current = false;
      }
    },
    [finishLogin, t],
  );

  useEffect(() => {
    if (!challenge) return;
    let cancelled = false;
    let inFlight = false;
    let attempts = 0;
    let timer: number | undefined;
    const abort = new AbortController();
    const poll = async () => {
      if (cancelled || inFlight || document.visibilityState === 'hidden') return;
      inFlight = true;
      let finished = false;
      let delay = Math.min(10_000, 5000 + attempts * 2500);
      try {
        const response = await fetch(
          `/api/auth/challenges/${encodeURIComponent(challenge.challengeId)}`,
          {
            cache: 'no-store',
            signal: abort.signal,
          },
        );
        const payload = (await response.json().catch(() => null)) as { status?: string } | null;
        if (cancelled) return;
        if (!response.ok) {
          delay = Math.max(
            delay,
            Math.min(60_000, Number(response.headers.get('retry-after')) * 1000 || 10_000),
          );
          if (response.status === 404 || response.status === 403) {
            finished = true;
            expireChallenge(challenge.challengeId);
          }
        } else if (payload?.status === 'confirmed') {
          finished = (await completeChallenge(challenge.challengeId)) === true;
        } else if (['expired', 'not_found', 'consumed'].includes(payload?.status ?? '')) {
          finished = true;
          expireChallenge(challenge.challengeId);
        }
      } catch {
        delay = 10_000;
      } finally {
        inFlight = false;
        attempts += 1;
        if (!cancelled && !finished && !document.hidden) timer = window.setTimeout(poll, delay);
      }
    };
    const resume = () => {
      if (document.visibilityState !== 'hidden') {
        window.clearTimeout(timer);
        void poll();
      }
    };
    timer = window.setTimeout(poll, 2500);
    document.addEventListener('visibilitychange', resume);
    return () => {
      cancelled = true;
      abort.abort();
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', resume);
    };
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

  const createChallenge = async () => {
    setFeedback(null);
    setIsCreatingChallenge(true);
    try {
      const response = await fetch('/api/auth/challenges', {
        method: 'POST',
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      const payload = (await response.json()) as LoginChallenge;

      if (!response.ok) {
        setFeedback({ message: t('states.unavailable'), kind: 'error' });
        return;
      }

      expiredChallengeRef.current = null;
      setChallenge(payload);
    } catch {
      setFeedback({ message: t('states.unavailable'), kind: 'error' });
    } finally {
      setIsCreatingChallenge(false);
    }
  };

  const loginWithPasskey = async () => {
    setChallenge(null);
    setIsPasskeyLoading(true);
    setFeedback({
      message: t('states.passkeyStarting'),
      kind: 'loading',
    });

    try {
      const optionsResponse = await fetch('/api/auth/passkeys/options/login', {
        method: 'POST',
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      const optionsPayload = (await optionsResponse.json()) as {
        options?: PublicKeyCredentialRequestOptionsJSON;
      };

      if (!optionsResponse.ok || !optionsPayload.options) {
        setFeedback({
          message: t('states.passkeyUnavailable'),
          kind: 'error',
        });
        return;
      }

      let credential: AuthenticationResponseJSON;
      try {
        credential = await startAuthentication({ optionsJSON: optionsPayload.options });
      } catch (error) {
        setFeedback({ message: t(passkeyAuthenticationErrorMessageKey(error)), kind: 'info' });
        return;
      }
      const loginResponse = await fetch('/api/auth/passkeys/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });

      if (!loginResponse.ok) {
        setFeedback({
          message: t('states.passkeyFailed'),
          kind: 'error',
        });
        return;
      }

      if (!(await finishLogin())) {
        setFeedback({ message: t('states.loginFailed'), kind: 'error' });
      }
    } catch {
      setFeedback({ message: t('states.passkeyFailed'), kind: 'error' });
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  return (
    <div className="auth-login-page">
      <div className="auth-login-backdrop" aria-hidden="true" />
      <div className="auth-login-stage">
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
            disabled={isCreatingChallenge || isCompletingChallenge || isPasskeyLoading}
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
            disabled={isPasskeyLoading || isCreatingChallenge || isCompletingChallenge}
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

        <InlineFeedback value={challenge ? null : feedback} className="auth-login-feedback" />

        {authenticated ? (
          <Link className="auth-login-account-link" href="/account">
            {t('actions.account')}
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>

      <AppDialog
        isOpen={Boolean(challenge)}
        onClose={() => setChallenge(null)}
        title={t('codePanel.title')}
        icon={<Gamepad2 className="h-5 w-5" />}
        className="auth-login-code-dialog"
        descriptionId="auth-login-code-description"
      >
        {challenge ? (
          <>
            <p className="auth-login-code-description" id="auth-login-code-description">
              {t('codePanel.instructions')}
            </p>
            <button
              type="button"
              className="auth-login-code-value"
              aria-label={t('codePanel.copyLabel')}
              aria-describedby="auth-login-copy-feedback"
              aria-busy={copying || undefined}
              disabled={copying}
              onClick={() => void copy()}
            >
              <span className="auth-login-code-command">/weblogin</span>{' '}
              <span className="auth-login-code-number">{challenge.displayCode}</span>
              {copyStatus === 'copied' ? (
                <Check className="auth-login-code-copy h-5 w-5" aria-hidden="true" />
              ) : (
                <Copy className="auth-login-code-copy h-5 w-5" aria-hidden="true" />
              )}
            </button>
            <div className="auth-login-code-footer">
              <span
                id="auth-login-copy-feedback"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {copyStatus === 'copied'
                  ? t('states.copied')
                  : copyStatus === 'error'
                    ? t('codePanel.copyFailed')
                    : t('codePanel.copyHint')}
              </span>
              <time dateTime={challenge.expiresAt}>
                {t('codePanel.remaining', { time: formatRemainingTime(remainingSeconds) })}
              </time>
            </div>
            <InlineFeedback value={feedback} />
          </>
        ) : null}
      </AppDialog>
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

function loginDestination(): '/account' | '/account/security' {
  return new URLSearchParams(window.location.search).get('next') === 'security'
    ? '/account/security'
    : '/account';
}
