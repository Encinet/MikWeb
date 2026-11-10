'use client';

import { BuildingGalleryError } from '@/modules/building/ui/building-route-state';

export default function BuildingDialogError({ retry }: { retry: () => void }) {
  return <BuildingGalleryError onRetry={retry} />;
}
