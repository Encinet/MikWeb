import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Activity, act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PageAppearance } from '@/shared/ui/page/page-appearance';
import { createBrowserEnvironment } from '../support/browser-environment';

test('cached pages stop contributing header appearance when Activity hides them and restore it on return', async () => {
  const environment = createBrowserEnvironment();
  const render = (page: 'home' | 'login' | 'wiki') =>
    act(async () =>
      environment.root.render(
        <>
          <Activity mode={page === 'home' ? 'visible' : 'hidden'}>
            <div className="home-project-page">
              <PageAppearance appearance="hero" />
            </div>
          </Activity>
          <Activity mode={page === 'login' ? 'visible' : 'hidden'}>
            <div className="auth-login-page">
              <PageAppearance appearance="dark" />
            </div>
          </Activity>
          {page === 'wiki' && <div className="wiki-page" />}
        </>,
      ),
    );
  const activeAppearances = () =>
    Array.from(document.querySelectorAll('[data-page-active]'), (element) =>
      element.getAttribute('data-page-appearance'),
    );
  try {
    await render('home');
    const home = document.querySelector('.home-project-page');
    assert.deepEqual(activeAppearances(), ['hero']);
    await render('wiki');
    assert.equal(document.querySelector('.home-project-page'), home);
    assert.deepEqual(activeAppearances(), []);
    await render('login');
    assert.deepEqual(activeAppearances(), ['dark']);
    await render('wiki');
    assert.deepEqual(activeAppearances(), []);
    await render('home');
    assert.equal(document.querySelector('.home-project-page'), home);
    assert.deepEqual(activeAppearances(), ['hero']);
  } finally {
    await environment.close();
  }
});

test('server-rendered page appearance is available before hydration', () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Reflect.deleteProperty(globalThis, 'window');
  try {
    const markup = renderToStaticMarkup(<PageAppearance appearance="hero" />);
    assert.match(markup, /data-page-appearance="hero"/);
    assert.match(markup, /data-page-active=""/);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
  }
});
