import { routing } from '@/shared/i18n/routing';
import {
  getSiteSocialImage,
  socialImageResponse,
} from '@/site/seo/social-image/cached-social-images';

// Keep the fallback URL without injecting file-based image metadata above the locale root.

export async function GET() {
  return socialImageResponse(await getSiteSocialImage(routing.defaultLocale));
}
