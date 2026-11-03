import 'fake-indexeddb/auto';
import { after } from 'node:test';
import { Window } from 'happy-dom';

// React detects input/composition support when its renderer loads, before individual test setup.
const browser = new Window({ url: 'https://example.test' });
const globals: [string, unknown][] = [
  ['window', browser],
  ['document', browser.document],
  ['navigator', browser.navigator],
];
const previous = globals.map(([key]) => Object.getOwnPropertyDescriptor(globalThis, key));
for (const [key, value] of globals)
  Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });

after(async () => {
  await browser.happyDOM.close();
  globals.forEach(([key], index) => {
    const descriptor = previous[index];
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  });
});
