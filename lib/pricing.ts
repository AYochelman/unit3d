/** Quantity discount tiers. One definition so the configurator quote and the
 *  cart line always agree — editing the quantity in the cart re-applies this. */
export const BULK_MIN_QTY = 5;
export const BULK_RATE = 0.1;

export function bulkDiscount(qty: number): number {
  return qty >= BULK_MIN_QTY ? BULK_RATE : 0;
}

/** Line total for `qty` units at `unitPrice`, with the tier discount applied. */
export function lineTotal(unitPrice: number, qty: number): number {
  return Math.round(unitPrice * qty * (1 - bulkDiscount(qty)));
}

export const BULK_NOTE = `הנחת כמות ${Math.round(BULK_RATE * 100)}%`;
