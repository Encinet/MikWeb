import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { isJoinPagePath } from '@/modules/join/lib/join-path';
import { getAccentInitializationScript } from '@/site/theme/lib/accent-color';

test('application routes always use daily color without replacing saved preferences elsewhere', () => {
  for (const path of ['/join', '/zh-CN/join', '/en/join/'])
    assert.equal(isJoinPagePath(path), true);
  assert.equal(isJoinPagePath('/en/join/other'), false);
  assert.equal(isJoinPagePath('/en/account'), false);
  for (const pathname of ['/zh-CN/join', '/en/join', '/zh-CN/account']) {
    const properties = new Map<string, string>();
    const attributes = new Map<string, string>();
    let storageReads = 0;
    runInNewContext(getAccentInitializationScript(), {
      location: { pathname },
      localStorage: {
        getItem() {
          storageReads++;
          return '#ff0000';
        },
      },
      document: {
        documentElement: {
          style: { setProperty: (key: string, value: string) => properties.set(key, value) },
          setAttribute: (key: string, value: string) => attributes.set(key, value),
        },
      },
    });
    if (isJoinPagePath(pathname)) {
      assert.equal(storageReads, 0);
      assert.equal(attributes.get('data-accent-mode'), 'daily');
      assert.notEqual(properties.get('--theme-seed'), '#ff0000');
    } else {
      assert.equal(storageReads, 1);
      assert.equal(properties.get('--theme-seed'), '#ff0000');
    }
  }
});
