import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../src/modules/chat/', import.meta.url));
const files = readdirSync(root, { recursive: true, encoding: 'utf8' })
  .filter((path) => /\.tsx?$/u.test(path))
  .map((path) => path.replaceAll('\\', '/'));
const paths = new Set(files);
const imports = new Map(
  files.map((path) => [
    path,
    Array.from(
      readFileSync(join(root, path), 'utf8').matchAll(
        /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?)['"]([^'"]+)['"]/gu,
      ),
      (match) => match[1],
    ),
  ]),
);

function localDependency(source: string, target: string): string | undefined {
  const relative = target.startsWith('@/modules/chat/')
    ? target.slice('@/modules/chat/'.length)
    : target.startsWith('.')
      ? posix.normalize(posix.join(posix.dirname(source), target))
      : undefined;
  if (!relative) return;
  return [`${relative}.ts`, `${relative}.tsx`, `${relative}/index.ts`].find((path) =>
    paths.has(path),
  );
}

const graph = new Map(
  files.map((path) => [
    path,
    (imports.get(path) ?? []).flatMap((target) => localDependency(path, target) ?? []),
  ]),
);

test('chat models, adapters and UI preserve their dependency boundaries', () => {
  for (const [source, targets] of imports) {
    const pureModel =
      source.startsWith('model/') &&
      source.endsWith('.ts') &&
      !posix.basename(source).startsWith('use-');
    const adapter = source.startsWith('lib/');
    if (pureModel || adapter) {
      assert.ok(
        targets.every(
          (target) =>
            !/^(?:react(?:-dom)?|next(?:-intl)?)(?:\/|$)/u.test(target) &&
            !/(?:^|\/)(?:ui\/|use-[^/]+$)/u.test(target),
        ),
        `${source} must remain independent of UI frameworks, components and state hooks`,
      );
    }
    for (const target of graph.get(source) ?? []) {
      if (pureModel) {
        assert.ok(
          target.startsWith('model/') && !posix.basename(target).startsWith('use-'),
          `${source} must depend only on domain models: ${target}`,
        );
      }
      if (adapter) {
        assert.ok(
          !target.startsWith('ui/') && !target.startsWith('model/use-'),
          `${source} must not depend on UI or state hooks: ${target}`,
        );
      }
      if (source.startsWith('lib/connection/')) {
        assert.ok(
          target.startsWith('lib/connection/') || target.startsWith('model/'),
          `${source} must not take ownership of storage or notifications: ${target}`,
        );
      }
      if (source.startsWith('ui/')) {
        assert.ok(
          !target.startsWith('lib/connection/') && !target.startsWith('lib/chat-history'),
          `${source} must use state hooks for connections and persistence: ${target}`,
        );
      }
    }
  }
});

test('chat source imports remain acyclic, including domain type imports', () => {
  const visited = new Set<string>();
  const stack = new Set<string>();
  function visit(source: string) {
    assert.ok(!stack.has(source), `Chat dependency cycle: ${[...stack, source].join(' -> ')}`);
    if (visited.has(source)) return;
    stack.add(source);
    for (const target of graph.get(source) ?? []) visit(target);
    stack.delete(source);
    visited.add(source);
  }
  for (const source of graph.keys()) visit(source);
});
