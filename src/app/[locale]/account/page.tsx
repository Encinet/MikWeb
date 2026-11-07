import type { Metadata } from 'next';
import { AccountPage } from '@/modules/auth/ui/account-page';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { generateSitePageMetadata } from '@/site/seo/site-page-metadata';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  return generateSitePageMetadata(locale, 'account');
}

export default AccountPage;
