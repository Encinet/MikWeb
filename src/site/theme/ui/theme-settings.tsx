'use client';

import { Monitor, Moon, Palette, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import type { CSSProperties, RefObject } from 'react';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHasMounted } from '@/shared/hooks/use-has-mounted';
import { useAccentColor } from '@/site/providers/theme-provider';
import { getAccentProperties, normalizeAccentColor } from '@/site/theme/lib/accent-color';

export function ThemeSettings() {
  const t = useTranslations('nav.theme');
  const { theme, setTheme } = useTheme();
  const mounted = useHasMounted();
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  const close = useCallback(() => setIsOpen(false), []);
  const nextMode = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
  const ThemeIcon = !mounted
    ? Monitor
    : theme === 'light'
      ? Sun
      : theme === 'dark'
        ? Moon
        : Monitor;

  return (
    <>
      <button
        type="button"
        onClick={() => setTheme(nextMode)}
        className="project-theme-toggle ui-nav-link inline-flex items-center py-2"
        title={t(nextMode)}
        aria-label={t(nextMode)}
      >
        <ThemeIcon className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="project-accent-toggle ui-nav-link inline-flex items-center py-2"
        title={t('title')}
        aria-label={t('title')}
        aria-expanded={isOpen}
        aria-controls={isOpen ? id : undefined}
        aria-haspopup="dialog"
      >
        <Palette className="h-4 w-4" aria-hidden="true" />
      </button>
      {isOpen &&
        createPortal(
          <ThemeColorPopover id={id} anchorRef={anchorRef} onClose={close} />,
          document.body,
        )}
    </>
  );
}

function ThemeColorPopover({
  id,
  anchorRef,
  onClose,
}: {
  id: string;
  anchorRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const t = useTranslations('nav.theme');
  const { accentColor, isDailyColor, setAccentColor, resetAccentColor } = useAccentColor();
  const [draft, setDraft] = useState(accentColor);
  const [invalid, setInvalid] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
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

  useLayoutEffect(() => {
    const updatePosition = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      const panel = ref.current;
      if (!anchor || !panel) return;
      setPosition({
        top: Math.max(
          12,
          Math.min(anchor.bottom + 12, window.innerHeight - panel.offsetHeight - 12),
        ),
        left: Math.max(
          12,
          Math.min(anchor.right - panel.offsetWidth, window.innerWidth - panel.offsetWidth - 12),
        ),
      });
    };
    updatePosition();
    ref.current?.querySelector('input')?.focus({ preventScroll: true });
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    setDraft(accentColor);
    setInvalid(false);
    // Keep exact slider positions even when neighboring hues quantize to the same RGB value.
    if (sliderColorRef.current !== accentColor) {
      setHue(Number(getAccentProperties(accentColor)['--theme-seed-hue']));
    }
    sliderColorRef.current = null;
  }, [accentColor]);

  useEffect(() => {
    const isInside = (target: EventTarget | null) =>
      target instanceof Node &&
      (ref.current?.contains(target) || anchorRef.current?.contains(target));
    const dismiss = (event: PointerEvent | FocusEvent) => {
      if (!isInside(event.target)) onClose();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      onClose();
      anchorRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('focusin', dismiss);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('focusin', dismiss);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [anchorRef, onClose]);

  const commitColor = () => {
    const color = normalizeAccentColor(draft);
    setInvalid(!color);
    if (color) {
      setDraft(color);
      if (color !== accentColor) setAccentColor(color);
    }
  };

  return (
    <div
      ref={ref}
      id={id}
      role="dialog"
      aria-labelledby={`${id}-title`}
      className="theme-color-popover"
      style={position}
    >
      <div className="theme-color-popover__heading">
        <h2 id={`${id}-title`}>{t('title')}</h2>
        <button
          type="button"
          className="theme-color-reset"
          disabled={isDailyColor && draft === accentColor}
          onClick={() => {
            setDraft(resetAccentColor());
            setInvalid(false);
          }}
        >
          {t('reset')}
        </button>
      </div>
      <label className="sr-only" htmlFor={`${id}-hue`}>
        {t('hue')}
      </label>
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
      <div className="theme-color-hex">
        <label htmlFor={`${id}-hex`}>HEX</label>
        <span
          className="theme-color-swatch"
          style={{ backgroundColor: accentColor }}
          aria-hidden="true"
        />
        <input
          id={`${id}-hex`}
          type="text"
          value={draft}
          maxLength={7}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-error` : undefined}
          onChange={(event) => {
            const value = event.target.value;
            setDraft(value);
            setInvalid(false);
            // Apply complete six-digit colors immediately; shorter forms commit on Enter/blur.
            if (/^#?[\da-f]{6}$/i.test(value)) setAccentColor(value);
          }}
          onBlur={commitColor}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitColor();
          }}
        />
      </div>
      {invalid && (
        <p id={`${id}-error`} className="theme-color-error" role="status">
          {t('invalidColor')}
        </p>
      )}
    </div>
  );
}
