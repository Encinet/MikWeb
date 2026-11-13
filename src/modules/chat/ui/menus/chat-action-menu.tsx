'use client';

import { MoreHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';
import { ChatMenuSurface } from '@/modules/chat/ui/menus/chat-menu-surface';
import { useChatMenu } from '@/modules/chat/ui/menus/use-chat-menu';

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
  const menu = useChatMenu(onOpen);
  return (
    <span className={`chat-action-menu ${className}`}>
      <button
        ref={menu.setAnchor}
        type="button"
        className={trigger ? 'chat-coordinate-trigger' : 'chat-icon-button chat-menu-trigger'}
        popoverTarget={menu.native ? menu.id : undefined}
        aria-controls={menu.id}
        aria-haspopup="dialog"
        aria-expanded={menu.open}
        aria-label={label}
        title={label}
        onClick={() => {
          if (!menu.native) {
            if (menu.open) menu.close(true);
            else menu.show();
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
            menu.show();
          }
        }}
      >
        {trigger ?? <MoreHorizontal size={18} aria-hidden="true" />}
      </button>
      <ChatMenuSurface menu={menu} label={label}>
        {children}
      </ChatMenuSurface>
    </span>
  );
}
