import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chatWorkspaceFeedback } from '@/modules/chat/model/chat-feedback';

const context = {
  connection: { status: 'online' } as const,
  error: null,
  channel: 'public' as const,
  recipientOnline: true,
  staff: true,
};

test('an outage owns its error and suppresses composer explanations until the connection recovers', () => {
  for (const status of ['reconnecting', 'error'] as const) {
    assert.deepEqual(
      chatWorkspaceFeedback({
        ...context,
        connection: { status, error: 'connection_failed' },
        error: 'connection_failed',
        channel: 'private',
        recipientOnline: false,
      }),
      { error: null, composeHint: null },
    );
  }
  assert.deepEqual(
    chatWorkspaceFeedback({ ...context, channel: 'private', recipientOnline: false }),
    { error: null, composeHint: 'privateOffline' },
  );
});

test('recipient and permission errors are explained by their composer hints once', () => {
  assert.deepEqual(
    chatWorkspaceFeedback({
      ...context,
      channel: 'private',
      recipientOnline: false,
      error: 'recipient_unavailable',
    }),
    { error: null, composeHint: 'privateOffline' },
  );
  assert.deepEqual(
    chatWorkspaceFeedback({
      ...context,
      channel: 'staff',
      staff: false,
      error: 'staff_required',
    }),
    { error: null, composeHint: 'staffUnavailable' },
  );
});

test('distinct action errors remain visible and recovered recipients no longer hide their errors', () => {
  assert.deepEqual(
    chatWorkspaceFeedback({
      ...context,
      connection: { status: 'reconnecting', error: 'connection_failed' },
      error: 'invalid_message',
    }),
    { error: 'invalid_message', composeHint: null },
  );
  assert.deepEqual(
    chatWorkspaceFeedback({
      ...context,
      channel: 'private',
      recipientOnline: false,
      error: 'chat_busy',
    }),
    { error: 'chat_busy', composeHint: 'privateOffline' },
  );
  assert.deepEqual(
    chatWorkspaceFeedback({ ...context, channel: 'private', error: 'recipient_unavailable' }),
    { error: 'recipient_unavailable', composeHint: null },
  );
});
