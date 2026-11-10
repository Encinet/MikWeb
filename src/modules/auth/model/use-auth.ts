'use client';

import { useContext } from 'react';
import { AuthStateContext } from '@/modules/auth/model/auth-state-context';
import { useHasMounted } from '@/shared/hooks/use-has-mounted';

export function useAuth() {
  const context = useContext(AuthStateContext);
  const hydrated = useHasMounted();

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  // A streamed consumer can hydrate after the provider has already verified the session.
  // Keep its first render identical to public server HTML, then reveal the current identity.
  return hydrated
    ? context
    : { ...context, account: null, authenticated: false, verified: false, isLoading: true };
}
