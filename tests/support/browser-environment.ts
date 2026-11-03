import { Window } from 'happy-dom';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

/** DOM emulation for behavior tests; this does not simulate a browser's layout engine. */
export function createBrowserEnvironment() {
  const window = new Window({ url: 'https://example.test/zh-CN/chat' });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  const globals: [string, unknown][] = [
    ['window', window],
    ['document', window.document],
    ['navigator', window.navigator],
    ['HTMLElement', window.HTMLElement],
    ['HTMLSelectElement', window.HTMLSelectElement],
    ['Node', window.Node],
    ['Event', window.Event],
    ['EventTarget', window.EventTarget],
    ['CustomEvent', window.CustomEvent],
    ['ResizeObserver', window.ResizeObserver],
    ['IntersectionObserver', window.IntersectionObserver],
    ['IS_REACT_ACT_ENVIRONMENT', true],
  ];
  for (const [key, value] of globals) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  return {
    window,
    root,
    container,
    async close() {
      await act(async () => root.unmount());
      await window.happyDOM.close();
      for (const [key, descriptor] of previous) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}
