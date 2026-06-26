const DATA_API_BASE_URL = 'https://data.mcmik.top/api';

export function dataApiUrl(pathname: string): string {
  return `${DATA_API_BASE_URL}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}
