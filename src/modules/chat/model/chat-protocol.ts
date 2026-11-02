import { z } from 'zod';

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

export const chatMessageSchema = z
  .object({
    id: z.string().min(1).max(128),
    requestId: z.string().max(64).nullable().optional(),
    channel: z.enum(['public', 'staff', 'private']),
    senderUuid: uuid,
    senderName: name,
    targetUuid: uuid.nullable().optional(),
    targetName: z.string().max(64).optional(),
    content: contentSchema,
    mentioned: z.boolean(),
    source: z.enum(['web', 'game']),
    createdAt: z.number().int().nonnegative().max(8_640_000_000_000_000),
  })
  .refine((value) => value.channel !== 'private' || Boolean(value.targetUuid));

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
  z.object({ type: z.literal('presence_notice'), joined: z.boolean(), name }),
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
export type ChatPeer = z.infer<typeof peerSchema>;
export type ChatPresence = z.infer<typeof presenceSchema>;
export interface ChatAccess {
  owner: string;
  staff: boolean;
}
export const chatDestinationSchema = z.discriminatedUnion('channel', [
  z.object({ channel: z.literal('public') }),
  z.object({ channel: z.literal('staff') }),
  z.object({ channel: z.literal('private'), targetUuid: uuid, name }),
]);
export type ChatDestination = z.infer<typeof chatDestinationSchema>;

export function messageConversation(message: ChatMessage, owner: string): string {
  return message.channel === 'private'
    ? `private:${message.senderUuid === owner ? message.targetUuid : message.senderUuid}`
    : message.channel;
}

export function destinationKey(destination: ChatDestination): string {
  return destination.channel === 'private'
    ? `private:${destination.targetUuid}`
    : destination.channel;
}

export function messageDestination(message: ChatMessage, owner: string): ChatDestination | null {
  if (message.channel !== 'private') return { channel: message.channel };
  const outgoing = message.senderUuid === owner;
  const targetUuid = outgoing ? message.targetUuid : message.senderUuid;
  if (!targetUuid) return null;
  return {
    channel: 'private',
    targetUuid,
    name: (outgoing ? message.targetName : message.senderName) || targetUuid,
  };
}

export function mayReadMessage(message: ChatMessage, owner: string, staff: boolean): boolean {
  if (message.channel === 'staff') return staff;
  return (
    message.channel !== 'private' || message.senderUuid === owner || message.targetUuid === owner
  );
}
