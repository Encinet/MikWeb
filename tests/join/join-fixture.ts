import type { JoinPageData } from '@/modules/join/model/join-group';

export const joinPageData: JoinPageData = {
  groups: [
    { id: '1', number: '123456789', joinUrl: 'https://qm.qq.com/q/test-first' },
    { id: '2', number: null, joinUrl: 'https://qm.qq.com/q/test-second' },
  ],
  formUrl: 'https://docs.google.com/forms/d/e/test-form/viewform',
  captcha: { apiEndpoint: 'https://cap.example.test/test-site/' },
};
