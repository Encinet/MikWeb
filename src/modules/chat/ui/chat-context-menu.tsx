'use client';

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode, RefCallback } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatMenuSurface } from '@/modules/chat/ui/chat-menu-surface';
import { useChatMenu } from '@/modules/chat/ui/use-chat-menu';

const LONG_PRESS_DELAY = 550;
const MOVEMENT_TOLERANCE = 10;
const NATIVE_TARGETS =
  'a, button, input, textarea, select, [contenteditable]:not([contenteditable="false"]), [data-chat-context-ignore]';

interface ContextTargetProps extends HTMLAttributes<HTMLElement> {
  ref: RefCallback<HTMLElement>;
  'data-chat-context-target': true;
  'data-chat-context-open': true | undefined;
  'data-chat-context-press': true | undefined;
}

interface ContextKeyboardProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'data-chat-context-keyboard': true;
}

function nativeTarget(target: EventTarget | null, owner: HTMLElement): boolean {
  const node = target instanceof Node ? target : null;
  const element = node?.nodeType === Node.ELEMENT_NODE ? (node as Element) : node?.parentElement;
  const control = element?.closest(NATIVE_TARGETS) ?? null;
  return (
    control !== null && control !== owner && !control.hasAttribute('data-chat-context-keyboard')
  );
}

function selectedText(owner: HTMLElement): boolean {
  const selection = window.getSelection();
  return Boolean(
    selection &&
      !selection.isCollapsed &&
      (owner.contains(selection.anchorNode) || owner.contains(selection.focusNode)),
  );
}

export function ChatContextMenu({
  label,
  actions,
  children,
  disabled = false,
}: {
  label: string;
  actions: (close: () => void) => ReactNode;
  children: (target: ContextTargetProps, keyboard: ContextKeyboardProps) => ReactNode;
  disabled?: boolean;
}) {
  const menu = useChatMenu();
  const press = useRef<{
    id: number;
    x: number;
    y: number;
    timer: ReturnType<typeof setTimeout> | null;
  } | null>(null);
  const suppressClick = useRef(false);
  const [pressing, setPressing] = useState(false);
  const cancel = useCallback(() => {
    if (press.current?.timer) clearTimeout(press.current.timer);
    press.current = null;
    setPressing(false);
  }, []);

  useEffect(
    () => () => {
      if (press.current?.timer) clearTimeout(press.current.timer);
    },
    [],
  );
  useEffect(() => {
    if (!pressing) return;
    const otherPointer = (event: PointerEvent) => {
      if (press.current && event.pointerId !== press.current.id) cancel();
    };
    document.addEventListener('pointerdown', otherPointer, true);
    document.addEventListener('scroll', cancel, true);
    window.addEventListener('blur', cancel);
    return () => {
      document.removeEventListener('pointerdown', otherPointer, true);
      document.removeEventListener('scroll', cancel, true);
      window.removeEventListener('blur', cancel);
    };
  }, [pressing, cancel]);

  const target: ContextTargetProps = {
    ref: menu.setAnchor,
    'aria-haspopup': 'menu',
    'aria-expanded': menu.open,
    'aria-controls': menu.id,
    'aria-keyshortcuts': 'Shift+F10',
    'data-chat-context-target': true,
    'data-chat-context-open': menu.open || undefined,
    'data-chat-context-press': pressing || undefined,
    onContextMenu(event) {
      if (event.shiftKey || nativeTarget(event.target, event.currentTarget)) return;
      if (!press.current && selectedText(event.currentTarget)) return;
      event.preventDefault();
      event.stopPropagation();
      const touch = Boolean(press.current);
      cancel();
      if (suppressClick.current) return;
      suppressClick.current = touch;
      menu.show(
        event.button === 0 && event.clientX === 0 && event.clientY === 0
          ? undefined
          : { x: event.clientX, y: event.clientY },
      );
    },
    onKeyDown(event) {
      suppressClick.current = false;
      if (event.key !== 'ContextMenu' && !(event.key === 'F10' && event.shiftKey)) return;
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.nativeEvent.isComposing ||
        nativeTarget(event.target, event.currentTarget)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      cancel();
      menu.show(
        undefined,
        event.target instanceof HTMLElement ? event.target : event.currentTarget,
      );
    },
    onPointerDown(event) {
      suppressClick.current = false;
      cancel();
      if (
        event.pointerType === 'mouse' ||
        event.button !== 0 ||
        !event.isPrimary ||
        nativeTarget(event.target, event.currentTarget) ||
        selectedText(event.currentTarget)
      )
        return;
      const pending = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        timer: null as ReturnType<typeof setTimeout> | null,
      };
      press.current = pending;
      setPressing(true);
      pending.timer = setTimeout(() => {
        pending.timer = null;
        if (press.current !== pending || !menu.anchor.current?.isConnected) return;
        suppressClick.current = true;
        menu.show({ x: pending.x, y: pending.y });
      }, LONG_PRESS_DELAY);
    },
    onPointerMove(event) {
      const pending = press.current;
      if (
        pending &&
        (event.pointerId !== pending.id ||
          Math.hypot(event.clientX - pending.x, event.clientY - pending.y) > MOVEMENT_TOLERANCE)
      )
        cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onClickCapture(event) {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };

  return (
    <>
      {children(
        disabled
          ? {
              ref: menu.setAnchor,
              'data-chat-context-target': true,
              'data-chat-context-open': undefined,
              'data-chat-context-press': undefined,
            }
          : target,
        {
          type: 'button',
          disabled,
          'aria-label': label,
          'aria-haspopup': 'menu',
          'aria-expanded': menu.open,
          'aria-controls': menu.id,
          'aria-keyshortcuts': 'Shift+F10',
          'data-chat-context-keyboard': true,
          onClick(event) {
            cancel();
            menu.show(undefined, event.currentTarget);
          },
        },
      )}
      <ChatMenuSurface menu={menu} label={label} role="menu">
        {actions(() => menu.close(true))}
      </ChatMenuSurface>
    </>
  );
}
