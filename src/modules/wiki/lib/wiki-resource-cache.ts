import type { WikiSectionPayload } from '@/modules/wiki/model/wiki-content-types';
import type { WikiSearchEntry } from '@/modules/wiki/model/wiki-search-types';
import { withRequestTimeout } from '@/shared/lib/request-timeout';

interface PendingResource {
  controller: AbortController;
  background: boolean;
  promise: Promise<void>;
}

/** Public, visit-scoped resources. Foreground reads and prefetches share requests. */
export class WikiResourceCache {
  private readonly sections = new Map<string, WikiSectionPayload>();
  private readonly searchIndexes = new Map<string, WikiSearchEntry[]>();
  private readonly listeners = new Set<() => void>();
  private readonly pending = new Map<string, PendingResource>();

  getSection(locale: string, id: string) {
    return this.sections.get(`${locale}/${id}`);
  }

  getSearchIndex(locale: string) {
    return this.searchIndexes.get(locale);
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  loadSection(locale: string, id: string, background = false): Promise<void> {
    const key = `${locale}/${id}`;
    if (this.sections.has(key)) return Promise.resolve();
    return this.load(
      `section:${key}`,
      `/api/wiki/section/${encodeURIComponent(locale)}/${encodeURIComponent(id)}`,
      background,
      (value: WikiSectionPayload) => {
        if (
          value?.id !== id ||
          typeof value.compiled !== 'string' ||
          !Array.isArray(value.outline)
        ) {
          throw new Error('Invalid Wiki section');
        }
        this.sections.set(key, value);
      },
    );
  }

  loadSearchIndex(locale: string, background = false): Promise<void> {
    if (this.searchIndexes.has(locale)) return Promise.resolve();
    return this.load(
      `search:${locale}`,
      `/api/wiki/search-index/${encodeURIComponent(locale)}/compact`,
      background,
      (value: WikiSearchEntry[]) => {
        if (!Array.isArray(value)) throw new Error('Invalid Wiki search index');
        this.searchIndexes.set(locale, value);
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
    for (const request of this.pending.values()) {
      if (request.background) return request.promise;
    }
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

  private load<T>(
    key: string,
    url: string,
    background: boolean,
    accept: (value: T) => void,
  ): Promise<void> {
    if (!background) this.cancelBackground(key);
    const existing = this.pending.get(key);
    if (existing) {
      if (!background) existing.background = false;
      return existing.promise;
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
        for (const listener of this.listeners) listener();
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
