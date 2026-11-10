import { Building2 } from 'lucide-react';

import { SectionMessage } from '@/shared/ui/feedback/async-state';

export function BuildingsLoadingState({ message }: { message: string }) {
  return (
    <div className="building-archive-loading" role="status" aria-live="polite">
      <span className="building-archive-loader building-archive-loader--large" aria-hidden="true">
        <span className="building-archive-loader__core" />
      </span>
      <p>{message}</p>
    </div>
  );
}

interface BuildingsStatusMessageProps {
  bodyText: string;
  iconColor: string;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function BuildingsStatusMessage({
  bodyText,
  iconColor,
  title,
  onRetry,
  retryLabel,
}: BuildingsStatusMessageProps) {
  return (
    <div>
      <SectionMessage body={bodyText} icon={Building2} iconColor={iconColor} title={title} />
      {onRetry ? (
        <button type="button" className="building-catalog-retry" onClick={onRetry}>
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}
