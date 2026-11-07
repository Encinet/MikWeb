import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { routing } from '@/shared/i18n/routing';
import { createSocialImage } from '@/site/seo/social-image/site-social-image';
import { SOCIAL_IMAGE_SIZE } from '@/site/seo/social-image/social-image-config';

export const contentType = 'image/png';
export const alt = 'Mik Casual Minecraft server';
export const size = SOCIAL_IMAGE_SIZE;
export const dynamic = 'force-static';
export const dynamicParams = false;

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
  return createSocialImage(locale);
}
