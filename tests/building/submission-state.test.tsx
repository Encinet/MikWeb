import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NextIntlClientProvider } from 'next-intl';
import { act } from 'react';
import sharp from 'sharp';
import { AuthStateContext } from '@/modules/auth/model/auth-state-context';
import type { AuthAccount } from '@/modules/auth/model/auth-types';
import {
  createBuildingSubmissionImageDrafts,
  releaseBuildingImagePreview,
  uploadBuildingSubmissionImageDrafts,
} from '@/modules/building-submission/lib/building-submission-images';
import type { BuildingSubmissionImageDraft } from '@/modules/building-submission/model/building-submission-form';
import type { BuildingSubmissionSummary } from '@/modules/building-submission/model/building-submission-types';
import { useBuildingSubmissionForm } from '@/modules/building-submission/model/use-building-submission-form';
import { clearFetchValidatedJsonBrowserCache } from '@/shared/api/fetch-validated-json';
import messages from '../../messages/en.json';
import { createBrowserEnvironment } from '../support/browser-environment';

const account: AuthAccount = {
  playerUuid: '00000000-0000-4000-8000-000000000001',
  currentName: 'Builder',
  role: 'member',
  passkeyCount: 0,
};
test('reselecting identical bytes reuses the prepared file and uploads within its own draft', async () => {
  const prefix = new Uint8Array(256 * 1024);
  const prepared = ['a', 'b'].map<BuildingSubmissionImageDraft>((suffix) => ({
    id: suffix,
    source: new File([prefix, suffix], 'screenshot.png', { type: 'image/png' }),
    files: {
      webp: new File([suffix], 'building.webp', { type: 'image/webp' }),
      jxl: new File([suffix], 'building.jxl', { type: 'image/jxl' }),
      thumbnailWebp: new File([suffix], 'thumbnail.webp', { type: 'image/webp' }),
    },
    preview: { webp: `blob:${suffix}-webp`, jxl: `blob:${suffix}-jxl` },
    size: 1,
    width: 960,
    height: 540,
  }));
  const copy = new File([prepared[1].source], 'renamed.png', { type: 'image/png' });
  const [draft] = await createBuildingSubmissionImageDrafts(
    [copy],
    new AbortController().signal,
    prepared,
  );
  const previousFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = (async () => {
    requests++;
    return Response.json({
      image: { webp: 'a'.repeat(64), jxl: 'b'.repeat(64), thumbnailWebp: 'c'.repeat(64), jxlPreviewBytes: 0 },
      expiresAt: Date.now() + 60_000,
    });
  }) as typeof fetch;
  try {
    assert.equal(draft.files, prepared[1].files);
    assert.notEqual(draft.preview.webp, prepared[1].preview.webp);
    const [first, second] = await uploadBuildingSubmissionImageDrafts(
      [prepared[1], draft],
      account,
      'first',
    );
    assert.equal(first, second);
    assert.equal(requests, 1);
    await uploadBuildingSubmissionImageDrafts([draft], account, 'new-draft');
    await uploadBuildingSubmissionImageDrafts(
      [draft],
      { ...account, playerUuid: 'other' },
      'new-draft',
    );
    assert.equal(requests, 3);
  } finally {
    releaseBuildingImagePreview(draft);
    globalThis.fetch = previousFetch;
  }
});
const submission: BuildingSubmissionSummary = {
  id: 'a'.repeat(32),
  status: 'pending',
  name: { en: 'Building' },
};
function Consumer({
  onState,
}: {
  onState: (state: ReturnType<typeof useBuildingSubmissionForm>) => void;
}) {
  onState(useBuildingSubmissionForm());
  return null;
}

function renderForm(
  environment: ReturnType<typeof createBrowserEnvironment>,
  currentAccount: AuthAccount,
  onState: (state: ReturnType<typeof useBuildingSubmissionForm>) => void,
) {
  return act(async () =>
    environment.root.render(
      <NextIntlClientProvider locale="en" messages={messages} timeZone="Asia/Singapore">
        <AuthStateContext
          value={{
            account: currentAccount,
            authenticated: true,
            verified: true,
            isLoading: false,
            refresh: async () => currentAccount,
            acceptAuthentication: () => undefined,
            logout: async () => undefined,
          }}
        >
          <Consumer onState={onState} />
        </AuthStateContext>
      </NextIntlClientProvider>,
    ),
  );
}

for (const role of ['member', 'moderator', 'custodian'] as const) {
  test(`${role} submission only allows staff to remove themselves`, async () => {
    const environment = createBrowserEnvironment();
    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async () => Response.json({ playerUuid: account.playerUuid, submissions: [] })) as typeof fetch;
    const currentAccount = { ...account, role };
    let state: ReturnType<typeof useBuildingSubmissionForm> | undefined;
    const current = () => {
      assert.ok(state);
      return state;
    };
    clearFetchValidatedJsonBrowserCache();
    try {
      await renderForm(environment, currentAccount, (value) => (state = value));
      assert.equal(current().builders[0].uuid, account.playerUuid);
      assert.equal(current().builders[0].locked, role === 'member');
      await act(async () => {
        current().setBuilders((builders) => [
          ...builders,
          { uuid: '00000000-0000-4000-8000-000000000002', name: 'Other', weight: 1 },
        ]);
      });
      await act(async () => current().clearOptionalBuilders());
      assert.deepEqual(
        current().builders.map((builder) => builder.uuid),
        [account.playerUuid],
      );
      await act(async () => {
        current().setBuilders((builders) => builders.filter((builder) => builder.locked));
      });
      assert.equal(current().builders.length, role === 'member' ? 1 : 0);
      await act(async () => current().resetForm(currentAccount));
      assert.equal(current().builders[0].uuid, account.playerUuid);
      assert.equal(current().builders[0].locked, role === 'member');
    } finally {
      globalThis.fetch = previousFetch;
      clearFetchValidatedJsonBrowserCache();
      await environment.close();
    }
  });
}

