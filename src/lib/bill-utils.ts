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

/**
 * Format product pack size / unit for display in catalog cards
 * Examples:
 * - 75g (packetWeight: 75, packetUnit: 'g')
 * - 125g (packetWeight: 125, packetUnit: 'g')
 * - 4 Pack (variant: '4 Pack')
 * - 4+1 Free Pack (5 bars) (variant)
 * - 1kg (loose or packet 1kg)
 * - pc / pkt
 */
export function formatProductPackSize(p: {
  baseUnit?: string;
  baseQuantity?: number;
  packetWeight?: number | null;
  packetUnit?: string | null;
  variant?: string | null;
  unit?: string | null;
}): string {
  if (!p) return 'pc';
  if (p.packetWeight && p.packetWeight > 0 && p.packetUnit) {
    const pw = p.packetWeight;
    const pu = p.packetUnit.toLowerCase();
    if (pu === 'g' && pw >= 1000 && pw % 1000 === 0) {
      return `${pw / 1000}kg`;
    }
    if (pu === 'ml' && pw >= 1000 && pw % 1000 === 0) {
      return `${pw / 1000}l`;
    }
    return `${pw}${p.packetUnit}`;
  }
  if (p.variant) {
    return p.variant;
  }
  const bu = (p.baseUnit || p.unit || 'pc').toString().trim();
  const bq = Number(p.baseQuantity) || 1;
  if (['pkt', 'packet', 'pc', 'pcs', 'piece'].includes(bu.toLowerCase())) {
    return bq > 1 ? `${bq} ${bu}` : bu;
  }
  return bq > 1 ? `${bq}${bu}` : bu;
}
