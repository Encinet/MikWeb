import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';
import { act } from 'react';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';
import { createBrowserEnvironment } from '../support/browser-environment';

let browser: ReturnType<typeof createBrowserEnvironment>;
let completeDescriptor: PropertyDescriptor | undefined;
beforeEach(() => {
  browser = createBrowserEnvironment();
  const prototype = browser.window.HTMLImageElement.prototype;
  completeDescriptor = Object.getOwnPropertyDescriptor(prototype, 'complete');
  // DOM emulation reports empty images as complete; cold browser requests are not.
  Object.defineProperty(prototype, 'complete', { configurable: true, get: () => false });
});
afterEach(async () => {
  await browser.close();
  const prototype = browser.window.HTMLImageElement.prototype;
  if (completeDescriptor) Object.defineProperty(prototype, 'complete', completeDescriptor);
  else Reflect.deleteProperty(prototype, 'complete');
});

function images() {
  return Array.from(document.querySelectorAll('img'));
}

async function load(image: HTMLImageElement) {
  Object.defineProperty(image, 'decode', { configurable: true, value: async () => undefined });
  await act(async () => image.dispatchEvent(new Event('load')));
}

test('different sizes and UUID spellings share one resource and reuse loaded state across remounts', async () => {
  const uuid = 'abcdefab-1234-4567-89ab-abcdefabcdef';
  const sizes = [18, 40];
  await act(async () =>
    browser.root.render(
      sizes.map((size, index) => (
        <MinecraftAvatar
          key={size}
          uuid={index % 2 ? uuid.replaceAll('-', '').toUpperCase() : uuid}
          name="Alex"
          size={size}
        />
      )),
    ),
  );
  const avatars = images();
  assert.equal(avatars.length, sizes.length);
  assert.equal(new Set(avatars.map((image) => image.src)).size, 1);
  for (const [index, image] of avatars.entries()) {
    assert.equal(image.width, sizes[index]);
    assert.equal(image.height, sizes[index]);
  }
  assert.ok(avatars.every((image) => image.loading === 'lazy'));
  const src = avatars[0].src;
  await load(avatars[0]);
  assert.ok(images().every((image) => image.loading === 'eager'));
  await act(async () =>
    browser.root.render(<MinecraftAvatar key="later" uuid={uuid} name="Cached" size={32} />),
  );
  assert.equal(images()[0].src, src);
  assert.equal(images()[0].loading, 'eager');
});

test('concurrent failures advance the shared source once and later mounts retain the successful fallback', async () => {
  const uuid = 'abcdefab-3333-4567-89ab-abcdefabcdef';
  const otherUuid = 'abcdefab-4444-4567-89ab-abcdefabcdef';
  await act(async () =>
    browser.root.render(
      <>
        <MinecraftAvatar uuid={uuid} name="Fallback" size={18} />
        <MinecraftAvatar uuid={uuid} name="Fallback" size={40} />
        <MinecraftAvatar uuid={otherUuid} name="Other" size={32} />
      </>,
    ),
  );
  const initial = images();
  await act(async () => {
    for (const image of initial.slice(0, 2)) image.dispatchEvent(new Event('error'));
  });
  const current = images();
  assert.ok(current.slice(0, 2).every((image) => new URL(image.src).hostname === 'minotar.net'));
  assert.equal(current[0].src, current[1].src);
  assert.equal(new URL(current[2].src).hostname, 'mineskin.eu');
  await load(images()[0]);
  await act(async () =>
    browser.root.render(<MinecraftAvatar key="fresh" uuid={uuid} name="Fallback" size={28} />),
  );
  assert.equal(new URL(images()[0].src).hostname, 'minotar.net');
  assert.equal(images()[0].loading, 'eager');
});

test('exhausted sources affect only the failed player and can recover on a later mount', async () => {
  const uuid = 'abcdefab-5555-4567-89ab-abcdefabcdef';
  const now = Date.now();
  const clock = mock.method(Date, 'now', () => now);
  try {
    await act(async () =>
      browser.root.render(<MinecraftAvatar uuid={uuid} name="Missing" size={28} />),
    );
    for (let index = 0; index < 3; index++) {
      await act(async () => images()[0].dispatchEvent(new Event('error')));
    }
    assert.equal(images().length, 0);
    assert.equal(document.querySelector('[role="img"]')?.textContent, 'M');
    await act(async () =>
      browser.root.render(
        <MinecraftAvatar uuid="abcdefab-6666-4567-89ab-abcdefabcdef" name="New" size={28} />,
      ),
    );
    assert.equal(new URL(images()[0].src).hostname, 'mineskin.eu');
    await act(async () =>
      browser.root.render(<MinecraftAvatar key="soon" uuid={uuid} name="Retry" size={28} />),
    );
    assert.equal(images().length, 0, 'new placements do not immediately repeat a failed chain');
    clock.mock.mockImplementation(() => now + 61_000);
    await act(async () =>
      browser.root.render(<MinecraftAvatar key="later" uuid={uuid} name="Retry" size={28} />),
    );
    assert.equal(new URL(images()[0].src).hostname, 'mineskin.eu');
  } finally {
    clock.mock.restore();
  }
});
