import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act } from 'react';
import { getBuildingShareData, getBuildingUrl } from '@/modules/building/lib/building-links';
import type { Building } from '@/modules/building/model/building-types';
import { useBuildingGallery } from '@/modules/building/model/use-building-gallery';
import { useBuildingImageShare } from '@/modules/building/model/use-building-image-share';
import { useBuildingShare } from '@/modules/building/model/use-building-share';
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

function ShareHarness({
  locale,
  onState,
}: {
  locale: string;
  onState: (value: ReturnType<typeof useBuildingShare>) => void;
}) {
  onState(useBuildingShare(building, locale));
  return null;
}

function GalleryHarness({
  onState,
}: {
  onState: (value: ReturnType<typeof useBuildingGallery>) => void;
}) {
  onState(
    useBuildingGallery({
      ...building,
      images: [
        'https://example.test/1.webp',
        'https://example.test/2.webp',
        'https://example.test/3.webp',
      ],
    }),
  );
  return null;
}

function ImageShareHarness({
  url,
  filename = 'building-image',
  onState,
}: {
  url?: string;
  filename?: string;
  onState: (value: ReturnType<typeof useBuildingImageShare>) => void;
}) {
  onState(useBuildingImageShare(url, filename, getBuildingShareData(building, 'en')));
  return null;
}

function imageResponse(bytes: string) {
  return new Response(bytes, {
    headers: {
      'Content-Type': 'image/jpeg',
    },
  });
}

test('image preparation aborts obsolete requests and never shares a previous selection', async () => {
  const environment = createBrowserEnvironment();
  const previousFetch = globalThis.fetch;
  const requests: { url: string; signal: AbortSignal; resolve: (response: Response) => void }[] =
    [];
  let state: ReturnType<typeof useBuildingImageShare> | undefined;
  let shared: ShareData | undefined;
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: async (data: ShareData) => {
      shared = data;
    },
  });
  globalThis.fetch = ((input: string, init: RequestInit) =>
    new Promise<Response>((resolve) => {
      assert.ok(init.signal);
      requests.push({ url: input, signal: init.signal, resolve });
    })) as typeof fetch;
  const render = (url?: string) =>
    act(async () => {
      environment.root.render(
        <ImageShareHarness
          url={url}
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
    await render('/api/buildings/first/images/0');
    await render('/api/buildings/first/images/1');
    assert.equal(requests[0].signal.aborted, true);
    await respond(0, 'old');
    assert.equal(state?.ready, false);
    await respond(1, 'current');
    assert.equal(state?.ready, true);
    await act(async () => {
      await state?.share();
    });
    assert.equal(await shared?.files?.[0].text(), 'current');
    assert.equal(shared?.files?.[0].name, 'building-image.jpg');
    await render();
    assert.equal(requests[1].signal.aborted, false);
    assert.equal(state?.ready, false);
    assert.equal(requests.length, 2);
  } finally {
    globalThis.fetch = previousFetch;
    await environment.close();
  }
});

test('image filenames have independent preparation and collapsed details release the prepared file', async () => {
  const environment = createBrowserEnvironment();
  const previousFetch = globalThis.fetch;
  const responses: ((response: Response) => void)[] = [];
  let state: ReturnType<typeof useBuildingImageShare> | undefined;
  let rejectShare: (error: Error) => void = () => {};
  const shared: ShareData[] = [];
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: (data: ShareData) => {
      shared.push(data);
      return shared.length === 1
        ? new Promise<void>((_resolve, reject) => {
            rejectShare = reject;
          })
        : Promise.resolve();
    },
  });
  globalThis.fetch = (() =>
    new Promise<Response>((resolve) => {
      responses.push(resolve);
    })) as typeof fetch;
  const render = (url: string | undefined, filename: string) =>
    act(async () => {
      environment.root.render(
        <ImageShareHarness
          url={url}
          filename={filename}
          onState={(value) => {
            state = value;
          }}
        />,
      );
    });
  const respond = (index: number) =>
    act(async () => {
      responses[index](imageResponse('image bytes'));
    });
  try {
    const url = '/api/buildings/first/images/0';
    await render(url, 'first-name');
    await respond(0);
    assert.equal(state?.ready, true);
    let firstShare: Promise<void> | undefined;
    await act(async () => {
      firstShare = state?.share();
    });
    await render(url, 'second-name');
    assert.equal(state?.ready, false);
    await act(async () => {
      rejectShare(new Error('Old selection failed'));
      await firstShare;
    });
    assert.equal(state?.failed, false);
    await respond(1);
    await act(async () => {
      await state?.share();
    });
    assert.equal(shared[1].files?.[0].name, 'second-name.jpg');
    await render(undefined, 'second-name');
    await render(url, 'second-name');
    assert.equal(state?.ready, false);
    await respond(2);
    assert.equal(state?.ready, true);
    assert.equal(responses.length, 3);
  } finally {
    globalThis.fetch = previousFetch;
    await environment.close();
  }
});

