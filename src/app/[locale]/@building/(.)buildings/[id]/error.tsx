'use client';

import { BuildingGalleryError } from '@/modules/building/ui/building-route-state';

export default function BuildingDialogError({ reset }: { reset: () => void }) {
  return <BuildingGalleryError onRetry={reset} />;
}
