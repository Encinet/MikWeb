import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { NextIntlClientProvider } from 'next-intl';
import { act, useRef, useState } from 'react';
import { getWikiNavigationScrollMinimum } from '@/modules/wiki/lib/wiki-navigation-scroll';
import { useWikiReading } from '@/modules/wiki/model/use-wiki-reading';
import WikiContent from '@/modules/wiki/ui/wiki-content-view';
import translations from '../../messages/zh-CN.json';
import { createBrowserEnvironment } from '../support/browser-environment';

let browser: ReturnType<typeof createBrowserEnvironment>;
let previousObserver: PropertyDescriptor | undefined;
let scrollY: number;
let scrolls: ScrollToOptions[];
let reading: ReturnType<typeof useWikiReading>;
const outline = [{ slug: 'details', heading: 'Details', level: 2 }];

beforeEach(() => {
  browser = createBrowserEnvironment();
  previousObserver = Object.getOwnPropertyDescriptor(globalThis, 'MutationObserver');
  Object.defineProperty(globalThis, 'MutationObserver', {
    configurable: true,
    value: browser.window.MutationObserver,
  });
  scrollY = 0;
  scrolls = [];
  Object.defineProperties(browser.window, {
    scrollY: { configurable: true, get: () => scrollY },
    scrollTo: {
      configurable: true,
      value: (options: ScrollToOptions) => {
        scrolls.push(options);
        scrollY = options.top ?? scrollY;
      },
    },
    requestAnimationFrame: { configurable: true, value: () => 1 },
    cancelAnimationFrame: { configurable: true, value: () => undefined },
  });
  // Explicit geometry tests the scroll policy, without pretending to render CSS layout.
  browser.window.HTMLElement.prototype.getBoundingClientRect = function () {
    if (this.classList.contains('wiki-page__layout')) {
      return new browser.window.DOMRect(0, 260 - scrollY, 1200, 2000);
    }
    if (this.classList.contains('wiki-page__navigation')) {
      return new browser.window.DOMRect(0, Math.max(80, 260 - scrollY), 200, 400);
    }
    if (this.classList.contains('wiki-navigation__groups')) {
      return new browser.window.DOMRect(0, Math.max(88, 268 - scrollY), 200, 400);
    }
    return new browser.window.DOMRect(
      0,
      (this.id === 'details' ? 1000 : this.matches('[data-docked-reader] h1') ? 268 : 260) -
        scrollY,
      800,
      this.tagName === 'ARTICLE' ? 2000 : 48,
    );
  };
  const style = document.createElement('style');
  style.textContent = '.wiki-markdown, .wiki-markdown__h1, h2 { scroll-margin-top: 100px; }';
  document.head.append(style);
});

afterEach(async () => {
  await browser.close();
  if (previousObserver) Object.defineProperty(globalThis, 'MutationObserver', previousObserver);
  else Reflect.deleteProperty(globalThis, 'MutationObserver');
});

function Reader({
  section = 'first',
  articleSection = section,
}: {
  section?: string;
  articleSection?: string;
}) {
  reading = useWikiReading(section, outline, true);
  return (
    <article
      key={articleSection}
      ref={reading.articleRef}
      data-section={articleSection}
      className="wiki-markdown"
    >
      <h1 className="wiki-markdown__h1" tabIndex={-1}>
        {articleSection}
      </h1>
      <h2 id="details" tabIndex={-1}>
        Details
      </h2>
    </article>
  );
}

test('section changes keep visible titles in place and only reveal titles above the reading area', async () => {
  await act(async () => browser.root.render(<Reader />));
  for (const position of [0, 80, 160, 900]) {
    scrollY = position;
    scrolls = [];
    await act(async () => {
      reading.requestScroll({
        sectionId: 'first',
        slug: '',
        focus: true,
        smooth: false,
        onlyIfAbove: true,
      });
    });
    assert.deepEqual(scrolls, position > 160 ? [{ top: 160, behavior: 'instant' }] : []);
    assert.equal(scrollY, Math.min(position, 160));
    assert.equal(document.activeElement, document.querySelector('h1'));
  }
});

test('outline and search anchors still scroll down, and history can restore scroll position zero', async () => {
  await act(async () => browser.root.render(<Reader />));
  await act(async () => {
    reading.requestScroll({ sectionId: 'first', slug: 'details', focus: true, smooth: true });
  });
  assert.deepEqual(scrolls, [{ top: 900, behavior: 'smooth' }]);
  assert.equal(document.activeElement, document.querySelector('h2'));
  await act(async () => {
    reading.requestScroll({
      sectionId: 'first',
      slug: 'details',
      scrollY: 0,
      focus: false,
      smooth: false,
    });
  });
  assert.equal(scrollY, 0);
  assert.deepEqual(scrolls.at(-1), { top: 0, behavior: 'instant' });
});

test('a pending section scroll waits for the outgoing article to be replaced', async () => {
  scrollY = 900;
  await act(async () => browser.root.render(<Reader />));
  await act(async () => {
    reading.requestScroll({
      sectionId: 'second',
      slug: '',
      focus: true,
      smooth: false,
      onlyIfAbove: true,
    });
    browser.root.render(<Reader section="second" articleSection="first" />);
  });
  assert.deepEqual(scrolls, []);
  await act(async () => browser.root.render(<Reader section="second" />));
  assert.deepEqual(scrolls, [{ top: 160, behavior: 'instant' }]);
  assert.equal(document.activeElement?.textContent?.trim(), 'second');
});

