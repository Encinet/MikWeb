import { isBuildingId } from '@/modules/building/model/building-types';
import type { AppLocale } from '@/shared/i18n/routing';
import { isRoutingLocale } from '@/shared/i18n/routing';
import type { SitePage } from '@/site/seo/site-pages';
import { SITE_PAGE_IDS, SITE_PAGES } from '@/site/seo/site-pages';

export type ShareTarget =
  | { kind: 'site'; locale: AppLocale; page: SitePage }
  | { kind: 'building'; locale: AppLocale; id: string };

const pagesBySpecificity = [...SITE_PAGE_IDS].sort(
  (a, b) => SITE_PAGES[b].pathname.length - SITE_PAGES[a].pathname.length,
);

export function resolveShareTarget(pathname: string): ShareTarget | null {
  const [, locale, ...segments] = pathname.replace(/\/$/, '').split('/');
  if (!isRoutingLocale(locale)) return null;
  if (segments.length === 2 && segments[0] === 'buildings' && isBuildingId(segments[1])) {
    return { kind: 'building', locale, id: segments[1].toLowerCase() };
  }
  const path = segments.length ? `/${segments.join('/')}` : '';
  const page = pagesBySpecificity.find((page) => {
    const parent = SITE_PAGES[page].pathname;
    return path === parent || (parent !== '' && path.startsWith(`${parent}/`));
  });
  return page ? { kind: 'site', locale, page } : null;
}

export function isSameShareTarget(current: ShareTarget | null, target: ShareTarget): boolean {
  if (!current || current.locale !== target.locale) return false;
  return current.kind === 'site'
    ? target.kind === 'site' && current.page === target.page
    : target.kind === 'building' && current.id === target.id;
}

export function getShareThumbnailPath(target: ShareTarget): string {
  return target.kind === 'site'
    ? `/${target.locale}/thumbnails/${target.page}`
    : `/${target.locale}/buildings/${target.id}/thumbnail`;
}
