'use client';

import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Fragment } from 'react';
import type { ChatServerMessage } from '@/modules/chat/model/chat-protocol';
import { ChatMessageContent } from '@/modules/chat/ui/chat-message-content';
import { useChatMessageContent } from '@/modules/chat/ui/use-chat-message-content';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';

interface ActivityPlayer {
  name: string;
  uuid?: string;
}
type ActivityTemplate = Extract<ChatServerMessage['content'], { template: string }>['template'];

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

function summarizeActivities(messages: ChatServerMessage[]) {
  const actions = new Map<ActivityTemplate, ChatServerMessage[]>();
  const others: ChatServerMessage[] = [];
  for (const message of messages) {
    if (Array.isArray(message.content)) {
      others.push(message);
      continue;
    }
    const events = actions.get(message.content.template);
    if (events) events.push(message);
    else actions.set(message.content.template, [message]);
  }
  return {
    actions: [...actions].map(([template, events]) => ({
      template,
      events,
      players: activityPlayers(events),
    })),
    others,
  };
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

/** Each action keeps named participants visible; expansion preserves the full chronology. */
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
  const firstTime = messages[0]?.createdAt ?? 0;
  const lastTime = messages.at(-1)?.createdAt ?? 0;
  const renderTime = (first: number, last: number) => {
    const start = formatTime(first);
    const end = formatTime(last);
    return (
      <time
        dateTime={new Date(last).toISOString()}
        title={start === end ? undefined : `${start} – ${end}`}
      >
        {end}
      </time>
    );
  };
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
        <span className="chat-activity-summary">
          {summaries.actions.map(({ template, players, events }) => (
            <span className="chat-activity-summary-line" key={template}>
              <span>
                {t.rich(`activity.${template}`, {
                  players: () => (
                    <>
                      {players.slice(0, 2).map((player, index) => (
                        <Fragment key={player.uuid ?? player.name}>
                          {index > 0 ? t('activity.playerSeparator') : null}
                          <PlayerName {...player} />
                        </Fragment>
                      ))}
                      {players.length > 2
                        ? t('activity.morePlayers', { count: players.length })
                        : null}
                    </>
                  ),
                })}
                {events.length > players.length ? (
                  <span className="chat-activity-repetitions">
                    {t('activity.repeatCount', { count: events.length })}
                  </span>
                ) : null}
              </span>
              {renderTime(events[0].createdAt, events[events.length - 1].createdAt)}
            </span>
          ))}
          {summaries.others.length ? (
            <span className="chat-activity-summary-line">
              <span>{t('activity.otherEvents', { count: summaries.others.length })}</span>
              {renderTime(
                summaries.others[0].createdAt,
                summaries.others[summaries.others.length - 1].createdAt,
              )}
            </span>
          ) : null}
        </span>
        <span className="chat-activity-expanded-heading">
          <span>{t('activity.count', { count: messages.length })}</span>
          {renderTime(firstTime, lastTime)}
        </span>
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
