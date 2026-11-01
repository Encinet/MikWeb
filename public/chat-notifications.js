/* Notifications only: no fetch handler, cache, push subscription or chat history. */
const views = new Map();
const seen = new Map();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const conversation = /^(?:public|staff|private:[0-9a-f-]{36})$/;
const chatPath = /^\/(?:zh-CN|en)\/chat\/?$/;
let revision = 0;
let policy;

self.addEventListener('install', (event) => event.waitUntil(self.skipWaiting()));

function permitted(owner, channel, view) {
  return (
    (policy === undefined || (policy.owner === owner && (channel !== 'staff' || policy.staff))) &&
    (channel !== 'staff' || view === undefined || view.staff)
  );
}

function currentNotification(data, clientId) {
  const view = views.get(clientId);
  return (
    view?.owner === data.owner &&
    view.token === data.token &&
    permitted(data.owner, data.conversation, view)
  );
}

async function closeUnreadableNotifications(clientId) {
  for (const notification of await self.registration.getNotifications()) {
    const view = clientId === undefined ? undefined : views.get(clientId);
    if (clientId !== undefined && (!view || notification.data?.owner !== view.owner)) continue;
    if (!permitted(notification.data?.owner, notification.data?.conversation, view))
      notification.close();
  }
}

function chatClient(client) {
  if (client?.type !== 'window') return false;
  const url = new URL(client.url);
  return url.origin === self.location.origin && chatPath.test(url.pathname);
}

function destination(value, key) {
  if (!value || typeof value !== 'object') return false;
  if (key === 'public' || key === 'staff') return value.channel === key;
  return (
    value.channel === 'private' &&
    uuid.test(value.targetUuid) &&
    key === `private:${value.targetUuid}` &&
    typeof value.name === 'string' &&
    value.name.length > 0 &&
    value.name.length <= 64
  );
}

self.addEventListener('message', (event) => {
  const data = event.data;
  const client = event.source;
  if (
    client?.type !== 'window' ||
    new URL(client.url).origin !== self.location.origin ||
    !data ||
    typeof data !== 'object'
  )
    return;
  if (data.type === 'account') {
    if ((data.owner !== null && !uuid.test(data.owner)) || typeof data.staff !== 'boolean') return;
    if (policy?.owner !== data.owner || policy?.staff !== data.staff) revision++;
    policy = { owner: data.owner, staff: data.staff };
    for (const [id, view] of views) if (!permitted(view.owner)) views.delete(id);
    event.waitUntil(closeUnreadableNotifications());
    return;
  }
  if (!uuid.test(data.owner)) return;
  if (
    data.type === 'view' &&
    typeof data.conversation === 'string' &&
    conversation.test(data.conversation)
  ) {
    if (
      !chatClient(client) ||
      !uuid.test(data.token) ||
      typeof data.staff !== 'boolean' ||
      !permitted(data.owner)
    )
      return;
    views.set(client.id, {
      owner: data.owner,
      token: data.token,
      conversation: data.conversation,
      staff: data.staff,
    });
    event.waitUntil(closeUnreadableNotifications(client.id));
    return;
  }
  if (data.type === 'clear' || data.type === 'release') {
    if (data.type === 'clear') revision++;
    if (data.type === 'release' && views.get(client.id)?.token === data.token)
      views.delete(client.id);
    event.waitUntil(
      (async () => {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const liveIds = new Set(windows.map((window) => window.id));
        for (const id of views.keys()) if (!liveIds.has(id)) views.delete(id);
        if (
          data.type === 'clear' ||
          ![...views.values()].some((view) => view.owner === data.owner)
        ) {
          for (const notification of await self.registration.getNotifications())
            if (notification.data?.owner === data.owner) notification.close();
        }
      })(),
    );
    return;
  }
  if (
    !chatClient(client) ||
    !permitted(data.owner, data.conversation, data) ||
    typeof data.staff !== 'boolean' ||
    data.type !== 'notify' ||
    typeof data.id !== 'string' ||
    data.id.length < 1 ||
    data.id.length > 128 ||
    !destination(data.destination, data.conversation) ||
    typeof data.title !== 'string' ||
    data.title.length > 256 ||
    typeof data.body !== 'string' ||
    data.body.length > 256 ||
    !uuid.test(data.token) ||
    typeof data.view !== 'string' ||
    !conversation.test(data.view)
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
  // One worker per browser profile. Other devices keep their own independent state.
  const key = `${data.owner}:${data.id}`;
  const now = Date.now();
  for (const [id, at] of seen) if (now - at > 120_000) seen.delete(id);
  if (seen.has(key)) return;
  seen.set(key, now);
  if (seen.size > 256) seen.delete(seen.keys().next().value);
  const expectedRevision = revision;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
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
      if ((await self.registration.getNotifications({ tag: `mik-chat:${key}` })).length) return;
      if (expectedRevision !== revision || !currentNotification(data, client.id)) return;
      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/mik-logo.svg',
        tag: `mik-chat:${key}`,
        renotify: false,
        data: {
          owner: data.owner,
          destination: data.destination,
          conversation: data.conversation,
          url: new URL(client.url).pathname,
        },
      });
      if (expectedRevision !== revision || !currentNotification(data, client.id)) {
        for (const notification of await self.registration.getNotifications({
          tag: `mik-chat:${key}`,
        }))
          notification.close();
      }
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data;
  if (
    !data ||
    !uuid.test(data.owner) ||
    !permitted(data.owner, data.conversation) ||
    !destination(data.destination, data.conversation)
  )
    return;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
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
        const url = new URL(data.url, self.location.origin);
        if (url.origin !== self.location.origin || !chatPath.test(url.pathname)) return;
        url.hash = new URLSearchParams({ owner: data.owner, chat: data.conversation }).toString();
        await self.clients.openWindow(url.href);
      }
    })(),
  );
});
