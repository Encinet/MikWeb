export interface FocusReturn {
  restore: (target?: HTMLElement | null) => void;
  dispose: () => void;
}

let releaseQuietFocus: (() => void) | undefined;

function quietReturnedFocus(target: HTMLElement) {
  releaseQuietFocus?.();
  const document = target.ownerDocument;
  target.setAttribute('data-restored-focus', 'quiet');

  const clear = () => {
    target.removeAttribute('data-restored-focus');
    target.removeEventListener('blur', clear);
    document.removeEventListener('pointerdown', clear, true);
    document.removeEventListener('keydown', keydown, true);
    if (releaseQuietFocus === clear) releaseQuietFocus = undefined;
  };
  const keydown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') clear();
  };
  target.addEventListener('blur', clear);
  document.addEventListener('pointerdown', clear, true);
  document.addEventListener('keydown', keydown, true);
  releaseQuietFocus = clear;
}

/** Escape alone should not turn a pointer-opened dialog into a keyboard focus ring. */
export function captureFocusReturn(opener: HTMLElement | null): FocusReturn {
  const document = opener?.ownerDocument;
  let showFocus = Boolean(
    opener?.matches(':focus-visible') && opener.getAttribute('data-restored-focus') !== 'quiet',
  );
  const keydown = (event: KeyboardEvent) => {
    if (/^(Tab|Arrow(Up|Down|Left|Right)|Home|End|PageUp|PageDown)$/.test(event.key)) {
      showFocus = true;
    }
  };
  document?.addEventListener('keydown', keydown, true);
  const dispose = () => document?.removeEventListener('keydown', keydown, true);

  return {
    dispose,
    restore(target = opener) {
      dispose();
      if (!target?.isConnected) return;
      releaseQuietFocus?.();
      if (!showFocus) quietReturnedFocus(target);
      target.focus({ preventScroll: true });
    },
  };
}
