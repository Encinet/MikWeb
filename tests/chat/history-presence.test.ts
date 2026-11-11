import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hasStoredChatHistory } from '@/modules/chat/lib/chat-history-presence';

test('fresh visitors skip history code while existing stores and enumeration failures retain account cleanup', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
  const install = (value: unknown) =>
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value });
  try {
    install(undefined);
    assert.equal(await hasStoredChatHistory(), false);
    install({ databases: async () => [] });
    assert.equal(await hasStoredChatHistory(), false);
    install({ databases: async () => [{ name: 'unrelated' }] });
    assert.equal(await hasStoredChatHistory(), false);
    install({ databases: async () => [{ name: 'mik-chat', version: 2 }] });
    assert.equal(await hasStoredChatHistory(), true);
    install({});
    assert.equal(
      await hasStoredChatHistory(),
      true,
      'unsupported enumeration must preserve cleanup',
    );
    install({
      databases: async () => {
        throw new DOMException('Restricted', 'SecurityError');
      },
    });
    assert.equal(
      await hasStoredChatHistory(),
      true,
      'restricted enumeration must preserve cleanup',
    );
  } finally {
    if (previous) Object.defineProperty(globalThis, 'indexedDB', previous);
    else Reflect.deleteProperty(globalThis, 'indexedDB');
  }
});
