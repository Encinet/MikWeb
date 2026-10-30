'use client';

import type { LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

export interface InlineFeedbackValue {
  message: string;
  kind: 'info' | 'success' | 'error' | 'loading';
}

export function InlineFeedback({
  value,
  className,
}: {
  value?: InlineFeedbackValue | null;
  className?: string;
}) {
  return (
    <div
      className={joinClassNames('inline-feedback', className)}
      data-kind={value?.kind}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {value?.message}
    </div>
  );
}

interface SkeletonLineProps {
  className?: string;
  height?: number | string;
  style?: CSSProperties;
  tone?: 'default' | 'soft';
  width?: number | string;
}

export function SkeletonLine({
  className,
  height = '0.75rem',
  style,
  tone = 'default',
  width = '100%',
}: SkeletonLineProps) {
  return (
    <div
      className={joinClassNames('rounded-full', className)}
      style={{
        width,
        height,
        background:
          tone === 'soft' ? 'var(--theme-surface-glass-light)' : 'var(--theme-surface-icon)',
        ...style,
      }}
    />
  );
}

interface SectionMessageProps {
  body: string;
  className?: string;
  icon: LucideIcon;
  iconClassName?: string;
  iconColor?: string;
  title?: string;
}

export function SectionMessage({
  body,
  className,
  icon: Icon,
  iconClassName,
  iconColor = 'var(--theme-text-muted)',
  title,
}: SectionMessageProps) {
  return (
    <div className={joinClassNames('py-20 text-center', className)}>
      <Icon
        className={joinClassNames('mx-auto mb-4 h-16 w-16', iconClassName)}
        style={{ color: iconColor }}
      />
      {title ? (
        <p className="mb-2 text-lg font-semibold" style={{ color: 'var(--theme-text-heading)' }}>
          {title}
        </p>
      ) : null}
      <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>
        {body}
      </p>
    </div>
  );
}
