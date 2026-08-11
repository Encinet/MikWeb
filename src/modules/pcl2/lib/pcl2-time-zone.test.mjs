import { expect, test } from 'bun:test';

import { buildPcl2HomepageXml } from './pcl2-homepage-xml.ts';
import {
  DEFAULT_PCL2_TIME_ZONE,
  formatPcl2Time,
  getPcl2TimeZoneFromUrl,
  normalizePcl2TimeZone,
  withPcl2TimeZone,
} from './pcl2-time-zone.ts';

test('normalizes IANA time zones and falls back to UTC', () => {
  expect(normalizePcl2TimeZone('Asia/Singapore')).toBe('Asia/Singapore');
  expect(normalizePcl2TimeZone('US/Eastern')).not.toBe(DEFAULT_PCL2_TIME_ZONE);
  expect(normalizePcl2TimeZone(undefined)).toBe(DEFAULT_PCL2_TIME_ZONE);
  expect(normalizePcl2TimeZone('Not/A_Time_Zone')).toBe(DEFAULT_PCL2_TIME_ZONE);
  expect(normalizePcl2TimeZone('+08:00')).toBe(DEFAULT_PCL2_TIME_ZONE);
  expect(normalizePcl2TimeZone('x'.repeat(101))).toBe(DEFAULT_PCL2_TIME_ZONE);
});

test('reads and writes the time-zone query parameter without losing existing parameters', () => {
  const homepageUrl = withPcl2TimeZone('https://mcmik.top/zh-CN/pcl2?raw=1', 'Asia/Singapore');

  expect(homepageUrl).toBe('https://mcmik.top/zh-CN/pcl2?raw=1&timezone=Asia%2FSingapore');
  expect(getPcl2TimeZoneFromUrl(homepageUrl)).toBe('Asia/Singapore');
  expect(getPcl2TimeZoneFromUrl('https://mcmik.top/zh-CN/pcl2')).toBe(DEFAULT_PCL2_TIME_ZONE);
});

test('formats each timestamp with the requested IANA time-zone rules', () => {
  expect(formatPcl2Time('2026-01-15T12:00:00Z', 'America/New_York')).toBe('2026/1/15 07:00');
  expect(formatPcl2Time('2026-07-15T12:00:00Z', 'America/New_York')).toBe('2026/7/15 08:00');
  expect(formatPcl2Time('2026-07-15T23:30:00Z', 'Asia/Singapore')).toBe('2026/7/16 07:30');
  expect(formatPcl2Time('invalid', 'Asia/Singapore')).toBe('invalid');
  expect(formatPcl2Time(null, 'Asia/Singapore')).toBe('?');
});

test('uses the request time zone throughout generated homepage XML', () => {
  const xml = buildPcl2HomepageXml({
    announcements: [{ content: 'Announcement', timestamp: '2026-07-15T23:30:00Z' }],
    bans: [
      {
        playerName: 'Bob',
        playerUuid: 'bob-uuid',
        reason: 'Test',
        bannedBy: 'Admin',
        bannedAt: '2026-07-15T23:30:00Z',
        expiresAt: '2026-07-16T23:30:00Z',
        isPermanent: false,
      },
    ],
    buildingCount: 0,
    buildings: [],
    displayAddress: 'mcmik.top',
    echoQuotes: [{ 'zh-CN': '回声', en: 'Echo' }],
    locale: 'en',
    onlinePlayers: {
      online: 1,
      players: [
        {
          name: 'Alice',
          uuid: 'alice-uuid',
          // biome-ignore lint/style/useNamingConvention: External player API uses snake_case.
          joined_at: '2026-07-15T23:30:00Z',
        },
      ],
    },
    serverAddress: 'mcmik.top',
    siteOrigin: 'https://mcmik.top',
    timeZone: 'Asia/Singapore',
  });

  expect(xml).toContain('Joined at 2026/7/16 07:30');
  expect(xml).toContain('2026/7/16 07:30');
  expect(xml).toContain('Expires：2026/7/17 07:30');
  expect(xml).toContain(
    'https://mcmik.top/en/pcl2?timezone=Asia%2FSingapore'.replaceAll('&', '&amp;'),
  );
});
