import { routing } from '@/shared/i18n/routing';
import { createSocialImage } from '@/site/seo/social-image/site-social-image';
import { SOCIAL_IMAGE_SIZE } from '@/site/seo/social-image/social-image-config';

export const contentType = 'image/png';
export const alt = 'Mik Casual Minecraft server';
export const size = SOCIAL_IMAGE_SIZE;

export default function OpenGraphImage() {
  return createSocialImage(routing.defaultLocale);
}
