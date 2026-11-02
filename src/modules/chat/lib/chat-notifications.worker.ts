/// <reference lib="webworker" />

import { z } from 'zod';
import { chatDestinationSchema, destinationKey } from '@/modules/chat/model/chat-protocol';

const worker = self as unknown as ServiceWorkerGlobalScope;
const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const conversation = z.string().regex(/^(?:public|staff|private:[0-9a-f-]{36})$/);
const chatPath = /^\/(?:zh-CN|en)\/chat\/?$/;
const viewSchema = z.object({ owner: uuid, token: uuid, conversation, staff: z.boolean() });
const notificationSchema = z
  .object({
    owner: uuid,
    destination: chatDestinationSchema,
    conversation,
    url: z.string().regex(chatPath),
  })
  .refine((data) => destinationKey(data.destination) === data.conversation);
const requestSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('account'), owner: uuid.nullable(), staff: z.boolean() }),
  viewSchema.extend({ type: z.literal('view') }),
  z.object({ type: z.literal('clear'), owner: uuid }),
  z.object({ type: z.literal('release'), owner: uuid, token: uuid }),
  viewSchema.extend({
    type: z.literal('notify'),
    id: z.string().min(1).max(128),
    destination: chatDestinationSchema,
    title: z.string().max(256),
    body: z.string().max(256),
    view: conversation,
  }),
]);
type ChatView = z.infer<typeof viewSchema>;
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
    const parsed = notificationSchema.safeParse(notification.data);
    if (!parsed.success) {
      notification.close();
      continue;
    }
    const view = clientId === undefined ? undefined : views.get(clientId);
    if (clientId !== undefined && (!view || parsed.data.owner !== view.owner)) continue;
    if (!permitted(parsed.data.owner, parsed.data.conversation, view)) notification.close();
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
  const parsed = requestSchema.safeParse(event.data);
  if (!parsed.success) return;
  const data = parsed.data;
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
  if (
    !chatClient(client) ||
    !permitted(data.owner, data.conversation, data) ||
    destinationKey(data.destination) !== data.conversation
  )
    return;
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
        icon: '/mik-logo.svg',
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
  const parsed = notificationSchema.safeParse(event.notification.data);
  if (!parsed.success || !permitted(parsed.data.owner, parsed.data.conversation)) return;
  const data = parsed.data;
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
