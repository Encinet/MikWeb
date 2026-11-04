'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ChatServerMessage } from '@/modules/chat/model/chat-protocol';
import { ChatMessageContent } from '@/modules/chat/ui/chat-message-content';
import { useChatMessageContent } from '@/modules/chat/ui/use-chat-message-content';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';

interface ActivityPlayer {
  name: string;
  uuid?: string;
}

function activityPlayers(messages: ChatServerMessage[]): ActivityPlayer[] {
  const players = new Map<string, ActivityPlayer>();
  for (const message of messages) {
    const name = Array.isArray(message.content)
      ? message.subject?.name
      : message.content.values.name;
    if (!name) continue;
    const key = name.toLowerCase();
    const player = players.get(key);
    if (!player || (!player.uuid && message.subject))
      players.set(key, { name, uuid: message.subject?.playerUuid });
  }
  return [
    ...new Map(
      [...players.values()].map((player) => [player.uuid ?? player.name, player]),
    ).values(),
  ];
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

/** A bounded summary keeps quiet activity compact; expansion preserves the full chronology. */
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
  const players = activityPlayers(messages);
  const summary =
    players.length === 1
      ? t('activity.summarySingle', { name: players[0].name, count: messages.length })
      : players.length > 1
        ? t('activity.summary', { players: players.length, count: messages.length })
        : t('activity.count', { count: messages.length });
  const firstTime = messages[0]?.createdAt ?? 0;
  const lastTime = messages.at(-1)?.createdAt ?? 0;
  const startTime = formatTime(firstTime);
  const endTime = formatTime(lastTime);
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
  const lines = messages.map((message) => (
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
  ));
  if (messages.length === 1)
    return <ul className="chat-activity-group chat-activity-single">{lines}</ul>;

  return (
    <details className="chat-activity-group" open={forcedOpen || undefined}>
      <summary>
        <ChevronDown size={13} aria-hidden="true" />
        <span className="chat-activity-summary" title={summary}>
          {players.length ? (
            <span className="chat-activity-preview" aria-hidden="true">
              {players.slice(0, 3).map((player) => (
                <ActivityAvatar key={player.uuid ?? player.name} {...player} />
              ))}
            </span>
          ) : null}
          <span className="chat-activity-summary-label">{summary}</span>
        </span>
        <time
          dateTime={new Date(lastTime).toISOString()}
          title={startTime === endTime ? undefined : `${startTime} – ${endTime}`}
        >
          {endTime}
        </time>
      </summary>
      <ul
        className="chat-activity-details"
        aria-label={t('activity.count', { count: messages.length })}
      >
        {lines}
      </ul>
    </details>
  );
}
