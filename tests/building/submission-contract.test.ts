import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isBuilding } from '@/modules/building/model/building-types';
import { buildBuildingSubmissionPayload } from '@/modules/building-submission/lib/building-submission-payload';
import { createInitialBuildingSubmissionForm } from '@/modules/building-submission/model/building-submission-form';
import { isBuildingSubmissionListResponse } from '@/modules/building-submission/model/building-submission-types';

test('submission payloads remain separate from server-assigned building identities', () => {
  const builder = {
    name: 'Builder',
    uuid: '00000000-0000-4000-8000-000000000001',
    weight: 1,
  };
  const image = {
    url: 'https://i.ibb.co/example/building.webp',
    width: 1920,
    height: 1080,
    size: 120_000,
    mime: 'image/webp',
  };
  const payload = buildBuildingSubmissionPayload(
    {
      ...createInitialBuildingSubmissionForm(),
      nameZh: '建筑',
      nameEn: 'Building',
      descriptionZh: '建筑介绍',
      descriptionEn: 'Description',
      buildDate: '2026-11-06',
      x: '1',
      z: '2',
    },
    [builder],
    [],
    [image.url],
  );
  assert.equal('id' in payload, false);
  assert.equal(isBuilding(payload), false);

  const submission = {
    id: 'a'.repeat(32),
    status: 'pending',
    submitterUuid: builder.uuid,
    submitterName: builder.name,
    submitterRole: 'member',
    payload,
    images: [image],
    createdAt: '2026-11-06T00:00:00.000Z',
    updatedAt: '2026-11-06T00:00:00.000Z',
  };
  assert.equal(isBuildingSubmissionListResponse({ submissions: [submission] }), true);
  const building = { ...payload, id: 'b'.repeat(32) };
  assert.equal(isBuilding(building), true);
  assert.equal(isBuilding({ ...building, id: 'b'.repeat(16) }), false);
  const approved = { ...submission, status: 'approved', buildingId: building.id };
  assert.equal(isBuildingSubmissionListResponse({ submissions: [approved] }), true);
  assert.equal(
    isBuildingSubmissionListResponse({
      submissions: [{ ...approved, buildingId: 'b'.repeat(16) }],
    }),
    false,
  );
});
