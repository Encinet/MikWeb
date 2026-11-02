'use client';

import { useId } from 'react';
import { ThemeAppearanceOptions } from '@/site/theme/ui/theme-appearance-options';
import { ThemeColorControls } from '@/site/theme/ui/theme-color-controls';

export function ThemePreferences() {
  const id = useId();
  return (
    <div className="appearance-preferences">
      <ThemeAppearanceOptions id={id} />
      <ThemeColorControls id={id} />
    </div>
  );
}
