import { DATA_API_ORIGIN } from '@/shared/config/service-config';

const DATA_API_BASE_URL = `${DATA_API_ORIGIN}/api`;
export type DataApiPath = `/${string}`;

export function dataApiUrl(pathname: DataApiPath): string {
  return `${DATA_API_BASE_URL}${pathname}`;
}
