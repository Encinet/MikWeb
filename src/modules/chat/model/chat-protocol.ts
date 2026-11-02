import { z } from 'zod';
import type { ChatDestination } from '@/modules/chat/model/chat-destination';

export const CHAT_MESSAGE_MAX_LENGTH = 256;

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const name = z
  .string()
  .min(1)
  .max(64)
  .refine((value) =>
    [...value].every((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code > 31 && (code < 127 || code > 159);
    }),
  );

function isSafeChatHref(value: string): boolean {
  if (
    /[\s\\]/u.test(value) ||
    [...value].some((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code <= 31 || (code >= 127 && code <= 159);
    })
  )
    return false;
  try {
    if (/^mailto:/i.test(value)) {
      const address = value.slice(7);
      return (
        !/[?#]/u.test(address) &&
        /^[a-z0-9!#$&'*+/=?^_`{|}~.-]+@[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/i.test(
          decodeURIComponent(address),
        )
      );
    }
    if (!/^https?:\/\//i.test(value)) return false;
    const authority = value.slice(value.indexOf('//') + 2).split(/[/?#]/u, 1)[0];
    if (authority.includes('@')) return false;
    const url = new URL(value);
    return Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

// The same schema validates live traffic and untrusted IndexedDB records.
const contentPartSchema = z
  .strictObject({
    text: z.string().min(1).max(16000),
    // URI and browser URL parsers differ. Invalid destinations become inert text, never a broken chat connection.
    href: z
      .string()
      .min(1)
      .max(2048)
      .transform((value) => (isSafeChatHref(value) ? value : undefined))
      .optional(),
    mention: z.literal(true).optional(),
  })
  .refine((part) => !part.href || !part.mention);
const contentSchema = z
  .array(contentPartSchema)
  .min(1)
  .max(128)
  .refine(
    (parts) =>
      parts.reduce((length, part) => length + part.text.length, 0) <= 16000 &&
      parts.reduce((length, part) => length + (part.href?.length ?? 0), 0) <= 4096,
  );

const messageFields = {
  id: z.string().min(1).max(128),
  channel: z.enum(['public', 'staff', 'private']),
  targetUuid: uuid.optional(),
  targetName: z.string().max(64).optional(),
  createdAt: z.number().int().nonnegative().max(8_640_000_000_000_000),
  streamId: uuid,
  sequence: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
};

const playerMessageSchema = z
  .object({
    ...messageFields,
    kind: z.literal('player'),
    requestId: z.string().max(64).nullable().optional(),
    senderUuid: uuid,
    senderName: name,
    content: contentSchema,
    mentioned: z.boolean(),
    source: z.enum(['web', 'game']),
  })
  .refine((value) => value.channel !== 'private' || Boolean(value.targetUuid));

const serverTranslationSchema = z.strictObject({
  template: z.enum(['gameJoined', 'gameLeft', 'webJoined', 'webLeft']),
  values: z.strictObject({ name }),
});

const serverMessageSchema = z
  .object({
    ...messageFields,
    kind: z.literal('server'),
    recipientUuid: uuid.optional(),
    content: z.union([contentSchema, serverTranslationSchema]),
    subject: z.strictObject({ playerUuid: uuid, name }).optional(),
    countsAsUnread: z.boolean(),
  })
  .refine((value) =>
    value.channel === 'private'
      ? Boolean(value.targetUuid && value.recipientUuid && value.targetUuid !== value.recipientUuid)
      : !value.targetUuid && !value.recipientUuid,
  );

export const chatMessageSchema = z.discriminatedUnion('kind', [
  playerMessageSchema,
  serverMessageSchema,
]);

const peerSchema = z.object({
  playerUuid: uuid,
  name,
  game: z.boolean(),
  webConnections: z.number().int().min(0).max(32),
});

const presenceSchema = z.object({
  players: z.array(peerSchema).max(512),
  staffPlayers: z.array(uuid).max(512),
});

export const chatServerEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('hello'), connectionId: z.string().regex(/^[A-Za-z0-9_-]{32}$/) }),
  z.object({
    type: z.literal('authorized'),
    playerUuid: uuid,
    name,
    staff: z.boolean(),
    expiresAt: z.number().int(),
  }),
  z.object({ type: z.literal('permissions'), staff: z.boolean() }),
  z.object({ type: z.literal('reauthorize') }),
  z.object({
    type: z.literal('presence'),
    ...presenceSchema.shape,
  }),
  z.object({ type: z.literal('message'), message: chatMessageSchema }),
  z.object({
    type: z.literal('accepted'),
    requestId: z.string().max(64),
    messageId: z.string().max(128),
  }),
  z.object({ type: z.literal('error'), requestId: z.string().max(64), error: z.string().max(64) }),
  z.object({ type: z.literal('closed'), reason: z.string().max(64) }),
]);

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatPlayerMessage = z.infer<typeof playerMessageSchema>;
export type ChatServerMessage = z.infer<typeof serverMessageSchema>;
export type ChatContent = z.infer<typeof contentSchema>;
export type ChatPeer = z.infer<typeof peerSchema>;
export type ChatPresence = z.infer<typeof presenceSchema>;
export interface ChatAccess {
  owner: string;
  staff: boolean;
}
export function messageConversation(message: ChatMessage, owner: string): string {
  return message.channel === 'private'
    ? `private:${message.kind === 'server' || message.senderUuid === owner ? message.targetUuid : message.senderUuid}`
    : message.channel;
}

export function messageDestination(message: ChatMessage, owner: string): ChatDestination | null {
  if (message.channel !== 'private') return { channel: message.channel };
  const outgoing = message.kind === 'server' || message.senderUuid === owner;
  const targetUuid = outgoing
    ? message.targetUuid
    : message.kind === 'player'
      ? message.senderUuid
      : undefined;
  if (!targetUuid) return null;
  return {
    channel: 'private',
    targetUuid,
    name:
      (outgoing ? message.targetName : message.kind === 'player' ? message.senderName : '') ||
      targetUuid,
  };
}

export function mayReadMessage(message: ChatMessage, owner: string, staff: boolean): boolean {
  if (message.channel === 'staff') return staff;
  return (
    message.channel !== 'private' ||
    (message.kind === 'server'
      ? message.recipientUuid === owner
      : message.senderUuid === owner || message.targetUuid === owner)
  );
}

export function countsAsUnread(message: ChatMessage, owner: string): boolean {
  return message.kind === 'server' ? message.countsAsUnread : message.senderUuid !== owner;
}

export function isPassiveMessage(message: ChatMessage): boolean {
  return message.kind === 'server' && !message.countsAsUnread;
}
