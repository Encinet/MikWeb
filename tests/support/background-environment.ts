import { act } from 'react';
import { createBrowserEnvironment } from './browser-environment';

export function createBackgroundEnvironment() {
  const environment = createBrowserEnvironment();
  const state = { ready: 'loading', visibility: 'visible', online: true };
  const connection = Object.assign(new EventTarget(), { saveData: false, effectiveType: '4g' });
  const idle = new Map<number, () => void>();
  let nextId = 0;
  Object.defineProperties(environment.window.document, {
    readyState: { configurable: true, get: () => state.ready },
    visibilityState: { configurable: true, get: () => state.visibility },
  });
  Object.defineProperties(environment.window.navigator, {
    onLine: { configurable: true, get: () => state.online },
    connection: { configurable: true, value: connection },
  });
  Object.defineProperties(environment.window, {
    requestIdleCallback: {
      configurable: true,
      value: (callback: () => void) => {
        const id = ++nextId;
        idle.set(id, callback);
        return id;
      },
    },
    cancelIdleCallback: { configurable: true, value: (id: number) => idle.delete(id) },
  });
  return {
    ...environment,
    state,
    connection,
    idle,
    async runIdle() {
      await act(async () => {
        const next = idle.entries().next().value;
        if (!next) throw new Error('No scheduled idle work');
        idle.delete(next[0]);
        next[1]();
      });
    },
  };
}
