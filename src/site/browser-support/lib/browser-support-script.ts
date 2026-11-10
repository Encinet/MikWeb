/** Keep this classic script in ES5 syntax: it must run even when the app bundle cannot parse. */
export function getBrowserSupportScript(): string {
  return String.raw`(function () {
  var ua = navigator.userAgent;
  var match;
  var outdated = false;
  // Check the iOS engine version before branded Chrome/Firefox versions.
  if (/iP(?:hone|ad|od)/.test(ua) && (match = /OS (\d+)[_.](\d+)/.exec(ua))) {
    outdated = +match[1] < 16 || (+match[1] === 16 && +match[2] < 4);
  } else if (/MSIE|Trident|Edge\//.test(ua)) {
    outdated = true;
  } else if ((match = /(?:Edg|Chrome|Chromium|HeadlessChrome)\/(\d+)/.exec(ua))) {
    outdated = +match[1] < 111;
  } else if ((match = /Firefox\/(\d+)/.exec(ua))) {
    outdated = +match[1] < 128;
  } else if (/Safari\//.test(ua) && (match = /Version\/(\d+)(?:\.(\d+))?/.exec(ua))) {
    outdated = +match[1] < 16 || (+match[1] === 16 && +(match[2] || 0) < 4);
  }
  var css = window.CSS;
  var unsupported = outdated || !css || typeof css.supports !== 'function' ||
    !css.supports('color', 'oklch(50% 0.1 180)') ||
    !css.supports('color', 'color-mix(in srgb, black, white)');
  if (!unsupported) return;
  var storageKey = 'mik-browser-warning-dismissed-v1';
  try { if (sessionStorage.getItem(storageKey) === '1') return; } catch (error) {}
  document.documentElement.setAttribute('data-browser-warning', 'visible');
  document.addEventListener('click', function (event) {
    if (!event.target || event.target.id !== 'browser-support-dismiss') return;
    document.documentElement.removeAttribute('data-browser-warning');
    try { sessionStorage.setItem(storageKey, '1'); } catch (error) {}
  });
})();`;
}
