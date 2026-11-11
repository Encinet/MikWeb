import { readFile, writeFile } from 'node:fs/promises';
import en from '../messages/en.json';
import zhCN from '../messages/zh-CN.json';

// Root error boundaries must work without an intl provider. Extract only their
// messages so importing a fallback never bundles both complete catalogs.
const target = new URL('../src/site/error/lib/error-messages.generated.json', import.meta.url);
const output = `${JSON.stringify({ en: en.pageError, 'zh-CN': zhCN.pageError }, null, 2)}\n`;
if ((await readFile(target, 'utf8').catch(() => '')) !== output) {
  await writeFile(target, output);
}
