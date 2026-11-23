import type { Sponsor } from '@/modules/sponsor/model/sponsor-types';

function orderTimeKey(at: string) {
  // Validated timestamps have fixed-width UTC seconds and optional fractional digits.
  const seconds = at.slice(0, 19);
  const fraction = at.slice(20, -1).replace(/0+$/, '');
  return seconds + fraction;
}

function compareNewestFirst(a: string, b: string) {
  if (a === b) return 0;
  return a < b ? 1 : -1;
}

export function createSponsorWall(entries: readonly Sponsor[]) {
  return entries
    .map(({ uuid, name, totalAmount, orders }) => {
      const sortedOrders = orders
        .map(({ at, message }, index) => ({ at, message, index, timeKey: orderTimeKey(at) }))
        .sort((a, b) => compareNewestFirst(a.timeKey, b.timeKey));
      const latestOrder = sortedOrders[0];
      return {
        latestOrderTimeKey: latestOrder.timeKey,
        sponsor: {
          uuid,
          name,
          totalAmount,
          latestOrderAt: latestOrder.at,
          messages: sortedOrders.flatMap(({ at, message, index }) =>
            message?.trim() ? [{ index, at, text: message }] : [],
          ),
        },
      };
    })
    .sort((a, b) => compareNewestFirst(a.latestOrderTimeKey, b.latestOrderTimeKey))
    .map(({ sponsor }) => sponsor);
}
