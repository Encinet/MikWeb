'use client';

export function Switch({
  label,
  checked,
  onChange,
  disabled,
  describedBy,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  describedBy?: string;
}) {
  return (
    <label className="ui-switch">
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        aria-describedby={describedBy}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span aria-hidden="true" />
    </label>
  );
}
