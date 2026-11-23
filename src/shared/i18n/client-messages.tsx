import type { Messages } from 'next-intl';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { ReactNode } from 'react';
import { cache } from 'react';
import type { AppLocale } from './routing';

// Global and account navigation use feature titles even outside those features.
const getNavigationMessages = cache((messages: Messages) => ({
  auth: { account: { title: messages.auth.account.title } },
  bans: { title: messages.bans.title },
  buildingSubmission: { title: messages.buildingSubmission.title },
  chat: { title: messages.chat.title },
  common: messages.common,
  map: { title: messages.map.title },
  nav: messages.nav,
  sponsors: { title: messages.sponsors.title },
}));

export async function ClientMessages({
  children,
  locale,
  namespaces,
}: {
  children: ReactNode;
  locale: AppLocale;
  namespaces?: (keyof Messages)[];
}) {
  const messages = await getMessages({ locale });
  const shared = getNavigationMessages(messages);
  // A nested next-intl provider replaces its parent's messages.
  const selected = namespaces
    ? { ...shared, ...Object.fromEntries(namespaces.map((key) => [key, messages[key]])) }
    : shared;
  return (
    <NextIntlClientProvider locale={locale} messages={selected}>
      {children}
    </NextIntlClientProvider>
  );
}
