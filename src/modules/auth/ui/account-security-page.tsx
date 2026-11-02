'use client';

import type {
  PublicKeyCredentialCreationOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/browser';
import { startRegistration, WebAuthnAbortService } from '@simplewebauthn/browser';
import { KeyRound, Loader2, LogOut, MonitorSmartphone, Plus, RefreshCw } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthRequestError, authRequest } from '@/modules/auth/lib/auth-request';
import { authenticationErrorKey } from '@/modules/auth/lib/authentication-error-key';
import { webAuthnError } from '@/modules/auth/lib/webauthn-error';
import type { AccountSecurityResponse, AuthAccount } from '@/modules/auth/model/auth-types';
import { isAccountSecurityResponse } from '@/modules/auth/model/auth-types';
import { useAuth } from '@/modules/auth/model/use-auth';
import { AccountLayout } from '@/modules/auth/ui/account-layout';
import { ReauthenticationDialog } from '@/modules/auth/ui/reauthentication-dialog';
import type { SecurityAction } from '@/modules/auth/ui/security-action-dialog';
import { SecurityActionDialog } from '@/modules/auth/ui/security-action-dialog';
import { SecurityItem } from '@/modules/auth/ui/security-item';
import {
  clearFetchValidatedJsonBrowserCache,
  fetchValidatedJson,
} from '@/shared/api/fetch-validated-json';
import { hasTranslationKey } from '@/shared/i18n/has-translation-key';
import { useRouter } from '@/shared/i18n/routing';

const SECURITY_CACHE_TTL_MS = 60_000;
interface SecurityDialog {
  step: 'action' | 'verify';
  action: SecurityAction;
}

export function AccountSecurityPage() {
  const { account } = useAuth();
  return (
    <AccountLayout>
      {account ? <AccountSecurity key={account.playerUuid} account={account} /> : null}
    </AccountLayout>
  );
}

