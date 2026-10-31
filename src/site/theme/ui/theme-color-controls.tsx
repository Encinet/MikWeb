'use client';

import { useTranslations } from 'next-intl';
import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAccentColor } from '@/site/providers/theme-provider';
import { getAccentProperties } from '@/site/theme/lib/accent-color';

export function ThemeColorControls({ id }: { id: string }) {
  const t = useTranslations('nav.theme');
  const { accentColor, isDailyColor, setAccentColor, resetAccentColor } = useAccentColor();
  const sliderColorRef = useRef<string | null>(null);
  const [hue, setHue] = useState(() =>
    Number(getAccentProperties(accentColor)['--theme-seed-hue']),
  );
  const hueTrack = useMemo(() => {
    const stops = Array.from(
      { length: 13 },
      (_, index) => getAccentProperties(accentColor, index * 30)['--theme-seed'],
    );
    return `linear-gradient(to right, ${stops.join(', ')})`;
  }, [accentColor]);

  useEffect(() => {
    // Preserve exact slider positions when neighboring hues quantize to the same RGB value.
    if (sliderColorRef.current !== accentColor) {
      setHue(Number(getAccentProperties(accentColor)['--theme-seed-hue']));
    }
    sliderColorRef.current = null;
  }, [accentColor]);

  return (
    <div className="appearance-colors">
      <div className="appearance-colors__label">
        <label htmlFor={`${id}-hue`}>{t('title')}</label>
        <button
          type="button"
          className="appearance-color-reset"
          disabled={isDailyColor}
          onClick={() => {
            const color = resetAccentColor();
            sliderColorRef.current = null;
            setHue(Number(getAccentProperties(color)['--theme-seed-hue']));
          }}
        >
          {t(isDailyColor ? 'daily' : 'reset')}
        </button>
      </div>
      <input
        id={`${id}-hue`}
        className="theme-color-slider"
        style={{ '--theme-hue-track': hueTrack } as CSSProperties}
        type="range"
        min={0}
        max={360}
        step={0.1}
        value={hue}
        aria-valuetext={`${Math.round(hue)}°`}
        onChange={(event) => {
          const value = Number(event.target.value);
          const color = getAccentProperties(accentColor, value)['--theme-seed'];
          setHue(value);
          sliderColorRef.current = color;
          setAccentColor(color);
        }}
      />
    </div>
  );
}
