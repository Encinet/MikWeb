'use client';

import type { RefObject } from 'react';
import { useEffect, useEffectEvent } from 'react';
import { captureFocusReturn, type FocusReturn } from '@/shared/lib/focus-return';
import { isImeComposing } from '@/shared/lib/keyboard-composition';

interface OpenModal {
  dialog: HTMLElement;
  surface: HTMLElement;
  opener: HTMLElement | null;
  focusReturn: FocusReturn;
}

interface ModalScope {
  open: Set<OpenModal>;
  top: OpenModal | undefined;
  first: OpenModal;
  madeInert: Set<HTMLElement>;
  previousOverflow: string;
}

const modalScopes = new WeakMap<Document, ModalScope>();

function syncModalBackground(body: HTMLElement, scope: ModalScope) {
  let top: OpenModal | undefined;
  for (const modal of scope.open) {
    if (modal.surface.parentElement !== body || modal.surface.style.display === 'none') continue;
    // Portals share a z-index. DOM order also survives an Activity effect reconnect.
    if (
      !top ||
      top.surface.compareDocumentPosition(modal.surface) & Node.DOCUMENT_POSITION_FOLLOWING
    ) {
      top = modal;
    }
  }
  scope.top = top;

  for (const element of scope.madeInert) {
    if (!top || element === top.surface || element.parentElement !== body) {
      element.inert = false;
      scope.madeInert.delete(element);
    }
  }

  if (!top) return;
  for (const element of body.children) {
    if (
      element instanceof HTMLElement &&
      element !== top.surface &&
      !element.inert &&
      !element.matches('script, style, nextjs-portal')
    ) {
      element.inert = true;
      scope.madeInert.add(element);
    }
  }
}

function focusInitialControl(dialog: HTMLElement) {
  const control =
    dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]:not(:disabled)') ??
    dialog.querySelector<HTMLElement>('[data-dialog-close]:not(:disabled)');
  control?.focus({ preventScroll: true });
  if (!dialog.contains(dialog.ownerDocument.activeElement)) dialog.focus({ preventScroll: true });
}

function restoreModalFocus({ opener, focusReturn }: OpenModal, within?: HTMLElement) {
  if (
    !opener?.isConnected ||
    (within && !within.contains(opener)) ||
    opener.closest('[inert]') ||
    opener.getClientRects().length === 0
  ) {
    return false;
  }
  focusReturn.restore();
  return opener.ownerDocument.activeElement === opener;
}

/** Shared keyboard, focus and background handling for both window and immersive dialogs. */
export function useModalInteraction(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void,
) {
  const close = useEffectEvent(onClose);

  useEffect(() => {
    const dialog = ref.current;
    if (!isOpen || !dialog) return;

    const document = dialog.ownerDocument;
    const surface = dialog.closest<HTMLElement>('body > *');
    if (!surface) return;

    const previousFocus = document.activeElement;
    const opener =
      previousFocus instanceof HTMLElement && previousFocus !== document.body ? previousFocus : null;
    const modal = { dialog, surface, opener, focusReturn: captureFocusReturn(opener) };
    let scope = modalScopes.get(document);
    if (!scope) {
      scope = {
        open: new Set(),
        top: undefined,
        first: modal,
        madeInert: new Set(),
        previousOverflow: document.documentElement.style.overflow,
      };
      modalScopes.set(document, scope);
      document.documentElement.style.overflow = 'hidden';
    }
    scope.open.add(modal);
    syncModalBackground(document.body, scope);
    if (scope.top === modal) focusInitialControl(dialog);

    const focusableElements = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ),
      ).filter((element) => !element.closest('[inert]') && element.getClientRects().length > 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        scope.top !== modal ||
        event.defaultPrevented ||
        isImeComposing(event) ||
        dialog.closest('[inert]')
      ) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (event.key === 'Tab') {
        const elements = focusableElements();
        const first = elements[0];
        const last = elements.at(-1);
        const active = document.activeElement;
        if (!first || !last) {
          event.preventDefault();
          dialog.focus();
        } else if (
          event.shiftKey &&
          (!active ||
            !dialog.contains(active) ||
            !elements.some(
              (element) =>
                element.compareDocumentPosition(active) & Node.DOCUMENT_POSITION_FOLLOWING,
            ))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (!active ||
            !dialog.contains(active) ||
            !elements.some(
              (element) =>
                active.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING,
            ))
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      const wasTop = scope.top === modal;
      scope.open.delete(modal);
      syncModalBackground(document.body, scope);

      if (scope.open.size === 0) {
        document.documentElement.style.overflow = scope.previousOverflow;
        modalScopes.delete(document);
        restoreModalFocus(scope.first);
        scope.first.focusReturn.dispose();
      } else if (wasTop && scope.top && !restoreModalFocus(modal, scope.top.dialog)) {
        focusInitialControl(scope.top.dialog);
      }

      if (modal !== scope.first) modal.focusReturn.dispose();
    };
  }, [isOpen, ref]);
}
