import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useModalInteraction } from '@/shared/hooks/use-modal-interaction';
import { createBrowserEnvironment } from '../support/browser-environment';

function Dialog({ onClose, nested = false }: { onClose: () => void; nested?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useModalInteraction(ref, true, onClose);
  return createPortal(
    <dialog ref={ref} open tabIndex={-1} data-nested={nested}>
      <input aria-label="Name" />
      <input
        aria-label="Combobox"
        onKeyDown={(event) => {
          if (event.key === 'Escape') event.preventDefault();
        }}
      />
    </dialog>,
    document.body,
  );
}

test('dialog Escape respects composition and a child control that already handled the key', async () => {
  const environment = createBrowserEnvironment();
  let closed = 0;
  try {
    await act(async () => environment.root.render(<Dialog onClose={() => closed++} />));
    const inputs = document.querySelectorAll('dialog input');
    const key = (
      target: Element,
      options: Pick<KeyboardEventInit, 'isComposing' | 'keyCode'> = {},
    ) => {
      const event = new environment.window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
        ...options,
      });
      target.dispatchEvent(event as unknown as Event);
      return event;
    };
    assert.equal(key(inputs[0], { isComposing: true }).defaultPrevented, false);
    assert.equal(key(inputs[0], { keyCode: 229 }).defaultPrevented, false);
    key(inputs[1]);
    assert.equal(closed, 0);
    assert.equal(key(inputs[0]).defaultPrevented, true);
    assert.equal(closed, 1);
  } finally {
    await environment.close();
  }
});

test('Escape only reaches the active dialog when another dialog is inert behind it', async () => {
  const environment = createBrowserEnvironment();
  const closed: string[] = [];
  const render = (nested: boolean) =>
    act(async () =>
      environment.root.render(
        <>
          <Dialog onClose={() => closed.push('parent')} />
          {nested ? <Dialog nested onClose={() => closed.push('child')} /> : null}
        </>,
      ),
    );
  try {
    await render(false);
    await render(true);
    document.querySelector('[data-nested="true"]')?.dispatchEvent(
      new environment.window.KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }) as unknown as Event,
    );
    assert.deepEqual(closed, ['child']);
    await render(false);
    assert.equal(document.querySelector('dialog')?.inert, false);
    assert.equal(document.documentElement.style.overflow, 'hidden');
  } finally {
    await environment.close();
  }
  assert.deepEqual(closed, ['child']);
});
