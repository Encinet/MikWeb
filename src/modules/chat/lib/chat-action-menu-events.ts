export const CHAT_ACTION_MENUS_CLOSE_EVENT = 'mik-chat-close-action-menus';

/** Close both native and fallback menus before opening another workspace surface. */
export function closeChatActionMenus(exceptId: string | null = null): void {
  window.dispatchEvent(new CustomEvent(CHAT_ACTION_MENUS_CLOSE_EVENT, { detail: exceptId }));
}
