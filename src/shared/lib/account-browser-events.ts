/** A change signal only: no credentials or account data enter browser storage. */
const ACCOUNT_CHANGE_KEY = 'mik-account-change';

export function announceAccountChange(): void {
  try {
    localStorage.setItem(ACCOUNT_CHANGE_KEY, crypto.randomUUID());
  } catch {
    // Storage may be disabled; server-side session expiry remains authoritative.
  }
}

export function onOtherTabAccountChange(listener: () => void): () => void {
  const handle = (event: StorageEvent) => {
    if (event.key === ACCOUNT_CHANGE_KEY || event.key === null) listener();
  };
  window.addEventListener('storage', handle);
  return () => window.removeEventListener('storage', handle);
}
