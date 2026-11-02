'use client';

import { Server } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useMemo, useState } from 'react';
import type { ChatDestination } from '@/modules/chat/model/chat-destination';
import type { ChatMessage } from '@/modules/chat/model/chat-protocol';
import { messageConversation, messageDestination } from '@/modules/chat/model/chat-protocol';
import { useChatMessageContent } from '@/modules/chat/ui/use-chat-message-content';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';

const PAGE_SIZE = 50;

export function ChatMessageSearch({
  messages,
  owner,
  conversation,
  onChoose,
}: {
  messages: ChatMessage[];
  owner: string;
  conversation: string;
  onChoose: (destination: ChatDestination, messageId: string) => void;
}) {
  const t = useTranslations('chat');
  const content = useChatMessageContent();
  const locale = useLocale();
  const id = useId();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'current' | 'all'>('current');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const needle = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!needle) return [];
    return messages
      .filter(
        (message) =>
          (scope === 'all' || messageConversation(message, owner) === conversation) &&
          (content(message)
            .map((part) => part.text)
            .join('')
            .toLowerCase()
            .includes(needle) ||
            (message.kind === 'player' ? message.senderName : (message.subject?.name ?? ''))
              .toLowerCase()
              .includes(needle)),
      )
      .toReversed();
  }, [messages, needle, scope, owner, conversation, content]);
  const time = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale],
  );
  return (
    <div className="chat-message-search">
      <label className="sr-only" htmlFor={id}>
        {t('searchMessages')}
      </label>
      <input
        id={id}
        type="search"
        data-dialog-initial-focus
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setLimit(PAGE_SIZE);
        }}
        placeholder={t('searchMessages')}
        maxLength={128}
        autoComplete="off"
      />
      <fieldset className="chat-search-scope">
        <legend className="sr-only">{t('searchScope')}</legend>
        {(['current', 'all'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={scope === value}
            onClick={() => {
              setScope(value);
              setLimit(PAGE_SIZE);
            }}
          >
            {t(value === 'current' ? 'searchCurrent' : 'searchAll')}
          </button>
        ))}
      </fieldset>
      {needle ? (
        <p className="chat-search-summary" role="status">
          {results.length ? t('searchCount', { count: results.length }) : t('searchEmpty')}
        </p>
      ) : null}
      <ol className="chat-search-results">
        {results.slice(0, limit).map((message) => {
          const destination = messageDestination(message, owner);
          if (!destination) return null;
          const label =
            destination.channel === 'private'
              ? destination.name
              : t(`channels.${destination.channel}`);
          const text = content(message)
            .map((part) => part.text)
            .join('');
          const subject =
            message.kind === 'player'
              ? { playerUuid: message.senderUuid, name: message.senderName }
              : message.subject;
          const match = text.toLowerCase().indexOf(needle);
          const start = Math.max(0, match - 40);
          const excerpt = text.slice(start, start + 180);
          const at = excerpt.toLowerCase().indexOf(needle);
          return (
            <li key={message.id}>
              <button
                type="button"
                className="chat-search-result"
                onClick={() => onChoose(destination, message.id)}
              >
                <span aria-hidden="true">
                  {subject ? (
                    <MinecraftAvatar uuid={subject.playerUuid} name={subject.name} size={28} />
                  ) : (
                    <Server size={20} />
                  )}
                </span>
                <span className="chat-search-result__content">
                  <span className="chat-search-result__meta">
                    <strong>
                      {message.kind === 'player' ? message.senderName : t('server.label')}
                    </strong>
                    {scope === 'all' &&
                    (message.channel !== 'private' ||
                      message.kind === 'server' ||
                      message.senderUuid === owner) ? (
                      <span>{label}</span>
                    ) : null}
                    <time dateTime={new Date(message.createdAt).toISOString()}>
                      {time.format(message.createdAt)}
                    </time>
                  </span>
                  <span className="chat-search-result__text">
                    {start ? '…' : ''}
                    {at < 0 ? (
                      excerpt
                    ) : (
                      <>
                        {excerpt.slice(0, at)}
                        <mark>{excerpt.slice(at, at + needle.length)}</mark>
                        {excerpt.slice(at + needle.length)}
                      </>
                    )}
                    {start + excerpt.length < text.length ? '…' : ''}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {results.length > limit ? (
        <button
          type="button"
          className="chat-history-more"
          onClick={() => setLimit((value) => value + PAGE_SIZE)}
        >
          {t('loadMoreResults')}
        </button>
      ) : null}
    </div>
  );
}
