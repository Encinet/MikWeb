'use client';

import {
  Hash,
  MessageCircle,
  PanelLeft,
  PanelRightClose,
  RotateCw,
  Search,
  Settings2,
  Shield,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { AuthAccount } from '@/modules/auth/model/auth-types';
import { closeChatActionMenus } from '@/modules/chat/lib/chat-action-menu-events';
import { focusChatConversation } from '@/modules/chat/lib/chat-conversation-focus';
import { keepChatWorkspace } from '@/modules/chat/model/chat-connection';
import type { ChatDestination } from '@/modules/chat/model/chat-destination';
import { destinationKey } from '@/modules/chat/model/chat-destination';
import { chatWorkspaceFeedback } from '@/modules/chat/model/chat-feedback';
import { chatInputHistory } from '@/modules/chat/model/chat-input-history';
import { channelPlayers } from '@/modules/chat/model/chat-presence';

import { CHAT_MESSAGE_MAX_LENGTH, messageConversation } from '@/modules/chat/model/chat-protocol';
import { messageCursor } from '@/modules/chat/model/chat-reading';
import type { ChatSearchCriteria } from '@/modules/chat/model/chat-search';
import { emptyChatSearch } from '@/modules/chat/model/chat-search';
import type { ChatPreferences, ChatThread } from '@/modules/chat/model/chat-workspace';
import { chatThreads } from '@/modules/chat/model/chat-workspace';
import { useChatNotifications } from '@/modules/chat/model/use-chat-notifications';
import { useChatWorkspace } from '@/modules/chat/model/use-chat-workspace';
import type { PendingChatMessage } from '@/modules/chat/model/use-web-chat';
import { useWebChat } from '@/modules/chat/model/use-web-chat';
import { ChatComposer } from '@/modules/chat/ui/chat-composer';
import { ChatConnectionBanner } from '@/modules/chat/ui/chat-connection-banner';
import { ChatGate } from '@/modules/chat/ui/chat-gate';
import type { ChatMessageJump } from '@/modules/chat/ui/chat-message-list';
import { ChatMessageList } from '@/modules/chat/ui/chat-message-list';
import { ChatMessageSearch } from '@/modules/chat/ui/chat-message-search';
import { ChatNavigation } from '@/modules/chat/ui/chat-navigation';
import { ChatPlayerList, PeerPresence } from '@/modules/chat/ui/chat-player-list';
import { ChatPlayerPicker } from '@/modules/chat/ui/chat-player-picker';
import { ChatSettings } from '@/modules/chat/ui/chat-settings';
import { useChatScroll } from '@/modules/chat/ui/use-chat-scroll';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';
import { SITE_LOGO_PATH } from '@/shared/config/site-config';
import { hasTranslationKey } from '@/shared/i18n/has-translation-key';
import { Link } from '@/shared/i18n/routing';
import { AppDialog } from '@/shared/ui/dialog/app-dialog';

type ChatPanelMode = 'search' | 'players' | 'participants';

export function ChatWorkspace({
  account,
  appearance,
}: {
  account: AuthAccount;
  appearance: ReactNode;
}) {
  const t = useTranslations('chat');
  const commonT = useTranslations('common');
  const owner = account.playerUuid;
  const chat = useWebChat();
  const {
    workspace,
    mutate,
    getDraft,
    storageFailed: workspaceStorageFailed,
    restoredCount,
  } = useChatWorkspace(chat.historyLease, chat.staff);
  const preferences = workspace.preferences;
  const [selected, setSelected] = useState<ChatDestination>({ channel: 'public' });
  const [playerQuery, setPlayerQuery] = useState('');
  const [notice, setNotice] = useState<'drafts.restoreTooLong' | null>(null);
  const [jump, setJump] = useState<ChatMessageJump | null>(null);
  const jumpSequence = useRef(0);
  const completeJump = useCallback((sequence: number) => {
    setJump((current) => (current?.sequence === sequence ? null : current));
  }, []);
  const [overlay, setOverlay] = useState<'channels' | 'settings' | null>(null);
  const [panel, setPanel] = useState<ChatPanelMode | null>(null);
  const searchOpen = panel === 'search';
  const peopleOpen = panel === 'players' || panel === 'participants';
  const [searchCriteria, setSearchCriteria] = useState<ChatSearchCriteria>(emptyChatSearch);
  const searchTrigger = useRef<HTMLButtonElement>(null);
  const navigationTrigger = useRef<HTMLButtonElement>(null);
  const panelOpener = useRef<HTMLElement | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const playerInput = useRef<HTMLInputElement>(null);
  const searchPanelId = useId();
  const playerPanelId = useId();
  const input = useRef<HTMLInputElement>(null);
  const openPanel = useCallback((mode: ChatPanelMode, trigger: HTMLElement | null) => {
    closeChatActionMenus();
    panelOpener.current = trigger;
    setOverlay(null);
    setPanel(mode);
    if (mode === 'players' || mode === 'participants') setPlayerQuery('');
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
  const key = destinationKey(selected);
  const viewKey = `${chat.historyEpoch}:${key}`;
  const scroll = useChatScroll(viewKey);
  const selectConversation = useCallback(
    (destination: ChatDestination, messageId?: string) => {
      setSelected(destination);
      setJump(
        messageId
          ? {
              conversation: destinationKey(destination),
              messageId,
              sequence: ++jumpSequence.current,
            }
          : null,
      );
      setOverlay(null);
      if (destination.channel === 'private') mutate({ type: 'open', destination, at: Date.now() });
    },
    [mutate],
  );
  const choose = useCallback(
    (destination: ChatDestination) => {
      selectConversation(destination);
      setPanel(null);
      requestAnimationFrame(() => focusChatConversation(scroll.log.current, input.current));
    },
    [selectConversation, scroll.log],
  );
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
  const draft = workspace.drafts[key]?.text ?? '';
  const changeDraft = useCallback(
    (text: string) => mutate({ type: 'draft', key, text, at: Date.now() }),
    [mutate, key],
  );
  const online = chat.connection.status === 'online';
  const workspaceVisible = keepChatWorkspace(chat.connection, chat.hasConnected);
  useEffect(() => {
    if (!workspaceVisible || overlay !== null) return;
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
  }, [workspaceVisible, overlay, panel, openSearch, closePanel]);
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
  const feedback = chatWorkspaceFeedback({
    connection: chat.connection,
    error: chat.error,
    channel: selected.channel,
    recipientOnline: Boolean(peer),
    staff: chat.staff,
  });
  const visible = useMemo(
    () => chat.messages.filter((message) => messageConversation(message, owner) === key),
    [chat.messages, owner, key],
  );
  const pending = useMemo(
    () => chat.pending.filter((message) => destinationKey(message.destination) === key),
    [chat.pending, key],
  );
  const inputHistory = useMemo(() => chatInputHistory(visible, owner, key), [visible, owner, key]);
  const threads = useMemo(
    () => chatThreads(chat.messages, players, owner, workspace),
    [chat.messages, players, owner, workspace],
  );
  const unreadCount = [...chat.unread.values()].reduce((total, unread) => total + unread.count, 0);
  const changePreferences = useCallback(
    (value: Partial<ChatPreferences>) => mutate({ type: 'preferences', value }),
    [mutate],
  );
  const closeThread = (thread: ChatThread) => {
    const through = thread.latest ? messageCursor(thread.latest) : null;
    mutate({ type: 'close', destination: thread.destination, through, at: Date.now() });
    if (through) chat.markRead(destinationKey(thread.destination), through);
    if (key === destinationKey(thread.destination)) choose({ channel: 'public' });
    else
      requestAnimationFrame(() => {
        const current = [
          ...document.querySelectorAll<HTMLElement>('.chat-navigation [aria-current="page"]'),
        ].find((element) => element.getClientRects().length > 0);
        current?.focus({ preventScroll: true });
      });
  };
  const mention = useCallback(
    (name: string) => {
      const draft = getDraft(key);
      const caret = input.current?.selectionStart ?? draft.length;
      const before = draft.slice(0, caret);
      const inserted = `${before && !/\s$/.test(before) ? ' ' : ''}@${name} `;
      changeDraft(before + inserted + draft.slice(caret));
      requestAnimationFrame(() => {
        input.current?.focus({ preventScroll: true });
        input.current?.setSelectionRange(caret + inserted.length, caret + inserted.length);
      });
    },
    [getDraft, key, changeDraft],
  );
  const startPrivate = useCallback(
    (uuid: string, name: string) => choose({ channel: 'private', targetUuid: uuid, name }),
    [choose],
  );

  const errorText = (code: string) => {
    const key = `errors.${code}`;
    return hasTranslationKey(t, key) ? t(key) : t('errors.default');
  };
  const send = () => {
    if (available && chat.send(selected, draft)) {
      setJump({ conversation: key, messageId: null, sequence: ++jumpSequence.current });
      changeDraft('');
      setNotice(null);
    }
  };
  const restoreDraft = useCallback(
    (message: PendingChatMessage) => {
      const restored = [getDraft(key), message.text].filter(Boolean).join(' ');
      if (restored.length > CHAT_MESSAGE_MAX_LENGTH * 2) {
        setNotice('drafts.restoreTooLong');
        return;
      }
      changeDraft(restored);
      setNotice(null);
      chat.dismissPending(message.requestId);
      input.current?.focus();
    },
    [getDraft, key, changeDraft, chat.dismissPending],
  );
  const chooseSearchResult = (destination: ChatDestination, messageId: string) => {
    selectConversation(destination, messageId);
    // Match the workspace's split-view breakpoint; narrow screens return to the message.
    if (!window.matchMedia('(min-width: 1180px)').matches) setPanel(null);
  };
  const connectionStatus = chat.connection.status;
  if (!workspaceVisible) {
    const { connection } = chat;
    const failed = connection.status === 'error';
    return (
      <ChatGate
        state={failed ? 'error' : 'pending'}
        message={
          connection.error
            ? errorText(connection.error)
            : t(
                `status.${connectionStatus === 'idle' || connectionStatus === 'online' ? 'authorizing' : connectionStatus}`,
              )
        }
      >
        {failed ? (
          <button type="button" className="chat-primary" onClick={chat.retry}>
            <RotateCw size={15} aria-hidden="true" />
            {commonT('actions.retry')}
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
      drafts={workspace.drafts}
      online={online}
      onPin={(thread) =>
        mutate({
          type: 'pin',
          destination: thread.destination,
          pinned: !thread.pinned,
          at: Date.now(),
        })
      }
      onCloseThread={closeThread}
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
        <span className="chat-connection-status" data-state={connectionStatus}>
          <span className="chat-connection-dot" aria-hidden="true" />
          {connectionStatus === 'online'
            ? commonT('states.online')
            : t(`status.${connectionStatus === 'idle' ? 'connecting' : connectionStatus}`)}
        </span>
      </div>
    </div>
  );

  return (
    <section
      className="chat-workspace"
      data-channel={selected.channel}
      data-panel-open={panel !== null || undefined}
      data-members-visible={isChannel && preferences.membersVisible}
      data-density={preferences.density}
      aria-label={t('title')}
    >
      <span className="sr-only" role="status">
        {restoredCount ? t('drafts.restored', { count: restoredCount }) : ''}
      </span>
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
            aria-label={unreadCount ? t('navigationUnread', { count: unreadCount }) : t('title')}
            aria-haspopup="dialog"
            onClick={() => setOverlay('channels')}
          >
            <PanelLeft size={20} aria-hidden="true" />
            {unreadCount ? (
              <span className="chat-mobile-unread" aria-hidden="true">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
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
                onClick={(event) => {
                  if (
                    window.matchMedia('(min-width: 1180px)').matches &&
                    !preferences.membersVisible
                  ) {
                    changePreferences({ membersVisible: true });
                    setPanel(null);
                  } else if (panel === 'participants') closePanel();
                  else openPanel('participants', event.currentTarget);
                }}
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
              aria-expanded={panel === 'search'}
              aria-controls={searchPanelId}
              aria-keyshortcuts="Control+f Meta+f"
              onClick={panel === 'search' ? closePanel : openSearch}
            >
              <Search size={19} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="chat-icon-button"
              aria-label={t('settings')}
              title={t('settings')}
              aria-haspopup="dialog"
              onClick={() => {
                closeChatActionMenus();
                setOverlay('settings');
              }}
            >
              <Settings2 size={19} aria-hidden="true" />
            </button>
          </div>
        </header>

        {!online ? (
          <ChatConnectionBanner connection={chat.connection} onRetry={chat.retry} />
        ) : null}
        {notice ? (
          <p className="chat-feedback" role="status">
            {t(notice)}
          </p>
        ) : null}

        {feedback.error ? (
          <p className="chat-feedback" role="alert">
            {errorText(feedback.error)}
          </p>
        ) : null}
        {(chat.storageFailed || workspaceStorageFailed) && overlay !== 'settings' ? (
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
          showActivity={preferences.showActivity}
          onMention={mention}
          onPrivate={startPrivate}
        />
        <ChatComposer
          key={viewKey}
          title={title}
          draft={draft}
          inputRef={input}
          available={available}
          hint={feedback.composeHint ? t(feedback.composeHint) : null}
          peers={mentionPlayers}
          history={inputHistory}
          notifications={notifications}
          onChange={changeDraft}
          onSend={send}
        />
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

      {isChannel && panel === null && preferences.membersVisible ? (
        <aside className="chat-participants" aria-label={t('participants')}>
          <div className="chat-participants-heading">
            <h2>{t('onlinePlayers', { count: participants.length })}</h2>
            <button
              type="button"
              className="chat-icon-button"
              aria-label={t('preferences.hideMembers')}
              title={t('preferences.hideMembers')}
              onClick={() => changePreferences({ membersVisible: false })}
            >
              <PanelRightClose size={16} aria-hidden="true" />
            </button>
          </div>
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
          <ChatSettings
            chat={{
              ...chat,
              storageFailed: chat.storageFailed || workspaceStorageFailed,
              setPersistence: (enabled) => chat.setPersistence(enabled, workspace),
            }}
            notifications={notifications}
            appearance={appearance}
            preferences={preferences}
            onPreferenceChange={changePreferences}
          />
        ) : null}
      </AppDialog>
    </section>
  );
}
