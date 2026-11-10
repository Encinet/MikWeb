interface ProgressRingProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/** Decorative activity indicator; its surrounding control or status supplies the label. */
export function ProgressRing({ className = '', size = 'md' }: ProgressRingProps) {
  return (
    <svg
      className={`progress-ring progress-ring--${size} ${className}`.trim()}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="16" cy="16" r="13" pathLength="100" />
    </svg>
  );
}

export function LoadingState({
  message,
  variant = 'section',
  className = '',
}: {
  message: string;
  variant?: 'page' | 'section' | 'inline';
  className?: string;
}) {
  return (
    <div
      className={`loading-state loading-state--${variant} ${className}`.trim()}
      role="status"
      aria-atomic="true"
    >
      <ProgressRing size={variant === 'page' ? 'lg' : variant === 'inline' ? 'sm' : 'md'} />
      <span className="loading-state__label">{message}</span>
    </div>
  );
}
