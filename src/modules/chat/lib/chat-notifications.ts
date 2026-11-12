export function registerChatNotificationWorker(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register(
    new URL(
      /* webpackChunkName: "chat-notifications-worker" */ '../worker/chat-notifications.worker.ts',
      import.meta.url,
    ),
    { scope: '/', updateViaCache: 'none' },
  );
}

/** Account cleanup also runs outside chat, without registering or enabling notifications. */
export async function syncChatNotificationAccount(
  owner: string | null,
  staff: boolean,
  current: () => boolean,
): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  if (current()) registration?.active?.postMessage({ type: 'account', owner, staff });
}
