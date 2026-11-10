'use client';

import { AlertCircle, Check, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ComponentPropsWithRef } from 'react';
import { useCopyFeedback } from '@/shared/hooks/use-copy-feedback';
import { ProgressRing } from '@/shared/ui/feedback/loading-state';

type CopyButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children' | 'onClick'> & {
  value: string;
  label?: string;
  showLabel?: boolean;
  onCopied?: () => void;
};

export function CopyButton({
  className,
  value,
  label,
  showLabel = false,
  onCopied,
  ...buttonProps
}: CopyButtonProps) {
  const t = useTranslations('common');
  const { status, copying, copy } = useCopyFeedback(value);
  const defaultLabel = label ?? buttonProps['aria-label'] ?? t('actions.copy');
  const statusLabel =
    status === 'copied'
      ? t('actions.copied')
      : status === 'error'
        ? t('actions.copyFailed')
        : defaultLabel;

  return (
    <>
      <button
        type="button"
        {...buttonProps}
        disabled={buttonProps.disabled || copying}
        aria-busy={copying || undefined}
        className={[
          'copy-button',
          status === 'copied' ? 'is-copied' : '',
          status === 'error' ? 'is-error' : '',
          showLabel ? 'copy-button--label' : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={async () => {
          if (await copy()) onCopied?.();
        }}
        aria-label={statusLabel}
        title={statusLabel}
      >
        {copying ? (
          <ProgressRing size="sm" className="copy-button__icon" />
        ) : status === 'copied' ? (
          <Check className="copy-button__icon" aria-hidden="true" />
        ) : status === 'error' ? (
          <AlertCircle className="copy-button__icon" aria-hidden="true" />
        ) : (
          <Copy className="copy-button__icon" aria-hidden="true" />
        )}
        {showLabel ? <span>{statusLabel}</span> : null}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {status === 'copied'
          ? t('actions.copied')
          : status === 'error'
            ? t('actions.copyHelp')
            : ''}
      </span>
    </>
  );
}
