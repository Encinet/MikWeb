'use client';

import {
  ArrowDown,
  ArrowLeft,
  Bell,
  Check,
  Gamepad2,
  Globe,
  Hash,
  Loader2,
  LogIn,
  LogOut,
  MessageCircle,
  PanelLeft,
  Send,
  Settings2,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { AuthAccount } from '@/modules/auth/model/auth-types';
import { useAuth } from '@/modules/auth/model/use-auth';
import type { ChatDestination, ChatMessage, ChatPeer } from '@/modules/chat/model/chat-protocol';
import { destinationKey, messageConversation } from '@/modules/chat/model/chat-protocol';
import { useChatNotifications } from '@/modules/chat/model/use-chat-notifications';
import { useWebChat } from '@/modules/chat/model/use-web-chat';
import { ChatMessageContent } from '@/modules/chat/ui/chat-message-content';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';
import { SITE_LOGO_PATH } from '@/shared/config/site-config';
import { Link } from '@/shared/i18n/routing';
import { AppDialog } from '@/shared/ui/dialog/app-dialog';

function dayKey(timestamp: number) {
  const date = new Date(timestamp);
  return [date.getFullYear(), date.getMonth(), date.getDate()].join('-');
}

function groupMessages(messages: ChatMessage[]) {
  const groups: ChatMessage[][] = [];
  for (const message of messages) {
    const last = groups.at(-1)?.at(-1);
    if (
      last &&
      last.senderUuid === message.senderUuid &&
      last.source === message.source &&
      message.createdAt - last.createdAt < 180_000 &&
      dayKey(last.createdAt) === dayKey(message.createdAt)
    ) {
      groups.at(-1)?.push(message);
    } else groups.push([message]);
  }
  return groups;
}

export function ChatPage() {
  const { account, isLoading } = useAuth();
  const t = useTranslations('chat');
  if (account) return <ChatWorkspace key={account.playerUuid} account={account} />;
  return (
    <section className="chat-workspace chat-gate" aria-label={t('title')}>
      <Link href="/" className="chat-back">
        <ArrowLeft size={16} aria-hidden="true" />
        <Image src={SITE_LOGO_PATH} alt="" width={32} height={32} />
        <span>Mik</span>
      </Link>
      <div className="chat-gate__content">
        {isLoading ? (
          <Loader2 className="chat-spinner" size={26} aria-hidden="true" />
        ) : (
          <MessageCircle size={32} aria-hidden="true" />
        )}
        <h1>{t('title')}</h1>
        {isLoading ? (
          <p role="status">{t('status.authorizing')}</p>
        ) : (
          <Link href="/login" className="chat-primary">
            {t('login')}
          </Link>
        )}
      </div>
    </section>
  );
}

function ChatWorkspace({ account }: { account: AuthAccount }) {
  const t = useTranslations('chat');
  const locale = useLocale();
  const [selected, setSelected] = useState<ChatDestination>({ channel: 'public' });
  const [opened, setOpened] = useState<Map<string, string>>(new Map());
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [overlay, setOverlay] = useState<'channels' | 'players' | 'settings' | null>(null);
  const [busy, setBusy] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const nearBottom = useRef(true);
  const searchId = useId();
  const composeId = useId();
  const hintId = useId();
  const historyHelpId = useId();
  const owner = account.playerUuid;
  const key = destinationKey(selected);
  const choose = useCallback((destination: ChatDestination) => {
    nearBottom.current = true;
    setAtBottom(true);
    setSelected(destination);
    setOverlay(null);
    if (destination.channel === 'private')
      setOpened((previous) => new Map(previous).set(destination.targetUuid, destination.name));
    requestAnimationFrame(() => {
      if (log.current) log.current.scrollTop = log.current.scrollHeight;
      input.current?.focus({ preventScroll: true });
    });
  }, []);
  const chat = useWebChat();
  const notifications = useChatNotifications(
    owner,
    selected,
    choose,
    chat.status === 'online',
    chat.staff,
  );
  useEffect(
    () => chat.subscribeMessages(notifications.receive),
    [chat.subscribeMessages, notifications.receive],
  );
  const draft = drafts[key] ?? '';
  const length = [...draft].length;
  const online = chat.status === 'online';
  const joining = ['connecting', 'authorizing', 'reconnecting'].includes(chat.status);
  const peer =
    selected.channel === 'private'
      ? chat.players.find((player) => player.playerUuid === selected.targetUuid)
      : null;
  const available =
    online &&
    (selected.channel !== 'private' || Boolean(peer)) &&
    (selected.channel !== 'staff' || chat.staff);
  const title =
    selected.channel === 'private'
      ? (peer?.name ?? selected.name)
      : t(`channels.${selected.channel}`);
  const composeHint = !online
    ? draft
      ? t('composeOffline')
      : null
    : selected.channel === 'private' && !peer
      ? t('privateOffline')
      : selected.channel === 'staff' && !chat.staff
        ? t('staffUnavailable')
        : null;
  const visible = useMemo(
    () => chat.messages.filter((message) => messageConversation(message, owner) === key),
    [chat.messages, owner, key],
  );
  const groups = useMemo(() => groupMessages(visible), [visible]);
  const pending = chat.pending.filter((message) => destinationKey(message.destination) === key);
  const threads = useMemo(() => {
    const result = new Map(opened);
    for (const message of chat.messages) {
      if (message.channel !== 'private') continue;
      const id = message.senderUuid === owner ? message.targetUuid : message.senderUuid;
      const name = message.senderUuid === owner ? message.targetName : message.senderName;
      if (id && name) result.set(id, name);
    }
    return [...result].map(([id, name]) => ({
      id,
      name: chat.players.find((player) => player.playerUuid === id)?.name ?? name,
    }));
  }, [opened, chat.messages, chat.players, owner]);
  const time = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }),
    [locale],
  );
  const date = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }),
    [locale],
  );
  const fullDate = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }),
    [locale],
  );

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const element = document.documentElement;
    const resize = () => {
      if (viewport.scale !== 1) return;
      element.style.setProperty('--chat-viewport-height', `${viewport.height}px`);
      element.style.setProperty('--chat-viewport-top', `${viewport.offsetTop}px`);
    };
    resize();
    viewport.addEventListener('resize', resize);
    viewport.addEventListener('scroll', resize);
    return () => {
      viewport.removeEventListener('resize', resize);
      viewport.removeEventListener('scroll', resize);
      element.style.removeProperty('--chat-viewport-height');
      element.style.removeProperty('--chat-viewport-top');
    };
  }, []);

  useEffect(() => {
    const element = log.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      if (nearBottom.current) element.scrollTop = element.scrollHeight;
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const lastMessage = visible.at(-1)?.id;
  const pendingCount = pending.length;
  useEffect(() => {
    if (!lastMessage && pendingCount === 0) return;
    if (nearBottom.current && log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [lastMessage, pendingCount]);

  const errorText = (code: string) =>
    t.has(`errors.${code}`) ? t(`errors.${code}`) : t('errors.default');
  const send = () => {
    if (available && chat.send(selected, draft)) {
      nearBottom.current = true;
      setDrafts((current) => ({ ...current, [key]: '' }));
    }
  };
  const openPlayers = () => {
    setSearch('');
    setOverlay('players');
  };
  const navigation = (
    <ChatNavigation selected={selected} staff={chat.staff} threads={threads} onChoose={choose} />
  );
  const RoomIcon =
    selected.channel === 'public' ? Hash : selected.channel === 'staff' ? Shield : MessageCircle;

  return (
    <section className="chat-workspace" aria-label={t('title')}>
      <aside className="chat-sidebar">
        <Link href="/" className="chat-brand" aria-label={t('backHome')}>
          <Image src={SITE_LOGO_PATH} alt="" width={36} height={36} />
          <span>Mik</span>
          <ArrowLeft className="chat-brand__back" size={15} aria-hidden="true" />
        </Link>
        {navigation}
        <Link href="/account" className="chat-identity" aria-label={t('backAccount')}>
          <MinecraftAvatar uuid={owner} name={account.currentName} size={28} />
          <span>{account.currentName}</span>
          <ArrowLeft size={15} aria-hidden="true" />
        </Link>
      </aside>

      <div className="chat-conversation">
        <header className="chat-topbar">
          <button
            type="button"
            className="chat-icon-button chat-mobile-menu"
            aria-label={t('channelList')}
            aria-haspopup="dialog"
            onClick={() => setOverlay('channels')}
          >
            <PanelLeft size={20} aria-hidden="true" />
          </button>
          <div className="chat-room-title">
            <span className="chat-room-mark" aria-hidden="true">
              {selected.channel === 'private' ? (
                <MinecraftAvatar uuid={selected.targetUuid} name={title} size={32} />
              ) : (
                <RoomIcon size={22} />
              )}
            </span>
            <div className="chat-room-copy">
              <h1>{title}</h1>
              {selected.channel === 'private' ? (
                <div className="chat-private-presence">
                  {peer ? <PeerPresence player={peer} /> : t('offline')}
                </div>
              ) : null}
            </div>
          </div>
          {online || joining ? (
            <span className={`chat-connection-status${online ? ' is-online' : ''}`} role="status">
              {joining ? (
                <Loader2 className="chat-spinner" size={14} aria-hidden="true" />
              ) : online ? (
                <Check size={14} aria-hidden="true" />
              ) : null}
              <span>{t(`status.${chat.status}`)}</span>
            </span>
          ) : null}
          {online ? (
            <button
              type="button"
              className="chat-icon-button chat-online-button"
              aria-label={t('onlinePlayers', { count: chat.players.length })}
              title={t('onlinePlayers', { count: chat.players.length })}
              aria-haspopup="dialog"
              onClick={openPlayers}
            >
              <span className="chat-avatar-stack" aria-hidden="true">
                {chat.players.slice(0, 3).map((player) => (
                  <MinecraftAvatar
                    key={player.playerUuid}
                    uuid={player.playerUuid}
                    name={player.name}
                    size={24}
                  />
                ))}
              </span>
              <Users className="chat-online-icon" size={17} aria-hidden="true" />
              <span>{chat.players.length}</span>
            </button>
          ) : null}
          {!online && !joining ? (
            <button type="button" className="chat-primary chat-join" onClick={chat.join}>
              <LogIn size={15} aria-hidden="true" />
              {t('join')}
            </button>
          ) : null}
          <button
            type="button"
            className="chat-icon-button"
            aria-label={t('settings')}
            title={t('settings')}
            aria-haspopup="dialog"
            onClick={() => setOverlay('settings')}
          >
            <Settings2 size={19} aria-hidden="true" />
          </button>
        </header>

        {chat.error ? (
          <p className="chat-feedback" role="alert">
            {errorText(chat.error)}
          </p>
        ) : null}
        {chat.storageFailed ? (
          <p className="chat-feedback" role="status">
            {t('storageFailed')}
          </p>
        ) : null}

        <div className="chat-stream">
          <div
            ref={log}
            className="chat-log"
            role="log"
            aria-label={title}
            aria-live={online ? 'polite' : 'off'}
            aria-relevant="additions text"
            onScroll={(event) => {
              const element = event.currentTarget;
              nearBottom.current =
                element.scrollHeight - element.scrollTop - element.clientHeight < 80;
              setAtBottom(nearBottom.current);
            }}
          >
            <div className="chat-log__content">
              {!visible.length && !pending.length ? (
                <div className="chat-empty">
                  <RoomIcon size={32} strokeWidth={1.25} aria-hidden="true" />
                  <p>{online ? t('emptyHistory') : t('emptyOffline')}</p>
                </div>
              ) : null}
              {groups.map((group, index) => {
                const first = group[0];
                if (!first) return null;
                const previous = groups[index - 1]?.[0];
                const showDate =
                  !previous || dayKey(previous.createdAt) !== dayKey(first.createdAt);
                const SourceIcon = first.source === 'game' ? Gamepad2 : Globe;
                return (
                  <Fragment key={first.id}>
                    {showDate ? (
                      <div className="chat-date">
                        <span>
                          {dayKey(first.createdAt) === dayKey(Date.now())
                            ? t('today')
                            : date.format(first.createdAt)}
                        </span>
                      </div>
                    ) : null}
                    <article
                      className={`chat-message${first.senderUuid === owner ? ' is-own' : ''}`}
                    >
                      <div className="chat-message__avatar" aria-hidden="true">
                        <MinecraftAvatar
                          uuid={first.senderUuid}
                          name={first.senderName}
                          size={36}
                        />
                      </div>
                      <div className="chat-message__content">
                        <div className="chat-message__meta">
                          <strong>{first.senderName}</strong>
                          <span
                            className="chat-message__source"
                            title={t(`source.${first.source}`)}
                          >
                            <SourceIcon size={12} aria-hidden="true" />
                            <span className="sr-only">{t(`source.${first.source}`)}</span>
                          </span>
                          <time
                            dateTime={new Date(first.createdAt).toISOString()}
                            title={fullDate.format(first.createdAt)}
                          >
                            {time.format(first.createdAt)}
                          </time>
                        </div>
                        {group.map((message) => (
                          <p key={message.id} title={fullDate.format(message.createdAt)}>
                            <ChatMessageContent content={message.content} />
                          </p>
                        ))}
                      </div>
                    </article>
                  </Fragment>
                );
              })}
              {pending.map((message) => (
                <article className="chat-message chat-message--pending" key={message.requestId}>
                  <div className="chat-message__avatar" aria-hidden="true">
                    <MinecraftAvatar uuid={owner} name={account.currentName} size={36} />
                  </div>
                  <div className="chat-message__content">
                    <div className="chat-message__meta">
                      <strong>{account.currentName}</strong>
                      <span>{t(`delivery.${message.status}`)}</span>
                    </div>
                    <p>{message.text}</p>
                    {message.error ? (
                      <p className="chat-message__error">{errorText(message.error)}</p>
                    ) : null}
                    {message.status !== 'sending' ? (
                      <button
                        type="button"
                        className="chat-text-button"
                        onClick={() => {
                          setDrafts((current) => ({
                            ...current,
                            [key]: [current[key], message.text].filter(Boolean).join(' '),
                          }));
                          chat.dismissPending(message.requestId);
                          input.current?.focus();
                        }}
                      >
                        {t('restoreDraft')}
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
          {!atBottom ? (
            <button
              className="chat-latest"
              type="button"
              onClick={() => {
                nearBottom.current = true;
                setAtBottom(true);
                if (log.current) log.current.scrollTop = log.current.scrollHeight;
              }}
            >
              <ArrowDown size={14} aria-hidden="true" />
              {t('latest')}
            </button>
          ) : null}
        </div>
        {selected.channel === 'public' && chat.notice ? (
          <div className="chat-notice" aria-live="polite">
            <p>{t(chat.notice.joined ? 'webJoined' : 'webLeft', { name: chat.notice.name })}</p>
          </div>
        ) : null}
        <div className="chat-compose-area">
          <form
            className="chat-compose"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <label htmlFor={composeId} className="sr-only">
              {t('composeLabel', { channel: title })}
            </label>
            <input
              ref={input}
              id={composeId}
              value={draft}
              onChange={(event) =>
                setDrafts((current) => ({ ...current, [key]: event.target.value }))
              }
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)
                )
                  event.preventDefault();
              }}
              maxLength={2000}
              autoComplete="off"
              aria-describedby={composeHint ? hintId : undefined}
              placeholder={
                selected.channel === 'private'
                  ? t('privatePlaceholder', { name: title })
                  : t('channelPlaceholder', { channel: title })
              }
            />
            {length > 800 ? (
              <span
                className={`chat-character-count${length > 1000 ? ' is-over-limit' : ''}`}
                aria-live={length > 1000 ? 'polite' : 'off'}
              >
                {length}/1000
              </span>
            ) : null}
            <button
              className="chat-send"
              type="submit"
              aria-label={t('send')}
              title={t('send')}
              disabled={!available || !draft.trim() || length > 1000}
            >
              <Send size={19} aria-hidden="true" />
            </button>
          </form>
          {composeHint ? (
            <p id={hintId} className="chat-compose-hint" role="status">
              {composeHint}
            </p>
          ) : null}
        </div>
      </div>

      <AppDialog
        isOpen={overlay !== null}
        onClose={() => setOverlay(null)}
        title={
          overlay === 'players'
            ? t('onlinePlayers', { count: chat.players.length })
            : overlay === 'channels'
              ? t('channelList')
              : t('settings')
        }
        icon={
          overlay === 'players' ? (
            <Users size={18} />
          ) : overlay === 'channels' ? (
            <MessageCircle size={18} />
          ) : (
            <Settings2 size={18} />
          )
        }
        className={`chat-dialog${overlay === 'channels' ? ' chat-navigation-dialog' : ''}`}
      >
        {overlay === 'channels' ? (
          <>
            {navigation}
            <Link href="/account" className="chat-back">
              <ArrowLeft size={16} aria-hidden="true" />
              {t('backAccount')}
            </Link>
          </>
        ) : null}
        {overlay === 'players' ? (
          <div className="chat-people">
            <label htmlFor={searchId} className="sr-only">
              {t('search')}
            </label>
            <input
              id={searchId}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('search')}
              maxLength={64}
              autoComplete="off"
            />
            <div className="chat-people__list">
              {chat.players
                .filter((player) => player.name.toLowerCase().includes(search.toLowerCase()))
                .map((player) => (
                  <button
                    type="button"
                    className="chat-peer"
                    key={player.playerUuid}
                    disabled={player.playerUuid === owner}
                    aria-label={
                      player.playerUuid === owner
                        ? t('yourPresence', { name: player.name })
                        : t('startPrivate', { name: player.name })
                    }
                    onClick={() =>
                      choose({
                        channel: 'private',
                        targetUuid: player.playerUuid,
                        name: player.name,
                      })
                    }
                  >
                    <MinecraftAvatar uuid={player.playerUuid} name={player.name} size={30} />
                    <span>
                      <strong>
                        {player.name}
                        {player.playerUuid === owner ? <small> {t('you')}</small> : null}
                      </strong>
                      <PeerPresence player={player} />
                    </span>
                    <MessageCircle size={16} aria-hidden="true" />
                  </button>
                ))}
              {!chat.players.length ? (
                <p className="chat-list-empty">
                  {online ? t('nobodyOnline') : t('joinToSeePlayers')}
                </p>
              ) : !chat.players.some((player) =>
                  player.name.toLowerCase().includes(search.toLowerCase()),
                ) ? (
                <p className="chat-list-empty">{t('noPlayersFound')}</p>
              ) : null}
            </div>
          </div>
        ) : null}
        {overlay === 'settings' ? (
          <div className="chat-settings">
            <button
              type="button"
              className="chat-setting-action"
              disabled={
                notifications.busy ||
                notifications.status === 'unsupported' ||
                notifications.status === 'denied'
              }
              aria-pressed={notifications.status === 'on'}
              onClick={() => {
                void notifications.toggle();
              }}
            >
              <Bell size={17} aria-hidden="true" />
              {t(`notifications.${notifications.status}`)}
            </button>
            <p>{t('notifications.help')}</p>
            <label className="chat-storage-toggle">
              <span>{t('saveLocally')}</span>
              <input
                type="checkbox"
                checked={chat.persist}
                disabled={busy}
                aria-describedby={historyHelpId}
                onChange={(event) => {
                  setBusy(true);
                  void chat.clearHistory(event.target.checked).finally(() => setBusy(false));
                }}
              />
            </label>
            <p id={historyHelpId}>{t('localHistoryHelp')}</p>
            <details className="chat-delete">
              <summary>
                <Trash2 size={16} aria-hidden="true" />
                {t('clearHistory')}
              </summary>
              <p>{t('clearConfirm')}</p>
              <button
                type="button"
                className="chat-danger"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void chat
                    .clearHistory()
                    .then(() => setOverlay(null))
                    .finally(() => setBusy(false));
                }}
              >
                {t('confirmClear')}
              </button>
            </details>
            {online || joining ? (
              <button
                type="button"
                className="chat-setting-action"
                onClick={() => {
                  chat.leave();
                  setOverlay(null);
                }}
              >
                <LogOut size={17} aria-hidden="true" />
                {t('leave')}
              </button>
            ) : null}
            <Link href="/account" className="chat-setting-action">
              <ArrowLeft size={17} aria-hidden="true" />
              {t('backAccount')}
            </Link>
          </div>
        ) : null}
      </AppDialog>
    </section>
  );
}

interface ChatNavigationProps {
  selected: ChatDestination;
  staff: boolean;
  threads: { id: string; name: string }[];
  onChoose: (destination: ChatDestination) => void;
}

function ChatNavigation({ selected, staff, threads, onChoose }: ChatNavigationProps) {
  const t = useTranslations('chat');
  const key = destinationKey(selected);
  return (
    <div className="chat-navigation">
      <nav aria-label={t('channelList')} className="chat-channels">
        <button
          type="button"
          className={key === 'public' ? 'is-active' : ''}
          aria-current={key === 'public' ? 'page' : undefined}
          onClick={() => onChoose({ channel: 'public' })}
        >
          <Hash size={18} aria-hidden="true" />
          {t('channels.public')}
        </button>
        {staff || selected.channel === 'staff' ? (
          <button
            type="button"
            className={key === 'staff' ? 'is-active' : ''}
            aria-current={key === 'staff' ? 'page' : undefined}
            disabled={!staff}
            onClick={() => onChoose({ channel: 'staff' })}
          >
            <Shield size={17} aria-hidden="true" />
            {t('channels.staff')}
          </button>
        ) : null}
      </nav>
      {threads.length ? (
        <nav aria-label={t('privateList')} className="chat-threads">
          <h2>{t('channels.private')}</h2>
          {threads.map((thread) => (
            <button
              type="button"
              key={thread.id}
              className={key === `private:${thread.id}` ? 'is-active' : ''}
              aria-current={key === `private:${thread.id}` ? 'page' : undefined}
              onClick={() =>
                onChoose({ channel: 'private', targetUuid: thread.id, name: thread.name })
              }
            >
              <span className="chat-thread-avatar" aria-hidden="true">
                <MinecraftAvatar uuid={thread.id} name={thread.name} size={24} />
              </span>
              <span>{thread.name}</span>
            </button>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

function PeerPresence({ player }: { player: ChatPeer }) {
  const t = useTranslations('chat');
  return (
    <span className="chat-peer-presence">
      {player.game ? (
        <span title={t('game')}>
          <Gamepad2 size={13} aria-hidden="true" />
          <span>{t('game')}</span>
        </span>
      ) : null}
      {player.webConnections ? (
        <span title={t('webCount', { count: player.webConnections })}>
          <Globe size={12} aria-hidden="true" />
          <span>{t('webCount', { count: player.webConnections })}</span>
        </span>
      ) : null}
    </span>
  );
}
