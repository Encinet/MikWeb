'use client';

function activatePage(marker: HTMLSpanElement | null) {
  if (!marker) return;
  marker.setAttribute('data-page-active', '');
  // Activity keeps the DOM but detaches refs while a cached page is hidden.
  return () => marker.removeAttribute('data-page-active');
}

/** Keep global page appearance tied to the visible route, including before hydration. */
export function PageAppearance({ appearance }: { appearance: 'hero' | 'dark' }) {
  return (
    <span
      ref={activatePage}
      hidden
      data-page-appearance={appearance}
      // Hidden client prerenders never attach the ref; only the server shell starts active.
      data-page-active={typeof window === 'undefined' ? '' : undefined}
      suppressHydrationWarning
    />
  );
}
