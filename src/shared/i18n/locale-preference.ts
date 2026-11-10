import type { AppLocale } from './routing';
import { isRoutingLocale, routing } from './routing';

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
  if (locale && isRoutingLocale(locale)) return locale;
  if (cookie && isRoutingLocale(cookie)) return cookie;
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
      const exact = routing.locales.find(
        (candidate) => candidate.toLowerCase() === requested.baseName.toLowerCase(),
      );
      const related = routing.locales.find(
        (candidate) => new Intl.Locale(candidate).language === requested.language,
      );
      if (exact || related) return exact ?? related ?? routing.defaultLocale;
    } catch {
      /* Ignore malformed language ranges. */
    }
  }
  return routing.defaultLocale;
}
