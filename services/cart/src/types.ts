/** A cart line as stored in Postgres — sku + qty only; prices always come from catalog. */
export interface StoredLine {
  id: string;
  sku: string;
  qty: number;
  savedForLater: boolean;
  addedAt: string;
}

export interface SnapshotLine {
  sku: string;
  qty: number;
}
