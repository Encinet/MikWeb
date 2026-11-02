'use client';

import { KeyRound, Loader2, LogOut, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { AuthAccount } from '@/modules/auth/model/auth-types';
import {
  AuthenticationIdentity,
  AuthenticationProgress,
} from '@/modules/auth/ui/authentication-flow';
import { AppDialog } from '@/shared/ui/dialog/app-dialog';

export type SecurityAction =
  | { type: 'add-passkey'; displayName: string }
  | { type: 'rename'; kind: 'session' | 'passkey'; id: string; displayName: string }
  | { type: 'delete-passkey'; credentialId: string }
  | { type: 'revoke-session'; sessionId: string }
  | { type: 'sign-out-all' };

export function SecurityActionDialog({
  account,
  action,
  busy,
  message,
  targetName,
  passkeyCount,
  onClose,
  onSubmit,
  onClearMessage,
}: {
  account: AuthAccount;
  action: SecurityAction;
  busy: boolean;
  message: string | null;
  targetName: string | null;
  passkeyCount: number;
  onClose: () => void;
  onSubmit: (action: SecurityAction) => void;
  onClearMessage: () => void;
}) {
  const t = useTranslations('auth.security');
  const editingName = action.type === 'add-passkey' || action.type === 'rename';
  const [displayName, setDisplayName] = useState(editingName ? action.displayName : '');
  const actionLabel = t(
    action.type === 'rename'
      ? 'actions.rename'
      : action.type === 'add-passkey'
        ? 'actions.createPasskey'
        : action.type === 'delete-passkey'
          ? 'actions.delete'
          : action.type === 'revoke-session'
            ? 'actions.revokeSession'
            : 'actions.signOutAllSessions',
  );
  return (
    <AppDialog
      isOpen
      dismissible={!busy}
      onClose={onClose}
      title={actionLabel}
      className={`auth-flow-dialog${busy && action.type === 'add-passkey' ? ' auth-flow-dialog--pending' : ''}`}
      icon={
        action.type === 'rename' ? (
          <Pencil className="h-5 w-5" />
        ) : action.type === 'add-passkey' ? (
          <KeyRound className="h-5 w-5" />
        ) : action.type === 'delete-passkey' ? (
          <Trash2 className="h-5 w-5" />
        ) : (
          <LogOut className="h-5 w-5" />
        )
      }
      descriptionId={editingName ? undefined : 'security-confirm-description'}
    >
      {busy && action.type === 'add-passkey' ? (
        <AuthenticationProgress title={t('states.creatingPasskey')} />
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(
              action.type === 'add-passkey' || action.type === 'rename'
                ? { ...action, displayName }
                : action,
            );
          }}
        >
          {action.type === 'add-passkey' ? <AuthenticationIdentity account={account} /> : null}
          {editingName ? (
            <div className="security-name-field">
              <label htmlFor="security-display-name">{t('name.label')}</label>
              <input
                id="security-display-name"
                name="displayName"
                type="text"
                value={displayName}
                maxLength={64}
                autoComplete="off"
                disabled={busy}
                data-dialog-initial-focus
                placeholder={t(
                  action.type === 'rename' && action.kind === 'session'
                    ? 'name.sessionPlaceholder'
                    : 'name.passkeyPlaceholder',
                )}
                aria-invalid={message === t('states.invalidName') || undefined}
                aria-describedby="security-name-hint security-action-message"
                onChange={(event) => {
                  setDisplayName(event.target.value);
                  onClearMessage();
                }}
              />
              <p id="security-name-hint">{t('name.hint')}</p>
            </div>
          ) : null}
          {targetName ? <p className="security-dialog-target">{targetName}</p> : null}
          {!editingName ? (
            <p id="security-confirm-description">
              {t(
                action.type === 'delete-passkey'
                  ? 'passkey.deleteConfirmation'
                  : action.type === 'revoke-session'
                    ? 'session.revokeConfirmation'
                    : 'session.signOutAllConfirmation',
              )}
            </p>
          ) : null}
          {action.type === 'delete-passkey' && passkeyCount === 1 ? (
            <p>{t('passkey.lastKeyWarning')}</p>
          ) : null}
          <p id="security-action-message" className="security-action-message" role="status">
            {message}
          </p>
          <div className="account-dialog-actions">
            <button
              type="button"
              className="ui-action-button"
              disabled={busy}
              data-dialog-initial-focus={!editingName || undefined}
              onClick={onClose}
            >
              {t('actions.cancel')}
            </button>
            <button
              type="submit"
              className={`ui-action-button ui-action-button--${editingName ? 'primary' : 'danger'}`}
              disabled={busy}
              aria-busy={busy}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
              ) : null}
              {action.type === 'rename' ? t('actions.save') : actionLabel}
            </button>
          </div>
        </form>
      )}
    </AppDialog>
  );
}
