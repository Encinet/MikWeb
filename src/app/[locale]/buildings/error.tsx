'use client';

import { BuildingRouteState } from '@/modules/building/ui/building-route-state';

export default function BuildingsError({ reset }: { reset: () => void }) {
  return <BuildingRouteState onRetry={reset} />;
}
