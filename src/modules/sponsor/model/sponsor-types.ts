export interface SponsorOrder {
  amount: `${number}`;
  at: string;
  message?: string;
}

/** Sponsor from a usable snapshot. The API can omit totals in partial responses. */
export interface Sponsor {
  uuid: string;
  name: string;
  totalAmount: `${number}`;
  orders: [SponsorOrder, ...SponsorOrder[]];
}
