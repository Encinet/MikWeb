/** Avoid scrolling back past the sidebar's docking point when changing articles. */
export function getWikiNavigationScrollMinimum(sidebar: HTMLElement | null): number | undefined {
  const layout = sidebar?.closest<HTMLElement>('.wiki-page__layout');
  if (!sidebar || !layout) return undefined;

  const style = window.getComputedStyle(sidebar);
  const stickyTop = Number.parseFloat(style.top);
  const rect = sidebar.getBoundingClientRect();
  if (
    style.position !== 'sticky' ||
    !rect.width ||
    !Number.isFinite(stickyTop) ||
    Math.abs(rect.top - stickyTop) > 1
  )
    return undefined;

  return Math.max(0, layout.getBoundingClientRect().top + window.scrollY - stickyTop);
}
