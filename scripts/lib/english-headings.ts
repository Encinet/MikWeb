const minorWords = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'in',
  'nor',
  'of',
  'on',
  'or',
  'per',
  'the',
  'to',
  'via',
]);

const properNames = new Map(
  [
    'AFK',
    'ajParkour',
    'GitHub',
    'JSON',
    'MCP',
    'Minecraft',
    'Mik',
    'PCL2',
    'PVP',
    'QQ',
    'URL',
    'WorldEdit',
  ].map((name) => [name.toLowerCase(), name]),
);

const headingKeys = new Set([
  'nav.brand.subtitle',
  'nav.items.join',
  'home.playerHome.shortcuts.rules',
  'home.playerHome.shortcuts.launcher',
  'home.playerHome.shortcuts.gettingStarted',
  'buildings.details.builders',
  'buildingSubmission.sections.basic',
  'auth.security.sections.sessions',
  'chat.settings',
  'chat.privateList',
  'chat.onlinePlayers',
  'chat.participants',
  'chat.newPrivate',
  'chat.searchMessages',
  'chat.channels.private',
  'mcp.addressLabel',
  'pcl2.addressLabel',
  'footer.navigation',
  'footer.siteInfo',
]);

export function isEnglishHeadingKey(key: string): boolean {
  // Notification titles are sentences about an event, rather than website headings.
  return (
    key !== 'chat.notifications.mentionTitle' &&
    (/(?:^|\.)(?:title|[a-zA-Z]+Title)$/.test(key) || headingKeys.has(key))
  );
}

/** Build-time copy check only; user content and runtime translations keep their own spelling. */
export function formatEnglishHeading(value: string): string {
  const tokens = value.match(/\{[^{}]*\}|[a-zA-Z][a-zA-Z0-9]*(?:['’][a-zA-Z]+)*/g) ?? [];
  let index = 0;
  return value.replace(/\{[^{}]*\}|[a-zA-Z][a-zA-Z0-9]*(?:['’][a-zA-Z]+)*/g, (word) => {
    const position = index++;
    if (word.startsWith('{')) return word;
    const lower = word.toLowerCase();
    const properName = properNames.get(lower);
    if (properName) return properName;
    if (position > 0 && position < tokens.length - 1 && minorWords.has(lower)) return lower;
    return word[0].toUpperCase() + word.slice(1);
  });
}
