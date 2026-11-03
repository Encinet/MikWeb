'use client';

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  CHAT_ACTION_MENUS_CLOSE_EVENT,
  closeChatActionMenus,
} from '@/modules/chat/lib/chat-action-menu-events';
import { useHasMounted } from '@/shared/hooks/use-has-mounted';
import {
  anchoredSurfacePosition,
  pointedSurfacePosition,
  readSafeViewportBounds,
} from '@/shared/lib/viewport-bounds';

export const CHAT_MENU_CONTROLS = 'button:not(:disabled), a[href], select:not(:disabled)';
export interface ChatMenuPoint {
  x: number;
  y: number;
}

/** Shared popup lifetime and positioning for button menus and contextual actions. */
export function useChatMenu(onOpen?: () => void) {
  const id = useId();
  const anchor = useRef<HTMLElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const surface = useRef<HTMLSpanElement | null>(null);
  const point = useRef<ChatMenuPoint | null>(null);
  const visible = useRef(false);
  const [open, setOpen] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const mounted = useHasMounted();
  const native =
    mounted &&
    typeof HTMLElement.prototype.showPopover === 'function' &&
    typeof HTMLElement.prototype.hidePopover === 'function';

  const setAnchor = useCallback((element: HTMLElement | null) => {
    anchor.current = element;
  }, []);
  const close = useCallback(
    (returnFocus = false) => {
      const wasOpen = visible.current;
      visible.current = false;
      if (native && surface.current?.matches(':popover-open')) surface.current.hidePopover();
      setOpen(false);
      const target = opener.current ?? anchor.current;
      if (returnFocus && wasOpen && target?.isConnected) target.focus({ preventScroll: true });
    },
    [native],
  );
  const position = useCallback(() => {
    const element = surface.current;
    const target = anchor.current;
    if (!element || !target) return;
    const viewport = readSafeViewportBounds();
    element.style.setProperty('--chat-menu-viewport-width', `${viewport.width}px`);
    element.style.setProperty('--chat-menu-viewport-height', `${viewport.height}px`);
    const size = { width: element.offsetWidth, height: element.offsetHeight };
    const placement = point.current
      ? pointedSurfacePosition(point.current, size, viewport)
      : anchoredSurfacePosition(target.getBoundingClientRect(), size, viewport);
    element.style.left = `${placement.left}px`;
    element.style.top = `${placement.top}px`;
  }, []);
  const show = useCallback(
    (location?: ChatMenuPoint, source?: HTMLElement) => {
      const target = anchor.current;
      if (!target) return;
      point.current = location ?? null;
      opener.current = source ?? target;
      closeChatActionMenus(id);
      if (native) {
        if (surface.current && !surface.current.matches(':popover-open'))
          surface.current.showPopover();
      } else {
        setPortalRoot(target.closest('dialog') ?? document.body);
      }
      visible.current = true;
      setOpen(true);
      position();
    },
    [id, native, position],
  );
  const toggle = useCallback(
    (opened: boolean) => {
      if (opened) closeChatActionMenus(id);
      visible.current = opened;
      setOpen(opened);
    },
    [id],
  );
  const opened = useEffectEvent(() => {
    onOpen?.();
    surface.current?.querySelector<HTMLElement>(CHAT_MENU_CONTROLS)?.focus({ preventScroll: true });
  });
  useLayoutEffect(() => {
    if (!open) return;
    if (native && surface.current && !surface.current.matches(':popover-open'))
      surface.current.showPopover();
    position();
    opened();
  }, [open, native, position]);

  useEffect(() => {
    const element = surface.current;
    if (!element || !open) return;
    const resize = new ResizeObserver(position);
    resize.observe(element);
    if (anchor.current) resize.observe(anchor.current);
    const scroll = (event: Event) => {
      if (!(event.target instanceof Node) || !element.contains(event.target)) close();
    };
    const dismiss = (event: Event) => {
      if ((event as CustomEvent<string | null>).detail !== id) close();
    };
    const pointer = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !element.contains(event.target) &&
        !anchor.current?.contains(event.target)
      )
        close();
    };
    window.addEventListener(CHAT_ACTION_MENUS_CLOSE_EVENT, dismiss);
    if (!native) document.addEventListener('pointerdown', pointer, true);
    document.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', position);
    window.visualViewport?.addEventListener('resize', position);
    window.visualViewport?.addEventListener('scroll', position);
    return () => {
      resize.disconnect();
      window.removeEventListener(CHAT_ACTION_MENUS_CLOSE_EVENT, dismiss);
      if (!native) document.removeEventListener('pointerdown', pointer, true);
      document.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
    };
  }, [position, open, close, id, native]);

  return { id, anchor, opener, setAnchor, surface, native, open, portalRoot, show, close, toggle };
}

export type ChatMenuController = ReturnType<typeof useChatMenu>;
