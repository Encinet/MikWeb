import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { routing } from '@/shared/i18n/routing';
import {
  getSiteSocialImage,
  socialImageResponse,
} from '@/site/seo/social-image/cached-social-images';
import { SOCIAL_IMAGE_SIZE } from '@/site/seo/social-image/social-image-config';

export const contentType = 'image/png';
export const alt = 'Mik Casual Minecraft server';
export const size = SOCIAL_IMAGE_SIZE;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleOpenGraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  return socialImageResponse(await getSiteSocialImage(locale));
}
