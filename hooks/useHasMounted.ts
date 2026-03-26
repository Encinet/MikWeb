import { useSyncExternalStore } from 'react';

const subscribe = () => {
  return () => {};
};

const getSnapshot = () => true;

const getServerSnapshot = () => false;

export function useHasMounted(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
