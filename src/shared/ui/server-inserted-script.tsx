'use client';

import { useServerInsertedHTML } from 'next/navigation';
import { useRef } from 'react';

/** Emit initialization only in server HTML, including when a document is used as an error fallback. */
export function ServerInsertedScript({ code }: { code: string }) {
  const inserted = useRef(false);
  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;
    // biome-ignore lint/security/noDangerouslySetInnerHtml: Only trusted, repository-owned initialization scripts are passed here.
    return <script dangerouslySetInnerHTML={{ __html: code }} />;
  });
  return null;
}
