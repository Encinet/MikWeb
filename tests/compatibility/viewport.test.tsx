import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { act } from 'react';
import { anchoredSurfacePosition, readSafeViewportBounds } from '@/shared/lib/viewport-bounds';
import { ViewportMetrics } from '@/site/providers/viewport-metrics';
import { createBrowserEnvironment } from '../support/browser-environment';

let browser: ReturnType<typeof createBrowserEnvironment>;
let frames: Map<number, FrameRequestCallback>;
beforeEach(() => {
  browser = createBrowserEnvironment();
  frames = new Map();
  let sequence = 0;
  Object.defineProperties(browser.window, {
    requestAnimationFrame: {
      configurable: true,
      value: (callback: FrameRequestCallback) => {
        frames.set(++sequence, callback);
        return sequence;
      },
    },
    cancelAnimationFrame: {
      configurable: true,
      value: (id: number) => {
        frames.delete(id);
      },
    },
  });
});
afterEach(async () => browser.close());

async function frame() {
  const callbacks = [...frames.values()];
  frames.clear();
  await act(async () => {
    for (const callback of callbacks) callback(0);
  });
}

test('visible viewport tracks keyboard, orientation, browser restoration, and preserves pinch zoom', async () => {
  const viewport = Object.assign(new browser.window.EventTarget(), {
    width: 390,
    height: 844,
    offsetLeft: 0,
    offsetTop: 0,
    scale: 1,
  });
  Object.defineProperty(browser.window, 'visualViewport', { configurable: true, value: viewport });
  const style = document.documentElement.style;
  style.setProperty('--visual-viewport-height', '123px');
  await act(async () => browser.root.render(<ViewportMetrics />));
  assert.equal(style.getPropertyValue('--visual-viewport-height'), '844px');
  viewport.height = 420;
  viewport.offsetTop = 80;
  viewport.dispatchEvent(new browser.window.Event('resize'));
  viewport.dispatchEvent(new browser.window.Event('scroll'));
  assert.equal(frames.size, 1);
  await frame();
  assert.equal(style.getPropertyValue('--visual-viewport-height'), '420px');
  assert.equal(style.getPropertyValue('--visual-viewport-top'), '80px');
  viewport.scale = 2;
  viewport.height = 210;
  viewport.dispatchEvent(new browser.window.Event('resize'));
  await frame();
  assert.equal(style.getPropertyValue('--visual-viewport-height'), '420px');
  viewport.scale = 1;
  viewport.width = 844;
  viewport.height = 390;
  viewport.offsetTop = 0;
  browser.window.dispatchEvent(new browser.window.Event('resize'));
  await frame();
  assert.equal(style.getPropertyValue('--visual-viewport-width'), '844px');
  assert.equal(style.getPropertyValue('--visual-viewport-height'), '390px');
  viewport.height = 800;
  browser.window.dispatchEvent(new browser.window.Event('pageshow'));
  await frame();
  assert.equal(style.getPropertyValue('--visual-viewport-height'), '800px');
  await act(async () => browser.root.unmount());
  assert.equal(style.getPropertyValue('--visual-viewport-height'), '123px');
});

test('browsers without VisualViewport use window dimensions and cancel pending measurements', async () => {
  Object.defineProperty(browser.window, 'visualViewport', { configurable: true, value: undefined });
  Object.defineProperties(browser.window, {
    innerWidth: { configurable: true, writable: true, value: 360 },
    innerHeight: { configurable: true, writable: true, value: 640 },
  });
  await act(async () => browser.root.render(<ViewportMetrics />));
  assert.equal(
    document.documentElement.style.getPropertyValue('--visual-viewport-height'),
    '640px',
  );
  browser.window.innerHeight = 320;
  browser.window.dispatchEvent(new browser.window.Event('resize'));
  await frame();
  assert.equal(
    document.documentElement.style.getPropertyValue('--visual-viewport-height'),
    '320px',
  );
  browser.window.dispatchEvent(new browser.window.Event('resize'));
  await act(async () => browser.root.unmount());
  assert.equal(frames.size, 0);
  assert.equal(document.documentElement.style.getPropertyValue('--visual-viewport-height'), '');
});

test('safe bounds resolve CSS lengths, remove measuring elements, and constrain menus at every edge', () => {
  const viewport = Object.assign(new browser.window.EventTarget(), {
    width: 390,
    height: 500,
    offsetLeft: 0,
    offsetTop: 80,
    scale: 1,
  });
  Object.defineProperty(browser.window, 'visualViewport', { configurable: true, value: viewport });
  for (const [side, inset] of Object.entries({ top: 47, right: 12, bottom: 34, left: 12 }))
    document.documentElement.style.setProperty(`--viewport-${side}-inset`, `${inset}px`);
  const count = document.body.children.length;
  const safe = readSafeViewportBounds();
  assert.deepEqual(safe, { left: 12, top: 127, width: 366, height: 419 });
  assert.equal(document.body.children.length, count);
  const size = { width: 200, height: 160 };
  for (const anchor of [
    { right: 5, top: 85, bottom: 100 },
    { right: 390, top: 550, bottom: 580 },
    { right: 220, top: 250, bottom: 270 },
  ]) {
    const position = anchoredSurfacePosition(anchor, size, safe);
    assert.ok(position.left >= safe.left + 8);
    assert.ok(position.top >= safe.top + 8);
    assert.ok(position.left + size.width <= safe.left + safe.width - 8);
    assert.ok(position.top + size.height <= safe.top + safe.height - 8);
  }
});
