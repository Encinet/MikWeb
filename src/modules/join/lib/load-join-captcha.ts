import { JOIN_CAPTCHA_ASSETS } from '@/modules/join/lib/join-captcha-assets';

let loading: Promise<void> | undefined;

export async function loadJoinCaptcha(): Promise<void> {
  // Loaded from this site, including both solvers and the fallback decompressor.
  window.CAP_CUSTOM_WASM_URL = JOIN_CAPTCHA_ASSETS.wasm;
  window.CAP_CUSTOM_HASHWX_URL = JOIN_CAPTCHA_ASSETS.hashwx;
  window.CAP_PAKO_URL = JOIN_CAPTCHA_ASSETS.inflate;
  if (window.customElements.get('cap-widget')) return;
  loading ??= import('cap-widget')
    .then(() => {
      if (!window.customElements.get('cap-widget')) throw new Error('Cap did not load');
    })
    .catch((error: unknown) => {
      loading = undefined;
      throw error;
    });
  await loading;
}
