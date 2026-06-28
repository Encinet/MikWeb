import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { LoginPage } from '@/modules/auth/ui/login-page';
import { requireRouteLocale } from '@/shared/i18n/route-locale';
import { buildPageMetadata } from '@/site/seo/build-page-metadata';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = requireRouteLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: 'auth.login' });

  return buildPageMetadata({
    locale,
    title: t('title'),
    description: t('subtitle'),
    pathname: '/login',
  });
}

export default LoginPage;
