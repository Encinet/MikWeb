/// <reference lib="webworker" />

import type { ChatDestination } from '@/modules/chat/model/chat-destination';
import { destinationKey, readChatDestination } from '@/modules/chat/model/chat-destination';
import { SITE_NOTIFICATION_ICON_PATH } from '@/shared/config/site-config';

const worker = self as unknown as ServiceWorkerGlobalScope;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const chatPath = /^\/(?:zh-CN|en)\/chat\/?$/;
interface ChatView {
  owner: string;
  token: string;
  conversation: string;
  staff: boolean;
}
interface NotificationData {
  owner: string;
  destination: ChatDestination;
  conversation: string;
  url: string;
}
type NotificationRequest =
  | { type: 'account'; owner: string | null; staff: boolean }
  | { type: 'clear'; owner: string }
  | { type: 'release'; owner: string; token: string }
  | (ChatView & { type: 'view' })
  | (ChatView & {
      type: 'notify';
      id: string;
      destination: ChatDestination;
      title: string;
      body: string;
      view: string;
    });

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function isUuid(value: unknown): value is string {
  return typeof value === 'string' && uuid.test(value);
}
function isConversation(value: unknown): value is string {
  return (
    value === 'public' ||
    value === 'staff' ||
    (typeof value === 'string' && value.startsWith('private:') && isUuid(value.slice(8)))
  );
}
function text(value: unknown, max: number, min = 0): value is string {
  return typeof value === 'string' && value.length >= min && value.length <= max;
}

function readRequest(value: unknown): NotificationRequest | null {
  if (!record(value)) return null;
  if (value.type === 'account') {
    return (value.owner === null || isUuid(value.owner)) && typeof value.staff === 'boolean'
      ? { type: 'account', owner: value.owner, staff: value.staff }
      : null;
  }
  if (!isUuid(value.owner)) return null;
  if (value.type === 'clear') return { type: 'clear', owner: value.owner };
  if (value.type === 'release')
    return isUuid(value.token) ? { type: 'release', owner: value.owner, token: value.token } : null;
  if (
    !isUuid(value.token) ||
    !isConversation(value.conversation) ||
    typeof value.staff !== 'boolean'
  )
    return null;
  const view: ChatView = {
    owner: value.owner,
    token: value.token,
    conversation: value.conversation,
    staff: value.staff,
  };
  if (value.type === 'view') return { type: 'view', ...view };
  if (
    value.type !== 'notify' ||
    !text(value.id, 128, 1) ||
    !text(value.title, 256) ||
    !text(value.body, 256) ||
    !isConversation(value.view)
  )
    return null;
  const destination = readChatDestination(value.destination);
  if (!destination || destinationKey(destination) !== value.conversation) return null;
  return {
    type: 'notify',
    ...view,
    id: value.id,
    destination,
    title: value.title,
    body: value.body,
    view: value.view,
  };
}

function readNotificationData(value: unknown): NotificationData | null {
  if (!record(value) || !isUuid(value.owner) || !text(value.url, 32) || !chatPath.test(value.url))
    return null;
  const destination = readChatDestination(value.destination);
  if (!destination || destinationKey(destination) !== value.conversation) return null;
  return {
    owner: value.owner,
    destination,
    conversation: destinationKey(destination),
    url: value.url,
  };
}
const views = new Map<string, ChatView>();
const seen = new Map<string, number>();
let revision = 0;
let policy: { owner: string | null; staff: boolean } | undefined;

worker.addEventListener('install', (event) => event.waitUntil(worker.skipWaiting()));

function permitted(owner: string | null, channel?: string, view?: { staff: boolean }) {
  return (
    (policy === undefined || (policy.owner === owner && (channel !== 'staff' || policy.staff))) &&
    (channel !== 'staff' || view === undefined || view.staff)
  );
}

function currentNotification(data: ChatView, clientId: string) {
  const view = views.get(clientId);
  return (
    view?.owner === data.owner &&
    view.token === data.token &&
    permitted(data.owner, data.conversation, view)
  );
}

async function closeUnreadableNotifications(clientId?: string) {
  for (const notification of await worker.registration.getNotifications()) {
    const data = readNotificationData(notification.data);
    if (!data) {
      notification.close();
      continue;
    }
    const view = clientId === undefined ? undefined : views.get(clientId);
    if (clientId !== undefined && (!view || data.owner !== view.owner)) continue;
    if (!permitted(data.owner, data.conversation, view)) notification.close();
  }
}

function windowClient(client: Client | ServiceWorker | MessagePort | null): client is WindowClient {
  return client !== null && 'type' in client && client.type === 'window';
}

