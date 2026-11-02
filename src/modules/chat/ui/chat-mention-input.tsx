'use client';

import { useTranslations } from 'next-intl';
import type { RefObject } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { completeMention, mentionQuery } from '@/modules/chat/lib/chat-mentions';
import type { ChatPeer } from '@/modules/chat/model/chat-protocol';
import { CHAT_MESSAGE_MAX_LENGTH } from '@/modules/chat/model/chat-protocol';
import MinecraftAvatar from '@/modules/player/ui/minecraft-avatar';

interface ChatMentionInputProps {
  inputRef: RefObject<HTMLInputElement | null>;
  id: string;
  value: string;
  onChange: (value: string) => void;
  peers: ChatPeer[];
  enabled: boolean;
  describedBy?: string;
  placeholder: string;
}

export function ChatMentionInput({
  inputRef,
  id,
  value,
  onChange,
  peers,
  enabled,
  describedBy,
  placeholder,
}: ChatMentionInputProps) {
  const t = useTranslations('chat');
  const listId = useId();
  const list = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<[number | null, number | null]>([null, null]);
  const [focused, setFocused] = useState(false);
  const [composing, setComposing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const query =
    enabled && focused && !composing && !dismissed ? mentionQuery(value, ...selection) : null;
  const search = query?.text.trimStart().toLowerCase() ?? '';
  const candidates = query
    ? peers
        .filter((peer) => peer.name.toLowerCase().includes(search))
        .sort(
          (a, b) =>
            Number(b.name.toLowerCase().startsWith(search)) -
              Number(a.name.toLowerCase().startsWith(search)) || a.name.localeCompare(b.name),
        )
        .slice(0, 8)
    : [];
  const selected = candidates.find((peer) => peer.playerUuid === active) ?? candidates[0];
  const activeId = selected ? `${listId}-${selected.playerUuid}` : undefined;
  const updateSelection = (element: HTMLInputElement) => {
    setSelection([element.selectionStart, element.selectionEnd]);
  };
  const choose = (peer: ChatPeer) => {
    if (!query) return;
    const next = completeMention(value, query, peer.name);
    const element = inputRef.current;
    onChange(next.value);
    setDismissed(true);
    requestAnimationFrame(() => {
      if (!element?.isConnected || inputRef.current !== element) return;
      element.focus({ preventScroll: true });
      element.setSelectionRange(next.caret, next.caret);
      updateSelection(element);
    });
  };

  useEffect(() => {
    const option = activeId ? document.getElementById(activeId) : null;
    const container = list.current;
    if (!option || !container) return;
    if (option.offsetTop < container.scrollTop) container.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > container.scrollTop + container.clientHeight)
      container.scrollTop = option.offsetTop + option.offsetHeight - container.clientHeight;
  }, [activeId]);

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={Boolean(selected)}
        aria-controls={selected ? listId : undefined}
        aria-activedescendant={activeId}
        aria-describedby={describedBy}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          updateSelection(event.currentTarget);
          setDismissed(false);
        }}
        onSelect={(event) => {
          if (
            event.currentTarget.selectionStart !== selection[0] ||
            event.currentTarget.selectionEnd !== selection[1]
          )
            setDismissed(false);
          updateSelection(event.currentTarget);
        }}
        onFocus={(event) => {
          setFocused(true);
          setDismissed(false);
          updateSelection(event.currentTarget);
        }}
        onBlur={() => setFocused(false)}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={(event) => {
          setComposing(false);
          updateSelection(event.currentTarget);
        }}
        onKeyDown={(event) => {
          if (composing || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) {
            if (event.key === 'Enter') event.preventDefault();
            return;
          }
          if (!selected) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            if (event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
            event.preventDefault();
            const index = candidates.indexOf(selected);
            setActive(
              candidates[
                (index + (event.key === 'ArrowDown' ? 1 : -1) + candidates.length) %
                  candidates.length
              ].playerUuid,
            );
          } else if (event.key === 'Enter') {
            event.preventDefault();
            choose(selected);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            setDismissed(true);
          } else if (event.key === 'Tab') setDismissed(true);
        }}
        maxLength={
          // Native maxlength measures UTF-16 units; message length uses Unicode code points.
          CHAT_MESSAGE_MAX_LENGTH * 2
        }
        autoComplete="off"
        placeholder={placeholder}
      />
      {selected ? (
        <div
          className="chat-mention-options"
          id={listId}
          ref={list}
          role="listbox"
          aria-label={t('mentionPlayers')}
        >
          {candidates.map((peer) => (
            <button
              key={peer.playerUuid}
              id={`${listId}-${peer.playerUuid}`}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={peer === selected}
              onPointerDown={(event) => event.preventDefault()}
              onPointerMove={() => setActive(peer.playerUuid)}
              onClick={() => choose(peer)}
            >
              <MinecraftAvatar uuid={peer.playerUuid} name={peer.name} size={28} />
              <span className="chat-mention-name">{peer.name}</span>
              <small aria-hidden="true">@</small>
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
