import { BuildingsProvider } from '@/modules/building/model/buildings-provider';
import BuildingsPage from '@/modules/building/ui/buildings-page';

export default function Page() {
  return (
    <BuildingsProvider>
      <BuildingsPage />
    </BuildingsProvider>
  );
}
