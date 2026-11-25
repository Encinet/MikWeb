import type { Element, Nodes, Root } from 'hast';
import type { Paragraph } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';
import { defaultUrlTransform } from 'react-markdown';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import remarkRehype, { type Options } from 'remark-rehype';
import { unified } from 'unified';

const jsxAttributes: Record<string, readonly string[]> = {
  Callout: ['title', 'kind'],
  Card: ['title', 'href'],
  Cards: [],
  Definition: ['title', 'code'],
  Definitions: [],
  Details: ['title'],
  Step: ['title'],
  Steps: [],
  Tab: ['title', 'value'],
  Tabs: ['defaultValue'],
  WikiTable: [],
  a: ['href'],
  code: [],
  td: ['rowSpan'],
  th: ['rowSpan', 'scope'],
  tr: [],
  tbody: [],
  thead: [],
};

type Handler = NonNullable<Options['unknownHandler']>;

function wikiJsx(
  state: Parameters<Handler>[0],
  node: MdxJsxFlowElement | MdxJsxTextElement,
): Element {
  if (!node.name || !Object.hasOwn(jsxAttributes, node.name)) {
    const message = `Unsupported Wiki JSX element: ${node.name ?? 'fragment'}`;
    throw state.options.file?.fail(message, node) ?? new Error(message);
  }

  const properties: Record<string, string | boolean> = {};
  for (const attribute of node.attributes) {
    if (attribute.type === 'mdxJsxAttribute' && jsxAttributes[node.name].includes(attribute.name)) {
      // A bare JSX attribute means true; the Wiki only uses this for Definition.code.
      if (attribute.name === 'code' && attribute.value == null) {
        properties.code = true;
        continue;
      }
      if (attribute.name !== 'code' && typeof attribute.value === 'string') {
        properties[attribute.name] = attribute.value;
        continue;
      }
    }
    const message = `Unsupported Wiki JSX attribute on ${node.name}; use literal attributes`;
    throw state.options.file?.fail(message, attribute) ?? new Error(message);
  }

  return {
    type: 'element',
    tagName: node.name === 'WikiTable' ? 'table' : node.name,
    properties,
    children: state.all(node),
  };
}

function wikiParagraph(state: Parameters<Handler>[0], node: Paragraph): ReturnType<Handler> {
  // MDX treats a paragraph made up only of JSX as a block (for example, table rows).
  if (
    node.children.some((child) => child.type === 'mdxJsxTextElement') &&
    node.children.every(
      (child) =>
        child.type === 'mdxJsxTextElement' || (child.type === 'text' && !child.value.trim()),
    )
  ) {
    return state.all(node).filter((child) => child.type !== 'text' || child.value.trim());
  }
  return { type: 'element', tagName: 'p', properties: {}, children: state.all(node) };
}

function cleanArticleTree() {
  return (tree: Root) => {
    const visit = (node: Nodes) => {
      delete node.position;
      delete node.data;
      if (node.type === 'element') {
        for (const property of ['href', 'src']) {
          const value = node.properties[property];
          if (typeof value === 'string') node.properties[property] = defaultUrlTransform(value);
        }
      }
      if ('children' in node) for (const child of node.children) visit(child);
    };
    visit(tree);
  };
}

export const wikiMarkdownParser = unified().use(remarkParse).use(remarkMdx).use(remarkGfm).freeze();

const articleProcessor = wikiMarkdownParser()
  .use(remarkRehype, {
    handlers: { mdxJsxFlowElement: wikiJsx, mdxJsxTextElement: wikiJsx, paragraph: wikiParagraph },
    unknownHandler(state, node) {
      const message = `Unsupported Wiki syntax: ${node.type}`;
      throw state.options.file?.fail(message, node) ?? new Error(message);
    },
  })
  .use(rehypeSlug)
  .use(cleanArticleTree)
  .freeze();

export function parseWikiArticle(content: string, sourcePath: string) {
  const file = { value: content, path: sourcePath };
  return articleProcessor.runSync(articleProcessor.parse(file), file);
}