test('selecting the current sidebar article preserves its hash, history, focus, and scroll', async () => {
  browser.window.history.replaceState(null, '', '/zh-CN/wiki?section=first');
  const section = {
    id: 'first',
    icon: 'BookOpen' as const,
    label: 'First',
    description: '',
    groupId: 'basics',
    groupLabel: 'Basics',
    groupOrder: 0,
    order: 0,
    access: 'public' as const,
  };
  await act(async () =>
    browser.root.render(
      <NextIntlClientProvider locale="zh-CN" timeZone="Asia/Singapore" messages={translations}>
        <WikiContent
          pageTitle="Wiki"
          navigation="Navigation"
          onThisPage="On this page"
          searchPlaceholder="Search"
          searchResultsLabel="Results"
          searchResultsCountTemplate="{count} results"
          searchEmptyTitle="Empty"
          searchEmptyDescription="No results"
          clearSearchLabel="Clear"
          sections={[section]}
          sectionGroups={[{ id: 'basics', label: 'Basics', sections: [section] }]}
          content={{ first: '# First' }}
          compiled={{}}
          outlines={{}}
          searchIndex={[]}
        />
      </NextIntlClientProvider>,
    ),
  );
  const link = document.querySelector<HTMLAnchorElement>('.wiki-page__navigation a');
  assert.ok(link);
  browser.window.history.replaceState(null, '', '/zh-CN/wiki?section=first#details');
  const historyLength = browser.window.history.length;
  scrollY = 900;
  link.focus();
  await act(async () => link.click());
  assert.deepEqual(scrolls, []);
  assert.equal(scrollY, 900);
  assert.equal(browser.window.location.hash, '#details');
  assert.equal(browser.window.history.length, historyLength);
  assert.equal(document.activeElement, link);
});

function DockedReader() {
  const [section, setSection] = useState('first');
  const sidebarRef = useRef<HTMLElement>(null);
  const { articleRef, requestScroll } = useWikiReading(section, outline, true);
  const changeSection = () => {
    const minScrollY = getWikiNavigationScrollMinimum(sidebarRef.current);
    const nextSection = section === 'first' ? 'second' : 'first';
    setSection(nextSection);
    requestScroll({
      sectionId: nextSection,
      slug: '',
      focus: true,
      smooth: false,
      onlyIfAbove: true,
      minScrollY,
    });
  };
  return (
    <div className="wiki-page__layout">
      <aside
        className="wiki-page__navigation"
        ref={sidebarRef}
        style={{ position: 'sticky', top: '80px', paddingTop: '8px' }}
      >
        <nav className="wiki-navigation__groups">
          <button type="button" onClick={changeSection}>
            Change article
          </button>
        </nav>
      </aside>
      <article
        key={section}
        ref={articleRef}
        className="wiki-markdown"
        data-section={section}
        data-docked-reader
      >
        <h1 className="wiki-markdown__h1" tabIndex={-1}>
          {section}
        </h1>
        <h2 id="details">Details</h2>
      </article>
    </div>
  );
}

test('scrolling down to dock the sidebar, switching articles, and scrolling again keep the same top gap', async () => {
  await act(async () => browser.root.render(<DockedReader />));
  const navigation = document.querySelector<HTMLElement>('.wiki-navigation__groups');
  const button = navigation?.querySelector('button');
  assert.ok(navigation && button);
  for (let index = 0; index < 3; index++) {
    scrollY = 900;
    browser.window.dispatchEvent(new browser.window.Event('scroll'));
    const before: number = navigation.getBoundingClientRect().top;
    assert.equal(before, 88);
    await act(async () => button.click());
    assert.equal(scrollY, 180, 'The article start must not scroll back past the docking point');
    assert.equal(navigation.getBoundingClientRect().top, before);
    scrollY += 50;
    browser.window.dispatchEvent(new browser.window.Event('scroll'));
    assert.equal(navigation.getBoundingClientRect().top, before);
  }
});

test('switching before the sidebar reaches its sticky position preserves normal flow', async () => {
  scrollY = 40;
  await act(async () => browser.root.render(<DockedReader />));
  const navigation = document.querySelector<HTMLElement>('.wiki-navigation__groups');
  const button = navigation?.querySelector('button');
  assert.ok(navigation && button);
  assert.equal(navigation.getBoundingClientRect().top, 228);
  await act(async () => button.click());
  assert.deepEqual(scrolls, []);
  assert.equal(scrollY, 40);
  scrollY += 50;
  assert.equal(navigation.getBoundingClientRect().top, 178);
});

test('hidden navigation and a sidebar pushed above its sticky line do not impose a scroll minimum', async () => {
  await act(async () => browser.root.render(<DockedReader />));
  const sidebar = document.querySelector<HTMLElement>('.wiki-page__navigation');
  assert.ok(sidebar);
  for (const rect of [
    new browser.window.DOMRect(0, 0, 0, 0),
    new browser.window.DOMRect(0, -40, 200, 400),
  ]) {
    sidebar.getBoundingClientRect = () => rect;
    assert.equal(getWikiNavigationScrollMinimum(sidebar), undefined);
  }
});
