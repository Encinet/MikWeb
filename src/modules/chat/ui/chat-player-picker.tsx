'use client';

import { useTranslations } from 'next-intl';
import type { RefObject } from 'react';
import { useId, useRef } from 'react';
import type { ChatDestination } from '@/modules/chat/model/chat-destination';
import type { ChatPeer } from '@/modules/chat/model/chat-protocol';
import { ChatPanel, ChatPanelSearch } from '@/modules/chat/ui/chat-panel';
import { ChatPlayerList } from '@/modules/chat/ui/chat-player-list';

export function ChatPlayerPicker({
  id,
  open,
  inputRef,
  title,
  query,
  onQueryChange,
  players,
  owner,
  onChoose,
  onClose,
}: {
  id: string;
  open: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  title: string;
  query: string;
  onQueryChange: (query: string) => void;
  players: ChatPeer[];
  owner: string;
  onChoose: (destination: ChatDestination) => void;
  onClose: () => void;
}) {
  const t = useTranslations('chat');
  const summaryId = useId();
  const list = useRef<HTMLDivElement>(null);
  const needle = query.trim().toLowerCase();
  const filtered = players.filter((player) => player.name.toLowerCase().includes(needle));
  const firstRecipient = filtered.find((player) => player.playerUuid !== owner);

  return (
    <ChatPanel id={id} open={open} inputRef={inputRef} title={title} onClose={onClose}>
      <ChatPanelSearch
        inputRef={inputRef}
        label={t('search')}
        placeholder={t('search')}
        query={query}
        onChange={(value) => {
          onQueryChange(value);
          if (list.current) list.current.scrollTop = 0;
        }}
        onSubmit={() => {
          if (firstRecipient)
            onChoose({
              channel: 'private',
              targetUuid: firstRecipient.playerUuid,
              name: firstRecipient.name,
            });
        }}
        maxLength={64}
        describedBy={filtered.length ? summaryId : undefined}
        enterKeyHint="go"
      />
      <div className="chat-panel-summary" id={summaryId} role="status">
        {filtered.length ? t('onlinePlayers', { count: filtered.length }) : null}
      </div>
      <div ref={list} className="chat-panel-results">
        <ChatPlayerList
          players={filtered}
          owner={owner}
          onChoose={onChoose}
          emptyText={needle ? t('noPlayersFound') : t('nobodyOnline')}
        />
      </div>
    </ChatPanel>
  );
}
