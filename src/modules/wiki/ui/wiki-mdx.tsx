'use client';

import type { Root } from 'hast';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { useMemo } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';

import { wikiMdxComponents } from '@/modules/wiki/ui/wiki-mdx-components';

export function WikiMdx({ article }: { article: Root }) {
  return useMemo(
    () => toJsxRuntime(article, { Fragment, jsx, jsxs, components: wikiMdxComponents }),
    [article],
  );
}
