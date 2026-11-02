'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { registerChatNotificationWorker } from '@/modules/chat/lib/chat-notifications';
import type { ChatAccess, ChatDestination, ChatMessage } from '@/modules/chat/model/chat-protocol';
import {
  chatDestinationSchema,
  destinationKey,
  messageConversation,
} from '@/modules/chat/model/chat-protocol';

const PREFERENCE = 'mik-chat-notifications';
let registration: Promise<ServiceWorkerRegistration> | undefined;

function supported() {
  return (
    window.isSecureContext &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'ServiceWorkerRegistration' in window &&
    'showNotification' in ServiceWorkerRegistration.prototype
  );
}

function enabled() {
  try {
    return (
      supported() &&
      Notification.permission === 'granted' &&
      localStorage.getItem(PREFERENCE) === 'on'
    );
  } catch {
    return false;
  }
}

function worker() {
  registration ??= registerChatNotificationWorker()
    .then(async () => navigator.serviceWorker.ready)
    .catch((error: unknown) => {
      registration = undefined;
      throw error;
    });
  return registration;
}

function messagePreview(message: ChatMessage): string {
  const text = message.content
    .map((part) => part.text)
    .join('')
    .replace(/\s+/gu, ' ')
    .trim();
  if (text.length <= 256) return text;
  let preview = text.slice(0, 255);
  const last = preview.charCodeAt(preview.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) preview = preview.slice(0, -1);
  return `${preview}…`;
}

export function useChatNotifications(
  owner: string,
  destination: ChatDestination,
  onOpen: (destination: ChatDestination) => void,
  active: boolean,
  staff: boolean,
) {
  const t = useTranslations('chat.notifications');
  const [status, setStatus] = useState<'unsupported' | 'off' | 'on' | 'denied' | 'error'>('off');
  const [busy, setBusy] = useState(false);
  const open = useRef(onOpen);
  const token = useRef('');
  const key = destinationKey(destination);

  useEffect(() => {
    open.current = onOpen;
  }, [onOpen]);

  useEffect(() => {
    const currentToken = crypto.randomUUID();
    token.current = currentToken;
    setBusy(false);
    const sync = () => {
      if (!supported()) setStatus('unsupported');
      else if (Notification.permission === 'denied') setStatus('denied');
      else setStatus(enabled() ? 'on' : 'off');
    };
    const receive = async (event: MessageEvent<unknown>) => {
      if (
        event.origin !== window.location.origin ||
        !(event.source instanceof ServiceWorker) ||
        !registration ||
        event.source !== (await registration.catch(() => undefined))?.active ||
        token.current !== currentToken
      )
        return;
      const data = event.data as { type?: unknown; owner?: unknown; destination?: unknown } | null;
      if (data?.type !== 'mik-chat-notification-open' || data.owner !== owner) return;
      const parsed = chatDestinationSchema.safeParse(data.destination);
      if (parsed.success) open.current(parsed.data);
    };
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('focus', sync);
    navigator.serviceWorker?.addEventListener('message', receive);
    // A notification may open a new tab after the previous chat tab was closed.
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const conversation = fragment.get('chat');
    if (fragment.get('owner') === owner && conversation) {
      const parsed = chatDestinationSchema.safeParse(
        conversation.startsWith('private:')
          ? { channel: 'private', targetUuid: conversation.slice(8), name: conversation.slice(8) }
          : { channel: conversation },
      );
      if (parsed.success) open.current(parsed.data);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    return () => {
      if (token.current === currentToken) token.current = '';
      window.removeEventListener('storage', sync);
      window.removeEventListener('focus', sync);
      navigator.serviceWorker?.removeEventListener('message', receive);
      if (registration)
        void registration
          .then((value) => {
            value.active?.postMessage({ type: 'release', owner, token: currentToken });
          })
          .catch(() => undefined);
    };
  }, [owner]);

  useEffect(() => {
    let current = true;
    const request = status === 'on' ? worker() : registration;
    if (!request) return;
    void request
      .then((value) => {
        if (current)
          value.active?.postMessage({
            type: status === 'on' && active ? 'view' : 'release',
            owner,
            token: token.current,
            conversation: key,
            staff,
          });
      })
      .catch(() => {
        if (current) setStatus('error');
      });
    return () => {
      current = false;
    };
  }, [owner, key, status, active, staff]);

  const toggle = async () => {
    if (!supported()) return;
    const currentToken = token.current;
    const current = () => token.current === currentToken && Boolean(currentToken);
    setBusy(true);
    try {
      if (status === 'on') {
        localStorage.removeItem(PREFERENCE);
        setStatus('off');
        const value = await worker();
        value.active?.postMessage({ type: 'clear', owner });
      } else {
        const permission = await Notification.requestPermission();
        if (!current()) return;
        if (permission !== 'granted') {
          setStatus(permission === 'denied' ? 'denied' : 'off');
          return;
        }
        await worker();
        if (!current()) return;
        localStorage.setItem(PREFERENCE, 'on');
        setStatus('on');
      }
    } catch {
      if (current()) setStatus('error');
    } finally {
      if (current()) setBusy(false);
    }
  };

  const receive = useCallback(
    (message: ChatMessage, access: () => ChatAccess | null) => {
      if (
        status === 'error' ||
        !enabled() ||
        message.senderUuid === owner ||
        (!message.mentioned && message.channel !== 'private')
      )
        return;
      const destination: ChatDestination =
        message.channel === 'private'
          ? { channel: 'private', targetUuid: message.senderUuid, name: message.senderName }
          : { channel: message.channel };
      const currentToken = token.current;
      void worker()
        .then((value) => {
          const current = access();
          if (
            !currentToken ||
            token.current !== currentToken ||
            current?.owner !== owner ||
            !enabled()
          )
            return;
          value.active?.postMessage({
            type: 'notify',
            owner,
            token: currentToken,
            view: key,
            staff: current.staff,
            id: message.id,
            conversation: messageConversation(message, owner),
            destination,
            title:
              message.channel === 'private'
                ? message.senderName
                : t('mentionTitle', { name: message.senderName, channel: t(message.channel) }),
            body: messagePreview(message),
          });
        })
        .catch(() => {
          if (token.current === currentToken && access()?.owner === owner) setStatus('error');
        });
    },
    [owner, key, status, t],
  );

  return { status, busy, toggle, receive };
}
