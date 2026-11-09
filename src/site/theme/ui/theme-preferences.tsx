'use client';

import { useId } from 'react';
import { useAccentColor } from '@/site/providers/theme-provider';
import { ThemeAppearanceOptions } from '@/site/theme/ui/theme-appearance-options';
import { ThemeColorControls } from '@/site/theme/ui/theme-color-controls';

export function ThemePreferences() {
  const id = useId();
  const { allowCustomAccent } = useAccentColor();
  return (
    <div className="appearance-preferences">
      <ThemeAppearanceOptions id={id} />
      {allowCustomAccent ? <ThemeColorControls id={id} /> : null}
    </div>
  );
}
