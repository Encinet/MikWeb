'use client';

import { usePathname, useServerInsertedHTML } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { ShareTarget } from '@/site/seo/share-target';
import { isSameShareTarget, resolveShareTarget } from '@/site/seo/share-target';
import { registerShareText } from '@/site/seo/share-text-head';

export function ShareTextMetadata({
  title,
  description,
  target,
}: {
  title: string;
  description: string;
  target: ShareTarget;
}) {
  const pathname = usePathname();
  const active = isSameShareTarget(pathname ? resolveShareTarget(pathname) : null, target);
  const inserted = useRef(false);

  // itemProp tags are not hoisted by React and are not supported by Next's Metadata API.
  useServerInsertedHTML(() => {
    if (!active || inserted.current) return null;
    inserted.current = true;
    return (
      <>
        <meta itemProp="name" content={title} />
        <meta itemProp="description" content={description} />
      </>
    );
  });

  useEffect(() => {
    if (!active) return;
    return registerShareText(document, { title, description });
  }, [active, title, description]);

  return null;
}
