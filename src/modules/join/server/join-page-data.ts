import 'server-only';
import type { JoinPageData } from '@/modules/join/model/join-group';
import { JOIN_GROUP_IDS } from '@/modules/join/model/join-group';
import { getJoinCaptchaConfig } from '@/modules/join/server/join-captcha';

function publicUrl(value: string | undefined): string | null {
  try {
    const url = new URL(value?.trim() ?? '');
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function getJoinPageData(): JoinPageData {
  return {
    captcha: getJoinCaptchaConfig(),
    groups: JOIN_GROUP_IDS.flatMap((id) => {
      const joinUrl = publicUrl(process.env[`QQ_GROUP_${id}_JOIN_URL`]);
      return joinUrl
        ? [{ id, number: process.env[`QQ_GROUP_${id}_NUMBER`]?.trim() || null, joinUrl }]
        : [];
    }),
    matrixUrl: publicUrl(process.env.MATRIX_JOIN_URL),
  };
}
