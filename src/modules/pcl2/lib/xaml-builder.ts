export type XamlAttributeValue = boolean | number | string | null | undefined;
export type XamlAttribute = readonly [name: string, value: XamlAttributeValue];
export type XamlAttributeList = readonly XamlAttribute[];

export interface XamlNode {
  attributes?: XamlAttributeList;
  children?: readonly XamlNode[];
  name: string;
}

const xmlEscapeMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

export function escapeXml(value: XamlAttributeValue): string {
  return String(value ?? '').replace(
    /[&<>"]/g,
    (character) => xmlEscapeMap[character] ?? character,
  );
}

export function xaml(
  name: string,
  attributes: XamlAttributeList = [],
  children: readonly XamlNode[] = [],
): XamlNode {
  return { attributes, children, name };
}

export function attr(name: string, value: XamlAttributeValue): XamlAttribute {
  return [name, value];
}

function formatAttributeValue(value: Exclude<XamlAttributeValue, null | undefined>): string {
  if (typeof value === 'boolean') {
    return value ? 'True' : 'False';
  }

  return String(value);
}

function renderAttributes(attributes: XamlAttributeList | undefined): string {
  if (!attributes) {
    return '';
  }

  return attributes
    .filter((entry): entry is readonly [string, Exclude<XamlAttributeValue, null | undefined>] => {
      return entry[1] !== null && entry[1] !== undefined;
    })
    .map(([key, value]) => `${key}="${escapeXml(formatAttributeValue(value))}"`)
    .join(' ');
}

export function renderXamlNode(node: XamlNode, depth = 0): string {
  const indent = '    '.repeat(depth);
  const attributes = renderAttributes(node.attributes);
  const startTag = attributes ? `${node.name} ${attributes}` : node.name;

  if (!node.children || node.children.length === 0) {
    return `${indent}<${startTag} />`;
  }

  return [
    `${indent}<${startTag}>`,
    ...node.children.map((child) => renderXamlNode(child, depth + 1)),
    `${indent}</${node.name}>`,
  ].join('\n');
}

export function renderXamlFragment(nodes: readonly XamlNode[]): string {
  return `${nodes.map((node) => renderXamlNode(node)).join('\n\n')}\n`;
}
