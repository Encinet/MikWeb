import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildBuildingSubmissionDetails } from '@/modules/building-submission/lib/building-submission-payload';
import { createInitialBuildingSubmissionForm } from '@/modules/building-submission/model/building-submission-form';
import {
  isBuildingSubmissionCreateResponse,
  isBuildingSubmissionListResponse,
} from '@/modules/building-submission/model/building-submission-validation';

const form = {
  ...createInitialBuildingSubmissionForm(),
  nameZh: '建筑',
  nameEn: 'Building',
  descriptionZh: '建筑介绍',
  descriptionEn: 'Description',
  buildDate: '2026-11-06',
  x: '1',
  z: '2',
};
const builder = {
  name: 'Builder',
  uuid: '00000000-0000-4000-8000-000000000001',
  weight: 1,
};

test('submission details and history follow their respective contracts', () => {
  const details = buildBuildingSubmissionDetails(form, [builder], []);
  assert.equal('images' in details, false);
  assert.equal('id' in details, false);

  const submission = {
    id: 'a'.repeat(32),
    status: 'pending',
    name: details.name,
  };
  const playerUuid = builder.uuid;
  assert.equal(isBuildingSubmissionListResponse({ playerUuid, submissions: [submission] }), true);
  assert.equal(isBuildingSubmissionCreateResponse({ playerUuid, submission }), true);
  for (const response of [
    null,
    { playerUuid, submission: { ...submission, status: 'unknown' } },
    { playerUuid, submission: { ...submission, expiresAt: 'invalid' } },
    { submission },
  ])
    assert.equal(isBuildingSubmissionCreateResponse(response), false);
  const approved = { ...submission, status: 'approved' };
  assert.equal(isBuildingSubmissionListResponse({ playerUuid, submissions: [approved] }), true);
  assert.equal(isBuildingSubmissionListResponse({ submissions: [approved] }), false);
  assert.equal(
    isBuildingSubmissionListResponse({
      playerUuid,
      submissions: [{ ...approved, id: 'b'.repeat(16) }],
    }),
    false,
  );
});

test('submission preflight accepts a single-language tag or source note and checks dates and URLs', () => {
  const draft = { ...form, buildType: 'derivative' as const, sourceNoteEn: ' Original note ' };
  const details = buildBuildingSubmissionDetails(draft, [builder], [{ zh: '', en: 'Trail' }]);
  assert.deepEqual(details.tags, [{ 'zh-CN': '', en: 'Trail' }]);
  assert.deepEqual(details.source?.notes, { 'zh-CN': '', en: 'Original note' });
  assert.equal(buildBuildingSubmissionDetails({ ...draft, sourceNoteEn: '' }, [builder], []).source, undefined);
  assert.throws(
    () => buildBuildingSubmissionDetails({ ...draft, buildDate: '2026-02-30' }, [builder], []),
    /dateInvalid/,
  );
  assert.throws(
    () => buildBuildingSubmissionDetails({ ...draft, sourceLink: 'ftp://example.test/source' }, [builder], []),
    /sourceInvalid/,
  );
});
