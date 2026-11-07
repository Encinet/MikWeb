import 'server-only';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

interface SocialImageFont {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: 'normal';
}

let fontData: Promise<SocialImageFont[]> | undefined;

/** Local regular and bold CJK fonts, loaded only on the server. */
export function readSocialImageFonts() {
  fontData ??= Promise.all([
    readFile(join(process.cwd(), 'public/fonts/noto-sans-sc-regular.woff')),
    readFile(join(process.cwd(), 'public/fonts/noto-sans-sc-bold.woff')),
  ])
    .then<SocialImageFont[]>(([regular, bold]) => [
      { name: 'Noto Sans SC', data: regular, weight: 400, style: 'normal' },
      { name: 'Noto Sans SC', data: bold, weight: 700, style: 'normal' },
    ])
    .catch((error: unknown) => {
      fontData = undefined;
      throw error;
    });
  return fontData;
}
