import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act } from 'react';
import { useBuildingCatalogQuery } from '@/modules/building/model/use-building-catalog-query';
import { createBrowserEnvironment } from '../support/browser-environment';

function Probe({
  onState,
}: {
  onState: (state: ReturnType<typeof useBuildingCatalogQuery>) => void;
}) {
  onState(useBuildingCatalogQuery());
  return null;
}

test('catalog deep links, debounced edits and intercepted galleries share the committed URL', async () => {
  const env = createBrowserEnvironment();
  const { window } = env;
  let timer: (() => void) | undefined;
  Object.defineProperties(window, {
    setTimeout: {
      value: (callback: () => void) => {
        timer = callback;
        return 1;
      },
    },
    clearTimeout: {
      value: () => {
        timer = undefined;
      },
    },
  });
  let latest: ReturnType<typeof useBuildingCatalogQuery> | undefined;
  const controls = () => {
    assert.ok(latest);
    return latest;
  };
  const catalogUrl = '/en/buildings?q=hall&type=replica&keep=1#catalog';
  try {
    window.history.replaceState(null, '', catalogUrl);
    await act(async () =>
      env.root.render(
        <Probe
          onState={(state) => {
            latest = state;
          }}
        />,
      ),
    );
    assert.deepEqual(controls().selection, { query: 'hall', filter: 'replica', sort: 'random' });

    await act(async () => controls().handleSearchChange('bridge'));
    assert.equal(controls().query, 'bridge');
    assert.equal(controls().selection.query, 'hall');
    await act(async () => controls().handleSortChange('name-asc'));
    assert.equal(timer, undefined);
    assert.equal(controls().selection.query, 'bridge');
    assert.equal(window.location.search, '?q=bridge&type=replica&keep=1&sort=name-asc');
    assert.equal(window.location.hash, '#catalog');

    await act(async () => controls().handleSearchChange('tower'));
    await act(async () => timer?.());
    assert.equal(controls().selection.query, 'tower');
    const lastCatalogUrl = window.location.href;
    await act(async () => controls().handleSearchChange('pending'));
    await act(async () => {
      window.history.pushState(null, '', '/en/buildings/example');
      controls().syncLocation();
    });
    assert.equal(timer, undefined);
    assert.equal(controls().query, 'tower');
    assert.equal(controls().selection.filter, 'replica');

    await act(async () => {
      window.history.replaceState(null, '', lastCatalogUrl);
      window.dispatchEvent(new window.Event('popstate'));
    });
    await act(async () => controls().handleSearchChange('discard on back'));
    await act(async () => {
      window.history.replaceState(null, '', catalogUrl);
      window.dispatchEvent(new window.Event('popstate'));
    });
    assert.equal(timer, undefined);
    assert.equal(controls().query, 'hall');
    await act(async () => controls().handleSearchChange('discard on link'));
    await act(async () => {
      window.history.pushState(null, '', '/en/buildings?q=hall&sort=date-asc');
      controls().syncLocation();
    });
    assert.equal(timer, undefined);
    assert.equal(controls().query, 'hall');
    assert.equal(controls().selection.sort, 'date-asc');
  } finally {
    await env.close();
  }
});