function chatClient(client: Client | ServiceWorker | MessagePort | null): client is WindowClient {
  if (!windowClient(client)) return false;
  const url = new URL(client.url);
  return url.origin === worker.location.origin && chatPath.test(url.pathname);
}

worker.addEventListener('message', (event) => {
  const client = event.source;
  if (!windowClient(client) || new URL(client.url).origin !== worker.location.origin) return;
  const data = readRequest(event.data);
  if (!data) return;
  if (data.type === 'account') {
    if (policy?.owner !== data.owner || policy?.staff !== data.staff) revision++;
    policy = { owner: data.owner, staff: data.staff };
    for (const [id, view] of views) if (!permitted(view.owner)) views.delete(id);
    event.waitUntil(closeUnreadableNotifications());
    return;
  }
  if (data.type === 'view') {
    if (!chatClient(client) || !permitted(data.owner)) return;
    views.set(client.id, data);
    event.waitUntil(closeUnreadableNotifications(client.id));
    return;
  }
  if (data.type === 'clear' || data.type === 'release') {
    if (data.type === 'clear') revision++;
    if (data.type === 'release' && views.get(client.id)?.token === data.token)
      views.delete(client.id);
    event.waitUntil(
      (async () => {
        const windows = await worker.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
        const liveIds = new Set(windows.map((window) => window.id));
        for (const id of views.keys()) if (!liveIds.has(id)) views.delete(id);
        if (
          data.type === 'clear' ||
          ![...views.values()].some((view) => view.owner === data.owner)
        ) {
          for (const notification of await worker.registration.getNotifications())
            if (notification.data?.owner === data.owner) notification.close();
        }
      })(),
    );
    return;
  }
  if (!chatClient(client) || !permitted(data.owner, data.conversation, data)) return;
  const view = views.get(client.id);
  if (view && !currentNotification(data, client.id)) return;
  if (!view)
    views.set(client.id, {
      owner: data.owner,
      token: data.token,
      conversation: data.view,
      staff: data.staff,
    });
  // Deduplication is local to this browser profile; other devices remain independent.
  const key = `${data.owner}:${data.id}`;
  const now = Date.now();
  for (const [id, at] of seen) if (now - at > 120_000) seen.delete(id);
  if (seen.has(key)) return;
  seen.set(key, now);
  const oldest = seen.keys().next().value;
  if (seen.size > 256 && oldest) seen.delete(oldest);
  const expectedRevision = revision;
  event.waitUntil(
    (async () => {
      const windows = await worker.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const liveIds = new Set(windows.map((window) => window.id));
      for (const id of views.keys()) if (!liveIds.has(id)) views.delete(id);
      if (expectedRevision !== revision || !currentNotification(data, client.id)) return;
      if (
        windows.some(
          (window) =>
            window.focused &&
            window.visibilityState === 'visible' &&
            views.get(window.id)?.owner === data.owner &&
            views.get(window.id)?.conversation === data.conversation &&
            permitted(data.owner, data.conversation, views.get(window.id)),
        )
      )
        return;
      if ((await worker.registration.getNotifications({ tag: `mik-chat:${key}` })).length) return;
      if (expectedRevision !== revision || !currentNotification(data, client.id)) return;
      await worker.registration.showNotification(data.title, {
        body: data.body,
        icon: SITE_NOTIFICATION_ICON_PATH,
        tag: `mik-chat:${key}`,
        data: {
          owner: data.owner,
          destination: data.destination,
          conversation: data.conversation,
          url: new URL(client.url).pathname,
        },
      });
      if (expectedRevision !== revision || !currentNotification(data, client.id)) {
        for (const notification of await worker.registration.getNotifications({
          tag: `mik-chat:${key}`,
        }))
          notification.close();
      }
    })(),
  );
});

worker.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = readNotificationData(event.notification.data);
  if (!data || !permitted(data.owner, data.conversation)) return;
  event.waitUntil(
    (async () => {
      const windows = await worker.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const client = windows.find(
        (window) =>
          chatClient(window) &&
          views.get(window.id)?.owner === data.owner &&
          permitted(data.owner, data.conversation, views.get(window.id)),
      );
      if (client) {
        await client.focus();
        client.postMessage({
          type: 'mik-chat-notification-open',
          owner: data.owner,
          destination: data.destination,
        });
      } else {
        const url = new URL(data.url, worker.location.origin);
        if (url.origin !== worker.location.origin || !chatPath.test(url.pathname)) return;
        url.hash = new URLSearchParams({ owner: data.owner, chat: data.conversation }).toString();
        await worker.clients.openWindow(url.href);
      }
    })(),
  );
});
