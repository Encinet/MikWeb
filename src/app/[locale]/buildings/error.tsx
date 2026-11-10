'use client';

import { BuildingRouteState } from '@/modules/building/ui/building-route-state';

export default function BuildingsError({ retry }: { retry: () => void }) {
  return <BuildingRouteState onRetry={retry} />;
}
