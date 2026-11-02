'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import type { ChatContent, ChatMessage } from '@/modules/chat/model/chat-protocol';

/** The same localized content drives the timeline and local search. */
export function useChatMessageContent() {
  const t = useTranslations('chat.server');
  return useCallback(
    (message: ChatMessage): ChatContent => {
      if (Array.isArray(message.content)) return message.content;
      return [{ text: t(message.content.template, message.content.values) }];
    },
    [t],
  );
}
