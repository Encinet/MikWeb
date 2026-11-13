/// <reference lib="webworker" />
import type { HistorySearchQuery } from '../lib/chat-history-search';
import { searchChatHistory } from '../lib/chat-history-search';

const scope = self as unknown as DedicatedWorkerGlobalScope;
let generation = 0;
scope.onmessage = (event: MessageEvent<HistorySearchQuery>) => {
  const version = ++generation;
  void searchChatHistory(event.data, () => version === generation).then(
    (page) => {
      if (version === generation) scope.postMessage({ page });
    },
    () => {
      if (version === generation) scope.postMessage({ error: true });
    },
  );
};
