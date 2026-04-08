'use client';

import type { LucideIcon } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(' ');
}

interface GlassSkeletonCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function GlassSkeletonCard({ children, className, style }: GlassSkeletonCardProps) {
  return (
    <div
      aria-hidden="true"
      className={joinClassNames('glass-card animate-pulse', className)}
      style={style}
    >
      {children}
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
