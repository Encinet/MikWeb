import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import wasm from '@cap.js/wasm/package.json';
import { JOIN_CAPTCHA_ASSETS } from '../src/modules/join/lib/join-captcha-assets';

const require = createRequire(import.meta.url);
const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));

/** Build-time file preparation only; no network requests or runtime credentials. */
export async function prepareCapAssets(destination = publicDirectory): Promise<void> {
  const wasmRoot = dirname(require.resolve('@cap.js/wasm/package.json'));
  const pakoRoot = dirname(require.resolve('pako/package.json'));
  const widgetRoot = dirname(require.resolve('cap-widget/package.json'));
  const widgetSource = await readFile(join(widgetRoot, 'src/cap.js'), 'utf8');
  const expectedWasmVersion = widgetSource.match(/\bWASM_VERSION\s*=\s*["']([^"']+)["']/)?.[1];
  if (expectedWasmVersion !== wasm.version) {
    throw new Error(
      `Cap widget expects WASM ${expectedWasmVersion ?? '(unknown)'}, installed ${wasm.version}; update cap-widget and @cap.js/wasm together`,
    );
  }

  const output = dirname(join(destination, JOIN_CAPTCHA_ASSETS.wasm.slice(1)));
  await mkdir(output, { recursive: true });
  await Promise.all([
    copyFile(
      join(wasmRoot, 'browser/cap_wasm_bg.wasm'),
      join(destination, JOIN_CAPTCHA_ASSETS.wasm.slice(1)),
    ),
    copyFile(
      join(wasmRoot, 'browser/hashwx.wasm'),
      join(destination, JOIN_CAPTCHA_ASSETS.hashwx.slice(1)),
    ),
    copyFile(
      join(pakoRoot, 'dist/pako_inflate.min.js'),
      join(destination, JOIN_CAPTCHA_ASSETS.inflate.slice(1)),
    ),
    copyFile(join(widgetRoot, 'LICENSE'), join(output, 'CAP-LICENSE')),
    copyFile(join(pakoRoot, 'LICENSE'), join(output, 'PAKO-LICENSE')),
  ]);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await prepareCapAssets();
}
