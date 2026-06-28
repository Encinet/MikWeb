'use client';

import { useContext } from 'react';
import { AuthStateContext } from '@/modules/auth/model/auth-state-context';

export function useAuth() {
  const context = useContext(AuthStateContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
