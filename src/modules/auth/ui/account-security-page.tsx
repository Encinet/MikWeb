'use client';

import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';
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
import { useCallback, useEffect, useState } from 'react';
import type { AccountSecurityResponse } from '@/modules/auth/model/auth-types';
import { isAccountSecurityResponse } from '@/modules/auth/model/auth-types';
import { useAuth } from '@/modules/auth/model/use-auth';
import { AccountLayout } from '@/modules/auth/ui/account-layout';
import {
  clearFetchValidatedJsonBrowserCache,
  fetchValidatedJson,
} from '@/shared/api/fetch-validated-json';

const SECURITY_CACHE_TTL_MS = 60_000;

export function AccountSecurityPage() {
  const t = useTranslations('auth.security');
  const locale = useLocale();
  const { account, authenticated, refresh } = useAuth();
  const [security, setSecurity] = useState<AccountSecurityResponse | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadSecurity = useCallback(
    async (options: { force?: boolean } = {}) => {
      if (!account) {
        setSecurity(null);
        return;
      }
      const result = await fetchValidatedJson({
        url: '/api/account/security',
        request: { method: 'POST' },
        cache: 'no-store',
        validate: isAccountSecurityResponse,
        timeoutMs: 8000,
        browserCache: {
          force: options.force,
          key: accountSecurityCacheKey(account.playerUuid),
          ttlMs: SECURITY_CACHE_TTL_MS,
        },
        fallbackErrorMessage: 'Failed to load account security',
      });
      if (result.status === 'success') {
        setSecurity(result.data);
        return;
      }
      setSecurity((current) => current);
    },
    [account],
  );

  useEffect(() => {
    if (authenticated && account) {
      void loadSecurity();
      return;
    }
    setSecurity(null);
  }, [account, authenticated, loadSecurity]);

  const registerPasskey = async () => {
    setIsMutating(true);
    setMessage(null);
    try {
      const optionsResponse = await fetch('/api/auth/passkeys/options/register', {
        method: 'POST',
        cache: 'no-store',
      });
      const optionsPayload = (await optionsResponse.json()) as {
        options?: PublicKeyCredentialCreationOptionsJSON;
      };

      if (!optionsResponse.ok || !optionsPayload.options) {
        setMessage(t('states.unavailable'));
        return;
      }

      const credential = await startRegistration({ optionsJSON: optionsPayload.options });
      const registerResponse = await fetch('/api/auth/passkeys/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential,
          displayName: t('passkey.defaultName'),
        }),
        cache: 'no-store',
      });

      if (!registerResponse.ok) {
        setMessage(t('states.registerFailed'));
        return;
      }

      if (account) {
        clearFetchValidatedJsonBrowserCache({ key: accountSecurityCacheKey(account.playerUuid) });
      }
      await Promise.all([loadSecurity({ force: true }), refresh()]);
      setMessage(t('states.registered'));
    } catch (error) {
      setMessage(t(passkeyRegistrationErrorMessageKey(error)));
    } finally {
      setIsMutating(false);
    }
  };

  const deletePasskey = async (credentialId: string) => {
    setIsMutating(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/auth/passkeys/${encodeURIComponent(credentialId)}`, {
        method: 'DELETE',
        cache: 'no-store',
      });

      if (!response.ok) {
        setMessage(t('states.deleteFailed'));
        return;
      }

      if (security) {
        clearFetchValidatedJsonBrowserCache({
          key: accountSecurityCacheKey(security.account.playerUuid),
        });
      }
      await Promise.all([loadSecurity({ force: true }), refresh()]);
      setMessage(t('states.deleted'));
    } finally {
      setIsMutating(false);
    }
  };

  const revokeSession = async (sessionId: string) => {
    setIsMutating(true);
    setMessage(null);
    try {
      const response = await fetch('/api/account/sessions/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetSessionId: sessionId }),
        cache: 'no-store',
      });

      if (!response.ok) {
        setMessage(t('states.revokeSessionFailed'));
        return;
      }

      if (security) {
        clearFetchValidatedJsonBrowserCache({
          key: accountSecurityCacheKey(security.account.playerUuid),
        });
      }
      await loadSecurity({ force: true });
      setMessage(t('states.sessionRevoked'));
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <AccountLayout>
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
                onClick={() => void deletePasskey(passkey.credentialId)}
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

        {message ? <div className="account-inline-message">{message}</div> : null}
      </section>
    </AccountLayout>
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

function accountSecurityCacheKey(playerUuid: string): string {
  return `account:security:${playerUuid}`;
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
