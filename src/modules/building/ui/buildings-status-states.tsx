import { Building2 } from 'lucide-react';

import { SectionMessage } from '@/shared/ui/feedback/async-state';
import { LoadingState } from '@/shared/ui/feedback/loading-state';

export function BuildingsLoadingState({ message }: { message: string }) {
  return <LoadingState message={message} variant="page" />;
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
