interface BillDisplayData {
  customerName?: string | null;
  createdAt?: unknown;
  date?: unknown;
}

/** Read current ISO dates and older Firestore timestamp representations. */
export function getBillDate(bill: BillDisplayData): Date | null {
  for (const value of [bill.createdAt, bill.date]) {
    let date: Date | undefined;
    if (value instanceof Date) date = value;
    else if (typeof value === 'string' || typeof value === 'number') date = new Date(value);
    else if (value && typeof value === 'object') {
      if ('toDate' in value && typeof value.toDate === 'function') date = value.toDate();
      else {
        const seconds = 'seconds' in value ? value.seconds : '_seconds' in value ? value._seconds : undefined;
        if (typeof seconds === 'number') date = new Date(seconds * 1000);
      }
    }
    if (date instanceof Date && !Number.isNaN(date.getTime())) return date;
  }
  return null;
}

/** Bill card title: customer name when entered, otherwise the bill's time. */
export function getBillLabel(bill: BillDisplayData): string {
  const customerName = bill.customerName?.trim();
  if (customerName) {
    return customerName;
  }
  return getBillDate(bill)?.toLocaleTimeString('en-IN', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).toUpperCase() || 'Time unavailable';
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
