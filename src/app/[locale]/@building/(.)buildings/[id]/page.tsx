import { BuildingDetailPage } from '@/site/pages/building-detail-page';

export { generateBuildingMetadata as generateMetadata } from '@/site/seo/build-building-metadata';

export default function Page({ params }: { params: Promise<{ locale: string; id: string }> }) {
  return <BuildingDetailPage params={params} modal />;
}
