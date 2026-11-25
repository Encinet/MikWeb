import type { BuildingImageUrls } from '../model/building-types';
import {
  decodeJxlOriginal,
  decodeJxlPreview,
  type JxlPrefix,
  readJxlPrefix,
} from './building-jxl-stream';

type Paint = (frame: VideoFrame) => void;
interface OriginalRequest {
  controller: AbortController;
  subscribers: Set<Paint>;
  result: Promise<Blob | null>;
}

export interface BuildingPreview {
  prefix: Promise<JxlPrefix | null>;
  ready: Promise<string | null>;
  // undefined while the cover is pending, null when the small WebP took over.
  source?: string | null;
  request?: OriginalRequest;
}

// Only encoded prefixes and small previews survive navigation. Never retain an idle 4K decoder.
const previews = new Map<string, BuildingPreview>();
const originals = new Map<string, Blob>();

function remember<T>(cache: Map<string, T>, key: string, value: T, limit: number) {
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > limit) cache.delete(cache.keys().next().value!);
}

export function cachedBuildingPreview(url: string) {
  return previews.get(url);
}

// Decode at most two cover frames at once, including on a wide catalog.
let decodeSlot = 0;
const decoders = [Promise.resolve(), Promise.resolve()];
function previewFrame(prefix: JxlPrefix) {
  const slot = decodeSlot++ % decoders.length;
  const frame = decoders[slot].then(() => decodeJxlPreview(prefix)).catch(() => null);
  decoders[slot] = frame.then(() => {});
  return frame;
}

export function prepareBuildingPreview(image: BuildingImageUrls): BuildingPreview {
  let entry = previews.get(image.jxl);
  if (!entry) {
    const prefix = readJxlPrefix(image.jxl, image.jxlPreviewBytes).catch(() => null);
    const ready = prefix.then((data) => data && previewFrame(data));
    const created: BuildingPreview = { prefix, ready };
    void ready.then((source) => {
      created.source = source;
    });
    entry = created;
  }
  remember(previews, image.jxl, entry, 32);
  return entry;
}

export function openBuildingOriginal(url: string, entry: BuildingPreview, paint: Paint) {
  const cached = originals.get(url);
  if (cached) {
    remember(originals, url, cached, 2);
    return { result: Promise.resolve(cached), release() {} };
  }

  if (!entry.request) {
    const controller = new AbortController();
    const subscribers = new Set<Paint>();
    const { signal } = controller;
    const timeout = setTimeout(() => controller.abort(), 60_000);
    const result = entry.prefix
      .then(async (prefix) => {
        signal.throwIfAborted();
        if (!prefix) return null;
        const blob = await decodeJxlOriginal(url, prefix, signal, (frame) => {
          for (const draw of subscribers) draw(frame);
        });
        remember(originals, url, blob, 2);
        return blob;
      })
      .finally(() => {
        clearTimeout(timeout);
        if (entry.request?.controller === controller) entry.request = undefined;
      });
    entry.request = { controller, subscribers, result };
  }
  const request = entry.request;
  request.subscribers.add(paint);
  return {
    result: request.result,
    release() {
      request.subscribers.delete(paint);
      // React can immediately remount the same stage during a navigation.
      queueMicrotask(() => {
        if (request.subscribers.size || entry.request !== request) return;
        entry.request = undefined;
        request.controller.abort();
      });
    },
  };
}
