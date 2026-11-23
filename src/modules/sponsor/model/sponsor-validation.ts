import type { Sponsor, SponsorOrder } from '@/modules/sponsor/model/sponsor-types';
import { isRecord } from '@/shared/lib/is-record';

const UUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const AMOUNT_PATTERN = /^\d+\.\d{2}$/;
const UTC_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

function isAmount(value: unknown): value is `${number}` {
  return typeof value === 'string' && AMOUNT_PATTERN.test(value);
}

function isUtcTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !UTC_TIMESTAMP_PATTERN.test(value)) return false;
  const timestamp = new Date(value);
  // Date accepts some out-of-range dates by rolling them into the next month.
  return (
    Number.isFinite(timestamp.getTime()) &&
    timestamp.toISOString().slice(0, 19) === value.slice(0, 19)
  );
}

function isSponsorOrder(value: unknown): value is SponsorOrder {
  return (
    isRecord(value) &&
    isAmount(value.amount) &&
    isUtcTimestamp(value.at) &&
    (value.message === undefined || typeof value.message === 'string')
  );
}

function isSponsor(value: unknown): value is Sponsor {
  return (
    isRecord(value) &&
    typeof value.uuid === 'string' &&
    UUID_PATTERN.test(value.uuid) &&
    typeof value.name === 'string' &&
    isAmount(value.totalAmount) &&
    Array.isArray(value.orders) &&
    value.orders.length > 0 &&
    value.orders.every(isSponsorOrder)
  );
}

export function isSponsorArray(value: unknown): value is Sponsor[] {
  return Array.isArray(value) && value.every(isSponsor);
}
