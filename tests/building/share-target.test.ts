import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  getShareThumbnailPath,
  isSameShareTarget,
  resolveShareTarget,
} from '@/site/seo/share-target';

test('share targets follow locale and the most specific page, independent of asset URLs', () => {
  assert.deepEqual(resolveShareTarget('/zh-CN'), { kind: 'site', locale: 'zh-CN', page: 'home' });
  assert.deepEqual(resolveShareTarget('/en/'), { kind: 'site', locale: 'en', page: 'home' });
  assert.deepEqual(resolveShareTarget('/en/account/security'), {
    kind: 'site',
    locale: 'en',
    page: 'security',
  });
  assert.deepEqual(resolveShareTarget('/zh-CN/wiki/getting-started'), {
    kind: 'site',
    locale: 'zh-CN',
    page: 'wiki',
  });
  assert.deepEqual(resolveShareTarget('/en/community/notices/123'), {
    kind: 'site',
    locale: 'en',
    page: 'community',
  });
  assert.equal(
    getShareThumbnailPath({ kind: 'site', locale: 'en', page: 'buildings' }),
    '/en/thumbnails/buildings',
  );
});

test('building IDs are normalized before target comparison and image path generation', () => {
  const id = 'A'.repeat(32);
  const target = { kind: 'building', locale: 'en', id: id.toLowerCase() } as const;
  assert.deepEqual(resolveShareTarget(`/en/buildings/${id}`), target);
  assert.deepEqual(resolveShareTarget(`/en/buildings/${id}/`), target);
  assert.equal(getShareThumbnailPath(target), `/en/buildings/${id.toLowerCase()}/thumbnail`);
  assert.equal(isSameShareTarget(resolveShareTarget(`/en/buildings/${id}`), target), true);
  assert.deepEqual(resolveShareTarget('/en/buildings/invalid'), {
    kind: 'site',
    locale: 'en',
    page: 'buildings',
  });
});

test('different locales, pages, buildings and unrelated routes do not match', () => {
  const site = { kind: 'site', locale: 'en', page: 'buildings' } as const;
  const building = { kind: 'building', locale: 'en', id: 'a'.repeat(32) } as const;
  assert.equal(isSameShareTarget(resolveShareTarget('/en/buildings'), site), true);
  assert.equal(isSameShareTarget(resolveShareTarget('/zh-CN/buildings'), site), false);
  assert.equal(isSameShareTarget(resolveShareTarget('/en/map'), site), false);
  assert.equal(isSameShareTarget(resolveShareTarget('/en/buildings'), building), false);
  assert.equal(
    isSameShareTarget(resolveShareTarget(`/en/buildings/${'b'.repeat(32)}`), building),
    false,
  );
  for (const path of ['/fr/buildings', '/en/buildings-other', '/en/unknown']) {
    assert.equal(resolveShareTarget(path), null);
    assert.equal(isSameShareTarget(resolveShareTarget(path), site), false);
  }
});
