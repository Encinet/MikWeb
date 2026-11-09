/** Locale prefixes do not change the application's daily-only appearance policy. */
export function isJoinPagePath(pathname: string | null): boolean {
  return pathname !== null && /^(?:\/(?:zh-CN|en))?\/join\/?$/.test(pathname);
}
