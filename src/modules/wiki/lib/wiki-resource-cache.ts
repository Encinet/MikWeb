import type {
  SearchableWikiBlock,
  WikiSectionPayload,
} from '@/modules/wiki/model/wiki-section-types';
import { withRequestTimeout } from '@/shared/lib/request-timeout';

interface WikiResources {
  sections: Record<string, WikiSectionPayload>;
  searchIndexes: Record<string, SearchableWikiBlock[]>;
}

interface PendingResource {
  controller: AbortController;
  background: boolean;
  promise: Promise<unknown>;
}

/** Public, visit-scoped resources. Foreground reads and prefetches share requests. */
export class WikiResourceCache {
  private snapshot: WikiResources = { sections: {}, searchIndexes: {} };
  private listeners = new Set<() => void>();
  private pending = new Map<string, PendingResource>();

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  loadSection(locale: string, id: string, background = false): Promise<WikiSectionPayload> {
    const key = `${locale}/${id}`;
    const cached = this.snapshot.sections[key];
    if (cached) return Promise.resolve(cached);
    return this.load(
      `section:${key}`,
      `/api/wiki/section?locale=${encodeURIComponent(locale)}&section=${encodeURIComponent(id)}`,
      background,
      (value: WikiSectionPayload) => {
        if (
          value?.id !== id ||
          typeof value.compiled !== 'string' ||
          !Array.isArray(value.outline)
        ) {
          throw new Error('Invalid Wiki section');
        }
        this.publish({ ...this.snapshot, sections: { ...this.snapshot.sections, [key]: value } });
      },
    );
  }

  loadSearchIndex(locale: string, background = false): Promise<SearchableWikiBlock[]> {
    const cached = this.snapshot.searchIndexes[locale];
    if (cached) return Promise.resolve(cached);
    return this.load(
      `search:${locale}`,
      `/api/wiki/search-index?locale=${encodeURIComponent(locale)}`,
      background,
      (value: SearchableWikiBlock[]) => {
        if (!Array.isArray(value)) throw new Error('Invalid Wiki search index');
        this.publish({
          ...this.snapshot,
          searchIndexes: { ...this.snapshot.searchIndexes, [locale]: value },
        });
      },
    );
  }

  cancelSection(locale: string, id: string) {
    this.cancelForeground(`section:${locale}/${id}`);
  }

  cancelSearchIndex(locale: string) {
    this.cancelForeground(`search:${locale}`);
  }

  private cancelForeground(key: string) {
    const request = this.pending.get(key);
    if (request && !request.background) this.cancel(key, request);
  }

  cancelBackground(except?: string) {
    for (const [key, request] of this.pending) {
      if (request.background && key !== except) this.cancel(key, request);
    }
  }

  pendingBackground() {
    return [...this.pending.values()].find((request) => request.background)?.promise;
  }

  cancelLocale(locale: string) {
    for (const [key, request] of this.pending) {
      if (key.startsWith(`section:${locale}/`) || key === `search:${locale}`)
        this.cancel(key, request);
    }
  }

  private cancel(key: string, request: PendingResource) {
    this.pending.delete(key);
    request.controller.abort();
  }

  private publish(snapshot: WikiResources) {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }

  private load<T>(
    key: string,
    url: string,
    background: boolean,
    accept: (value: T) => void,
  ): Promise<T> {
    if (!background) this.cancelBackground(key);
    const existing = this.pending.get(key);
    if (existing) {
      if (!background) existing.background = false;
      return existing.promise as Promise<T>;
    }
    const controller = new AbortController();
    const promise = withRequestTimeout(
      15_000,
      async (signal) => {
        const response = await fetch(url, {
          signal,
          credentials: 'omit',
          priority: background ? 'low' : 'auto',
        });
        if (!response.ok) throw new Error(`Wiki request failed: ${response.status}`);
        const value: T = await response.json();
        // An aborted response may still finish parsing; it must not enter the cache.
        if (signal.aborted) throw signal.reason;
        accept(value);
        return value;
      },
      controller.signal,
    ).finally(() => {
      if (this.pending.get(key)?.promise === promise) this.pending.delete(key);
    });
    const request = { controller, background, promise };
    this.pending.set(key, request);
    return promise;
  }
}
