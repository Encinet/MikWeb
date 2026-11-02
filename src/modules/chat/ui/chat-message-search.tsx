'use client';

import { Hash, MessageCircle, Server, Shield } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { RefObject } from 'react';
import { useId, useMemo, useRef, useState } from 'react';
import type { ChatDestination } from '@/modules/chat/model/chat-destination';
import { destinationKey } from '@/modules/chat/model/chat-destination';
import type { ChatMessage } from '@/modules/chat/model/chat-protocol';
import { messageConversation, messageDestination } from '@/modules/chat/model/chat-protocol';
import { ChatPanel, ChatPanelSearch } from '@/modules/chat/ui/chat-panel';
import { useChatMessageContent } from '@/modules/chat/ui/use-chat-message-content';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';

const PAGE_SIZE = 30;

export interface ChatSearchCriteria {
  query: string;
  scope: 'current' | 'all';
}

function searchPattern(value: string, global = false): RegExp {
  return new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), global ? 'giu' : 'iu');
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return text;
  const parts = [];
  let offset = 0;
  for (const match of text.matchAll(searchPattern(query, true))) {
    parts.push(text.slice(offset, match.index));
    parts.push(<mark key={match.index}>{match[0]}</mark>);
    offset = match.index + match[0].length;
  }
  parts.push(text.slice(offset));
  return parts;
}

function excerpt(text: string, query: string): string {
  const match = text.match(searchPattern(query));
  const characters = [...text];
  const before = [...text.slice(0, match?.index ?? 0)].length;
  const start = Math.max(0, before - 28);
  const end = Math.min(
    characters.length,
    start + Math.max(150, before - start + [...query].length),
  );
  return `${start ? '…' : ''}${characters.slice(start, end).join('')}${end < characters.length ? '…' : ''}`;
}

