'use client';

import {
  Hash,
  MessageCircle,
  PanelLeft,
  RotateCw,
  Search,
  Send,
  Settings2,
  Shield,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { AuthAccount } from '@/modules/auth/model/auth-types';
import { useAuth } from '@/modules/auth/model/use-auth';
import type { ChatDestination } from '@/modules/chat/model/chat-destination';
import { destinationKey } from '@/modules/chat/model/chat-destination';
import { channelPlayers } from '@/modules/chat/model/chat-presence';

import {
  CHAT_MESSAGE_MAX_LENGTH,
  messageConversation,
  messageDestination,
} from '@/modules/chat/model/chat-protocol';
import { useChatNotifications } from '@/modules/chat/model/use-chat-notifications';
import type { PendingChatMessage } from '@/modules/chat/model/use-web-chat';
import { useWebChat } from '@/modules/chat/model/use-web-chat';
import { ChatGate } from '@/modules/chat/ui/chat-gate';
import { ChatMentionInput } from '@/modules/chat/ui/chat-mention-input';
import type { ChatMessageJump } from '@/modules/chat/ui/chat-message-list';
import { ChatMessageList } from '@/modules/chat/ui/chat-message-list';
import type { ChatSearchCriteria } from '@/modules/chat/ui/chat-message-search';
import { ChatMessageSearch } from '@/modules/chat/ui/chat-message-search';
import { ChatNavigation } from '@/modules/chat/ui/chat-navigation';
import { ChatNotificationSuggestion } from '@/modules/chat/ui/chat-notification-suggestion';
import { ChatPlayerList, PeerPresence } from '@/modules/chat/ui/chat-player-list';
import { ChatPlayerPicker } from '@/modules/chat/ui/chat-player-picker';
import { ChatSettings } from '@/modules/chat/ui/chat-settings';
import { useChatScroll } from '@/modules/chat/ui/use-chat-scroll';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';
import { SITE_LOGO_PATH } from '@/shared/config/site-config';
import { Link } from '@/shared/i18n/routing';
import { AppDialog } from '@/shared/ui/dialog/app-dialog';

type ChatPanelMode = 'search' | 'players' | 'participants';

export function ChatPage({ appearance }: { appearance: ReactNode }) {
  const { account, isLoading, verified, refresh } = useAuth();
  const t = useTranslations('chat');
  const commonT = useTranslations('common');
  if (account && verified)
    return <ChatWorkspace key={account.playerUuid} account={account} appearance={appearance} />;
  return (
    <ChatGate
      state={isLoading ? 'pending' : verified ? 'signed-out' : 'error'}
      message={
        isLoading
          ? t('status.authorizing')
          : verified
            ? undefined
            : t('errors.auth_upstream_unavailable')
      }
    >
      {!isLoading ? (
        verified ? (
          <Link href="/login" className="chat-primary">
            {commonT('actions.login')}
          </Link>
        ) : (
          <button
            type="button"
            className="chat-primary"
            onClick={() => void refresh().catch(() => undefined)}
          >
            <RotateCw size={15} aria-hidden="true" />
            {t('retry')}
          </button>
        )
      ) : null}
    </ChatGate>
  );
}

function ChatWorkspace({ account, appearance }: { account: AuthAccount; appearance: ReactNode }) {
  const t = useTranslations('chat');
  const [selected, setSelected] = useState<ChatDestination>({ channel: 'public' });
  const [opened, setOpened] = useState<Map<string, string>>(new Map());
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [playerQuery, setPlayerQuery] = useState('');
  const [jump, setJump] = useState<ChatMessageJump | null>(null);
  const jumpSequence = useRef(0);
  const completeJump = useCallback((sequence: number) => {
    setJump((current) => (current?.sequence === sequence ? null : current));
  }, []);
  const [overlay, setOverlay] = useState<'channels' | 'settings' | null>(null);
  const [panel, setPanel] = useState<ChatPanelMode | null>(null);
  const searchOpen = panel === 'search';
  const peopleOpen = panel === 'players' || panel === 'participants';
  const [searchCriteria, setSearchCriteria] = useState<ChatSearchCriteria>({
    query: '',
    scope: 'current',
  });
  const searchTrigger = useRef<HTMLButtonElement>(null);
  const navigationTrigger = useRef<HTMLButtonElement>(null);
  const panelOpener = useRef<HTMLElement | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const playerInput = useRef<HTMLInputElement>(null);
  const searchPanelId = useId();
  const playerPanelId = useId();
  const input = useRef<HTMLInputElement>(null);
  const composeId = useId();
  const hintId = useId();
  const openPanel = useCallback((mode: ChatPanelMode, trigger: HTMLElement | null) => {
    panelOpener.current = trigger;
    setOverlay(null);
    setPanel(mode);
    if (mode !== 'search') setPlayerQuery('');
    requestAnimationFrame(() => {
      const field = mode === 'search' ? searchInput.current : playerInput.current;
      field?.focus({ preventScroll: true });
      field?.select();
    });
  }, []);
  const openSearch = useCallback(() => openPanel('search', searchTrigger.current), [openPanel]);
  const closePanel = useCallback(() => {
    setPanel(null);
    requestAnimationFrame(() => {
      const opener = panelOpener.current;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
      if (!opener?.isConnected || document.activeElement !== opener) {
        const fallback = window.matchMedia('(max-width: 820px)').matches
          ? navigationTrigger.current
          : searchTrigger.current;
        fallback?.focus({ preventScroll: true });
      }
    });
  }, []);
  const owner = account.playerUuid;
  const key = destinationKey(selected);
  const selectConversation = useCallback((destination: ChatDestination, messageId?: string) => {
    setSelected(destination);
    setJump(
      messageId
        ? { conversation: destinationKey(destination), messageId, sequence: ++jumpSequence.current }
        : null,
    );
    setOverlay(null);
    if (destination.channel === 'private')
      setOpened((previous) => new Map(previous).set(destination.targetUuid, destination.name));
  }, []);
  const choose = useCallback(
    (destination: ChatDestination) => {
      selectConversation(destination);
      setPanel(null);
      requestAnimationFrame(() => input.current?.focus({ preventScroll: true }));
    },
    [selectConversation],
  );
  const chat = useWebChat();
  const players = chat.presence.players;
  const participants = useMemo(
    () => channelPlayers(chat.presence, selected, owner),
    [chat.presence, selected, owner],
  );
  const mentionPlayers = useMemo(
    () => participants.filter((player) => player.playerUuid !== owner),
    [participants, owner],
  );
  const recipients = useMemo(
    () => players.filter((player) => player.playerUuid !== owner),
    [players, owner],
  );
  const notifications = useChatNotifications(
    owner,
    selected,
    choose,
    chat.connection.status === 'online',
    chat.staff,
  );
  useEffect(
    () => chat.subscribeMessages(notifications.receive),
    [chat.subscribeMessages, notifications.receive],
  );
  const draft = drafts[key] ?? '';
  const length = [...draft].length;
  const overLimit = length > CHAT_MESSAGE_MAX_LENGTH;
  const online = chat.connection.status === 'online';
  useEffect(() => {
    if (!online || overlay !== null) return;
    const shortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
      if (event.key === 'Escape' && panel !== null) {
        event.preventDefault();
        closePanel();
        return;
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === 'f'
      ) {
        event.preventDefault();
        openSearch();
      }
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, [online, overlay, panel, openSearch, closePanel]);
  const isChannel = selected.channel !== 'private';
  const peer =
    selected.channel === 'private'
      ? players.find((player) => player.playerUuid === selected.targetUuid)
      : null;
  const available =
    online &&
    (selected.channel !== 'private' || Boolean(peer)) &&
    (selected.channel !== 'staff' || chat.staff);
  const title =
    selected.channel === 'private'
      ? (peer?.name ?? selected.name)
      : t(`channels.${selected.channel}`);
  const composeHint =
    online && selected.channel === 'private' && !peer
      ? t('privateOffline')
      : online && selected.channel === 'staff' && !chat.staff
        ? t('staffUnavailable')
        : null;
  const visible = useMemo(
    () => chat.messages.filter((message) => messageConversation(message, owner) === key),
    [chat.messages, owner, key],
  );
  const pending = useMemo(
    () => chat.pending.filter((message) => destinationKey(message.destination) === key),
    [chat.pending, key],
  );
  const viewKey = `${chat.historyEpoch}:${key}`;
  const scroll = useChatScroll(viewKey);
  const threads = useMemo(() => {
    const result = new Map(opened);
    for (const message of chat.messages) {
      if (message.channel !== 'private') continue;
      const destination = messageDestination(message, owner);
      if (destination?.channel === 'private') result.set(destination.targetUuid, destination.name);
    }
    return [...result].map(([id, name]) => ({
      id,
      name: players.find((player) => player.playerUuid === id)?.name ?? name,
    }));
  }, [opened, chat.messages, players, owner]);

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

  const errorText = (code: string) =>
    t.has(`errors.${code}`) ? t(`errors.${code}`) : t('errors.default');
  const send = () => {
    if (available && chat.send(selected, draft)) {
      setJump({ conversation: key, messageId: null, sequence: ++jumpSequence.current });
      setDrafts((current) => ({ ...current, [key]: '' }));
    }
  };
  const restoreDraft = useCallback(
    (message: PendingChatMessage) => {
      setDrafts((current) => ({
        ...current,
        [key]: [current[key], message.text].filter(Boolean).join(' '),
      }));
      chat.dismissPending(message.requestId);
      input.current?.focus();
    },
    [key, chat.dismissPending],
  );
  const chooseSearchResult = (destination: ChatDestination, messageId: string) => {
    selectConversation(destination, messageId);
    // Match the workspace's split-view breakpoint; narrow screens return to the message.
    if (!window.matchMedia('(min-width: 1180px)').matches) setPanel(null);
  };
  if (!online) {
    const { connection } = chat;
    const failed = connection.status === 'error';
    return (
      <ChatGate
        state={failed ? 'error' : 'pending'}
        message={
          connection.error
            ? errorText(connection.error)
            : t(`status.${connection.status === 'idle' ? 'authorizing' : connection.status}`)
        }
      >
        {failed ? (
          <button type="button" className="chat-primary" onClick={chat.retry}>
            <RotateCw size={15} aria-hidden="true" />
            {t('retry')}
          </button>
        ) : null}
      </ChatGate>
    );
  }
  const navigation = (
    <ChatNavigation
      selected={selected}
      staff={chat.staff}
      threads={threads}
      unread={chat.unread}
      onChoose={choose}
      onNewPrivate={(trigger) =>
        panel === 'players' ? closePanel() : openPanel('players', trigger)
      }
      privatePanelId={playerPanelId}
      privatePanelOpen={panel === 'players'}
    />
  );
  const RoomIcon =
    selected.channel === 'public' ? Hash : selected.channel === 'staff' ? Shield : MessageCircle;
  const brand = (
    <Link href="/" className="chat-brand" aria-label={t('backHome')}>
      <Image src={SITE_LOGO_PATH} alt="" width={36} height={36} />
      <span>Mik</span>
    </Link>
  );
  const identity = (
    <div className="chat-identity">
      <span aria-hidden="true">
        <MinecraftAvatar uuid={owner} name={account.currentName} size={28} />
      </span>
      <div>
        <strong>{account.currentName}</strong>
        <span className="chat-connection-status" role="status">
          <span className="chat-connection-dot" aria-hidden="true" />
          {t('status.online')}
        </span>
      </div>
    </div>
  );

  return (
    <section
      className="chat-workspace"
      data-channel={selected.channel}
      data-panel-open={panel !== null || undefined}
      aria-label={t('title')}
    >
      <aside className="chat-sidebar">
        {brand}
        {navigation}
        {identity}
      </aside>

      <div className="chat-conversation">
        <header className="chat-topbar">
          <button
            ref={navigationTrigger}
            type="button"
            className="chat-icon-button chat-mobile-menu"
            aria-label={t('title')}
            aria-haspopup="dialog"
            onClick={() => setOverlay('channels')}
          >
            <PanelLeft size={20} aria-hidden="true" />
          </button>
          <div className="chat-room-title">
            <span className="chat-room-mark" aria-hidden="true">
              {selected.channel === 'private' ? (
                <MinecraftAvatar uuid={selected.targetUuid} name={title} size={36} />
              ) : (
                <RoomIcon size={22} />
              )}
            </span>
            <div className="chat-room-copy">
              <h1>{title}</h1>
              {selected.channel === 'private' && peer ? (
                <div className="chat-private-presence">
                  <PeerPresence player={peer} />
                </div>
              ) : null}
            </div>
          </div>
          <div className="chat-room-actions">
            {isChannel ? (
              <button
                type="button"
                className="chat-icon-button chat-online-button"
                aria-label={t('onlinePlayers', { count: participants.length })}
                title={t('onlinePlayers', { count: participants.length })}
                aria-expanded={panel === 'participants'}
                aria-controls={playerPanelId}
                onClick={(event) =>
                  panel === 'participants'
                    ? closePanel()
                    : openPanel('participants', event.currentTarget)
                }
              >
                <Users size={18} aria-hidden="true" />
                <span>{participants.length}</span>
              </button>
            ) : null}
            <button
              ref={searchTrigger}
              type="button"
              className="chat-icon-button"
              aria-label={t('searchMessages')}
              title={t('searchMessages')}
              aria-expanded={searchOpen}
              aria-controls={searchPanelId}
              aria-keyshortcuts="Control+f Meta+f"
              onClick={searchOpen ? closePanel : openSearch}
            >
              <Search size={19} aria-hidden="true" />
            </button>
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
          </div>
        </header>

        {chat.error ? (
          <p className="chat-feedback" role="alert">
            {errorText(chat.error)}
          </p>
        ) : null}
        {chat.storageFailed && overlay !== 'settings' ? (
          <p className="chat-feedback" role="status">
            {t('storageFailed')}
          </p>
        ) : null}

        <ChatMessageList
          key={viewKey}
          conversation={key}
          destination={selected}
          title={title}
          owner={owner}
          name={account.currentName}
          messages={visible}
          pending={pending}
          unread={chat.unread.get(key)}
          jump={jump}
          paused={overlay !== null || panel !== null}
          scroll={scroll}
          onRead={chat.markRead}
          onRestore={restoreDraft}
          onJumpComplete={completeJump}
        />
        <div className="chat-compose-area">
          <form
            className="chat-compose chat-input-surface"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <label htmlFor={composeId} className="sr-only">
              {t('composeLabel', { channel: title })}
            </label>
            <ChatMentionInput
              key={key}
              inputRef={input}
              id={composeId}
              value={draft}
              onChange={(value) => setDrafts((current) => ({ ...current, [key]: value }))}
              enabled={available}
              peers={mentionPlayers}
              describedBy={composeHint ? hintId : undefined}
              placeholder={t('messagePlaceholder')}
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
          {composeHint ? (
            <p id={hintId} className="chat-compose-hint" role="status">
              {composeHint}
            </p>
          ) : null}
          {available ? <ChatNotificationSuggestion notifications={notifications} /> : null}
        </div>
      </div>

      <ChatMessageSearch
        id={searchPanelId}
        inputRef={searchInput}
        open={searchOpen}
        criteria={searchCriteria}
        onCriteriaChange={setSearchCriteria}
        messages={chat.messages}
        owner={owner}
        conversation={selected}
        onChoose={chooseSearchResult}
        onClose={closePanel}
      />

      <ChatPlayerPicker
        id={playerPanelId}
        inputRef={playerInput}
        open={peopleOpen}
        title={panel === 'participants' ? t('participants') : t('newPrivate')}
        query={playerQuery}
        onQueryChange={setPlayerQuery}
        players={panel === 'participants' ? participants : recipients}
        owner={owner}
        onChoose={choose}
        onClose={closePanel}
      />

      {isChannel && panel === null ? (
        <aside className="chat-participants" aria-label={t('participants')}>
          <h2>{t('onlinePlayers', { count: participants.length })}</h2>
          <ChatPlayerList
            players={participants}
            owner={owner}
            onChoose={choose}
            emptyText={t('nobodyOnline')}
          />
        </aside>
      ) : null}

      <AppDialog
        key={overlay}
        isOpen={overlay !== null}
        onClose={() => setOverlay(null)}
        title={overlay === 'channels' ? t('title') : t('settings')}
        icon={overlay === 'channels' ? <MessageCircle size={18} /> : <Settings2 size={18} />}
        className={`chat-dialog${overlay === 'channels' ? ' chat-navigation-dialog' : overlay === 'settings' ? ' chat-settings-dialog' : ''}`}
      >
        {overlay === 'channels' ? (
          <>
            {brand}
            {navigation}
            {identity}
          </>
        ) : null}
        {overlay === 'settings' ? (
          <ChatSettings chat={chat} notifications={notifications} appearance={appearance} />
        ) : null}
      </AppDialog>
    </section>
  );
}
