'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Fragment } from 'react';
import type { ChatServerMessage } from '@/modules/chat/model/chat-protocol';
import { ChatMessageContent } from '@/modules/chat/ui/chat-message-content';
import { useChatMessageContent } from '@/modules/chat/ui/use-chat-message-content';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';

type PresenceContent = Extract<ChatServerMessage['content'], { template: string }>;
interface ActivityPlayer {
  name: string;
  uuid?: string;
}
interface PlayerSummary {
  kind: 'players';
  template: PresenceContent['template'];
  players: Map<string, ActivityPlayer>;
}
type ActivitySummary = PlayerSummary | { kind: 'message'; message: ChatServerMessage };

function summarizeActivities(messages: ChatServerMessage[]): ActivitySummary[] {
  const summaries: ActivitySummary[] = [];
  const players = new Map<PresenceContent['template'], PlayerSummary>();
  for (const message of messages) {
    if (Array.isArray(message.content)) {
      summaries.push({ kind: 'message', message });
      continue;
    }
    const { template, values } = message.content;
    let summary = players.get(template);
    if (!summary) {
      summary = { kind: 'players', template, players: new Map() };
      players.set(template, summary);
      summaries.push(summary);
    }
    const player = summary.players.get(values.name);
    if (!player || (!player.uuid && message.subject))
      summary.players.set(values.name, { name: values.name, uuid: message.subject?.playerUuid });
  }
  return summaries;
}

function ActivityAvatar({ name, uuid }: ActivityPlayer) {
  return (
    <span className="chat-activity-avatar" aria-hidden="true">
      <MinecraftAvatar uuid={uuid} name={name} size={18} />
    </span>
  );
}

function PlayerName({ name, uuid }: ActivityPlayer) {
  return (
    <span className="chat-activity-player">
      <ActivityAvatar name={name} uuid={uuid} />
      <span>{name}</span>
    </span>
  );
}

/** Summaries group player names by action; expansion preserves the full event chronology. */
export function ChatActivityGroup({
  messages,
  highlighted,
  revealedId,
  formatTime,
}: {
  messages: ChatServerMessage[];
  highlighted: string | null;
  revealedId: string | null;
  formatTime: (timestamp: number) => string;
}) {
  const t = useTranslations('chat');
  const content = useChatMessageContent();
  const forcedOpen = messages.some(
    (message) => message.id === highlighted || message.id === revealedId,
  );
  const summaries = summarizeActivities(messages);
  const lastTime = messages.at(-1)?.createdAt ?? 0;
  const renderActivity = (message: ChatServerMessage) =>
    Array.isArray(message.content) ? (
      <>
        {message.subject ? (
          <>
            <ActivityAvatar name={message.subject.name} uuid={message.subject.playerUuid} />{' '}
          </>
        ) : null}
        <ChatMessageContent content={content(message)} />
      </>
    ) : (
      t.rich(`activity.${message.content.template}`, {
        players: () => (
          <PlayerName name={message.content.values.name} uuid={message.subject?.playerUuid} />
        ),
      })
    );
  return (
    <details className="chat-activity-group" open={forcedOpen || undefined}>
      <summary>
        <ChevronDown size={13} aria-hidden="true" />
        <span className="chat-activity-summary">
          {summaries.map((summary) => (
            <span
              key={summary.kind === 'players' ? summary.template : `message:${summary.message.id}`}
            >
              {summary.kind === 'players'
                ? t.rich(`activity.${summary.template}`, {
                    players: () =>
                      [...summary.players.values()].map((player, index) => (
                        <Fragment key={player.name}>
                          {index > 0 ? ', ' : null}
                          <PlayerName name={player.name} uuid={player.uuid} />
                        </Fragment>
                      )),
                  })
                : renderActivity(summary.message)}
            </span>
          ))}
        </span>
        <span className="chat-activity-count">
          {t('activity.count', { count: messages.length })}
        </span>
        <time dateTime={new Date(lastTime).toISOString()}>{formatTime(lastTime)}</time>
      </summary>
      <ul
        className="chat-activity-details"
        aria-label={t('activity.count', { count: messages.length })}
      >
        {messages.map((message) => (
          <li
            key={message.id}
            data-chat-message={message.id}
            tabIndex={-1}
            className={`chat-activity-line${highlighted === message.id ? ' is-highlighted' : ''}`}
          >
            <span>{renderActivity(message)}</span>
            <time dateTime={new Date(message.createdAt).toISOString()}>
              {formatTime(message.createdAt)}
            </time>
          </li>
        ))}
      </ul>
    </details>
  );
}
