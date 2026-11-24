import 'server-only';

import type Sharp from 'sharp';

const sharp: typeof Sharp = require(/* turbopackIgnore: true */ 'sharp');

export default sharp;
