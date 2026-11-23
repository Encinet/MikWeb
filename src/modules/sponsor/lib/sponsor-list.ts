import type {
  SponsorEntry,
  SponsorOrder,
  SponsorRecordWire,
} from '@/modules/sponsor/model/sponsor-types';

function toSponsorOrders(orders: SponsorRecordWire['orders']): SponsorOrder[] {
  return (orders ?? []).map((order) => ({
    amount: order.amount,
    at: order.at,
    id: order.id,
    remark: order.remark,
  }));
}

export function toSponsorEntries(records: SponsorRecordWire[]): SponsorEntry[] {
  return records.map((record) => {
    const orders = toSponsorOrders(record.orders);
    // Orders arrive newest-first, but only trust a valid timestamp: 0 means the
    // source could not parse it and must not beat real dates.
    const validAts = orders.map((order) => order.at).filter((at) => at > 0);
    return {
      uuid: record.uuid,
      name: record.name,
      totalAmount: record.totalAmount?.trim() ?? '',
      orders,
      recentAt: validAts.length > 0 ? Math.max(...validAts) : null,
    };
  });
}

/** Newest first by most recent valid order time; sponsors without any timestamp sink. */
export function sortSponsorEntries(entries: SponsorEntry[]): SponsorEntry[] {
  const byRecent = (entry: SponsorEntry): number =>
    entry.recentAt === null ? Number.NEGATIVE_INFINITY : entry.recentAt;
  return [...entries].sort(
    (left, right) => byRecent(right) - byRecent(left) || left.name.localeCompare(right.name),
  );
}

/** Convert and sort a bare /api/sponsors response in one step. */
export function toSortedSponsorEntries(records: SponsorRecordWire[]): SponsorEntry[] {
  return sortSponsorEntries(toSponsorEntries(records));
}
