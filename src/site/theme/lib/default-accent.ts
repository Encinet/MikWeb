import 'server-only';

import { DEFAULT_ACCENT_COLOR } from '@/shared/config/theme-config';
import { getAccentProperties } from '@/site/theme/lib/accent-color';

export const DEFAULT_ACCENT_PROPERTIES = getAccentProperties(DEFAULT_ACCENT_COLOR);
