'use client';

import type { MouseEvent } from 'react';

export function SkipToContent({ children, targetId }: { children: string; targetId: string }) {
  function skip(event: MouseEvent<HTMLAnchorElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = document.getElementById(targetId);
    if (!target) return;

    // A native fragment navigation can add a history entry without App Router state.
    event.preventDefault();
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: 'instant', block: 'start' });
  }

  return (
    <a
      href={`#${targetId}`}
      onClick={skip}
      className="site-skip-link sr-only focus:not-sr-only print:hidden"
    >
      {children}
    </a>
  );
}
