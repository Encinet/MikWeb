'use client';

import { usePathname } from 'next/navigation';
import { SITE_URL } from '@/shared/config/site-config';
import { getShareThumbnailPath, resolveShareTarget } from '@/site/seo/share-target';

// Render inside the root head: React deliberately does not hoist itemProp meta tags.
export function ShareThumbnailMetadata() {
  const pathname = usePathname();
  const target = pathname ? resolveShareTarget(pathname) : null;
  return target ? (
    <meta itemProp="image" content={`${SITE_URL}${getShareThumbnailPath(target)}`} />
  ) : null;
}
