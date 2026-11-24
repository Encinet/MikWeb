import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act } from 'react';
import {
  getBuildingPreviewUrl,
  getBuildingShareData,
  getBuildingUrl,
} from '@/modules/building/lib/building-links';
import { localizeBuilding } from '@/modules/building/model/building-api';
import type { Building } from '@/modules/building/model/building-types';
import { useBuildingCardShare } from '@/modules/building/model/use-building-card-share';
import { useBuildingGallery } from '@/modules/building/model/use-building-gallery';
import type { AppLocale } from '@/shared/i18n/routing';
import { createBrowserEnvironment } from '../support/browser-environment';

const building: Building = {
  id: 'a'.repeat(32),
  name: { 'zh-CN': '樱之庭', en: 'Sakura Garden' },
  description: {
    'zh-CN': '樱花与庭院。\n\n光影资料',
    en: 'A garden of cherry blossoms.\n\nShader details',
  },
  builders: [
    { name: 'Guest', uuid: 'guest', weight: 1 },
    { name: 'Lead', uuid: 'lead', weight: 10 },
  ],
  coordinates: { world: 'world', x: 1, y: 64, z: 2 },
  buildType: 'original',
  images: [],
  buildDate: '2026-11-06',
};

function GalleryHarness({
  onState,
  modal,
  images = [
    'https://example.test/1.webp',
    'https://example.test/2.webp',
    'https://example.test/3.webp',
  ],
}: {
  onState: (value: ReturnType<typeof useBuildingGallery>) => void;
  modal?: boolean;
  images?: string[];
}) {
  onState(useBuildingGallery(images, modal));
  return null;
}

test('catalog refresh keeps the selected photo through reordering and recovers from deletion', async () => {
  const environment = createBrowserEnvironment();
  let state: ReturnType<typeof useBuildingGallery> | undefined;
  const current = () => {
    assert.ok(state);
    return state;
  };
  const render = (images: string[]) =>
    act(async () =>
      environment.root.render(
        <GalleryHarness
          images={images}
          onState={(value) => {
            state = value;
          }}
        />,
      ),
    );
  try {
    await render(['first', 'second', 'third']);
    await act(async () => current().handleSelectImage(2));
    assert.equal(current().activeImage, 'third');
    await render(['third', 'first', 'second']);
    assert.equal(current().activeImage, 'third');
    assert.equal(current().imageIndex, 0);
    await render(['first', 'second']);
    assert.equal(current().activeImage, 'first');
    await act(async () => current().prev());
    assert.equal(current().activeImage, 'second');
    await render([]);
    assert.equal(current().activeImage, undefined);
    assert.equal(current().loading, false);
    await render(['new']);
    assert.equal(current().activeImage, 'new');
    assert.equal(current().imageIndex, 0);
    await render(['duplicate', 'duplicate']);
    await act(async () => current().handleSelectImage(1));
    assert.equal(current().imageIndex, 1);
    await act(async () => current().next());
    assert.equal(current().imageIndex, 0);
  } finally {
    await environment.close();
  }
});

function CardShareHarness({
  locale,
  onState,
}: {
  locale: AppLocale;
  onState: (value: ReturnType<typeof useBuildingCardShare>) => void;
}) {
  onState(useBuildingCardShare(localizeBuilding(building, locale), locale));
  return null;
}

function imageResponse(bytes: string) {
  return new Response(bytes, {
    headers: {
      'Content-Type': 'image/png',
    },
  });
}

