const STORAGE_KEY = 'mik-auth-navigation';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Presentation only. Returns a persisted audience change so other tabs can re-verify. */
export function rememberAuthNavigation(authenticated: boolean): boolean {
  document.documentElement.setAttribute(
    'data-auth-navigation',
    authenticated ? 'signed-in' : 'signed-out',
  );
  try {
    const previouslySignedIn = window.localStorage.getItem(STORAGE_KEY) !== null;
    if (authenticated) window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
    else window.localStorage.removeItem(STORAGE_KEY);
    return previouslySignedIn !== authenticated;
  } catch {
    // Navigation still updates in this tab when browser storage is unavailable.
  }
  return false;
}

function applyStoredNavigation(storageKey: string, maxAgeMs: number): void {
  let signedIn = false;
  try {
    const savedAt = Number(window.localStorage.getItem(storageKey));
    const age = Date.now() - savedAt;
    signedIn = savedAt > 0 && age >= 0 && age < maxAgeMs;
  } catch {
    // Public navigation is the fallback when storage is unavailable.
  }
  document.documentElement.setAttribute(
    'data-auth-navigation',
    signedIn ? 'signed-in' : 'signed-out',
  );
}

export function restoreAuthNavigation(): void {
  applyStoredNavigation(STORAGE_KEY, MAX_AGE_MS);
}

/** Same initialization before paint and on account changes; public HTML stays cacheable. */
export function getAuthNavigationInitializationScript(): string {
  return `(${applyStoredNavigation.toString()})(${JSON.stringify(STORAGE_KEY)},${MAX_AGE_MS});`;
}
