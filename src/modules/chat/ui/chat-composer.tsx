'use client';

import { Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { RefObject } from 'react';
import { useId } from 'react';
import type { ChatInputHistoryEntry } from '@/modules/chat/model/chat-input-history';
import type { ChatPeer } from '@/modules/chat/model/chat-protocol';
import { CHAT_MESSAGE_MAX_LENGTH } from '@/modules/chat/model/chat-protocol';
import type { useChatNotifications } from '@/modules/chat/model/use-chat-notifications';
import { ChatMentionInput } from '@/modules/chat/ui/chat-mention-input';
import { ChatNotificationSuggestion } from '@/modules/chat/ui/chat-notification-suggestion';

export function ChatComposer({
  title,
  draft,
  inputRef,
  available,
  hint,
  peers,
  history,
  notifications,
  onChange,
  onSend,
}: {
  title: string;
  draft: string;
  inputRef: RefObject<HTMLInputElement | null>;
  available: boolean;
  hint: string | null;
  peers: ChatPeer[];
  history: ChatInputHistoryEntry[];
  notifications: ReturnType<typeof useChatNotifications>;
  onChange: (value: string) => void;
  onSend: () => void;
}) {
  const t = useTranslations('chat');
  const composeId = useId();
  const hintId = useId();
  const length = [...draft].length;
  const overLimit = length > CHAT_MESSAGE_MAX_LENGTH;
  return (
    <div className="chat-compose-area">
      <form
        className="chat-compose chat-input-surface"
        onSubmit={(event) => {
          event.preventDefault();
          onSend();
        }}
      >
        <label htmlFor={composeId} className="sr-only">
          {t('composeLabel', { channel: title })}
        </label>
        <ChatMentionInput
          inputRef={inputRef}
          id={composeId}
          value={draft}
          onChange={onChange}
          enabled={available}
          peers={peers}
          history={history}
          describedBy={hint ? hintId : undefined}
          placeholder={t('composePlaceholder', { channel: title })}
        />
        {length > CHAT_MESSAGE_MAX_LENGTH * 0.8 ? (
          <span
            className={`chat-character-count${overLimit ? ' is-over-limit' : ''}`}
            aria-live={overLimit ? 'polite' : 'off'}
          >
            {length}/{CHAT_MESSAGE_MAX_LENGTH}
          </span>
        ) : null}
        <button
          className="chat-send"
          type="submit"
          aria-label={t('send')}
          title={t('send')}
          disabled={!available || !draft.trim() || overLimit}
        >
          <Send size={19} aria-hidden="true" />
        </button>
      </form>
      {hint ? (
        <p id={hintId} className="chat-compose-hint" role="status">
          {hint}
        </p>
      ) : null}
      {available ? <ChatNotificationSuggestion notifications={notifications} /> : null}
    </div>
  );
}
