'use client';

import type {
  PublicKeyCredentialCreationOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser';
import { startRegistration } from '@simplewebauthn/browser';
import {
  KeyRound,
  Loader2,
  LogOut,
  MonitorSmartphone,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AccountSecurityResponse } from '@/modules/auth/model/auth-types';
import { isAccountSecurityResponse } from '@/modules/auth/model/auth-types';
import { useAuth } from '@/modules/auth/model/use-auth';
import { AccountLayout } from '@/modules/auth/ui/account-layout';
import {
  clearFetchValidatedJsonBrowserCache,
  fetchValidatedJson,
} from '@/shared/api/fetch-validated-json';
import { Link } from '@/shared/i18n/routing';
import { AppDialog } from '@/shared/ui/dialog/app-dialog';

const SECURITY_CACHE_TTL_MS = 60_000;

export function AccountSecurityPage() {
  const { account } = useAuth();
  return (
    <AccountLayout>
      {account ? (
        <AccountSecurity key={account.playerUuid} playerUuid={account.playerUuid} />
      ) : null}
    </AccountLayout>
  );
}

function AccountSecurity({ playerUuid }: { playerUuid: string }) {
  const t = useTranslations('auth.security');
  const locale = useLocale();
  const { refresh, logout } = useAuth();
  const [security, setSecurity] = useState<AccountSecurityResponse | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [reauthentication, setReauthentication] = useState(false);
  const [confirmation, setConfirmation] = useState<
    { type: 'delete-passkey'; credentialId: string } | { type: 'sign-out-all' } | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);

  const cacheKey = `account:security:${playerUuid}`;
  const accountGeneration = useRef(0);
  useEffect(
    () => () => {
      accountGeneration.current++;
    },
    [],
  );

  const loadSecurity = useCallback(
    async (options: { force?: boolean } = {}) => {
      const generation = accountGeneration.current;
      const result = await fetchValidatedJson({
        url: '/api/account/security',
        request: { method: 'POST' },
        cache: 'no-store',
        validate: (value): value is AccountSecurityResponse =>
          isAccountSecurityResponse(value) && value.account.playerUuid === playerUuid,
        timeoutMs: 8000,
        browserCache: {
          force: options.force,
          key: cacheKey,
          ttlMs: SECURITY_CACHE_TTL_MS,
        },
        fallbackErrorMessage: 'Failed to load account security',
      });
      if (generation !== accountGeneration.current) return false;
      if (result.status === 'success') {
        setSecurity(result.data);
        return true;
      }
      setMessage(t('states.loadFailed'));
      return false;
    },
    [playerUuid, cacheKey, t],
  );

  useEffect(() => {
    void loadSecurity();
  }, [loadSecurity]);

  const refreshSecurity = async (generation: number) => {
    clearFetchValidatedJsonBrowserCache({ key: cacheKey });
    try {
      const refreshed = await refresh();
      if (
        !refreshed ||
        refreshed.playerUuid !== playerUuid ||
        generation !== accountGeneration.current
      )
        return false;
      const loaded = await loadSecurity({ force: true });
      return loaded && generation === accountGeneration.current;
    } catch {
      if (generation === accountGeneration.current) setMessage(t('states.loadFailed'));
      return false;
    }
  };

  const registerPasskey = async () => {
    const generation = accountGeneration.current;
    setIsMutating(true);
    setMessage(null);
    try {
      const optionsResponse = await fetch('/api/auth/passkeys/options/register', {
        method: 'POST',
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      const optionsPayload = (await optionsResponse.json()) as {
        options?: PublicKeyCredentialCreationOptionsJSON;
        error?: string;
      };
      if (generation !== accountGeneration.current) return;

      if (!optionsResponse.ok || !optionsPayload.options) {
        setReauthentication(optionsPayload.error === 'reauthentication_required');
        setMessage(
          t(
            optionsPayload.error === 'reauthentication_required'
              ? 'states.reauthenticationRequired'
              : optionsPayload.error === 'passkey_limit'
                ? 'states.passkeyLimit'
                : 'states.unavailable',
          ),
        );
        return;
      }

      let credential: RegistrationResponseJSON;
      try {
        credential = await startRegistration({ optionsJSON: optionsPayload.options });
      } catch (error) {
        if (generation === accountGeneration.current) {
          setMessage(t(passkeyRegistrationErrorMessageKey(error)));
        }
        return;
      }
      if (generation !== accountGeneration.current) return;
      const registerResponse = await fetch('/api/auth/passkeys/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential,
          displayName: t('passkey.defaultName'),
        }),
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });

      if (generation !== accountGeneration.current) return;
      if (!registerResponse.ok) {
        const error = (await registerResponse.json().catch(() => ({}))) as { error?: string };
        setReauthentication(error.error === 'reauthentication_required');
        setMessage(
          t(
            error.error === 'reauthentication_required'
              ? 'states.reauthenticationRequired'
              : 'states.registerFailed',
          ),
        );
        return;
      }

      if (await refreshSecurity(generation)) setMessage(t('states.registered'));
    } catch {
      if (generation !== accountGeneration.current) return;
      setMessage(t('states.registerFailed'));
    } finally {
      if (generation === accountGeneration.current) setIsMutating(false);
    }
  };

  const deletePasskey = async (credentialId: string) => {
    const generation = accountGeneration.current;
    setIsMutating(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/auth/passkeys/${encodeURIComponent(credentialId)}`, {
        method: 'DELETE',
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });

      if (generation !== accountGeneration.current) return;
      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as { error?: string };
        setReauthentication(error.error === 'reauthentication_required');
        setMessage(
          t(
            error.error === 'reauthentication_required'
              ? 'states.reauthenticationRequired'
              : 'states.deleteFailed',
          ),
        );
        return;
      }

      setConfirmation(null);
      setSecurity((current) =>
        current
          ? {
              ...current,
              passkeys: current.passkeys.filter((passkey) => passkey.credentialId !== credentialId),
            }
          : current,
      );
      if (!(await refreshSecurity(generation))) return;
      setMessage(t('states.deleted'));
    } catch {
      if (generation !== accountGeneration.current) return;
      setMessage(t('states.deleteFailed'));
    } finally {
      if (generation === accountGeneration.current) setIsMutating(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    const generation = accountGeneration.current;
    setIsMutating(true);
    setMessage(null);
    try {
      const response = await fetch('/api/account/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetSessionId: sessionId }),
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });

      if (generation !== accountGeneration.current) return;
      if (!response.ok) {
        const error = (await response.json().catch(() => ({}))) as { error?: string };
        setReauthentication(error.error === 'reauthentication_required');
        setMessage(
          t(
            error.error === 'reauthentication_required'
              ? 'states.reauthenticationRequired'
              : 'states.revokeSessionFailed',
          ),
        );
        return;
      }

      clearFetchValidatedJsonBrowserCache({ key: cacheKey });
      if (!(await loadSecurity({ force: true })) || generation !== accountGeneration.current)
        return;
      setMessage(t('states.sessionRevoked'));
    } catch {
      if (generation !== accountGeneration.current) return;
      setMessage(t('states.revokeSessionFailed'));
    } finally {
      if (generation === accountGeneration.current) setIsMutating(false);
    }
  };

  const signOutAllSessions = async () => {
    const generation = accountGeneration.current;
    setIsMutating(true);
    setMessage(null);
    try {
      await logout({ allSessions: true });
    } catch (error) {
      if (generation !== accountGeneration.current) return;
      const needsAuthentication =
        error instanceof Error && error.message === 'reauthentication_required';
      setReauthentication(needsAuthentication);
      setMessage(
        t(needsAuthentication ? 'states.reauthenticationRequired' : 'states.revokeSessionFailed'),
      );
    } finally {
      if (generation === accountGeneration.current) setIsMutating(false);
    }
  };

  const deletingPasskey = confirmation?.type === 'delete-passkey';
  const confirmationLabel = t(deletingPasskey ? 'actions.delete' : 'actions.signOutAllSessions');

  return (
    <>
      <section className="account-detail-panel">
        <div className="account-detail-panel__header">
          <div className="account-detail-panel__title">
            <span>
              <MonitorSmartphone className="h-4 w-4" />
            </span>
            <div>
              <h1>{t('sections.sessions')}</h1>
              <p>{t('session.description')}</p>
            </div>
          </div>
          <button
            type="button"
            className="account-action-button account-action-button--danger"
            disabled={isMutating || !security?.sessions.length}
            onClick={() => {
              setMessage(null);
              setConfirmation({ type: 'sign-out-all' });
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {t('actions.signOutAllSessions')}
          </button>
        </div>

        <div className="account-settings-list">
          {(security?.sessions ?? []).map((session) => (
            <div key={session.id} className="account-setting-row">
              <div className="account-setting-row__label">
                <span>
                  <MonitorSmartphone className="h-5 w-5" />
                </span>
                <div>
                  <strong>
                    {t(`session.method.${session.authMethod}`)}
                    {session.current ? (
                      <em className="account-setting-row__pill">{t('session.current')}</em>
                    ) : null}
                  </strong>
                  <small>
                    {t('session.lastSeenAt', { time: formatDate(session.lastSeenAt, locale) })}
                  </small>
                  <small>
                    {t('session.expiresAt', { time: formatDate(session.idleExpiresAt, locale) })}
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="account-action-button account-action-button--danger"
                disabled={isMutating || session.current}
                onClick={() => void revokeSession(session.id)}
              >
                <LogOut className="h-4 w-4" />
                {session.current ? t('session.current') : t('actions.revokeSession')}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="account-detail-panel">
        <div className="account-detail-panel__header">
          <div className="account-detail-panel__title">
            <span>
              <ShieldCheck className="h-4 w-4" />
            </span>
            <div>
              <h1>{t('sections.passkeys')}</h1>
              <p>{t('passkey.description')}</p>
            </div>
          </div>
          <button
            type="button"
            className="account-action-button account-action-button--primary"
            disabled={isMutating}
            onClick={registerPasskey}
          >
            {isMutating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {t('actions.addPasskey')}
          </button>
        </div>

        <div className="account-settings-list">
          {(security?.passkeys ?? []).map((passkey) => (
            <div key={passkey.credentialId} className="account-setting-row">
              <div className="account-setting-row__label">
                <span>
                  <KeyRound className="h-5 w-5" />
                </span>
                <div>
                  <strong>{passkey.displayName || t('passkey.defaultName')}</strong>
                  <small>
                    {t('passkey.createdAt', { time: formatDate(passkey.createdAt, locale) })}
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="account-action-button account-action-button--danger"
                disabled={isMutating}
                onClick={() =>
                  setConfirmation({ type: 'delete-passkey', credentialId: passkey.credentialId })
                }
              >
                <Trash2 className="h-4 w-4" />
                {t('actions.delete')}
              </button>
            </div>
          ))}

          {security && security.passkeys.length === 0 ? (
            <div className="account-setting-row account-setting-row--empty">
              {t('passkey.empty')}
            </div>
          ) : null}
        </div>

        {message ? (
          <div className="account-inline-message" role="status">
            {message}
          </div>
        ) : null}
        {reauthentication ? (
          <Link href="/login?next=security" className="account-action-button">
            {t('actions.reauthenticate')}
          </Link>
        ) : null}
      </section>
      <AppDialog
        isOpen={confirmation !== null}
        onClose={() => {
          if (!isMutating) setConfirmation(null);
        }}
        title={confirmationLabel}
        icon={
          deletingPasskey ? (
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          ) : (
            <LogOut className="h-5 w-5" aria-hidden="true" />
          )
        }
        descriptionId="security-confirm-description"
      >
        <p id="security-confirm-description">
          {t(deletingPasskey ? 'passkey.deleteConfirmation' : 'session.signOutAllConfirmation')}
        </p>
        {deletingPasskey && security?.passkeys.length === 1 ? (
          <p>{t('passkey.lastKeyWarning')}</p>
        ) : null}
        {reauthentication ? (
          <Link href="/login?next=security">{t('actions.reauthenticate')}</Link>
        ) : null}
        {message ? <p role="status">{message}</p> : null}
        <button
          type="button"
          className="account-action-button"
          disabled={isMutating}
          data-dialog-initial-focus
          onClick={() => setConfirmation(null)}
        >
          {t('actions.cancel')}
        </button>
        <button
          type="button"
          className="account-action-button account-action-button--danger"
          disabled={isMutating}
          aria-busy={isMutating}
          onClick={() => {
            if (!confirmation) return;
            if (confirmation.type === 'delete-passkey')
              void deletePasskey(confirmation.credentialId);
            else void signOutAllSessions();
          }}
        >
          {isMutating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {confirmationLabel}
        </button>
      </AppDialog>
    </>
  );
}

function passkeyRegistrationErrorMessageKey(error: unknown): `states.${string}` {
  const code = readErrorCode(error);
  if (code === 'ERROR_INVALID_DOMAIN' || code === 'ERROR_INVALID_RP_ID') {
    return 'states.domainMismatch';
  }
  if (code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED') {
    return 'states.alreadyRegistered';
  }
  if (
    code === 'ERROR_AUTHENTICATOR_MISSING_DISCOVERABLE_CREDENTIAL_SUPPORT' ||
    code === 'ERROR_AUTHENTICATOR_MISSING_USER_VERIFICATION_SUPPORT'
  ) {
    return 'states.unsupportedAuthenticator';
  }
  if (error instanceof Error && error.message === 'WebAuthn is not supported in this browser') {
    return 'states.browserUnsupported';
  }
  return 'states.cancelled';
}

function readErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return '';
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : '';
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
