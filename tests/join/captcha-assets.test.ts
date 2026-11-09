import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { JOIN_CAPTCHA_ASSETS } from '@/modules/join/lib/join-captcha-assets';
import { loadJoinCaptcha } from '@/modules/join/lib/load-join-captcha';
import { prepareCapAssets } from '../../scripts/prepare-cap-assets';
import { createBrowserEnvironment } from '../support/browser-environment';

test('self-hosted Cap URLs resolve to generated solver modules, decompressor and licenses', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'mikweb-cap-assets-'));
  const environment = createBrowserEnvironment();
  environment.window.customElements.define(
    'cap-widget',
    class extends environment.window.HTMLElement {},
  );
  try {
    await prepareCapAssets(directory);
    await loadJoinCaptcha();
    const urls = {
      wasm: window.CAP_CUSTOM_WASM_URL,
      hashwx: window.CAP_CUSTOM_HASHWX_URL,
      inflate: window.CAP_PAKO_URL,
    };
    assert.deepEqual(urls, JOIN_CAPTCHA_ASSETS);
    for (const [kind, url] of Object.entries(urls)) {
      assert.ok(url);
      assert.equal(
        new URL(url, environment.window.location.href).origin,
        environment.window.location.origin,
      );
      const bytes = await readFile(join(directory, url.slice(1)));
      if (kind === 'inflate') assert.match(bytes.toString(), /pako/);
      else {
        assert.deepEqual([...bytes.subarray(0, 4)], [0, 97, 115, 109]);
        await WebAssembly.compile(bytes);
      }
    }
    const assetDirectory = dirname(join(directory, JOIN_CAPTCHA_ASSETS.wasm.slice(1)));
    assert.match(await readFile(join(assetDirectory, 'CAP-LICENSE'), 'utf8'), /Apache License/);
    assert.match(await readFile(join(assetDirectory, 'PAKO-LICENSE'), 'utf8'), /Copyright/);
    // Repeated dev/build runs must remain safe and produce usable resources.
    await prepareCapAssets(directory);
  } finally {
    await environment.close();
    await rm(directory, { recursive: true, force: true });
  }
});
