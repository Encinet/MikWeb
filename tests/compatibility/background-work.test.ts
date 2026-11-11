import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act } from 'react';
import { scheduleBackgroundWork } from '@/shared/lib/background-work';
import { createBackgroundEnvironment } from '../support/background-environment';

test('background work waits for load, respects network/visibility and resumes without overlapping steps', async () => {
  const env = createBackgroundEnvironment();
  let calls = 0;
  let pauses = 0;
  let resolve: ((more: boolean) => void) | undefined;
  const cancel = scheduleBackgroundWork(
    () => {
      calls++;
      return new Promise<boolean>((done) => {
        resolve = done;
      });
    },
    () => {
      pauses++;
    },
  );
  try {
    assert.equal(env.idle.size, 0);
    env.connection.saveData = true;
    env.state.ready = 'complete';
    window.dispatchEvent(new Event('load'));
    assert.equal(env.idle.size, 0);
    env.connection.saveData = false;
    env.connection.effectiveType = '3g';
    env.connection.dispatchEvent(new Event('change'));
    assert.equal(env.idle.size, 0);
    env.connection.effectiveType = '4g';
    env.connection.dispatchEvent(new Event('change'));
    await env.runIdle();
    assert.equal(calls, 1);
    env.connection.dispatchEvent(new Event('change'));
    assert.equal(env.idle.size, 0);
    env.state.visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    assert.ok(pauses > 0);
    await act(async () => {
      resolve?.(true);
    });
    assert.equal(env.idle.size, 0);
    env.state.visibility = 'visible';
    env.state.online = false;
    document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(env.idle.size, 0);
    env.state.online = true;
    window.dispatchEvent(new Event('online'));
    await env.runIdle();
    assert.equal(calls, 2);
    await act(async () => {
      resolve?.(false);
    });
    const previousPauses = pauses;
    env.state.visibility = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(pauses, previousPauses, 'completed work removes its listeners');
  } finally {
    cancel();
    await env.close();
  }
});

test('background imports use a cancellable timer without idle/network APIs and fail silently', async () => {
  const env = createBackgroundEnvironment();
  const timers = new Map<number, () => void>();
  env.state.ready = 'complete';
  Object.defineProperty(window, 'requestIdleCallback', { value: undefined });
  Object.defineProperty(navigator, 'connection', { value: undefined });
  Object.defineProperty(window, 'setTimeout', {
    configurable: true,
    value: (callback: () => void, delay: number) => {
      assert.equal(delay, 1000);
      timers.set(1, callback);
      return 1;
    },
  });
  Object.defineProperty(window, 'clearTimeout', {
    configurable: true,
    value: (id: number) => timers.delete(id),
  });
  let calls = 0;
  const step = async () => {
    calls++;
    throw new Error('Offline chunk');
  };
  const first = scheduleBackgroundWork(step);
  try {
    assert.equal(timers.size, 1);
    first();
    assert.equal(timers.size, 0);
    const second = scheduleBackgroundWork(step);
    await act(async () => {
      timers.get(1)?.();
      timers.delete(1);
    });
    assert.equal(calls, 1);
    assert.equal(timers.size, 0);
    second();
  } finally {
    first();
    await env.close();
  }
});
