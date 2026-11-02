import type messages from '../../../messages/zh-CN.json';
import type { AppLocale } from './routing';

declare module 'next-intl' {
  interface AppConfig {
    // biome-ignore lint/style/useNamingConvention: next-intl defines this extension key.
    Locale: AppLocale;
    // biome-ignore lint/style/useNamingConvention: next-intl defines this extension key.
    Messages: typeof messages;
  }
}
