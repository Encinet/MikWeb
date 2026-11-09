import wasm from '@cap.js/wasm/package.json';
import pako from 'pako/package.json';

// Both the build script and browser loader use the installed dependency versions.
const basePath = '/vendor/cap';
export const JOIN_CAPTCHA_ASSETS = {
  wasm: `${basePath}/cap_wasm_bg-${wasm.version}.wasm`,
  hashwx: `${basePath}/hashwx-${wasm.version}.wasm`,
  inflate: `${basePath}/pako_inflate-${pako.version}.min.js`,
} as const;
