/** Room selection preserves reading on touch/narrow layouts; editing actions focus separately. */
export function focusChatConversation(
  timeline: HTMLElement | null,
  composer: HTMLInputElement | null,
): void {
  const reading =
    window.matchMedia('(max-width: 820px)').matches ||
    window.matchMedia('(pointer: coarse)').matches;
  (reading ? timeline : composer)?.focus({ preventScroll: true });
}
