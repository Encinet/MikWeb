import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act } from 'react';
import {
  getBuildingShareData,
  getBuildingUrl,
} from '@/modules/building/lib/building-links';
import { localizeBuilding } from '@/modules/building/model/building-api';
import type { BuildingImageUrls, BuildingWithImageUrls } from '@/modules/building/model/building-types';
import { useBuildingCardShare } from '@/modules/building/model/use-building-card-share';
import { useBuildingGallery } from '@/modules/building/model/use-building-gallery';
import type { AppLocale } from '@/shared/i18n/routing';
import { createBrowserEnvironment } from '../support/browser-environment';

const building: BuildingWithImageUrls = {
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

function photo(name: string): BuildingImageUrls {
  return { webp: `https://example.test/${name}.webp`, jxl: `https://example.test/${name}.jxl` };
}

function GalleryHarness({
  onState,
  modal,
  images = ['1', '2', '3'].map(photo),
}: {
  onState: (value: ReturnType<typeof useBuildingGallery>) => void;
  modal?: boolean;
  images?: BuildingImageUrls[];
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
          images={images.map(photo)}
          onState={(value) => {
            state = value;
          }}
        />,
      ),
    );
  try {
    await render(['first', 'second', 'third']);
    await act(async () => current().handleSelectImage(2));
    assert.deepEqual(current().activeImage, photo('third'));
    await render(['third', 'first', 'second']);
    assert.deepEqual(current().activeImage, photo('third'));
    assert.equal(current().imageIndex, 0);
    await render(['first', 'second']);
    assert.deepEqual(current().activeImage, photo('first'));
    await act(async () => current().prev());
    assert.deepEqual(current().activeImage, photo('second'));
    await render([]);
    assert.equal(current().activeImage, undefined);
    assert.equal(current().loading, false);
    await render(['new']);
    assert.deepEqual(current().activeImage, photo('new'));
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
    assert.equal(current().shouldShowThumbnail(photo('1')), false);
    await act(async () => current().handleImageLoad(photo('1')));
    assert.equal(current().loading, false);
    assert.equal(current().shouldShowThumbnail(photo('1')), true);
    await act(async () => current().next());
    const earlierImage = current().activeImage;
    await act(async () => current().next());
    assert.equal(current().imageIndex, 2);
    assert.equal(current().loading, true);
    await act(async () => {
      if (earlierImage) current().handleImageLoad(earlierImage);
    });
    assert.equal(current().loading, true);
    await act(async () => current().handleImageError(photo('3')));
    assert.equal(current().loading, false);
    await act(async () => current().retryImage());
    assert.equal(current().isImageError(photo('3')), false);
    assert.equal(current().loading, true);
    await act(async () => current().handleImageLoad(photo('3')));
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

test('gallery recognizes the actual selected format from an already loaded cover', async () => {
  const environment = createBrowserEnvironment();
  const first = photo('first');
  const second = photo('second');
  Object.defineProperty(document, 'images', {
    value: [{ complete: true, currentSrc: first.jxl, naturalWidth: 1920 }],
  });
  let gallery!: ReturnType<typeof useBuildingGallery>;
  try {
    await act(async () =>
      environment.root.render(
        <GalleryHarness modal images={[first, second]} onState={(state) => { gallery = state; }} />,
      ),
    );
    assert.equal(gallery.loading, false);
    assert.equal(gallery.shouldShowThumbnail(first), true);
    await act(async () => gallery.next());
    assert.equal(gallery.loading, true);
    assert.equal(gallery.shouldShowThumbnail(second), false);
    await act(async () => gallery.handleImageError(second));
    assert.equal(gallery.loading, false);
    assert.equal(gallery.isImageError(second), true);
    await act(async () => gallery.retryImage());
    assert.equal(gallery.loading, true);
    await act(async () => gallery.handleImageLoad(second));
    assert.equal(gallery.shouldShowThumbnail(second), true);
  } finally {
    await environment.close();
  }
});
