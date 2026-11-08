'use client';

import { AtSign, MessageCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChatUserMessage } from '@/modules/chat/model/chat-protocol';
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
  message: ChatUserMessage;
  owner: string;
  onCopied: () => void;
}) {
  const t = useTranslations('chat');
  const playerUuid = message.sender.playerUuid;
  const playerName = message.sender.playerName ?? message.sender.name;
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
      {playerUuid && playerUuid !== owner ? (
        <>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className="chat-popover-action"
            data-chat-menu-close
            onClick={() => onMention(playerName)}
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
            onClick={() => onPrivate(playerUuid, playerName)}
          >
            <MessageCircle size={16} aria-hidden="true" />
            {t('messageActions.private')}
          </button>
        </>
      ) : null}
    </>
  );
}
