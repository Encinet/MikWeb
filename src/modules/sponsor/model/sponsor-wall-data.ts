import type { Sponsor } from '@/modules/sponsor/model/sponsor-types';

export function createSponsorWall(entries: readonly Sponsor[], locale: string) {
  const names = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
  return entries
    .map(({ uuid, name, totalAmount, orders }) => ({
      uuid,
      name,
      totalAmount,
      messages: orders.flatMap(({ at, message }, index) =>
        message?.trim() ? [{ index, at, text: message }] : [],
      ),
    }))
    .sort((a, b) => names.compare(a.name, b.name) || a.uuid.localeCompare(b.uuid));
}
