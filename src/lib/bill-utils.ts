/**
 * Get the display label for a bill
 * Shows: Customer Name if exists, otherwise "Bill #1"
 */
export function getBillLabel(bill: any): string {
  const customerName = bill.customerName?.trim();
  if (customerName) {
    return customerName;
  }
  const billNum = bill.billNumber || 'N/A';
  return `Bill #${billNum}`;
}

/**
 * Get just the bill number for display
 * Shows: "Bill #1"
 */
export function getBillNumber(bill: any): string {
  const billNum = bill.billNumber || 'N/A';
  return `Bill #${billNum}`;
}

/**
 * Get the customer identifier
 * Alias for getBillLabel
 */
export function getBillIdentifier(bill: any): string {
  return getBillLabel(bill);
}
