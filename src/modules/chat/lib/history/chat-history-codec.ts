import type { ChatMessage, ChatSender, ChatSource } from '@/modules/chat/model/chat-protocol';
import {
  chatMessageSchema,
  countsAsUnread,
  messageConversation,
} from '@/modules/chat/model/chat-protocol';
import { isRecord } from '@/shared/lib/is-record';

type StoredSender = [string, string, (1 | [string, string?])?];
type StoredSource = 0 | 1 | [string, string];
type StoredContent = ChatMessage['content'] | string;
interface MessageOptions {
  e?: number;
  t?: string;
  n?: string;
  r?: string | null;
  m?: true;
  u?: true;
  s?: [string, string];
}
type MessageBody =
  | [0, string, StoredSender, StoredContent, StoredSource, MessageOptions?]
  | [1, string, StoredContent, MessageOptions?];

/** v6: indexes reference these fields directly, so message headers are stored only once. */
export interface StoredMessageData {
  c: ChatMessage['channel'];
  t: number;
  o: string;
  v: MessageBody;
}
export interface StoredChatMessage {
  key: string;
  owner: string;
  conversation: string;
  data: StoredMessageData;
  unread?: 1;
  historical?: true;
}

function encodeSender(sender: ChatSender): StoredSender {
  const value: StoredSender = [sender.id, sender.name];
  if (sender.playerUuid && sender.playerName) {
    value.push(
      sender.playerUuid === sender.id && sender.playerName === sender.name
        ? 1
        : sender.playerName === sender.name
          ? [sender.playerUuid]
          : [sender.playerUuid, sender.playerName],
    );
  }
  return value;
}

/** Plain text is the common case. Rich content keeps its full, validated representation. */
export function encodeMessageData(message: ChatMessage): StoredMessageData {
  const content =
    Array.isArray(message.content) &&
    message.content.length === 1 &&
    Object.keys(message.content[0]).length === 1
      ? message.content[0].text
      : message.content;
  const options: MessageOptions = {};
  if (message.expiresAt !== undefined) options.e = message.expiresAt;
  if (message.targetUuid !== undefined) options.t = message.targetUuid;
  if (message.targetName !== undefined) options.n = message.targetName;
  let body: MessageBody;
  if (message.kind === 'user') {
    if (message.requestId !== undefined) options.r = message.requestId;
    if (message.mentioned) options.m = true;
    const source: StoredSource =
      message.source.kind === 'game'
        ? 0
        : message.source.kind === 'web'
          ? 1
          : [message.source.platformId, message.source.platformName];
    body = [0, message.id, encodeSender(message.sender), content, source];
    if (Object.keys(options).length) body.push(options);
  } else {
    if (message.recipientUuid !== undefined) options.r = message.recipientUuid;
    if (message.countsAsUnread) options.u = true;
    if (message.subject) options.s = [message.subject.playerUuid, message.subject.name];
    body = [1, message.id, content];
    if (Object.keys(options).length) body.push(options);
  }
  return { c: message.channel, t: message.createdAt, o: message.order, v: body };
}

function decodeSender(value: unknown): unknown {
  if (!Array.isArray(value) || value.length < 2 || value.length > 3) return null;
  const [id, name, binding] = value;
  if (binding === undefined) return { id, name };
  if (binding === 1) return { id, name, playerUuid: id, playerName: name };
  if (!Array.isArray(binding) || binding.length < 1 || binding.length > 2) return null;
  return { id, name, playerUuid: binding[0], playerName: binding[1] ?? name };
}
function decodeSource(value: unknown): unknown {
  if (value === 0) return { kind: 'game' } satisfies ChatSource;
  if (value === 1) return { kind: 'web' } satisfies ChatSource;
  return Array.isArray(value) && value.length === 2
    ? { kind: 'social', platformId: value[0], platformName: value[1] }
    : null;
}

/** Stored data remains untrusted; decoding always uses the same protocol validation as live traffic. */
export function decodeMessageData(value: unknown): ChatMessage | null {
  if (!isRecord(value) || !Array.isArray(value.v)) return null;
  const body = value.v;
  const user = body[0] === 0;
  if (
    (!user && body[0] !== 1) ||
    (user ? body.length !== 5 && body.length !== 6 : body.length !== 3 && body.length !== 4)
  )
    return null;
  const extra = body[user ? 5 : 3];
  if (extra !== undefined && !isRecord(extra)) return null;
  const options = extra ?? {};
  const content = body[user ? 3 : 2];
  const common = {
    id: body[1],
    channel: value.c,
    createdAt: value.t,
    order: value.o,
    content: typeof content === 'string' ? [{ text: content }] : content,
    ...(options.e !== undefined ? { expiresAt: options.e } : {}),
    ...(options.t !== undefined ? { targetUuid: options.t } : {}),
    ...(options.n !== undefined ? { targetName: options.n } : {}),
  };
  const message = user
    ? {
        ...common,
        kind: 'user',
        sender: decodeSender(body[2]),
        source: decodeSource(body[4]),
        mentioned: options.m ?? false,
        ...(options.r !== undefined ? { requestId: options.r } : {}),
      }
    : {
        ...common,
        kind: 'server',
        countsAsUnread: options.u ?? false,
        ...(options.r !== undefined ? { recipientUuid: options.r } : {}),
        ...(options.s !== undefined
          ? {
              subject:
                Array.isArray(options.s) && options.s.length === 2
                  ? { playerUuid: options.s[0], name: options.s[1] }
                  : null,
            }
          : {}),
      };
  const parsed = chatMessageSchema.safeParse(message);
  return parsed.success ? parsed.data : null;
}

export function readStoredMessage(record: unknown): ChatMessage | null {
  return isRecord(record) ? decodeMessageData(record.data) : null;
}

export function storedMessage(
  owner: string,
  message: ChatMessage,
  historical = false,
): StoredChatMessage {
  return {
    key: `${owner}:${message.id}`,
    owner,
    conversation: messageConversation(message, owner),
    data: encodeMessageData(message),
    ...(!historical && countsAsUnread(message, owner) ? { unread: 1 as const } : {}),
    ...(historical ? { historical: true as const } : {}),
  };
}
