/** Settle message grouping and activity disclosures before measuring coordinates or anchoring menus. */
export function finishChatRegrouping(root: HTMLElement | null) {
  if (!root || typeof root.getAnimations !== 'function') return;
  for (const animation of root.getAnimations({ subtree: true })) {
    const target = (animation.effect as KeyframeEffect | null)?.target;
    if (
      target instanceof HTMLElement &&
      target.matches(
        '.chat-message, .chat-message__author, .chat-message__avatar, .chat-activity-disclosure',
      ) &&
      'transitionProperty' in animation &&
      ['margin-top', 'grid-template-rows', 'opacity', 'visibility'].includes(
        String(animation.transitionProperty),
      )
    )
      animation.finish();
  }
}
