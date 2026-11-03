'use client';

import { AtSign, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChatPlayerMessage } from '@/modules/chat/model/chat-protocol';
import { ChatActionMenu } from '@/modules/chat/ui/chat-action-menu';
import { CopyButton } from '@/shared/ui/action/copy-button';

export interface ChatMessageActionHandlers {
  onMention: (name: string) => void;
  onPrivate: (uuid: string, name: string) => void;
}

export function ChatMessageActions({
  message,
  owner,
  onMention,
  onPrivate,
}: ChatMessageActionHandlers & { message: ChatPlayerMessage; owner: string }) {
  const t = useTranslations('chat');
  return (
    <ChatActionMenu
      label={t('messageActions.label', { name: message.senderName })}
      className="chat-message-actions"
    >
      <CopyButton
        value={message.content.map((part) => part.text).join('')}
        label={t('messageActions.copy')}
        showLabel
        className="chat-popover-action"
      />
      {message.senderUuid !== owner ? (
        <>
          <button
            type="button"
            className="chat-popover-action"
            data-chat-menu-close
            onClick={() => onMention(message.senderName)}
          >
            <AtSign size={16} aria-hidden="true" />
            {t('messageActions.mention')}
          </button>
          <button
            type="button"
            className="chat-popover-action"
            data-chat-menu-close
            onClick={() => onPrivate(message.senderUuid, message.senderName)}
          >
            <MessageCircle size={16} aria-hidden="true" />
            {t('messageActions.private')}
          </button>
        </>
      ) : null}
    </ChatActionMenu>
  );
}
