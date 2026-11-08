import type { ChatUserMessage } from '@/modules/chat/model/chat-protocol';

export const OWNER = '11111111-1111-4111-8111-111111111111';
export const PEER = '22222222-2222-4222-8222-222222222222';
export const OTHER = '33333333-3333-4333-8333-333333333333';
export const STREAM = '44444444-4444-4444-8444-444444444444';

export function message(overrides: Partial<ChatUserMessage> = {}): ChatUserMessage {
  return {
    id: 'message-1',
    kind: 'user',
    channel: 'public',
    sender: player(PEER, 'Alex'),
    content: [{ text: 'Meet at 120, 64, -300' }],
    mentioned: false,
    source: { kind: overrides.requestId ? 'web' : 'game' },
    createdAt: Date.now(),
    streamId: STREAM,
    sequence: 1,
    ...overrides,
  };
}

export function player(uuid: string, name = 'Alex') {
  return { id: uuid, playerUuid: uuid, playerName: name, name };
}
