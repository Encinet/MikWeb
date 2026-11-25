import type { AppLocale } from './routing';
import { isRoutingLocale, routing } from './routing';

const localeCandidates = routing.locales.map((locale) => ({
  locale,
  tag: locale.toLowerCase(),
  language: new Intl.Locale(locale).language,
}));

/** Fallback for documents outside a locale root, including the global 404. */
export function resolveLocalePreference({
  locale,
  cookie,
  acceptLanguage,
}: {
  locale?: string | null;
  cookie?: string | null;
  acceptLanguage?: string | null;
}): AppLocale {
  if (isRoutingLocale(locale)) return locale;
  if (isRoutingLocale(cookie)) return cookie;
  const preferences = (acceptLanguage ?? '')
    .split(',')
    .map((entry) => {
      const [language, ...parameters] = entry.trim().split(';');
      const weight = parameters.map((value) => value.trim()).find((value) => /^q=/i.test(value));
      return { language, quality: weight === undefined ? 1 : Number(weight.slice(2)) };
    })
    .filter(({ quality }) => Number.isFinite(quality) && quality > 0 && quality <= 1)
    .sort((left, right) => right.quality - left.quality);
  for (const { language } of preferences) {
    if (language === '*') return routing.defaultLocale;
    try {
      const requested = new Intl.Locale(language);
      const tag = requested.baseName.toLowerCase();
      const match =
        localeCandidates.find((candidate) => candidate.tag === tag) ??
        localeCandidates.find((candidate) => candidate.language === requested.language);
      if (match) return match.locale;
    } catch {
      /* Ignore malformed language ranges. */
    }
  }
  return routing.defaultLocale;
}
