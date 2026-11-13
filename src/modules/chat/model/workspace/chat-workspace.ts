import { z } from 'zod';
import type { ChatDestination } from '@/modules/chat/model/chat-destination';
import { destinationKey } from '@/modules/chat/model/chat-destination';
import type { ChatMessage, ChatPeer, ChatUserMessage } from '@/modules/chat/model/chat-protocol';
import {
  CHAT_MESSAGE_MAX_LENGTH,
  chatOrder,
  messageDestination,
} from '@/modules/chat/model/chat-protocol';
import type { ChatReadCursor } from '@/modules/chat/model/chat-reading';
import { compareCursors, messageCursor } from '@/modules/chat/model/chat-reading';

const WORKSPACE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_CONVERSATIONS = 512;
const privateKey = /^private:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const conversationKey = z
  .string()
  .refine((key) => key === 'public' || key === 'staff' || privateKey.test(key));
const timestamp = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const cursorSchema = z.object({
  messageId: z.string().min(1).max(128),
  createdAt: timestamp,
  order: chatOrder,
});
const draftSchema = z.object({
  text: z.string().max(CHAT_MESSAGE_MAX_LENGTH * 2),
  updatedAt: timestamp,
});
const threadSchema = z.object({
  name: z.string().min(1).max(64),
  updatedAt: timestamp,
  pinned: z.boolean(),
  closed: z.boolean(),
  closedThrough: cursorSchema.nullable(),
});
const preferencesSchema = z.object({
  density: z.enum(['comfortable', 'compact']).catch('comfortable'),
  showActivity: z.boolean().catch(true),
  membersVisible: z.boolean().catch(true),
});
const workspaceSchema = z.object({
  drafts: z.record(conversationKey, draftSchema),
  threads: z.record(z.string().regex(privateKey), threadSchema),
  preferences: preferencesSchema,
});

export type ChatWorkspaceState = z.infer<typeof workspaceSchema>;
export type ChatPreferences = ChatWorkspaceState['preferences'];
export type ChatWorkspaceMutation =
  | { type: 'draft'; key: string; text: string; at: number }
  | { type: 'open'; destination: Extract<ChatDestination, { channel: 'private' }>; at: number }
  | {
      type: 'pin';
      destination: Extract<ChatDestination, { channel: 'private' }>;
      pinned: boolean;
      at: number;
    }
  | {
      type: 'close';
      destination: Extract<ChatDestination, { channel: 'private' }>;
      through: ChatReadCursor | null;
      at: number;
    }
  | { type: 'preferences'; value: Partial<ChatPreferences> };

export function emptyChatWorkspace(preferences?: ChatPreferences): ChatWorkspaceState {
  return {
    drafts: {},
    threads: {},
    preferences: preferences ?? {
      density: 'comfortable',
      showActivity: true,
      membersVisible: true,
    },
  };
}

/** Validate stored data, bound its lifetime/size, and enforce the same staff gate as history. */
export function readChatWorkspace(
  value: unknown,
  staff: boolean,
  now = Date.now(),
): ChatWorkspaceState {
  const parsed = workspaceSchema.safeParse(value);
  if (!parsed.success) return emptyChatWorkspace();
  const workspace = parsed.data;
  workspace.drafts = Object.fromEntries(
    Object.entries(workspace.drafts)
      .filter(
        ([key, draft]) =>
          (staff || key !== 'staff') && draft.updatedAt > now - WORKSPACE_MAX_AGE_MS,
      )
      .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
      .slice(0, MAX_CONVERSATIONS),
  );
  workspace.threads = Object.fromEntries(
    Object.entries(workspace.threads)
      .filter(
        ([key, thread]) =>
          thread.pinned ||
          Boolean(workspace.drafts[key]) ||
          thread.updatedAt > now - WORKSPACE_MAX_AGE_MS,
      )
      .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
      .slice(0, MAX_CONVERSATIONS),
  );
  return workspace;
}

export function updateChatWorkspace(
  state: ChatWorkspaceState,
  mutation: ChatWorkspaceMutation,
): ChatWorkspaceState {
  if (mutation.type === 'preferences')
    return { ...state, preferences: { ...state.preferences, ...mutation.value } };
  if (mutation.type === 'draft') {
    if (!conversationKey.safeParse(mutation.key).success) return state;
    const drafts = { ...state.drafts };
    if (mutation.text)
      drafts[mutation.key] = {
        text: mutation.text.slice(0, CHAT_MESSAGE_MAX_LENGTH * 2),
        updatedAt: mutation.at,
      };
    else delete drafts[mutation.key];
    return { ...state, drafts };
  }
  const key = destinationKey(mutation.destination);
  const previous = state.threads[key];
  const thread = {
    name: mutation.destination.name,
    updatedAt: mutation.at,
    pinned: previous?.pinned ?? false,
    closed: previous?.closed ?? false,
    closedThrough: previous?.closedThrough ?? null,
  };
  if (mutation.type === 'open') thread.closed = false;
  if (mutation.type === 'pin') thread.pinned = mutation.pinned;
  if (mutation.type === 'close') {
    thread.closed = true;
    thread.pinned = false;
    thread.closedThrough = mutation.through;
  }
  return { ...state, threads: { ...state.threads, [key]: thread } };
}

export interface ChatThread {
  destination: Extract<ChatDestination, { channel: 'private' }>;
  latest: ChatUserMessage | null;
  peer?: ChatPeer;
  draft: string;
  pinned: boolean;
  activityAt: number;
}

export function chatThreads(
  messages: ChatMessage[],
  players: ChatPeer[],
  owner: string,
  workspace: ChatWorkspaceState,
): ChatThread[] {
  const latest = new Map<string, ChatUserMessage>();
  const names = new Map(
    Object.entries(workspace.threads).map(([key, thread]) => [key, thread.name]),
  );
  for (const message of messages) {
    if (message.kind !== 'user' || message.channel !== 'private') continue;
    const destination = messageDestination(message, owner);
    if (destination?.channel !== 'private') continue;
    const key = destinationKey(destination);
    const previous = latest.get(key);
    if (!previous || compareCursors(messageCursor(message), messageCursor(previous)) > 0) {
      latest.set(key, message);
      names.set(key, destination.name);
    }
  }
  const peers = new Map(players.map((peer) => [peer.playerUuid, peer]));
  return [...names]
    .flatMap(([key, name]): ChatThread[] => {
      const metadata = workspace.threads[key];
      const message = latest.get(key) ?? null;
      if (
        metadata?.closed &&
        (!message ||
          (metadata.closedThrough &&
            compareCursors(messageCursor(message), metadata.closedThrough) <= 0))
      )
        return [];
      const uuid = key.slice('private:'.length);
      const peer = peers.get(uuid);
      const draft = workspace.drafts[key];
      return [
        {
          destination: { channel: 'private', targetUuid: uuid, name: peer?.name ?? name },
          latest: message,
          peer,
          draft: draft?.text ?? '',
          pinned: metadata?.pinned ?? false,
          activityAt: Math.max(
            message?.createdAt ?? metadata?.updatedAt ?? 0,
            draft?.updatedAt ?? 0,
          ),
        },
      ];
    })
    .sort(
      (a, b) =>
        Number(b.pinned) - Number(a.pinned) ||
        b.activityAt - a.activityAt ||
        a.destination.name.localeCompare(b.destination.name),
    );
}
