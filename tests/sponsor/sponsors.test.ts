import assert from 'node:assert/strict';
import { test } from 'node:test';
import { toSortedSponsorEntries, toSponsorEntries } from '@/modules/sponsor/lib/sponsor-list';
import type {
  SponsorRecordWire,
} from '@/modules/sponsor/model/sponsor-types';
import { isSponsorRecordWire, isSponsorsArray } from '@/modules/sponsor/model/sponsor-validation';

const records: SponsorRecordWire[] = [
  {
    uuid: '069a79f4-44e9-4726-a5be-fca4e82d3858',
    name: 'Hee',
    totalAmount: '128.00',
    orders: [
      { id: 'af:1', remark: '二周年快乐', amount: '98.00', at: 1769909459 },
      { id: 'af:2', remark: '支持服务器！', amount: '30.00', at: 1624455517 },
    ],
  },
  {
    uuid: '11111111-2222-4333-8444-555566667777',
    name: '某位朋友',
    orders: [{ id: 'mn:1', remark: '感谢转账支持', amount: '50', at: 1752950400 }],
  },
  // Orders may be omitted entirely by the service when a sponsor has no remarks.
  { uuid: '22222222-3333-4444-5555-666677778888', name: '沉默赞助者', totalAmount: '10.00' },
  {
    uuid: '33333333-4444-5555-6666-777788889999',
    name: '坏时间戳',
    orders: [{ id: 'mn:2', remark: '无法解析时间', amount: '1', at: 0 }],
  },
];

test('wire records convert to application state without leaking wire fields', () => {
  const entries = toSponsorEntries(records);
  assert.deepEqual(entries, [
    {
      uuid: '069a79f4-44e9-4726-a5be-fca4e82d3858',
      name: 'Hee',
      totalAmount: '128.00',
      orders: [
        { id: 'af:1', remark: '二周年快乐', amount: '98.00', at: 1769909459 },
        { id: 'af:2', remark: '支持服务器！', amount: '30.00', at: 1624455517 },
      ],
      recentAt: 1769909459,
    },
    {
      uuid: '11111111-2222-4333-8444-555566667777',
      name: '某位朋友',
      totalAmount: '',
      orders: [{ id: 'mn:1', remark: '感谢转账支持', amount: '50', at: 1752950400 }],
      recentAt: 1752950400,
    },
    {
      uuid: '22222222-3333-4444-5555-666677778888',
      name: '沉默赞助者',
      totalAmount: '10.00',
      orders: [],
      recentAt: null,
    },
    {
      uuid: '33333333-4444-5555-6666-777788889999',
      name: '坏时间戳',
      totalAmount: '',
      orders: [{ id: 'mn:2', remark: '无法解析时间', amount: '1', at: 0 }],
      recentAt: null,
    },
  ]);
});

test('entries sort newest first with remark-less sponsors sinking', () => {
  const entries = toSortedSponsorEntries(records);
  assert.deepEqual(entries.map((entry) => entry.name), [
    'Hee',
    '某位朋友',
    '沉默赞助者',
    '坏时间戳',
  ]);
});

test('sorting is stable by name when timestamps tie', () => {
  const tied: SponsorRecordWire[] = [
    {
      uuid: '11111111-2222-4333-8444-555566667777',
      name: 'Zoe',
      orders: [{ id: 'o1', remark: '', amount: '1', at: 100 }],
    },
    {
      uuid: '22222222-3333-4444-5555-666677778888',
      name: 'Amy',
      orders: [{ id: 'o2', remark: '', amount: '1', at: 100 }],
    },
  ];
  const entries = toSortedSponsorEntries(tied);
  assert.deepEqual(entries.map((entry) => entry.name), ['Amy', 'Zoe']);
});

test('response validators accept and reject', () => {
  assert.equal(isSponsorsArray(records), true);
  // Omitted totalAmount and orders are both legal.
  assert.equal(isSponsorsArray([{ uuid: 'u', name: 'n' }]), true);

  const record: SponsorRecordWire = {
    uuid: 'x',
    name: 'x',
    orders: [{ id: 'o', remark: '', amount: '1', at: 1 }],
  };
  assert.equal(isSponsorRecordWire(record), true);
  assert.equal(isSponsorsArray([]), true);

  assert.equal(isSponsorsArray({ uuid: 'x', name: 'x' }), false);
  assert.equal(
    isSponsorsArray([{ uuid: '', name: 'x' }]),
    false,
  );
  assert.equal(
    isSponsorRecordWire({ ...record, orders: [{ id: 'o', remark: '', amount: '1', at: '1' }] }),
    false,
  );
});
