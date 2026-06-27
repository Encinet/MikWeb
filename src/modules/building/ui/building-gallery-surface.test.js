import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const buildingsPage = readFileSync('src/modules/building/ui/buildings-page.tsx', 'utf8');
const globalsCss = readFileSync('src/app/globals.css', 'utf8');

function readCssCustomProperty(css, propertyName) {
  const escapedName = propertyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escapedName}:\\s*([^;]+);`));
  return match?.[1]?.trim();
}

test('buildings page does not use legacy surface names', () => {
  assert.equal(buildingsPage.includes('BuildingArchiveHeader'), false);
  assert.equal(buildingsPage.includes('buildBuildingArchiveSummary'), false);
  assert.equal(buildingsPage.includes('content-page-hero building-gallery-hero'), false);
  assert.equal(globalsCss.includes('.building-archive-header'), false);
  assert.equal(globalsCss.includes('.building-archive-card'), true);
});

test('building detail modal layer is defined above site chrome and theme transitions', () => {
  const modalLayer = Number(readCssCustomProperty(globalsCss, '--z-modal'));
  const dropdownLayer = Number(readCssCustomProperty(globalsCss, '--z-dropdown'));
  const viewTransitionLayer = Number(readCssCustomProperty(globalsCss, '--z-view-transition'));

  assert.ok(Number.isFinite(modalLayer), '--z-modal should be a numeric layer token');
  assert.ok(Number.isFinite(dropdownLayer), '--z-dropdown should be a numeric layer token');
  assert.ok(
    Number.isFinite(viewTransitionLayer),
    '--z-view-transition should be a numeric layer token',
  );
  assert.ok(
    modalLayer > dropdownLayer,
    'modal layer should appear above dropdowns and theme controls',
  );
  assert.ok(modalLayer > viewTransitionLayer, 'modal layer should appear above theme transitions');
  assert.match(globalsCss, /\.building-archive-overlay\s*{[^}]*z-index:\s*var\(--z-modal\)/s);
  assert.match(
    globalsCss,
    /::view-transition-new\(root\)\s*{[^}]*z-index:\s*var\(--z-view-transition\)/s,
  );
});
test('building archive redesign uses clean page and dialog structure', () => {
  const buildingCard = readFileSync('src/modules/building/ui/building-card.tsx', 'utf8');
  const buildingDialog = readFileSync(
    'src/modules/building/ui/building-details-dialog.tsx',
    'utf8',
  );

  assert.equal(buildingsPage.includes('content-page-hero building-gallery-hero'), false);
  assert.equal(buildingsPage.includes('BuildingArchiveHero'), false);
  assert.equal(buildingsPage.includes('featuredBuildings'), false);
  assert.equal(buildingCard.includes('building-archive-card'), true);
  assert.equal(buildingCard.includes('building-gallery-card'), false);
  assert.equal(buildingDialog.includes('building-archive-overlay'), true);
  assert.equal(buildingDialog.includes('building-detail-window'), false);
  assert.equal(globalsCss.includes('.building-archive-hero'), false);
  assert.equal(globalsCss.includes('.building-gallery-card'), false);
  assert.equal(globalsCss.includes('.building-catalog-controls'), true);
});
