import { mergeCommunityNotices } from '@/modules/community/lib/community-notices';
import { isCommunityBoardResponse } from '@/modules/community/model/community-notice-validation';
import { dataApiUrl } from '@/shared/api/data-api-url';
import { withRequestTimeout } from '@/shared/lib/request-timeout';

async function readNoticeResponse(path: string) {
  return withRequestTimeout(15_000, async (signal) => {
    const response = await fetch(dataApiUrl(path), { cache: 'no-store', signal });
    if (!response.ok) throw new Error('community_notices_unavailable');
    return (await response.json()) as unknown;
  });
}

/** A failed or mismatched deep link must not discard the recent notices. */
export async function loadCommunityNotices(targetId: string | null) {
  const data = await readNoticeResponse('/community/notices');
  if (!isCommunityBoardResponse(data)) throw new Error('invalid_response');
  const notices = mergeCommunityNotices(data.notices);
  if (!targetId || notices.some((entry) => entry.id.toLowerCase() === targetId)) return notices;
  try {
    const detail = await readNoticeResponse(`/community/notices/${encodeURIComponent(targetId)}`);
    if (detail && typeof detail === 'object' && 'notice' in detail) {
      const linked = { notices: [detail.notice] };
      if (isCommunityBoardResponse(linked) && linked.notices[0].id.toLowerCase() === targetId)
        return mergeCommunityNotices(notices, linked.notices[0]);
    }
  } catch {
    // Keep recent records available when a linked record cannot be fetched.
  }
  return notices;
}
