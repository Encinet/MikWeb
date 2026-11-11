'use client';

import { useEffect } from 'react';

export function PrintPreparation() {
  useEffect(() => {
    const printMedia = window.matchMedia('print');
    let closedDetails: HTMLDetailsElement[] = [];
    let hiddenContent: HTMLElement[] = [];

    const prepare = () => {
      if (closedDetails.length || hiddenContent.length) return;
      closedDetails = Array.from(
        document.querySelectorAll<HTMLDetailsElement>('.wiki-details:not([open])'),
      );
      hiddenContent = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.wiki-tabs__panel[hidden], .community-board__entry-content[hidden]',
        ),
      );
      for (const details of closedDetails) details.open = true;
      for (const content of hiddenContent) content.hidden = false;
    };

    const restore = () => {
      for (const details of closedDetails) details.open = false;
      for (const content of hiddenContent) content.hidden = true;
      closedDetails = [];
      hiddenContent = [];
    };

    const onMediaChange = () => {
      if (printMedia.matches) prepare();
      else restore();
    };

    window.addEventListener('beforeprint', prepare);
    window.addEventListener('afterprint', restore);
    printMedia.addEventListener('change', onMediaChange);
    if (printMedia.matches) prepare();

    return () => {
      window.removeEventListener('beforeprint', prepare);
      window.removeEventListener('afterprint', restore);
      printMedia.removeEventListener('change', onMediaChange);
      restore();
    };
  }, []);

  return null;
}
