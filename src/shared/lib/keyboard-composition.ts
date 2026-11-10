/** Safari can send the IME confirmation key after compositionend with isComposing=false.
 * Keep the deprecated 229 check in this compatibility boundary until that ordering is reliable.
 */
export function isImeComposing(event: Pick<KeyboardEvent, 'isComposing' | 'keyCode'>): boolean {
  return event.isComposing || event.keyCode === 229;
}