test('card sharing downloads only on demand, cancels stale requests and shares the prepared PNG', async () => {
  const environment = createBrowserEnvironment();
  const previousFetch = globalThis.fetch;
  const requests: {
    url: string;
    signal: AbortSignal;
    resolve: (response: Response) => void;
  }[] = [];
  let state: ReturnType<typeof useBuildingCardShare> | undefined;
  let shared: ShareData | undefined;
  let shareError: unknown;
  let shareCount = 0;
  Object.defineProperty(navigator, 'canShare', {
    configurable: true,
    value: () => true,
  });
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: async (data: ShareData) => {
      shareCount += 1;
      if (shareError) throw shareError;
      shared = data;
    },
  });
  globalThis.fetch = ((input: string, init: RequestInit) =>
    new Promise<Response>((resolve) => {
      assert.ok(init.signal);
      requests.push({ url: input, signal: init.signal, resolve });
    })) as typeof fetch;
  const render = (locale: AppLocale) =>
    act(async () => {
      environment.root.render(
        <CardShareHarness
          locale={locale}
          onState={(value) => {
            state = value;
          }}
        />,
      );
    });
  const respond = (index: number, bytes: string) =>
    act(async () => {
      requests[index].resolve(imageResponse(bytes));
    });
  try {
    await render('en');
    assert.equal(requests.length, 0);
    assert.equal(state?.supported, true);
    const prepare = () =>
      act(async () => {
        void state?.prepareOrShare();
      });
    await prepare();
    await prepare();
    assert.equal(state?.busy, 'preparing');
    assert.equal(requests.length, 1);
    await render('zh-CN');
    assert.equal(requests[0].signal.aborted, true);
    await respond(0, 'old');
    assert.equal(state?.ready, false);
    assert.equal(requests.length, 1);
    await prepare();
    await respond(1, 'current');
    assert.equal(state?.ready, true);
    assert.equal(state?.busy, null);
    assert.equal(shareCount, 0);
    assert.equal(state?.url, `/zh-CN/buildings/${building.id}/opengraph-image`);
    assert.equal(requests[1].url, state?.url);
    await act(async () => {
      await state?.prepareOrShare();
    });
    assert.equal(await shared?.files?.[0].text(), 'current');
    assert.equal(shared?.files?.[0].name, state?.filename);
    assert.equal(shared?.files?.[0].type, 'image/png');
    assert.equal(shared?.url, undefined);
    shareError = new DOMException('Canceled', 'AbortError');
    await act(async () => {
      await state?.prepareOrShare();
    });
    assert.equal(state?.failed, false);
    shareError = new DOMException('Unavailable', 'NotAllowedError');
    await act(async () => {
      await state?.prepareOrShare();
    });
    assert.equal(state?.failed, true);
    shareError = undefined;
    const previousCount = shareCount;
    await act(async () => {
      await Promise.all([state?.prepareOrShare(), state?.prepareOrShare()]);
    });
    assert.equal(shareCount, previousCount + 1);
    assert.equal(state?.failed, false);
    await render('zh-CN');
    assert.equal(requests[1].signal.aborted, false);
    assert.equal(state?.ready, true);
    assert.equal(requests.length, 2);
    await render('en');
    assert.equal(requests.length, 2);
    await prepare();
    await act(async () => {
      requests[2].resolve(new Response('error', { headers: { 'Content-Type': 'text/html' } }));
    });
    assert.equal(state?.ready, false);
    assert.equal(state?.busy, null);
    assert.equal(state?.failed, true);
    assert.equal(state?.url, `/en/buildings/${building.id}/opengraph-image`);
    await prepare();
    await respond(3, 'retry');
    assert.equal(state?.ready, true);
    assert.equal(state?.failed, false);
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false });
    await render('zh-CN');
    assert.equal(state?.supported, false);
    await prepare();
    assert.equal(requests.length, 4);
  } finally {
    globalThis.fetch = previousFetch;
    await environment.close();
  }
});

