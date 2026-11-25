import { JOIN_CAPTCHA_ASSETS } from '@/modules/join/lib/join-captcha-assets';

let loading: Promise<void> | undefined;

export function loadJoinCaptcha(apiEndpoint: string): Promise<void> {
  // Cap runs challenge code in a sandboxed frame. Only fetch it from the configured site.
  const challenge = `${apiEndpoint}challenge`;
  const redeem = `${apiEndpoint}redeem`;
  window.CAP_CUSTOM_FETCH = (input, options) => {
    if (
      options?.method !== 'POST' ||
      (input !== challenge && input !== `${challenge}?wasm=0` && input !== redeem)
    ) {
      return Promise.reject(new Error('Unexpected Cap request'));
    }
    return fetch(input, { ...options, redirect: 'error', credentials: 'omit' });
  };
  if (loading) return loading;

  // The assets and nonce belong to the document, not to each widget instance.
  window.CAP_CUSTOM_WASM_URL = JOIN_CAPTCHA_ASSETS.wasm;
  window.CAP_CUSTOM_HASHWX_URL = JOIN_CAPTCHA_ASSETS.hashwx;
  window.CAP_PAKO_URL = JOIN_CAPTCHA_ASSETS.inflate;
  window.CAP_SCRIPT_NONCE = document.head.querySelector<HTMLScriptElement>(
    'script[data-mikweb-bootstrap][nonce]',
  )?.nonce;
  window.CAP_ISOLATE = true;

  loading = import('cap-widget')
    .then(() => {
      if (!window.customElements.get('cap-widget')) throw new Error('Cap did not load');
    })
    .catch((error: unknown) => {
      loading = undefined;
      throw error;
    });
  return loading;
}