test('submission history keeps the newest refresh when older same-account requests finish later', async () => {
  const environment = createBrowserEnvironment();
  const previousFetch = globalThis.fetch;
  const requests: ((response: Response) => void)[] = [];
  globalThis.fetch = (() =>
    new Promise<Response>((resolve) => requests.push(resolve))) as typeof fetch;
  let state: ReturnType<typeof useBuildingSubmissionForm> | undefined;
  const current = () => {
    assert.ok(state);
    return state;
  };
  clearFetchValidatedJsonBrowserCache();
  try {
    await renderForm(environment, account, (value) => (state = value));
    assert.equal(requests.length, 1);
    let refresh: Promise<void> | undefined;
    await act(async () => {
      refresh = current().loadSubmissions({ force: true });
    });
    await act(async () => {
      requests[1](Response.json({ playerUuid: account.playerUuid, submissions: [submission] }));
      await refresh;
    });
    assert.equal(current().submissions.length, 1);
    await act(async () => {
      requests[0](Response.json({ playerUuid: account.playerUuid, submissions: [] }));
    });
    assert.equal(
      current().submissions.length,
      1,
      'late initial data cannot replace the refreshed history',
    );
    assert.equal(current().isLoadingSubmissions, false);
  } finally {
    globalThis.fetch = previousFetch;
    clearFetchValidatedJsonBrowserCache();
    await environment.close();
  }
});

test('reset during image preparation cancels the old batch and preserves the next selection', async () => {
  const pixels = await sharp({
    create: { width: 960, height: 540, channels: 3, background: '#369' },
  })
    .webp()
    .toBuffer();
  const file = new File([new Uint8Array(pixels)], 'photo.webp', { type: 'image/webp' });
  const selection = (...files: File[]): FileList =>
    Object.assign(files, { item: (index: number) => files[index] ?? null });
  const environment = createBrowserEnvironment();
  const previousFetch = globalThis.fetch;
  const previousWorker = globalThis.Worker;
  const canvas = environment.window.HTMLCanvasElement.prototype;
  const originalContext = canvas.getContext;
  canvas.getContext = function () {
    return {
      canvas: this,
      drawImage() {},
      getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    } as unknown as ReturnType<typeof canvas.getContext>;
  };
  class EncoderWorker extends EventTarget {
    postMessage() {
      const event = new environment.window.MessageEvent('message', {
        data: { webp: new Uint8Array([1]).buffer, jxl: new Uint8Array([2]).buffer, thumbnailWebp: new Uint8Array([3]).buffer },
      });
      queueMicrotask(() => this.dispatchEvent(event as unknown as Event));
    }
    terminate() {}
  }
  globalThis.Worker = EncoderWorker as unknown as typeof Worker;
  const previousDecode = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap');
  const decodes: ReturnType<typeof Promise.withResolvers<ImageBitmap>>[] = [];
  let closed = 0;
  const bitmap = { width: 960, height: 540, close: () => closed++ } as ImageBitmap;
  Object.defineProperty(globalThis, 'createImageBitmap', {
    configurable: true,
    value: () => {
      const decode = Promise.withResolvers<ImageBitmap>();
      decodes.push(decode);
      return decode.promise;
    },
  });
  globalThis.fetch = (async () => Response.json({ playerUuid: account.playerUuid, submissions: [] })) as typeof fetch;
  let state!: ReturnType<typeof useBuildingSubmissionForm>;
  try {
    await renderForm(environment, account, (value) => (state = value));
    let oldBatch!: Promise<void>;
    await act(async () => {
      oldBatch = state.handleImageFiles(selection(file, file));
      void state.handleImageFiles(selection(file));
    });
    assert.equal(decodes.length, 1);
    await act(async () => state.resetForm(account));
    assert.equal(state.isUploading, false);

    let newBatch!: Promise<void>;
    await act(async () => {
      newBatch = state.handleImageFiles(selection(file));
    });
    await act(async () => {
      decodes[0].resolve(bitmap);
      await oldBatch;
    });
    assert.equal(decodes.length, 2);
    assert.equal(closed, 1);
    assert.equal(state.isUploading, true);
    assert.equal(state.draftImages.length, 0);
    assert.ok(!state.feedback.images);
    await act(async () => {
      decodes[1].resolve(bitmap);
      await newBatch;
    });
    assert.equal(state.isUploading, false);
    assert.equal(state.draftImages.length, 1);
    assert.equal(state.draftImages[0].source, file);
    assert.equal(state.draftImages[0].files.jxl.type, 'image/jxl');
    assert.equal(closed, 2);
  } finally {
    globalThis.Worker = previousWorker;
    canvas.getContext = originalContext;
    if (previousDecode) Object.defineProperty(globalThis, 'createImageBitmap', previousDecode);
    else Reflect.deleteProperty(globalThis, 'createImageBitmap');
    globalThis.fetch = previousFetch;
    clearFetchValidatedJsonBrowserCache();
    await environment.close();
  }
});
