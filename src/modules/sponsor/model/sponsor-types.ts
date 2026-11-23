/** MikData /api/sponsors wire types. The service is a public read-only API; no auth,
 * and its fields are already camelCase. The response is a bare array of sponsors. */
export interface SponsorOrderWire {
  /** Order id; `af:` prefixed rows come from Afdian, `mn:` from manual entries. */
  id: string;
  /** Paid amount of this order. */
  amount: string;
  /** The sponsor's message for this order. */
  remark: string;
  /** Unix seconds; 0 when the source could not parse the time. */
  at: number;
}

export interface SponsorRecordWire {
  /** Public identity: the Minecraft UUID. Unmapped Afdian sponsors do not appear. */
  uuid: string;
  name: string;
  /** Pre-discount cumulative total; manual entries may leave it out. */
  totalAmount?: string;
  /** Orders that carry a message, newest first. The key is omitted when empty. */
  orders?: SponsorOrderWire[];
}

/** Application-facing sponsor entry; wire rows are converted in the lib layer. */
export interface SponsorOrder {
  id: string;
  amount: string;
  remark: string;
  at: number;
}

export interface SponsorEntry {
  uuid: string;
  name: string;
  /** Pre-discount cumulative total; empty string when the source has no amount. */
  totalAmount: string;
  orders: SponsorOrder[];
  /** Most recent valid order time (unix seconds); null when the sponsor has no orders. */
  recentAt: number | null;
}
