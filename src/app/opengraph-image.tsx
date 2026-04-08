import { routing } from '@/shared/i18n/routing';
import { createSocialImage, SOCIAL_IMAGE_SIZE } from '@/site/seo/social-image';

export const contentType = 'image/png';
export const size = SOCIAL_IMAGE_SIZE;

export default function OpenGraphImage() {
  return createSocialImage(routing.defaultLocale);
}