test('rapid gallery navigation ignores completion from an earlier image and remains navigable', async () => {
  const environment = createBrowserEnvironment();
  let state: ReturnType<typeof useBuildingGallery> | undefined;
  const current = () => {
    assert.ok(state);
    return state;
  };
  try {
    await act(async () =>
      environment.root.render(
        <GalleryHarness
          onState={(value) => {
            state = value;
          }}
        />,
      ),
    );
    assert.equal(current().loading, true);
    assert.equal(current().activePreview, undefined);
    assert.equal(current().getThumbnailSrc('https://example.test/1.webp'), undefined);
    await act(async () => current().handleImageLoad('https://example.test/1.webp'));
    assert.equal(current().loading, false);
    assert.equal(
      current().getThumbnailSrc('https://example.test/1.webp'),
      'https://example.test/1.webp',
    );
    await act(async () => current().next());
    const earlierImage = current().activeImage;
    await act(async () => current().next());
    assert.equal(current().imageIndex, 2);
    assert.equal(current().loading, true);
    await act(async () => {
      if (earlierImage) current().handleImageLoad(earlierImage);
    });
    assert.equal(current().loading, true);
    await act(async () => current().handleImageError('https://example.test/3.webp'));
    assert.equal(current().loading, false);
    await act(async () => current().retryImage());
    assert.equal(current().isImageError('https://example.test/3.webp'), false);
    assert.equal(current().loading, true);
    await act(async () => current().handleImageLoad('https://example.test/3.webp'));
    assert.equal(current().loading, false);
    await act(async () => current().next());
    assert.equal(current().imageIndex, 0);
    assert.equal(current().loading, false);
    await act(async () => current().handleSelectImage(99));
    assert.equal(current().imageIndex, 0);
    // A second click can arrive before a View Transition has committed the first one.
    await act(async () => {
      current().next();
      current().next();
    });
    assert.equal(current().imageIndex, 2);
    await act(async () => {
      current().prev();
      current().prev();
    });
    assert.equal(current().imageIndex, 0);
  } finally {
    await environment.close();
  }
});

test('gallery shares loaded covers and thumbnails and retries only the failed original', async () => {
  const environment = createBrowserEnvironment();
  const [first, second] = ['https://example.test/first.webp', 'https://example.test/second.webp'];
  const cover = getBuildingPreviewUrl(first, 'cover');
  const small = getBuildingPreviewUrl(second, 'thumbnail');
  Object.defineProperty(document, 'images', {
    value: [
      { complete: true, currentSrc: cover, naturalWidth: 640 },
      { complete: false, currentSrc: second, naturalWidth: 0 },
    ],
  });
  let gallery!: ReturnType<typeof useBuildingGallery>;
  try {
    await act(async () =>
      environment.root.render(
        <GalleryHarness
          modal
          images={[first, second]}
          onState={(state) => {
            gallery = state;
          }}
        />,
      ),
    );
    assert.equal(gallery.loading, true);
    assert.equal(gallery.activePreview, cover);
    assert.equal(gallery.getThumbnailSrc(first), cover);
    assert.equal(gallery.getThumbnailSrc(second), small);
    await act(async () => {
      gallery.handleImageLoad(small);
      gallery.next();
    });
    assert.equal(gallery.loading, true);
    assert.equal(gallery.activePreview, small);
    await act(async () => gallery.handleImageError(second));
    assert.equal(gallery.getThumbnailSrc(second), small);
    await act(async () => gallery.retryImage());
    assert.equal(gallery.activePreview, small);
    await act(async () => gallery.handleImageLoad(second));
    assert.equal(gallery.activePreview, undefined);
    await act(async () => gallery.handleImageError(small));
    assert.equal(gallery.getThumbnailSrc(second), second);
    assert.equal(gallery.isImageError(second), false);
  } finally {
    await environment.close();
  }
});

test('building preview URLs retain the public object path for both widths', () => {
  const original = `https://images.example.test/media/buildings/${building.id}/${'b'.repeat(64)}.webp`;
  assert.equal(getBuildingPreviewUrl(original, 'thumbnail'), `${original}?w=160`);
  assert.equal(getBuildingPreviewUrl(original, 'cover'), `${original}?w=640`);
});

test('sharing uses immutable identity across locales, renames and coordinate edits', () => {
  const data = getBuildingShareData(localizeBuilding(building, 'zh-CN'), 'zh-CN');
  assert.equal(data.title, '樱之庭 · Mik Casual');
  assert.equal(data.text, 'Lead, Guest · 樱花与庭院。');
  assert.equal(data.url, `https://mcmik.top/zh-CN/buildings/${building.id}`);
  assert.equal(
    getBuildingShareData(localizeBuilding(building, 'en'), 'en').title,
    'Sakura Garden · Mik Casual',
  );
  assert.equal(
    getBuildingShareData(
      {
        ...localizeBuilding(building, 'zh-CN'),
        name: 'New name',
        coordinates: { world: 'other', x: 9, y: 70, z: 9 },
      },
      'zh-CN',
    ).url,
    data.url,
  );
  assert.equal(getBuildingUrl(building.id, 'en'), `https://mcmik.top/en/buildings/${building.id}`);
});
