export const CHAT_NOTIFICATION_WORKER = '/chat-notifications.js';

/** Account cleanup also runs outside chat, without registering or enabling notifications. */
export async function syncChatNotificationAccount(
  owner: string | null,
  staff: boolean,
  current: () => boolean,
): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('/');
  if (
    current() &&
    registration?.active?.scriptURL ===
      new URL(CHAT_NOTIFICATION_WORKER, window.location.origin).href
  )
    registration.active.postMessage({ type: 'account', owner, staff });
}