function AccountSecurity({ account }: { account: AuthAccount }) {
  const { playerUuid } = account;
  const t = useTranslations('auth.security');
  const commonT = useTranslations('common');
  const authT = useTranslations('auth');
  const authenticationT = useTranslations('auth.authentication.errors');
  const locale = useLocale();
  const router = useRouter();
  const { refresh, logout } = useAuth();
  const [security, setSecurity] = useState<AccountSecurityResponse | null>(null);
  const [running, setRunning] = useState<SecurityAction | null>(null);
  const [dialog, setDialog] = useState<SecurityDialog | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const generation = useRef(0);
  const mutating = useRef(false);
  const securityRequest = useRef(0);
  const ceremony = useRef(false);
  const cacheKey = `account:security:${playerUuid}`;

  useEffect(
    () => () => {
      generation.current++;
      if (ceremony.current) WebAuthnAbortService.cancelCeremony();
    },
    [],
  );

  const loadSecurity = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      const current = generation.current;
      const request = ++securityRequest.current;
      setLoading(true);
      const result = await fetchValidatedJson({
        url: '/api/account/security',
        request: { method: 'POST' },
        cache: 'no-store',
        validate: (value): value is AccountSecurityResponse =>
          isAccountSecurityResponse(value) && value.account.playerUuid === playerUuid,
        timeoutMs: 8000,
        browserCache: { force, key: cacheKey, ttlMs: SECURITY_CACHE_TTL_MS },
        fallbackErrorMessage: 'Failed to load account security',
      });
      if (current !== generation.current || request !== securityRequest.current) return false;
      setLoading(false);
      if (result.status === 'success') {
        setSecurity(result.data);
        return true;
      }
      setMessage(t('states.loadFailed'));
      return false;
    },
    [cacheKey, playerUuid, t],
  );

  useEffect(() => {
    void loadSecurity();
  }, [loadSecurity]);

  const refreshSecurity = async (current: number) => {
    clearFetchValidatedJsonBrowserCache({ key: cacheKey });
    try {
      const refreshed = await refresh();
      if (current !== generation.current || refreshed?.playerUuid !== playerUuid) return;
      await loadSecurity({ force: true });
    } catch {
      if (current === generation.current) setMessage(t('states.loadFailed'));
    }
  };

  const run = async (action: SecurityAction) => {
    if (mutating.current) return;
    if (
      (action.type === 'add-passkey' || action.type === 'rename') &&
      ([...action.displayName.normalize('NFC').trim()].length > 64 ||
        /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(action.displayName))
    ) {
      setMessage(t('states.invalidName'));
      return;
    }
    mutating.current = true;
    const current = generation.current;
    const active = () => current === generation.current;
    setRunning(action);
    setMessage(null);
    try {
      switch (action.type) {
        case 'add-passkey': {
          const payload = await authRequest<{ options: PublicKeyCredentialCreationOptionsJSON }>(
            '/api/auth/passkeys/options/register',
          );
          if (!active()) return;
          if (!payload.options) throw new AuthRequestError('invalid_response', 502);
          ceremony.current = true;
          let credential: RegistrationResponseJSON;
          try {
            credential = await startRegistration({ optionsJSON: payload.options });
          } catch (cause) {
            throw new AuthRequestError(webAuthnError(cause), 400);
          } finally {
            ceremony.current = false;
          }
          if (!active()) return;
          await authRequest('/api/auth/passkeys/register', {
            body: { credential, displayName: action.displayName },
          });
          break;
        }
        case 'rename':
          await authRequest(
            action.kind === 'passkey'
              ? `/api/auth/passkeys/${encodeURIComponent(action.id)}`
              : `/api/account/sessions/${encodeURIComponent(action.id)}`,
            { method: 'PATCH', body: { displayName: action.displayName } },
          );
          break;
        case 'delete-passkey':
          await authRequest(`/api/auth/passkeys/${encodeURIComponent(action.credentialId)}`, {
            method: 'DELETE',
          });
          break;
        case 'revoke-session':
          await authRequest('/api/account/sessions/revoke', {
            body: { targetSessionId: action.sessionId },
          });
          break;
        case 'sign-out-all':
          await logout({ allSessions: true });
          return;
      }
      if (!active()) return;
      setDialog(null);
      setMessage(
        t(
          action.type === 'rename'
            ? 'states.renamed'
            : action.type === 'add-passkey'
              ? 'states.registered'
              : action.type === 'delete-passkey'
                ? 'states.deleted'
                : 'states.sessionRevoked',
        ),
      );
      if (action.type === 'rename') {
        clearFetchValidatedJsonBrowserCache({ key: cacheKey });
        await loadSecurity({ force: true });
      } else await refreshSecurity(current);
    } catch (cause) {
      if (!active()) return;
      const code =
        cause instanceof AuthRequestError
          ? cause.code
          : cause instanceof Error
            ? cause.message
            : 'request_failed';
      const errorKey = authenticationErrorKey(code);
      if (code === 'reauthentication_required') {
        setDialog({ step: 'verify', action });
      } else if (
        code === 'unauthenticated' ||
        (cause instanceof AuthRequestError && cause.status === 401)
      ) {
        router.replace('/login?next=security');
      } else if (code === 'invalid_display_name') setMessage(t('states.invalidName'));
      else if (code === 'passkey_limit') setMessage(t('states.passkeyLimit'));
      else if (hasTranslationKey(authenticationT, errorKey)) setMessage(authenticationT(errorKey));
      else
        setMessage(
          t(
            action.type === 'rename'
              ? 'states.renameFailed'
              : action.type === 'add-passkey'
                ? 'states.registerFailed'
                : action.type === 'delete-passkey'
                  ? 'states.deleteFailed'
                  : 'states.revokeSessionFailed',
          ),
        );
    } finally {
      mutating.current = false;
      if (active()) setRunning(null);
    }
  };

  const openAction = (action: SecurityAction) => {
    setMessage(null);

    setDialog({ step: 'action', action });
  };
  const isMutating = running !== null;
  const visibleDialog = dialog && dialog.step !== 'verify' ? dialog : null;
  const selectedAction = visibleDialog?.action;
  const targetName =
    selectedAction?.type === 'delete-passkey'
      ? security?.passkeys.find((key) => key.credentialId === selectedAction.credentialId)
          ?.displayName || t('passkey.defaultName')
      : selectedAction?.type === 'revoke-session'
        ? security?.sessions.find((session) => session.id === selectedAction.sessionId)
            ?.displayName || t('session.defaultName')
        : null;

  return (
    <>
      <header className="account-page-heading security-page-heading">
        <h1>{t('title')}</h1>
        <button
          type="button"
          className="security-refresh ui-floating-control"
          aria-label={commonT('actions.refresh')}
          title={commonT('actions.refresh')}
          disabled={loading || isMutating}
          onClick={() => {
            setMessage(null);
            void loadSecurity({ force: true });
          }}
        >
          <RefreshCw
            className={`h-4 w-4${loading ? ' motion-safe:animate-spin' : ''}`}
            aria-hidden="true"
          />
        </button>
        {message && !visibleDialog ? (
          <p className="ui-inline-message" role="status">
            {message}
          </p>
        ) : null}
      </header>
      {!security && loading ? (
        <p className="security-loading" role="status">
          {t('states.loading')}
        </p>
      ) : null}
      {security ? (
        <>
          <section className="account-section" aria-labelledby="account-sessions-title">
            <div className="account-section__header">
              <div>
                <h2 id="account-sessions-title">{t('sections.sessions')}</h2>
                <p>{t('session.description')}</p>
              </div>
              <button
                type="button"
                className="ui-action-button ui-action-button--danger"
                disabled={isMutating || !security?.sessions.length}
                onClick={() => openAction({ type: 'sign-out-all' })}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                {t('actions.signOutAllSessions')}
              </button>
            </div>
            <ul className="security-list">
              {security.sessions.map((session) => (
                <SecurityItem
                  key={session.id}
                  name={session.displayName || t('session.defaultName')}
                  icon={<MonitorSmartphone className="h-5 w-5" />}
                  current={session.current}
                  disabled={isMutating}
                  removeLabel={t('actions.revokeSession')}
                  onRename={() =>
                    openAction({
                      type: 'rename',
                      kind: 'session',
                      id: session.id,
                      displayName: session.displayName ?? '',
                    })
                  }
                  onRemove={
                    session.current
                      ? undefined
                      : () => openAction({ type: 'revoke-session', sessionId: session.id })
                  }
                >
                  <p>{t(`session.method.${session.authMethod}`)}</p>
                  <p>
                    <time dateTime={session.lastSeenAt}>
                      {t('session.lastSeenAt', { time: formatDate(session.lastSeenAt, locale) })}
                    </time>
                  </p>
                  <p className="security-item__secondary">
                    <time dateTime={session.idleExpiresAt}>
                      {t('session.expiresAt', { time: formatDate(session.idleExpiresAt, locale) })}
                    </time>
                  </p>
                </SecurityItem>
              ))}
            </ul>
          </section>
          <section className="account-section" aria-labelledby="account-passkeys-title">
            <div className="account-section__header">
              <div>
                <h2 id="account-passkeys-title">{authT('fields.passkeys')}</h2>
                <p>{t('passkey.description')}</p>
              </div>
              <button
                type="button"
                className="ui-action-button ui-action-button--primary"
                disabled={isMutating || !security}
                onClick={() => openAction({ type: 'add-passkey', displayName: '' })}
                aria-busy={running?.type === 'add-passkey' || undefined}
              >
                {running?.type === 'add-passkey' ? (
                  <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="h-4 w-4" aria-hidden="true" />
                )}
                {t('actions.addPasskey')}
              </button>
            </div>
            <ul className="security-list">
              {security.passkeys.map((passkey) => (
                <SecurityItem
                  key={passkey.credentialId}
                  name={passkey.displayName || t('passkey.defaultName')}
                  icon={<KeyRound className="h-5 w-5" />}
                  disabled={isMutating}
                  removeLabel={t('actions.delete')}
                  onRename={() =>
                    openAction({
                      type: 'rename',
                      kind: 'passkey',
                      id: passkey.credentialId,
                      displayName: passkey.displayName ?? '',
                    })
                  }
                  onRemove={() =>
                    openAction({
                      type: 'delete-passkey',
                      credentialId: passkey.credentialId,
                    })
                  }
                >
                  <p>
                    {passkey.lastUsedAt ? (
                      <time dateTime={passkey.lastUsedAt}>
                        {t('passkey.lastUsedAt', { time: formatDate(passkey.lastUsedAt, locale) })}
                      </time>
                    ) : (
                      t('passkey.neverUsed')
                    )}
                  </p>
                  <p className="security-item__secondary">
                    <time dateTime={passkey.createdAt}>
                      {t('passkey.createdAt', { time: formatDate(passkey.createdAt, locale) })}
                    </time>
                  </p>
                </SecurityItem>
              ))}
              {security.passkeys.length === 0 ? (
                <li className="security-empty">{t('passkey.empty')}</li>
              ) : null}
            </ul>
          </section>
        </>
      ) : null}
      {dialog?.step === 'verify' ? (
        <ReauthenticationDialog
          account={security ? { ...account, passkeyCount: security.passkeys.length } : account}
          onClose={() => setDialog(null)}
          onVerified={() => {
            setDialog({
              step: 'action',
              action: dialog.action,
            });
            void loadSecurity({ force: true });
          }}
        />
      ) : null}
      {visibleDialog ? (
        <SecurityActionDialog
          account={account}
          action={visibleDialog.action}
          busy={isMutating}
          message={message}
          targetName={targetName}
          passkeyCount={security?.passkeys.length ?? account.passkeyCount}
          onClose={() => {
            setDialog(null);
            setMessage(null);
          }}
          onSubmit={(action) => void run(action)}
          onClearMessage={() => setMessage(null)}
        />
      ) : null}
    </>
  );
}

function formatDate(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}
