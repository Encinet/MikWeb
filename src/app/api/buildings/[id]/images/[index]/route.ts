import { notFound } from 'next/navigation';
import { readBuildingImage } from '@/modules/building/server/building-image';
import { getBuilding } from '@/modules/building/server/building-queries';

export const dynamic = 'force-static';
export const revalidate = 86400;

export function generateStaticParams() {
  return [];
}

/** Only catalog IDs and image indices are accepted, never an arbitrary proxy URL. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; index: string }> },
) {
  const { id, index } = await params;
  if (!/^(0|[1-9]\d{0,3})$/.test(index)) notFound();
  const building = await getBuilding(id, revalidate);
  const url = building.images[Number(index)];
  if (!url) notFound();
  // Re-encode the registered image to a bounded JPEG; do not serve arbitrary upstream content.
  const image = await readBuildingImage(url);
  return new Response(new Uint8Array(image), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `inline; filename="${building.id}-${Number(index) + 1}.jpg"`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
