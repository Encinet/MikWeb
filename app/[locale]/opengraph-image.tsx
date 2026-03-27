import { requireRouteLocale } from '@/lib/routeLocale';
import { createSocialImage, SOCIAL_IMAGE_SIZE } from '@/lib/socialImage';

export const contentType = 'image/png';
export const size = SOCIAL_IMAGE_SIZE;

export default async function LocaleOpenGraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  return createSocialImage(locale);
}
