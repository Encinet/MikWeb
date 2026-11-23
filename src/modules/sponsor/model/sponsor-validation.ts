import type { SponsorOrderWire, SponsorRecordWire } from '@/modules/sponsor/model/sponsor-types';
import { isRecord } from '@/shared/lib/is-record';

function isSponsorOrderWire(value: unknown): value is SponsorOrderWire {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.amount === 'string' &&
    typeof value.remark === 'string' &&
    typeof value.at === 'number' &&
    Number.isFinite(value.at)
  );
}

/** A sponsor row. `uuid` and `name` are required; `totalAmount` and `orders` may be
 * omitted (orders is dropped entirely when the sponsor has no remarks). */
export function isSponsorRecordWire(value: unknown): value is SponsorRecordWire {
  if (!isRecord(value)) return false;
  return (
    typeof value.uuid === 'string' &&
    value.uuid.length > 0 &&
    typeof value.name === 'string' &&
    (value.totalAmount === undefined || typeof value.totalAmount === 'string') &&
    (value.orders === undefined ||
      (Array.isArray(value.orders) && value.orders.every(isSponsorOrderWire)))
  );
}

/** The public endpoint returns a bare array of sponsor records. */
export function isSponsorsArray(value: unknown): value is SponsorRecordWire[] {
  return Array.isArray(value) && value.every(isSponsorRecordWire);
}
