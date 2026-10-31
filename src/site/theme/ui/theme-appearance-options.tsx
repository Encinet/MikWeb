'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';

const modes = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
] as const;

export function ThemeAppearanceOptions({ id }: { id: string }) {
  const t = useTranslations('nav.theme');
  const { theme, setTheme } = useTheme();
  return (
    <fieldset className="appearance-section">
      <legend>{t('displayMode')}</legend>
      <div className="appearance-mode-options">
        {modes.map(({ value, icon: Icon }) => (
          <label key={value} className="appearance-mode-option">
            <input
              className="sr-only"
              type="radio"
              name={`${id}-mode`}
              value={value}
              checked={theme === value}
              onChange={() => setTheme(value)}
            />
            <span>
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{t(value)}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
