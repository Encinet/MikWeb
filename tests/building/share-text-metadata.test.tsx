import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PathnameContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { act } from 'react';
import { ShareTextMetadata } from '@/site/seo/share-text-metadata';
import { createBrowserEnvironment } from '../support/browser-environment';

function textTags() {
  return [
    ...document.head.querySelectorAll<HTMLMetaElement>(
      'meta[itemprop="name"],meta[itemprop="description"]',
    ),
  ].map((tag) => [tag.getAttribute('itemprop'), tag.content]);
}

const id = 'a'.repeat(32);

function Page({
  pathname,
  description = 'Building summary',
}: {
  pathname: string;
  description?: string;
}) {
  return (
    <PathnameContext.Provider value={pathname}>
      <ShareTextMetadata
        title="Catalog"
        description="Catalog summary"
        target={{ kind: 'site', locale: 'en', page: 'buildings' }}
      />
      <ShareTextMetadata
        title="Building"
        description={description}
        target={{ kind: 'building', locale: 'en', id }}
      />
    </PathnameContext.Provider>
  );
}

test('share text follows navigation without parent-layout overrides or stale summaries', async () => {
  const browser = createBrowserEnvironment();
  try {
    document.head.innerHTML =
      '<meta itemprop="name" content="Catalog"><meta itemprop="description" content="Catalog summary">';
    await act(async () => browser.root.render(<Page pathname="/en/buildings" />));
    assert.deepEqual(textTags(), [
      ['name', 'Catalog'],
      ['description', 'Catalog summary'],
    ]);
    await act(async () => browser.root.render(<Page pathname={`/en/buildings/${id}`} />));
    assert.deepEqual(textTags(), [
      ['name', 'Building'],
      ['description', 'Building summary'],
    ]);
    await act(async () =>
      browser.root.render(<Page pathname={`/en/buildings/${id}`} description="Updated summary" />),
    );
    assert.deepEqual(textTags(), [
      ['name', 'Building'],
      ['description', 'Updated summary'],
    ]);
    await act(async () => browser.root.render(<Page pathname="/en/buildings" />));
    assert.deepEqual(textTags(), [
      ['name', 'Catalog'],
      ['description', 'Catalog summary'],
    ]);
    await act(async () => browser.root.render(<Page pathname="/en/map" />));
    assert.deepEqual(textTags(), []);
  } finally {
    await browser.close();
  }
});

function OverlappingOwners({ first, second }: { first: boolean; second: boolean }) {
  return (
    <PathnameContext.Provider value="/en/buildings">
      {first ? (
        <ShareTextMetadata
          key="first"
          title="First"
          description="First summary"
          target={{ kind: 'site', locale: 'en', page: 'buildings' }}
        />
      ) : null}
      {second ? (
        <ShareTextMetadata
          key="second"
          title="Second"
          description="Second summary"
          target={{ kind: 'site', locale: 'en', page: 'buildings' }}
        />
      ) : null}
    </PathnameContext.Provider>
  );
}

test('unmounting an older owner keeps the surviving owner and leaves the image tag intact', async () => {
  const browser = createBrowserEnvironment();
  try {
    document.head.innerHTML =
      '<meta itemprop="image" content="square.png"><meta itemprop="name" content="SSR"><meta itemprop="name" content="SSR duplicate"><meta itemprop="description" content="SSR summary">';
    await act(async () => browser.root.render(<OverlappingOwners first={true} second={true} />));
    assert.deepEqual(textTags(), [
      ['name', 'Second'],
      ['description', 'Second summary'],
    ]);
    await act(async () => browser.root.render(<OverlappingOwners first={false} second={true} />));
    assert.deepEqual(textTags(), [
      ['name', 'Second'],
      ['description', 'Second summary'],
    ]);
    await act(async () => browser.root.render(<OverlappingOwners first={false} second={false} />));
    assert.deepEqual(textTags(), []);
    assert.equal(
      document.head.querySelector<HTMLMetaElement>('meta[itemprop="image"]')?.content,
      'square.png',
    );
  } finally {
    await browser.close();
  }
});

test('removing the latest owner restores the previous owner rather than losing all share text', async () => {
  const browser = createBrowserEnvironment();
  try {
    await act(async () => browser.root.render(<OverlappingOwners first={true} second={true} />));
    assert.deepEqual(textTags(), [
      ['name', 'Second'],
      ['description', 'Second summary'],
    ]);
    await act(async () => browser.root.render(<OverlappingOwners first={true} second={false} />));
    assert.deepEqual(textTags(), [
      ['name', 'First'],
      ['description', 'First summary'],
    ]);
    await act(async () => browser.root.render(<OverlappingOwners first={false} second={false} />));
    assert.deepEqual(textTags(), []);
    await act(async () => browser.root.render(<OverlappingOwners first={false} second={true} />));
    assert.deepEqual(textTags(), [
      ['name', 'Second'],
      ['description', 'Second summary'],
    ]);
  } finally {
    await browser.close();
  }
});
