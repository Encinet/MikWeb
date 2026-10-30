export const PCL2_HOMEPAGE_ROUTE = '/pcl2';

export function getPcl2HomepagePath(locale: string): string {
  return `/${locale}${PCL2_HOMEPAGE_ROUTE}`;
}
