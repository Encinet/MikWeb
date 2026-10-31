'use client';

import type { RefObject } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import type { FocusReturn } from '@/shared/lib/focus-return';
import { captureFocusReturn } from '@/shared/lib/focus-return';

export type WikiNavigationPanel = 'sections' | 'outline' | null;

interface WikiNavigationPanelOptions {
  panel: WikiNavigationPanel;
  onPanelChange: (panel: WikiNavigationPanel) => void;
  dialogRef: RefObject<HTMLDialogElement | null>;
  toolbarRef: RefObject<HTMLDivElement | null>;
  sectionsButtonRef: RefObject<HTMLButtonElement | null>;
  outlineButtonRef: RefObject<HTMLButtonElement | null>;
}

export function useWikiNavigationPanel({
  panel,
  onPanelChange,
  dialogRef,
  toolbarRef,
  sectionsButtonRef,
  outlineButtonRef,
}: WikiNavigationPanelOptions) {
  const focusReturnRef = useRef<FocusReturn | null>(null);
  const dismissPanel = useCallback(
    (restoreFocus = true) => {
      dialogRef.current?.close();
      onPanelChange(null);
      if (!restoreFocus) return;

      const trigger = panel === 'sections' ? sectionsButtonRef.current : outlineButtonRef.current;
      if (trigger?.getClientRects().length) {
        focusReturnRef.current?.restore(trigger);
        return;
      }

      // A resize may have replaced the trigger with a permanent sidebar.
      const layout = toolbarRef.current?.closest('.wiki-page__layout');
      const sidebar = layout?.querySelector(
        panel === 'sections' ? '.wiki-page__navigation' : '.wiki-page__outline',
      );
      const target =
        sidebar?.querySelector<HTMLElement>('[aria-current]') ??
        sidebar?.querySelector<HTMLElement>('a') ??
        layout?.querySelector<HTMLElement>('.wiki-markdown');
      if (target) focusReturnRef.current?.restore(target);
    },
    [dialogRef, onPanelChange, outlineButtonRef, panel, sectionsButtonRef, toolbarRef],
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!panel || !dialog) return;
    const focusReturn = captureFocusReturn(
      panel === 'sections' ? sectionsButtonRef.current : outlineButtonRef.current,
    );
    focusReturnRef.current = focusReturn;

    // Keep these thresholds aligned with the Wiki stylesheet.
    const sheetQuery = window.matchMedia('(max-width: 639px)');
    const shortViewportQuery = window.matchMedia('(max-height: 480px)');
    const sidebarQuery = window.matchMedia('(min-width: 1024px)');
    const outlineQuery = window.matchMedia('(min-width: 1280px)');
    if ((panel === 'sections' && sidebarQuery.matches) || outlineQuery.matches) {
      dismissPanel();
      focusReturn.dispose();
      return;
    }

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const modal = sheetQuery.matches || shortViewportQuery.matches;
    const updateAvailableHeight = () => {
      const toolbar = toolbarRef.current;
      if (!toolbar || modal) return;
      const viewport = window.visualViewport;
      const bottom = viewport ? viewport.height + viewport.offsetTop : window.innerHeight;
      toolbar.style.setProperty(
        '--wiki-panel-available-height',
        `${Math.max(0, bottom - toolbar.getBoundingClientRect().bottom - 20)}px`,
      );
    };
    updateAvailableHeight();
    if (modal) {
      // Native modal dialogs provide focus containment and make the background inert.
      dialog.showModal();
      root.style.overflow = 'hidden';
    } else {
      dialog.show();
    }

    const currentLink = dialog.querySelector<HTMLElement>('[aria-current]');
    const initialFocus = currentLink ?? dialog.querySelector<HTMLElement>('a, button');
    initialFocus?.focus({ preventScroll: true });
    const viewport = dialog.querySelector<HTMLElement>('[data-wiki-panel-viewport]');
    if (currentLink && viewport) {
      viewport.scrollTop +=
        currentLink.getBoundingClientRect().top -
        viewport.getBoundingClientRect().top -
        viewport.clientHeight / 3;
    }

    const cancel = (event: Event) => {
      event.preventDefault();
      dismissPanel();
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') cancel(event);
    };
    const pointerdown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!modal && !toolbarRef.current?.contains(event.target)) dismissPanel(false);
      if (modal && event.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        ) {
          dismissPanel();
        }
      }
    };
    const focusin = (event: FocusEvent) => {
      if (!modal && event.target instanceof Node && !toolbarRef.current?.contains(event.target)) {
        dismissPanel(false);
      }
    };
    const layoutChange = () => dismissPanel();

    dialog.addEventListener('cancel', cancel);
    document.addEventListener('keydown', keydown);
    document.addEventListener('pointerdown', pointerdown);
    document.addEventListener('focusin', focusin);
    window.addEventListener('scroll', updateAvailableHeight, { passive: true });
    window.addEventListener('resize', updateAvailableHeight);
    window.visualViewport?.addEventListener('resize', updateAvailableHeight);
    const headerOffsetObserver = new MutationObserver(updateAvailableHeight);
    headerOffsetObserver.observe(root, { attributes: true, attributeFilter: ['style'] });
    for (const query of [sheetQuery, shortViewportQuery, sidebarQuery, outlineQuery]) {
      query.addEventListener('change', layoutChange);
    }
    return () => {
      dialog.removeEventListener('cancel', cancel);
      document.removeEventListener('keydown', keydown);
      document.removeEventListener('pointerdown', pointerdown);
      document.removeEventListener('focusin', focusin);
      window.removeEventListener('scroll', updateAvailableHeight);
      window.removeEventListener('resize', updateAvailableHeight);
      window.visualViewport?.removeEventListener('resize', updateAvailableHeight);
      headerOffsetObserver.disconnect();
      for (const query of [sheetQuery, shortViewportQuery, sidebarQuery, outlineQuery]) {
        query.removeEventListener('change', layoutChange);
      }
      if (dialog.open) dialog.close();
      if (modal) root.style.overflow = previousOverflow;
      focusReturn.dispose();
    };
  }, [dialogRef, dismissPanel, outlineButtonRef, panel, sectionsButtonRef, toolbarRef]);

  return dismissPanel;
}
