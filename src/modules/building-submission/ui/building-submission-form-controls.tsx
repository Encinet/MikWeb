'use client';

import { Check } from 'lucide-react';
import { useId } from 'react';
import type { BuildingSubmission } from '@/modules/building-submission/model/building-submission-types';

export function Section({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <section
      className={
        className ? `building-submission-section ${className}` : 'building-submission-section'
      }
    >
      <h2>{title}</h2>
      <div className="building-submission-section__grid">{children}</div>
    </section>
  );
}

export function TextField({
  className,
  label,
  onChange,
  required = false,
  type = 'text',
  value,
}: {
  className?: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  const id = useId();
  return (
    <div
      className={className ? `building-submission-field ${className}` : 'building-submission-field'}
    >
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function TextArea({
  label,
  onChange,
  required = false,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  value: string;
}) {
  const id = useId();
  return (
    <div className="building-submission-field building-submission-field--wide">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function StatusBadge({
  label,
  status,
}: {
  label: string;
  status: BuildingSubmission['status'];
}) {
  return (
    <span className={`building-submission-status building-submission-status--${status}`}>
      {status === 'approved' ? <Check className="h-3.5 w-3.5" /> : null}
      {label}
    </span>
  );
}
