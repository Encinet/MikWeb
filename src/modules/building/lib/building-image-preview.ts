import type { BuildingImageUrls } from '../model/building-types';
import {
  decodeJxlOriginal,
  decodeJxlPreview,
  type JxlPrefix,
  readJxlPrefix,
} from './building-jxl-stream';
import { downscaleBuildingImage } from './building-preview-canvas';

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
}

class ImageBlobCache {
  private readonly entries = new Map<string, Blob>();
  private size = 0;

  constructor(private readonly limit: number) {}

  has(url: string) {
    return this.entries.has(url);
  }

  get(url: string) {
    const blob = this.entries.get(url);
    if (blob) {
      this.entries.delete(url);
      this.entries.set(url, blob);
    }
    return blob;
  }

  set(url: string, blob: Blob) {
    if (!blob.size || blob.size > this.limit) return false;
    this.remove(url);
    this.entries.set(url, blob);
    this.size += blob.size;
    while (this.size > this.limit) this.remove(this.entries.keys().next().value!);
    return true;
  }

  private remove(url: string) {
    const blob = this.entries.get(url);
    if (!blob) return;
    this.entries.delete(url);
    this.size -= blob.size;
  }
}

const MIB = 1024 * 1024;
const DETAIL_COVER_SIZE = 1024;
// Only encoded images survive navigation.
const previews = new Map<string, BuildingPreview>();
const originals = new ImageBlobCache(32 * MIB);
const originalRequests = new Map<string, OriginalRequest>();
const detailCovers = new ImageBlobCache(8 * MIB);
const encodingCovers = new Set<string>();
const coverListeners = new Map<string, Set<(blob: Blob) => void>>();

export function cachedBuildingPreview(url: string) {
  return previews.get(url);
}

export function hasBuildingOriginal(url: string) {
  return originals.has(url) || originalRequests.has(url);
}

export function watchBuildingDetailCover(url: string, listener: (blob: Blob) => void) {
  const listeners = coverListeners.get(url) ?? new Set();
  listeners.add(listener);
  coverListeners.set(url, listeners);
  const cover = detailCovers.get(url);
  if (cover) listener(cover);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) coverListeners.delete(url);
  };
}

export function rememberBuildingDetailCover(
  url: string,
  source: CanvasImageSource,
  width: number,
  height: number,
) {
  if (detailCovers.get(url) || encodingCovers.has(url)) return;
  try {
    const canvas = downscaleBuildingImage(source, width, height, DETAIL_COVER_SIZE, 'high');
    if (!canvas) return;
    encodingCovers.add(url);
    canvas.toBlob(
      (cover) => {
        encodingCovers.delete(url);
        if (!cover || !detailCovers.set(url, cover)) return;
        for (const listener of coverListeners.get(url) ?? []) listener(cover);
      },
      'image/webp',
      0.9,
    );
  } catch {
    // A cross-origin picture can be viewable even when its pixels cannot be exported.
    encodingCovers.delete(url);
  }
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

export function prepareBuildingPreview({
  jxl,
  jxlPreviewBytes,
}: Pick<BuildingImageUrls, 'jxl' | 'jxlPreviewBytes'>) {
  let entry = previews.get(jxl);
  if (!entry) {
    if (hasBuildingOriginal(jxl)) return;
    const prefix = readJxlPrefix(jxl, jxlPreviewBytes).catch(() => null);
    const ready = prefix.then((data) => data && previewFrame(data));
    const created: BuildingPreview = { prefix, ready };
    void ready.then((source) => {
      created.source = source;
    });
    entry = created;
  }
  previews.delete(jxl);
  previews.set(jxl, entry);
  if (previews.size > 32) previews.delete(previews.keys().next().value!);
  return entry;
}

export function openBuildingOriginal(
  url: string,
  entry: BuildingPreview | undefined,
  paint: Paint,
) {
  const cached = originals.get(url);
  if (cached) return { result: Promise.resolve(cached), release() {} };

  let request = originalRequests.get(url);
  if (!request && entry) {
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
        originals.set(url, blob);
        return blob;
      })
      .finally(() => {
        clearTimeout(timeout);
        if (originalRequests.get(url)?.controller === controller) originalRequests.delete(url);
      });
    request = { controller, subscribers, result };
    originalRequests.set(url, request);
  }
  if (!request) return null;
  const active = request;
  active.subscribers.add(paint);
  return {
    result: active.result,
    release() {
      active.subscribers.delete(paint);
      // React can immediately remount the same stage during a navigation.
      queueMicrotask(() => {
        if (active.subscribers.size || originalRequests.get(url) !== active) return;
        originalRequests.delete(url);
        active.controller.abort();
      });
    },
  };
}
