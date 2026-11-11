import type { JoinPageData } from '@/modules/join/model/join-group';

export const joinPageData: JoinPageData = {
  groups: [
    { id: '1', number: '123456789', joinUrl: 'https://qm.qq.com/q/test-first' },
    { id: '2', number: null, joinUrl: 'https://qm.qq.com/q/test-second' },
  ],
  matrixUrl: 'https://matrix.to/#/#mikcasual:matrix.org',
  captcha: { apiEndpoint: 'https://cap.example.test/test-site/' },
};
