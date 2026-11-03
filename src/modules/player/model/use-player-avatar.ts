'use client';

import { useCallback, useSyncExternalStore } from 'react';

// Every display size shares the same small bitmap and browser cache entry.
const AVATAR_SERVICES = [
  (identifier: string) => `https://mineskin.eu/helm/${identifier}/64`,
  (identifier: string) => `https://minotar.net/avatar/${identifier}/64`,
  (identifier: string) => `https://mc-heads.net/avatar/${identifier}/64`,
];
// Soft limit: mounted avatars keep their state; only idle entries can be evicted.
const CACHE_LIMIT = 512;
const FAILURE_RETRY_MS = 60_000;
interface PlayerAvatarIdentity {
  uuid?: string;
  name: string;
}
interface AvatarSnapshot {
  // A retry of the same URL is a new request; late events must not match it.
  request: { service: number };
  loaded: boolean;
}
interface AvatarEntry {
  snapshot: AvatarSnapshot;
  listeners: Set<() => void>;
  failedAt: number | null;
}
const INITIAL: AvatarSnapshot = { request: { service: 0 }, loaded: false };
// Image bytes belong in the browser cache; only source/load metadata is shared here.
const avatars = new Map<string, AvatarEntry>();

function pendingSnapshot(service: number): AvatarSnapshot {
  return { request: { service }, loaded: false };
}

function entryFor(identifier: string): AvatarEntry {
  let entry = avatars.get(identifier);
  if (!entry) {
    entry = { snapshot: INITIAL, listeners: new Set(), failedAt: null };
    avatars.set(identifier, entry);
  }
  return entry;
}

function trimCache() {
  for (const [identifier, entry] of avatars) {
    if (avatars.size <= CACHE_LIMIT) break;
    if (!entry.listeners.size) avatars.delete(identifier);
  }
}

function notify(entry: AvatarEntry) {
  for (const listener of entry.listeners) listener();
}

/** Share successful loads and failover across placements, including later mounts. */
export function usePlayerAvatar({ uuid, name }: PlayerAvatarIdentity) {
  const value = uuid?.trim() || name.trim();
  const compact = value.replaceAll('-', '');
  const identifier = /^[\da-f]{32}$/i.test(compact) ? compact.toLowerCase() : value;
  const subscribe = useCallback(
    (listener: () => void) => {
      if (!identifier) return () => {};
      const entry = entryFor(identifier);
      // Keep recently used, unmounted avatars ahead of older idle entries.
      avatars.delete(identifier);
      avatars.set(identifier, entry);
      entry.listeners.add(listener);
      if (entry.failedAt !== null && Date.now() - entry.failedAt >= FAILURE_RETRY_MS) {
        entry.snapshot = pendingSnapshot(0);
        entry.failedAt = null;
        notify(entry);
      }
      trimCache();
      return () => {
        entry.listeners.delete(listener);
        trimCache();
      };
    },
    [identifier],
  );
  const getSnapshot = useCallback(() => avatars.get(identifier)?.snapshot ?? INITIAL, [identifier]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => INITIAL);
  const { request } = snapshot;
  const onLoad = useCallback(() => {
    if (!identifier) return;
    const entry = entryFor(identifier);
    if (entry.snapshot.request !== request || entry.snapshot.loaded) return;
    entry.snapshot = { request, loaded: true };
    notify(entry);
  }, [identifier, request]);
  const onError = useCallback(() => {
    if (!identifier) return;
    const entry = entryFor(identifier);
    // Several copies can fail together; advance once for the failed source.
    if (entry.snapshot.request !== request || request.service >= AVATAR_SERVICES.length) return;
    const nextService = request.service + 1;
    entry.snapshot = pendingSnapshot(nextService);
    entry.failedAt = nextService === AVATAR_SERVICES.length ? Date.now() : null;
    notify(entry);
  }, [identifier, request]);
  const service = AVATAR_SERVICES[request.service];
  return {
    src: identifier && service ? service(encodeURIComponent(identifier)) : null,
    loaded: snapshot.loaded,
    onLoad,
    onError,
  };
}
