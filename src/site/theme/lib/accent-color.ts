import { isJoinPagePath } from '@/modules/join/lib/join-path';
import {
  ACCENT_COLOR_STORAGE_KEY,
  DAILY_ACCENT_CHROMA,
  DEFAULT_ACCENT_COLOR,
} from '@/shared/config/theme-config';

export function normalizeAccentColor(value: string): string | null {
  const hex = value.trim().replace(/^#/, '');
  if (/^[\da-f]{3}$/i.test(hex)) {
    return `#${Array.from(hex, (character) => character.repeat(2)).join('')}`.toLowerCase();
  }
  return /^[\da-f]{6}$/i.test(hex) ? `#${hex.toLowerCase()}` : null;
}

/**
 * OKLab matrices: https://bottosson.github.io/posts/oklab/
 * Reduce chroma at constant hue/lightness to fit sRGB; then verify quantized contrast.
 * Self-contained so SSR, the early head script and live updates use identical math.
 */
export function getAccentProperties(
  color: string,
  hueOverride?: number,
  chromaOverride?: number,
): Record<string, string> {
  type Rgb = [number, number, number];
  const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const linearize = (value: number) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  const parse = (hex: string): Rgb =>
    [1, 3, 5].map((offset) =>
      linearize(Number.parseInt(hex.slice(offset, offset + 2), 16) / 255),
    ) as Rgb;
  const luminance = (hex: string) => {
    const [r, g, b] = parse(hex);
    return r * 0.2126 + g * 0.7152 + b * 0.0722;
  };
  const contrast = (foreground: string, background: string) => {
    const a = luminance(foreground);
    const b = luminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  const ink = (background: string) =>
    contrast('#000000', background) >= contrast('#ffffff', background) ? '#000000' : '#ffffff';
  const [r, g, b] = parse(color);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const seedLightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const labA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const labB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  // Ignore numerical hue noise for white, black and neutral grays.
  const seedChroma = Math.hypot(labA, labB) < 0.002 ? 0 : Math.hypot(labA, labB);
  const hue =
    hueOverride === undefined
      ? seedChroma === 0
        ? 0
        : ((Math.atan2(labB, labA) * 180) / Math.PI + 360) % 360
      : ((hueOverride % 360) + 360) % 360;
  const angle = (hue * Math.PI) / 180;
  const linearRgb = (lightness: number, chroma: number): Rgb => {
    const a = chroma * Math.cos(angle);
    const b = chroma * Math.sin(angle);
    const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
  };
  const inGamut = (rgb: Rgb) =>
    rgb.every((channel) => channel >= -0.0000001 && channel <= 1.0000001);
  const tone = (lightness: number, chroma: number) => {
    let rgb = linearRgb(lightness, chroma);
    if (!inGamut(rgb)) {
      let low = 0;
      let high = chroma;
      for (let step = 0; step < 16; step++) {
        const mid = (low + high) / 2;
        if (inGamut(linearRgb(lightness, mid))) low = mid;
        else high = mid;
      }
      rgb = linearRgb(lightness, low);
    }
    return `#${rgb
      .map((channel) => {
        const value = clamp(channel);
        const encoded = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
        return Math.round(clamp(encoded) * 255)
          .toString(16)
          .padStart(2, '0');
      })
      .join('')}`;
  };
  const accessibleTone = (
    lightness: number,
    chroma: number,
    backgrounds: string[],
    target: number,
    lighter: boolean,
  ) => {
    const passes = (value: number) =>
      backgrounds.every((background) => contrast(tone(value, chroma), background) >= target);
    if (passes(lightness)) return tone(lightness, chroma);
    let fail = lightness;
    let pass = lighter ? 1 : 0;
    for (let step = 0; step < 18; step++) {
      const mid = (fail + pass) / 2;
      if (passes(mid)) pass = mid;
      else fail = mid;
    }
    return tone(pass, chroma);
  };

  const chroma =
    chromaOverride === undefined
      ? hueOverride === undefined
        ? Math.min(seedChroma, 0.19)
        : clamp(seedChroma, 0.12, 0.18)
      : clamp(chromaOverride, 0, 0.19);
  if (hueOverride !== undefined) {
    return { '--theme-seed': tone(0.72, chroma), '--theme-seed-hue': hue.toFixed(2) };
  }
  const neutralChroma = Math.min(chroma * 0.12, 0.016);
  const darkBackground = tone(0.195, neutralChroma);
  const lightBackground = tone(0.955, neutralChroma * 0.6);
  const darkSurfaces = [darkBackground, tone(0.34, neutralChroma)];
  const lightSurfaces = [lightBackground, tone(0.9, neutralChroma * 0.6)];
  const darkFill = tone(clamp(seedLightness, 0.65, 0.78), chroma);
  const lightFill = tone(clamp(seedLightness, 0.42, 0.55), chroma);
  const darkHover = tone(clamp(seedLightness, 0.65, 0.78) + 0.04, chroma);
  const lightHover = tone(clamp(seedLightness, 0.42, 0.55) - 0.04, chroma);
  const darkInk = ink(darkFill);
  const lightInk = ink(lightFill);
  const properties: Record<string, string> = {
    '--theme-seed': color,
    '--theme-seed-hue': hue.toFixed(2),
    '--theme-bg-dark': darkBackground,
    '--theme-neutral-ink': tone(0.23, neutralChroma),
    '--theme-accent-on-dark': accessibleTone(0.8, chroma * 0.85, darkSurfaces, 5, true),
    '--theme-accent-on-light': accessibleTone(0.43, chroma * 0.95, lightSurfaces, 5, false),
    '--palette-dark-accent': darkFill,
    '--palette-light-accent': lightFill,
    '--palette-dark-on-accent': darkInk,
    '--palette-light-on-accent': lightInk,
    '--palette-dark-accent-hover': contrast(darkInk, darkHover) >= 4.5 ? darkHover : darkFill,
    '--palette-light-accent-hover': contrast(lightInk, lightHover) >= 4.5 ? lightHover : lightFill,
    '--palette-dark-bg': darkBackground,
    '--palette-light-bg': lightBackground,
  };
  for (const [name, darkL, lightL] of [
    ['surface-glass', 0.235, 0.985],
    ['surface-glass-light', 0.265, 0.93],
    ['surface-icon', 0.28, 0.925],
    ['surface-code-block', 0.205, 0.925],
    ['surface-modal', 0.225, 0.985],
    ['surface-modal-badge', 0.27, 0.94],
  ] as const) {
    properties[`--palette-dark-${name}`] = tone(darkL, neutralChroma);
    properties[`--palette-light-${name}`] = tone(lightL, neutralChroma * 0.6);
  }
  return properties;
}

/** One shared calendar day in UTC+8, independent of browser/server time zones. */
export function getDailyAccentHue(date = new Date()): number {
  const day = Math.floor((date.getTime() + 8 * 60 * 60 * 1000) / 86_400_000);
  // A golden-angle step distributes successive days around the hue wheel.
  return (day * 137.50776405003785) % 360;
}

export function getDailyAccentColor(date = new Date()): string {
  return getAccentProperties(DEFAULT_ACCENT_COLOR, getDailyAccentHue(date), DAILY_ACCENT_CHROMA)[
    '--theme-seed'
  ];
}

export function getAccentInitializationScript(): string {
  return `{
const palette=(${getAccentProperties.toString()});
const hue=(${getDailyAccentHue.toString()})();
let color=palette(${JSON.stringify(DEFAULT_ACCENT_COLOR)},hue,${DAILY_ACCENT_CHROMA})['--theme-seed'];
let mode='daily';
if(!(${isJoinPagePath.toString()})(location.pathname))try{const saved=localStorage.getItem(${JSON.stringify(ACCENT_COLOR_STORAGE_KEY)});if(saved&&/^#[\\da-f]{6}$/i.test(saved)){color=saved.toLowerCase();mode='custom'}}catch{}
for(const [name,value] of Object.entries(palette(color))){document.documentElement.style.setProperty(name,value)}
document.documentElement.setAttribute('data-accent-mode',mode);
}`;
}
