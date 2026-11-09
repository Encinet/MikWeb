'use client';

import { runSync } from '@mdx-js/mdx';
import { useMemo } from 'react';
import * as runtime from 'react/jsx-runtime';
import { wikiMdxComponents } from '@/modules/wiki/ui/wiki-mdx-components';

/** Only accepts code compiled from reviewed repository MDX by the server. */
export function WikiMdx({ code }: { code: string }) {
  const Content = useMemo(() => runSync(code, runtime).default, [code]);
  return <Content components={wikiMdxComponents} />;
}
