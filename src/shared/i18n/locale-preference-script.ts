import type { AppLocale } from './routing';
import { LOCALE_COOKIE_NAME } from './routing';

function rememberDocumentLocale(name: string, locale: string): void {
  if (window.top !== window) return;
  const save = () => {
    try {
      const preference = `${name}=${locale}`;
      if (!document.cookie.split(';').some((entry) => entry.trim() === preference)) {
        // The Cookie Store API is not available in every supported browser.
        document.cookie = `${preference}; Path=/; SameSite=Lax`;
      }
    } catch {
      // The current URL still selects the correct locale if storage is unavailable.
    }
  };
  if ((document as Document & { prerendering?: boolean }).prerendering) {
    document.addEventListener('prerenderingchange', save, { once: true });
  } else {
    save();
  }
}

/** Use the language of the displayed document, not a speculative prefetch response. */
export function getLocalePreferenceScript(locale: AppLocale): string {
  return `(${rememberDocumentLocale.toString()})(${JSON.stringify(LOCALE_COOKIE_NAME)},${JSON.stringify(locale)});`;
}
