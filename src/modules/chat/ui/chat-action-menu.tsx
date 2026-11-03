'use client';

import { MoreHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  CHAT_ACTION_MENUS_CLOSE_EVENT,
  closeChatActionMenus,
} from '@/modules/chat/lib/chat-action-menu-events';
import { useHasMounted } from '@/shared/hooks/use-has-mounted';
import { anchoredSurfacePosition, readSafeViewportBounds } from '@/shared/lib/viewport-bounds';

const MENU_CONTROLS = 'button:not(:disabled), a[href], select:not(:disabled)';

/** Use the native top layer when available, with a portal for browsers without Popover support. */
export function ChatActionMenu({
  label,
  children,
  trigger,
  className = '',
  onOpen,
}: {
  label: string;
  children: ReactNode;
  trigger?: ReactNode;
  className?: string;
  onOpen?: () => void;
}) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const mounted = useHasMounted();
  const native =
    mounted &&
    typeof HTMLElement.prototype.showPopover === 'function' &&
    typeof HTMLElement.prototype.hidePopover === 'function';
  const close = useCallback(
    (returnFocus = false) => {
      const surface = popover.current;
      if (native && surface?.matches(':popover-open')) surface.hidePopover();
      setOpen(false);
      if (returnFocus) button.current?.focus({ preventScroll: true });
    },
    [native],
  );
  const show = () => {
    closeChatActionMenus(id);
    if (native) {
      const surface = popover.current;
      if (surface && !surface.matches(':popover-open')) surface.showPopover();
    } else {
      setPortalRoot(button.current?.closest('dialog') ?? document.body);
      setOpen(true);
    }
  };
  const position = useCallback(() => {
    const surface = popover.current;
    const anchor = button.current;
    if (!surface || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const viewport = readSafeViewportBounds();
    surface.style.setProperty('--chat-menu-viewport-width', `${viewport.width}px`);
    surface.style.setProperty('--chat-menu-viewport-height', `${viewport.height}px`);
    const position = anchoredSurfacePosition(
      rect,
      { width: surface.offsetWidth, height: surface.offsetHeight },
      viewport,
    );
    surface.style.left = `${position.left}px`;
    surface.style.top = `${position.top}px`;
  }, []);
  const opened = useEffectEvent(() => {
    onOpen?.();
    popover.current?.querySelector<HTMLElement>(MENU_CONTROLS)?.focus({ preventScroll: true });
  });
  useLayoutEffect(() => {
    if (!open) return;
    position();
    opened();
  }, [open, position]);
  useEffect(() => {
    const surface = popover.current;
    if (!surface || !open) return;
    const resize = new ResizeObserver(position);
    resize.observe(surface);
    if (button.current) resize.observe(button.current);
    const scroll = (event: Event) => {
      if (!(event.target instanceof Node) || !surface.contains(event.target)) close();
    };
    const dismiss = (event: Event) => {
      if ((event as CustomEvent<string | null>).detail !== id) close();
    };
    const pointer = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !surface.contains(event.target) &&
        !button.current?.contains(event.target)
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
  const surface = (
    <span
      ref={popover}
      id={id}
      popover={native ? 'auto' : undefined}
      data-chat-menu-fallback={!native || undefined}
      data-chat-menu-open={open || undefined}
      role="dialog"
      className="chat-action-popover"
      aria-label={label}
      onToggle={(event) => {
        const opened = (event.nativeEvent as ToggleEvent).newState === 'open';
        if (opened) closeChatActionMenus(id);
        setOpen(opened);
      }}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('[data-chat-menu-close]')) {
          close(true);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          close(true);
          return;
        }
        // Portaled content must resume the invoker's tab order when focus leaves the menu.
        if (!native && event.key === 'Tab') {
          const controls = event.currentTarget.querySelectorAll<HTMLElement>(MENU_CONTROLS);
          const boundary = event.shiftKey ? controls[0] : controls[controls.length - 1];
          const anchor = button.current;
          if (event.target === boundary && anchor) {
            event.preventDefault();
            event.stopPropagation();
            const scope = anchor.closest('dialog[open]') ?? document;
            const candidates = Array.from(
              scope.querySelectorAll<HTMLElement>(
                'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
              ),
            ).filter(
              (element) =>
                element.tabIndex >= 0 &&
                !event.currentTarget.contains(element) &&
                !element.closest('[inert], [hidden]') &&
                element.getClientRects().length > 0,
            );
            const next = event.shiftKey
              ? anchor
              : (candidates.find(
                  (element) =>
                    anchor.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING,
                ) ?? (scope !== document ? candidates[0] : anchor));
            close();
            next?.focus({ preventScroll: true });
          }
          return;
        }
        if (
          !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey ||
          event.nativeEvent.isComposing ||
          event.target instanceof HTMLSelectElement
        )
          return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(MENU_CONTROLS),
        );
        const index = controls.indexOf(event.target as HTMLElement);
        if (index < 0) return;
        event.preventDefault();
        const next =
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? controls.length - 1
              : (index + (event.key === 'ArrowDown' ? 1 : -1) + controls.length) % controls.length;
        controls[next]?.focus();
      }}
    >
      {children}
    </span>
  );
  return (
    <span className={`chat-action-menu ${className}`}>
      <button
        ref={button}
        type="button"
        className={trigger ? 'chat-coordinate-trigger' : 'chat-icon-button chat-menu-trigger'}
        popoverTarget={native ? id : undefined}
        aria-controls={id}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        title={label}
        onClick={() => {
          if (!native) {
            if (open) close(true);
            else show();
          }
        }}
        onKeyDown={(event) => {
          if (
            event.key === 'ArrowDown' &&
            !event.altKey &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            show();
          }
        }}
      >
        {trigger ?? <MoreHorizontal size={18} aria-hidden="true" />}
      </button>
      {native ? surface : open && portalRoot ? createPortal(surface, portalRoot) : null}
    </span>
  );
}
