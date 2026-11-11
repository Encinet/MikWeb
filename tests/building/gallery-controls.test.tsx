import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act } from 'react';
import { useBuildingGalleryControls } from '@/modules/building/model/use-building-gallery-controls';
import { createBrowserEnvironment } from '../support/browser-environment';

function Harness({
  onNavigate,
  imageIndex = 0,
}: {
  onNavigate: (direction: number) => void;
  imageIndex?: number;
}) {
  const { stageRef, thumbnailsRef } = useBuildingGalleryControls({
    imageIndex,
    imageCount: 3,
    next: () => onNavigate(1),
    prev: () => onNavigate(-1),
    reduceMotion: true,
  });
  return (
    <div className="building-archive-overlay">
      <div ref={stageRef}>
        <button type="button">Next</button>
      </div>
      <input aria-label="Caption" />
      <section ref={thumbnailsRef} data-thumbnails>
        {[0, 1, 2].map((index) => (
          <button key={index} type="button" aria-pressed={index === imageIndex}>
            {index + 1}
          </button>
        ))}
      </section>
    </div>
  );
}

test('gallery shortcuts preserve text editing, selection and browser shortcuts', async () => {
  const environment = createBrowserEnvironment();
  let changes = 0;
  const key = (
    target: Element,
    options: Pick<KeyboardEventInit, 'key' | 'ctrlKey' | 'shiftKey' | 'altKey' | 'metaKey'> = {},
  ) =>
    target.dispatchEvent(
      new environment.window.KeyboardEvent('keydown', {
        key: 'ArrowRight',
        bubbles: true,
        cancelable: true,
        ...options,
      }) as unknown as Event,
    );
  try {
    await act(async () =>
      environment.root.render(
        <Harness
          onNavigate={(direction) => {
            changes += direction;
          }}
        />,
      ),
    );
    const stage = environment.container.querySelector('.building-archive-overlay > div');
    const input = environment.container.querySelector('input');
    const button = environment.container.querySelector('button');
    assert.ok(stage && input && button);
    assert.equal(key(button), false);
    assert.equal(changes, 1);
    key(input);
    key(button, { ctrlKey: true });
    key(button, { shiftKey: true });
    const outside = document.createElement('button');
    document.body.append(outside);
    key(outside);
    const selection = window.getSelection();
    selection?.selectAllChildren(button);
    key(button);
    selection?.removeAllRanges();
    assert.equal(changes, 1);
  } finally {
    await environment.close();
  }
});

test('keyboard image changes scroll only the thumbnail strip enough to reveal the selection', async () => {
  const environment = createBrowserEnvironment();
  const scrolls: ScrollToOptions[] = [];
  const render = (imageIndex: number) =>
    act(async () => {
      environment.root.render(<Harness onNavigate={() => {}} imageIndex={imageIndex} />);
    });
  try {
    await render(0);
    const strip = environment.container.querySelector('[data-thumbnails]');
    assert.ok(strip);
    Object.defineProperty(strip, 'scrollBy', {
      value: (options: ScrollToOptions) => scrolls.push(options),
    });
    strip.getBoundingClientRect = () => ({ left: 100, right: 300 }) as DOMRect;
    const buttons = strip.querySelectorAll('button');
    buttons[1].getBoundingClientRect = () => ({ left: 280, right: 340 }) as DOMRect;
    await render(1);
    assert.deepEqual(scrolls, [{ left: 44, behavior: 'auto' }]);
    buttons[0].getBoundingClientRect = () => ({ left: 60, right: 120 }) as DOMRect;
    await render(0);
    assert.deepEqual(scrolls.at(-1), { left: -44, behavior: 'auto' });
    buttons[2].getBoundingClientRect = () => ({ left: 160, right: 220 }) as DOMRect;
    await render(2);
    assert.equal(scrolls.length, 2);
  } finally {
    await environment.close();
  }
});
