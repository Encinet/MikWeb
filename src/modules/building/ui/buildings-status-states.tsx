import { Building2 } from 'lucide-react';

import { SectionMessage } from '@/shared/ui/feedback/async-state';

export function BuildingsLoadingState({ message }: { message: string }) {
  return (
    <div className="py-20 text-center">
      <div
        className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"
        style={{ borderColor: 'var(--theme-accent-green-strong)', borderTopColor: 'transparent' }}
      />
      <p className="mt-6 text-base" style={{ color: 'var(--theme-text-muted)' }}>
        {message}
      </p>
    </div>
  );
}

interface BuildingsStatusMessageProps {
  bodyText: string;
  iconColor: string;
  title?: string;
}

export function BuildingsStatusMessage({
  bodyText,
  iconColor,
  title,
}: BuildingsStatusMessageProps) {
  return <SectionMessage body={bodyText} icon={Building2} iconColor={iconColor} title={title} />;
}
