'use client';

import { AtSign, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChatPlayerMessage } from '@/modules/chat/model/chat-protocol';
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
  onCopied,
}: ChatMessageActionHandlers & {
  message: ChatPlayerMessage;
  owner: string;
  onCopied: () => void;
}) {
  const t = useTranslations('chat');
  return (
    <>
      <CopyButton
        value={message.content.map((part) => part.text).join('')}
        label={t('messageActions.copy')}
        showLabel
        className="chat-popover-action"
        role="menuitem"
        tabIndex={-1}
        onCopied={onCopied}
      />
      {message.senderUuid !== owner ? (
        <>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className="chat-popover-action"
            data-chat-menu-close
            onClick={() => onMention(message.senderName)}
          >
            <AtSign size={16} aria-hidden="true" />
            {t('messageActions.mention')}
          </button>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className="chat-popover-action"
            data-chat-menu-close
            onClick={() => onPrivate(message.senderUuid, message.senderName)}
          >
            <MessageCircle size={16} aria-hidden="true" />
            {t('messageActions.private')}
          </button>
        </>
      ) : null}
    </>
  );
}
