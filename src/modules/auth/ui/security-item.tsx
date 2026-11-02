'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';

export function SecurityItem({
  name,
  icon,
  children,
  current = false,
  disabled,
  onRename,
  onRemove,
  removeLabel,
}: {
  name: string;
  icon: ReactNode;
  children: ReactNode;
  current?: boolean;
  disabled: boolean;
  onRename: () => void;
  onRemove?: () => void;
  removeLabel: string;
}) {
  const t = useTranslations('auth.security');
  return (
    <li className="security-item" data-current={current || undefined}>
      <span className="security-item__icon" aria-hidden="true">
        {icon}
      </span>
      <div className="security-item__copy">
        <div className="security-item__heading">
          <button
            type="button"
            className="security-item__name"
            aria-label={t('actions.renameItem', { name })}
            title={t('actions.rename')}
            disabled={disabled}
            onClick={onRename}
          >
            <span>{name}</span>
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          {current ? <span className="security-item__current">{t('session.current')}</span> : null}
        </div>
        <div className="security-item__details">{children}</div>
      </div>
      {onRemove ? (
        <button
          type="button"
          className="ui-action-button ui-action-button--danger"
          aria-label={`${removeLabel}: ${name}`}
          disabled={disabled}
          onClick={onRemove}
        >
          {removeLabel}
        </button>
      ) : null}
    </li>
  );
}
