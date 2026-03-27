import { routing } from '@/i18n/routing';
import { createSocialImage, SOCIAL_IMAGE_SIZE } from '@/lib/socialImage';

export const contentType = 'image/png';
export const size = SOCIAL_IMAGE_SIZE;

export default function OpenGraphImage() {
  return createSocialImage(routing.defaultLocale);
}