/** A persistent workspace pane: choosing a message does not discard the search. */
export function ChatMessageSearch({
  id,
  inputRef,
  open,
  criteria,
  onCriteriaChange,
  messages,
  owner,
  conversation,
  onChoose,
  onClose,
}: {
  id: string;
  inputRef: RefObject<HTMLInputElement | null>;
  open: boolean;
  criteria: ChatSearchCriteria;
  onCriteriaChange: (criteria: ChatSearchCriteria) => void;
  messages: ChatMessage[];
  owner: string;
  conversation: ChatDestination;
  onChoose: (destination: ChatDestination, messageId: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations('chat');
  const content = useChatMessageContent();
  const locale = useLocale();
  const summaryId = useId();
  const list = useRef<HTMLDivElement>(null);
  const { query, scope } = criteria;
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<string | null>(null);
  const needle = query.trim();
  const key = destinationKey(conversation);
  const currentLabel =
    conversation.channel === 'private' ? conversation.name : t(`channels.${conversation.channel}`);
  const CurrentIcon =
    conversation.channel === 'public'
      ? Hash
      : conversation.channel === 'staff'
        ? Shield
        : MessageCircle;
  const indexed = useMemo(
    () =>
      open
        ? messages
            .flatMap((message) => {
              const destination = messageDestination(message, owner);
              if (!destination) return [];
              return [
                {
                  message,
                  destination,
                  text: content(message)
                    .map((part) => part.text)
                    .join(''),
                  name:
                    message.kind === 'player' ? message.senderName : (message.subject?.name ?? ''),
                },
              ];
            })
            .toReversed()
        : [],
    [messages, owner, content, open],
  );
  const results = useMemo(() => {
    if (!needle) return [];
    const pattern = searchPattern(needle);
    return indexed.filter(
      ({ message, text, name }) =>
        (scope === 'all' || messageConversation(message, owner) === key) &&
        (pattern.test(text) || pattern.test(name)),
    );
  }, [indexed, needle, scope, owner, key]);
  const format = useMemo(
    () => ({
      date: new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }),
      time: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }),
      full: new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'short' }),
    }),
    [locale],
  );
  const choose = (result: (typeof results)[number]) => {
    setSelected(result.message.id);
    onChoose(result.destination, result.message.id);
  };
  const resetResults = () => {
    setLimit(PAGE_SIZE);
    setSelected(null);
    if (list.current) list.current.scrollTop = 0;
  };
  const changeScope = (value: typeof scope) => {
    onCriteriaChange({ ...criteria, scope: value });
    resetResults();
  };
  const visible = results.slice(0, limit);
  const today = format.date.format(Date.now());

  return (
    <ChatPanel
      id={id}
      open={open}
      inputRef={inputRef}
      title={t('searchMessages')}
      onClose={onClose}
    >
      <ChatPanelSearch
        inputRef={inputRef}
        label={t('searchMessages')}
        placeholder={t('searchPlaceholder')}
        query={query}
        onChange={(value) => {
          onCriteriaChange({ ...criteria, query: value });
          resetResults();
        }}
        onSubmit={() => {
          if (results[0]) choose(results[0]);
        }}
        maxLength={128}
        describedBy={needle && results.length ? summaryId : undefined}
      />
      <fieldset className="chat-search-scope">
        <legend className="sr-only">{t('searchScope')}</legend>
        <button
          type="button"
          aria-pressed={scope === 'current'}
          aria-label={`${t('searchCurrent')}: ${currentLabel}`}
          title={t('searchCurrent')}
          onClick={() => changeScope('current')}
        >
          <CurrentIcon size={14} aria-hidden="true" />
          <span>{currentLabel}</span>
        </button>
        <button type="button" aria-pressed={scope === 'all'} onClick={() => changeScope('all')}>
          {t('searchAll')}
        </button>
      </fieldset>
      <div className="chat-panel-summary" id={summaryId} role="status">
        {needle && results.length ? t('searchCount', { count: results.length }) : null}
      </div>
      <div ref={list} className="chat-panel-results chat-search-results">
        {!visible.length ? (
          <div className="chat-panel-empty" role={needle ? 'status' : undefined}>
            <p>{needle ? t('searchEmpty') : t('searchHint')}</p>
            {needle ? (
              scope === 'current' ? (
                <button type="button" onClick={() => changeScope('all')}>
                  {t('searchAll')}
                </button>
              ) : (
                <p>{t('searchEmptyHint')}</p>
              )
            ) : null}
          </div>
        ) : (
          <ol>
            {visible.map((result, index) => {
              const { message, destination, text } = result;
              const date = format.date.format(message.createdAt);
              const showDate =
                index === 0 || date !== format.date.format(visible[index - 1].message.createdAt);
              const subject =
                message.kind === 'player'
                  ? { playerUuid: message.senderUuid, name: message.senderName }
                  : message.subject;
              const ContextIcon =
                destination.channel === 'public'
                  ? Hash
                  : destination.channel === 'staff'
                    ? Shield
                    : MessageCircle;
              const showContext =
                scope === 'all' &&
                (message.channel !== 'private' ||
                  message.kind === 'server' ||
                  message.senderUuid === owner);
              return (
                <li key={message.id}>
                  {showDate ? (
                    <h3 className="chat-search-date">{date === today ? t('today') : date}</h3>
                  ) : null}
                  <button
                    type="button"
                    className="chat-search-result"
                    data-chat-panel-result
                    aria-current={selected === message.id ? 'true' : undefined}
                    onClick={() => choose(result)}
                  >
                    <span className="chat-search-result__avatar" aria-hidden="true">
                      {subject ? (
                        <MinecraftAvatar uuid={subject.playerUuid} name={subject.name} size={32} />
                      ) : (
                        <Server size={20} />
                      )}
                    </span>
                    <span className="chat-search-result__content">
                      <span className="chat-search-result__meta">
                        <strong>
                          <HighlightedText
                            text={
                              message.kind === 'player' ? message.senderName : t('server.label')
                            }
                            query={needle}
                          />
                        </strong>
                        <time
                          dateTime={new Date(message.createdAt).toISOString()}
                          title={format.full.format(message.createdAt)}
                        >
                          {format.time.format(message.createdAt)}
                        </time>
                      </span>
                      <span className="chat-search-result__text">
                        <HighlightedText text={excerpt(text, needle)} query={needle} />
                      </span>
                      {showContext ? (
                        <span className="chat-search-result__context">
                          <ContextIcon size={12} aria-hidden="true" />
                          {destination.channel === 'private'
                            ? destination.name
                            : t(`channels.${destination.channel}`)}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
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
    </ChatPanel>
  );
}
