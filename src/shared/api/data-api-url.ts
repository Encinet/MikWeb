import { DATA_API_ORIGIN } from '@/shared/config/service-config';

const DATA_API_BASE_URL = `${DATA_API_ORIGIN}/api`;

export function dataApiUrl(pathname: string): string {
  return `${DATA_API_BASE_URL}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}