test('a copy completed after a locale change cannot open fallback feedback for the new link', async () => {
  const environment = createBrowserEnvironment();
  let state: ReturnType<typeof useBuildingShare> | undefined;
  let rejectCopy: (error: Error) => void = () => {};
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  Object.defineProperty(navigator.clipboard, 'writeText', {
    configurable: true,
    value: () =>
      new Promise<void>((_resolve, reject) => {
        rejectCopy = reject;
      }),
  });
  const render = (locale: string) =>
    act(async () => {
      environment.root.render(
        <ShareHarness
          locale={locale}
          onState={(value) => {
            state = value;
          }}
        />,
      );
    });
  try {
    await render('en');
    let copying: Promise<boolean> | undefined;
    await act(async () => {
      copying = state?.copy();
    });
    await render('zh-CN');
    await act(async () => {
      rejectCopy(new Error('Clipboard denied'));
      await copying;
    });
    assert.equal(state?.fallbackOpen, false);
    assert.equal(state?.link, getBuildingUrl(building.id, 'zh-CN'));
    assert.equal(state?.status, 'idle');
  } finally {
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
    await act(async () => current().handleImageLoad('https://example.test/1.webp'));
    assert.equal(current().loading, false);
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
    await act(async () => current().next());
    assert.equal(current().imageIndex, 0);
    assert.equal(current().loading, false);
    await act(async () => current().handleSelectImage(99));
    assert.equal(current().imageIndex, 0);
  } finally {
    await environment.close();
  }
});

test('sharing uses immutable identity across locales, renames and coordinate edits', () => {
  const data = getBuildingShareData(building, 'zh-CN');
  assert.equal(data.title, '樱之庭 · Mik Casual');
  assert.equal(data.text, 'Lead, Guest · 樱花与庭院。');
  assert.equal(data.url, `https://mcmik.top/zh-CN/buildings/${building.id}`);
  assert.equal(getBuildingShareData(building, 'en').title, 'Sakura Garden · Mik Casual');
  assert.equal(
    getBuildingShareData(
      { ...building, name: { en: 'New name' }, coordinates: { world: 'other', x: 9, y: 70, z: 9 } },
      'zh-CN',
    ).url,
    data.url,
  );
  assert.equal(getBuildingUrl(building.id, 'en'), `https://mcmik.top/en/buildings/${building.id}`);
});

test('native cancellation is quiet and does not write the clipboard; real failures offer a separate copy action', async () => {
  const environment = createBrowserEnvironment();
  let state: ReturnType<typeof useBuildingShare> | undefined;
  let nativeCalls = 0;
  let copies = 0;
  let rejectShare: (reason: Error) => void = () => {};
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
  Object.defineProperty(navigator, 'share', {
    configurable: true,
    value: () => {
      nativeCalls++;
      return new Promise<void>((_resolve, reject) => {
        rejectShare = reject;
      });
    },
  });
  Object.defineProperty(navigator.clipboard, 'writeText', {
    configurable: true,
    value: async () => {
      copies++;
    },
  });
  try {
    await act(async () =>
      environment.root.render(
        <ShareHarness
          locale="zh-CN"
          onState={(value) => {
            state = value;
          }}
        />,
      ),
    );
    const current = () => {
      assert.ok(state);
      return state;
    };
    let operation: Promise<void> | undefined;
    await act(async () => {
      operation = current().share();
      await current().share();
    });
    assert.equal(nativeCalls, 1);
    await act(async () => {
      rejectShare(new DOMException('Cancelled', 'AbortError'));
      await operation;
    });
    assert.equal(current().fallbackOpen, false);
    assert.equal(copies, 0);
    await act(async () => {
      operation = current().share();
    });
    await act(async () => {
      rejectShare(new Error('Unavailable'));
      await operation;
    });
    assert.equal(current().canShare, false);
    assert.equal(copies, 0);
    await act(async () => {
      await current().copy();
    });
    assert.equal(copies, 1);
    assert.equal(current().fallbackOpen, false);
    assert.equal(current().status, 'copied');
  } finally {
    await environment.close();
  }
});

test('platforms without native sharing copy immediately and expose a manual link when clipboard access fails', async () => {
  const environment = createBrowserEnvironment();
  let state: ReturnType<typeof useBuildingShare> | undefined;
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  Object.defineProperty(navigator.clipboard, 'writeText', {
    configurable: true,
    value: async () => {
      throw new DOMException('Denied', 'NotAllowedError');
    },
  });
  try {
    await act(async () =>
      environment.root.render(
        <ShareHarness
          locale="en"
          onState={(value) => {
            state = value;
          }}
        />,
      ),
    );
    await act(async () => {
      await state?.share();
    });
    assert.equal(state?.fallbackOpen, true);
    assert.equal(state?.link, getBuildingUrl(building.id, 'en'));
  } finally {
    await environment.close();
  }
});
