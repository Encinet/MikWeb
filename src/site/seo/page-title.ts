import { SITE_NAME } from '@/shared/config/site-config';

export function formatPageTitle(title: string, { home = false }: { home?: boolean } = {}) {
  const label = title.replace(/\s+/gu, ' ').trim();
  if (!label) return SITE_NAME;
  return home ? `${SITE_NAME} | ${label}` : `${label} | ${SITE_NAME}`;
}

export const PAGE_TITLE_TEMPLATE = formatPageTitle('%s');
