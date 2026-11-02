export type ChatDestination =
  | { channel: 'public' | 'staff' }
  | { channel: 'private'; targetUuid: string; name: string };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Normalize untrusted notification destinations without pulling message parsers into the worker. */
export function readChatDestination(value: unknown): ChatDestination | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const data = value as Record<string, unknown>;
  if (data.channel === 'public' || data.channel === 'staff') return { channel: data.channel };
  if (
    data.channel !== 'private' ||
    typeof data.targetUuid !== 'string' ||
    !uuid.test(data.targetUuid) ||
    typeof data.name !== 'string' ||
    data.name.length < 1 ||
    data.name.length > 64 ||
    [...data.name].some((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code <= 31 || (code >= 127 && code <= 159);
    })
  )
    return null;
  return { channel: 'private', targetUuid: data.targetUuid, name: data.name };
}

export function destinationKey(destination: ChatDestination): string {
  return destination.channel === 'private'
    ? `private:${destination.targetUuid}`
    : destination.channel;
}
