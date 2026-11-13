import { z } from 'zod';
import type { ChatDestination } from '@/modules/chat/model/chat-destination';

export const CHAT_MESSAGE_MAX_LENGTH = 256;

export function isValidChatInput(value: string): boolean {
  const characters = [...value];
  return (
    characters.length > 0 &&
    characters.length <= CHAT_MESSAGE_MAX_LENGTH &&
    characters.every((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code > 31 && (code < 127 || code > 159) && code !== 0x2028 && code !== 0x2029;
    })
  );
}

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
export const historyToken = z.string().regex(/^[A-Za-z0-9_-]{91}$/);
export const chatOrder = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
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

const rgb = z.number().int().min(0).max(0xffffff);
const contentStyleSchema = z
  .strictObject({
    color: rgb.optional(),
    gradientEndColor: rgb.optional(),
    bold: z.literal(true).optional(),
    italic: z.literal(true).optional(),
    underlined: z.literal(true).optional(),
    strikethrough: z.literal(true).optional(),
  })
  .refine((style) => style.gradientEndColor === undefined || style.color !== undefined);

// The same allowlist validates live traffic and untrusted IndexedDB records.
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
    style: contentStyleSchema.optional(),
  })
  .refine((part) => !part.href || !part.mention);
const contentSchema = z
  .array(contentPartSchema)
  .min(1)
  .max(256)
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
  expiresAt: z.number().int().nonnegative().max(8_640_000_000_000_000).optional(),
  order: chatOrder,
};

const senderSchema = z
  .strictObject({
    id: z.string().min(1).max(160),
    name: z
      .string()
      .min(1)
      .max(128)
      .refine((value) =>
        [...value].every((character) => {
          const code = character.codePointAt(0) ?? 0;
          return code > 31 && (code < 127 || code > 159);
        }),
      ),
    playerUuid: uuid.optional(),
    playerName: name.optional(),
  })
  .refine((sender) => Boolean(sender.playerUuid) === Boolean(sender.playerName));

const sourceSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('game') }),
  z.strictObject({ kind: z.literal('web') }),
  z.strictObject({
    kind: z.literal('social'),
    platformId: z.string().regex(/^[a-z0-9._-]{1,32}$/),
    platformName: z.string().min(1).max(512),
  }),
]);

const userMessageSchema = z
  .object({
    ...messageFields,
    kind: z.literal('user'),
    requestId: z.string().max(64).nullable().optional(),
    sender: senderSchema,
    content: contentSchema,
    mentioned: z.boolean(),
    source: sourceSchema,
  })
  .refine(
    (value) => value.channel !== 'private' || Boolean(value.targetUuid && value.sender.playerUuid),
  )
  .refine((value) => value.source.kind !== 'social' || value.channel === 'public')
  .refine((value) => value.source.kind === 'social' || Boolean(value.sender.playerUuid))
  .refine((value) => !value.requestId || value.source.kind === 'web');

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
  userMessageSchema,
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
    history: z.boolean().optional(),
  }),
  z.object({ type: z.literal('permissions'), staff: z.boolean() }),
  z.object({ type: z.literal('reauthorize') }),
  z.object({
    type: z.literal('presence'),
    ...presenceSchema.shape,
  }),
  z.object({ type: z.literal('message'), message: chatMessageSchema }),
  z.object({
    type: z.literal('history'),
    requestId: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/),
    channel: z.enum(['public', 'staff', 'private']),
    messages: z.array(chatMessageSchema).max(256),
    checkpoint: historyToken,
    nextPage: historyToken.optional(),
    reset: z.boolean(),
  }),
  z.object({
    type: z.literal('accepted'),
    requestId: z.string().max(64),
    messageId: z.string().max(128),
  }),
  z.object({ type: z.literal('error'), requestId: z.string().max(64), error: z.string().max(64) }),
  z.object({ type: z.literal('closed'), reason: z.string().max(64) }),
]);

export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatServerEvent = z.infer<typeof chatServerEventSchema>;
export type ChatUserMessage = z.infer<typeof userMessageSchema>;
export type ChatSender = z.infer<typeof senderSchema>;
export type ChatSource = z.infer<typeof sourceSchema>;

export function sameChatSource(first: ChatSource, second: ChatSource): boolean {
  return (
    first.kind === second.kind &&
    (first.kind !== 'social' ||
      (second.kind === 'social' && first.platformId === second.platformId))
  );
}
export type ChatServerMessage = z.infer<typeof serverMessageSchema>;
export type ChatContent = z.infer<typeof contentSchema>;
export type ChatStyle = z.infer<typeof contentStyleSchema>;
export type ChatPeer = z.infer<typeof peerSchema>;
export type ChatPresence = z.infer<typeof presenceSchema>;
export interface ChatAccess {
  owner: string;
  staff: boolean;
}
export function messageConversation(message: ChatMessage, owner: string): string {
  return message.channel === 'private'
    ? `private:${message.kind === 'server' || message.sender.playerUuid === owner ? message.targetUuid : message.sender.playerUuid}`
    : message.channel;
}

export function messageDestination(message: ChatMessage, owner: string): ChatDestination | null {
  if (message.channel !== 'private') return { channel: message.channel };
  const outgoing = message.kind === 'server' || message.sender.playerUuid === owner;
  const targetUuid = outgoing
    ? message.targetUuid
    : message.kind === 'user'
      ? message.sender.playerUuid
      : undefined;
  if (!targetUuid) return null;
  return {
    channel: 'private',
    targetUuid,
    name:
      (outgoing ? message.targetName : message.kind === 'user' ? message.sender.name : '') ||
      targetUuid,
  };
}

export function mayReadMessage(message: ChatMessage, owner: string, staff: boolean): boolean {
  if (message.channel === 'staff') return staff;
  return (
    message.channel !== 'private' ||
    (message.kind === 'server'
      ? message.recipientUuid === owner
      : message.sender.playerUuid === owner || message.targetUuid === owner)
  );
}

export function countsAsUnread(message: ChatMessage, owner: string): boolean {
  return message.kind === 'server' ? message.countsAsUnread : message.sender.playerUuid !== owner;
}

export function isPassiveMessage(message: ChatMessage): boolean {
  return message.kind === 'server' && !message.countsAsUnread;
}
