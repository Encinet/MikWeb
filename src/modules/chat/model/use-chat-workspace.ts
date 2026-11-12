'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { HistoryLease } from '@/modules/chat/lib/chat-history';
import {
  chatWorkspaceEpoch,
  loadChatWorkspace,
  onWorkspaceChange,
  saveChatWorkspace,
} from '@/modules/chat/lib/chat-history';
import type {
  ChatWorkspaceMutation,
  ChatWorkspaceState,
} from '@/modules/chat/model/chat-workspace';
import {
  emptyChatWorkspace,
  readChatWorkspace,
  updateChatWorkspace,
} from '@/modules/chat/model/chat-workspace';
import { appendWorkspaceMutation } from '@/modules/chat/model/chat-workspace-queue';

interface WorkspaceWrite {
  lease: HistoryLease;
  mutation: ChatWorkspaceMutation;
}

/** Ordered writes preserve edits through storage failures; reloads rebase any unsaved mutations. */
export function useChatWorkspace(lease: HistoryLease | null, staff: boolean) {
  const [snapshot, setSnapshot] = useState<{ epoch: string | null; value: ChatWorkspaceState }>({
    epoch: null,
    value: emptyChatWorkspace(),
  });
  const [storageFailed, setStorageFailed] = useState(false);
  const [restoredCount, setRestoredCount] = useState(0);
  const latest = useRef(snapshot);
  const revision = useRef(0);
  const queue = useRef<WorkspaceWrite[]>([]);
  const running = useRef(false);
  const writing = useRef<WorkspaceWrite | null>(null);
  const failed = useRef(false);
  const activeLease = useRef(lease);
  const activeStaff = useRef(staff);
  const refresh = useRef<() => void>(() => undefined);
  useLayoutEffect(() => {
    activeLease.current = lease;
    activeStaff.current = staff;
  }, [lease, staff]);

  useEffect(() => {
    let current = true;
    let initialized = false;
    const epoch = chatWorkspaceEpoch(lease);
    revision.current++;
    if (latest.current.epoch !== epoch) {
      queue.current = [];
      failed.current = false;
      setStorageFailed(false);
      setRestoredCount(0);
      const next = { epoch, value: emptyChatWorkspace(latest.current.value.preferences) };
      latest.current = next;
      setSnapshot(next);
    }
    if (!staff) {
      queue.current = queue.current.filter(
        (write) => write.mutation.type !== 'draft' || write.mutation.key !== 'staff',
      );
      if (latest.current.value.drafts.staff) {
        const drafts = { ...latest.current.value.drafts };
        delete drafts.staff;
        const next = { ...latest.current, value: { ...latest.current.value, drafts } };
        latest.current = next;
        setSnapshot(next);
      }
    }
    const load = async () => {
      if (!lease) return;
      const version = revision.current;
      try {
        const stored = await loadChatWorkspace(lease);
        if (!stored || !current || version !== revision.current) return;
        let value = lease.persist
          ? stored
          : { ...latest.current.value, preferences: stored.preferences };
        for (const write of queue.current)
          if (chatWorkspaceEpoch(write.lease) === epoch)
            value = updateChatWorkspace(value, write.mutation);
        value = readChatWorkspace(value, staff);
        const next = { epoch, value };
        latest.current = next;
        setSnapshot(next);
        if (!initialized) {
          initialized = true;
          setRestoredCount(Object.keys(stored.drafts).length);
        }
        setStorageFailed(failed.current);
      } catch {
        if (current) setStorageFailed(true);
      }
    };
    refresh.current = () => void load();
    void load();
    const unsubscribe = onWorkspaceChange(() => void load());
    return () => {
      current = false;
      unsubscribe();
    };
  }, [lease, staff]);

  const flush = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      while (queue.current.length) {
        const write = queue.current[0];
        writing.current = write;
        try {
          await saveChatWorkspace(write.lease, write.mutation);
        } catch {
          if (chatWorkspaceEpoch(write.lease) !== chatWorkspaceEpoch(activeLease.current)) {
            if (queue.current[0] === write) queue.current.shift();
            continue;
          }
          failed.current = true;
          setStorageFailed(true);
          return;
        } finally {
          writing.current = null;
        }
        if (queue.current[0] === write) queue.current.shift();
      }
      failed.current = false;
      setStorageFailed(false);
    } finally {
      running.current = false;
      refresh.current();
    }
  }, []);

  const mutate = useCallback(
    (mutation: ChatWorkspaceMutation) => {
      const epoch = chatWorkspaceEpoch(lease);
      if (epoch !== chatWorkspaceEpoch(activeLease.current)) return;
      if (mutation.type === 'draft' && mutation.key === 'staff' && !activeStaff.current) return;
      const previous = latest.current.epoch === epoch ? latest.current.value : emptyChatWorkspace();
      const value = readChatWorkspace(updateChatWorkspace(previous, mutation), activeStaff.current);
      const next = { epoch, value };
      latest.current = next;
      revision.current++;
      setSnapshot(next);
      if (!lease || (!lease.persist && mutation.type !== 'preferences')) return;
      const waiting = queue.current.filter(
        (write) => write !== writing.current && chatWorkspaceEpoch(write.lease) === epoch,
      );
      const pending = appendWorkspaceMutation(
        waiting.map((write) => write.mutation),
        mutation,
      );
      queue.current = [
        ...queue.current.filter((write) => write === writing.current),
        ...pending.map((mutation) => ({ lease, mutation })),
      ];
      void flush();
    },
    [lease, flush],
  );

  const value = useMemo(() => {
    const value =
      snapshot.epoch === chatWorkspaceEpoch(lease)
        ? snapshot.value
        : emptyChatWorkspace(snapshot.value.preferences);
    if (staff || !value.drafts.staff) return value;
    const drafts = { ...value.drafts };
    delete drafts.staff;
    return { ...value, drafts };
  }, [snapshot, lease, staff]);
  const getDraft = useCallback(
    (key: string) =>
      (key !== 'staff' || activeStaff.current) &&
      latest.current.epoch === chatWorkspaceEpoch(activeLease.current)
        ? (latest.current.value.drafts[key]?.text ?? '')
        : '',
    [],
  );
  return {
    workspace: value,
    mutate,
    getDraft,
    storageFailed,
    restoredCount,
  };
}
