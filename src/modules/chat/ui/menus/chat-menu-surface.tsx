'use client';

import type { HTMLAttributes, ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { ChatMenuController } from '@/modules/chat/ui/menus/use-chat-menu';
import { CHAT_MENU_CONTROLS } from '@/modules/chat/ui/menus/use-chat-menu';

export function ChatMenuSurface({
  menu,
  label,
  role = 'dialog',
  children,
}: {
  menu: ChatMenuController;
  label: string;
  role?: 'dialog' | 'menu';
  children: ReactNode;
}) {
  const surfaceProps = {
    ref: menu.surface,
    id: menu.id,
    // An auto popover opened during a long press light-dismisses on that same pointerup.
    popover: menu.native ? (role === 'menu' ? 'manual' : 'auto') : undefined,
    'data-chat-menu-fallback': !menu.native || undefined,
    'data-chat-menu-open': menu.open || undefined,
    className: `chat-action-popover${role === 'menu' ? ' chat-context-menu' : ''}`,
    'aria-label': label,
    onToggle: (event) => menu.toggle((event.nativeEvent as ToggleEvent).newState === 'open'),
    // Let the button action run before closing can unmount it or move focus.
    onClick: (event) => {
      if ((event.target as HTMLElement).closest('[data-chat-menu-close]')) menu.close(true);
    },
    onKeyDown: (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        menu.close(true);
        return;
      }
      const controls = Array.from(
        event.currentTarget.querySelectorAll<HTMLElement>(CHAT_MENU_CONTROLS),
      );
      if (event.key === 'Tab' && (role === 'menu' || !menu.native)) {
        const boundary = event.shiftKey ? controls[0] : controls[controls.length - 1];
        const anchor = menu.opener.current ?? menu.anchor.current;
        if ((role === 'menu' || event.target === boundary) && anchor) {
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
          const previous = candidates.filter(
            (element) => anchor.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_PRECEDING,
          );
          const next = event.shiftKey
            ? role === 'menu'
              ? (previous.at(-1) ?? (scope !== document ? candidates.at(-1) : anchor))
              : anchor
            : (candidates.find(
                (element) =>
                  anchor.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING,
              ) ?? (scope !== document ? candidates[0] : anchor));
          menu.close();
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
      const index = controls.indexOf(event.target as HTMLElement);
      if (index < 0) return;
      event.preventDefault();
      event.stopPropagation();
      const next =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? controls.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + controls.length) % controls.length;
      controls[next]?.focus({ preventScroll: true });
    },
  } satisfies HTMLAttributes<HTMLSpanElement> & {
    ref: RefObject<HTMLSpanElement | null>;
    'data-chat-menu-fallback': true | undefined;
    'data-chat-menu-open': true | undefined;
  };
  const surface =
    role === 'menu' ? (
      <span {...surfaceProps} role="menu">
        {menu.open ? children : null}
      </span>
    ) : (
      <span {...surfaceProps} role="dialog">
        {children}
      </span>
    );
  return menu.native
    ? surface
    : menu.open && menu.portalRoot
      ? createPortal(surface, menu.portalRoot)
      : null;
}
