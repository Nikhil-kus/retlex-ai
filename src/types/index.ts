/**
 * src/types/index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared TypeScript interfaces for the entire application.
 *
 * Architecture note:
 *   All Firestore documents are typed here. Using `any` in page/API code is
 *   discouraged — import these types instead. This makes refactoring safe and
 *   IDE autocomplete useful.
 *
 *   Fields marked `| null` are explicitly nullable in Firestore.
 *   Fields marked `?` are optional (may not exist on older documents).
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Shop ─────────────────────────────────────────────────────────────────────

export interface Shop {
  id: string;
  name: string;
  mobile: string;
  address: string;
  qrCodeId: string;
  businessTypeId?: string | null;
  /** Embedded businessType object (denormalized for fast reads) */
  businessType?: { name: string } | null;
  /** ISO timestamp of creation */
  createdAt?: string;
}

// ── Product ───────────────────────────────────────────────────────────────────

export interface Product {
  id: string;
  shopId: string;
  name: string;
  localName: string | null;
  localAliases?: string[] | null;
  barcode: string | null;
  /** Selling price per baseUnit */
  price: number;
  costPrice: number;
  /** Unit of sale: "pc", "pkt", "kg", "g", "l", "ml" */
  baseUnit: string;
  /** Quantity per unit (e.g. 100g packet → baseQuantity: 100, baseUnit: "g") */
  baseQuantity: number;
  /** Weight of one packet (for loose items sold by weight) */
  packetWeight: number | null;
  packetUnit: string | null;
  category: string | null;
  imageUrl: string | null;
}

// ── Bill ──────────────────────────────────────────────────────────────────────

export interface BillItem {
  productId: string | null;
  name: string;
  localName: string | null;
  imageUrl: string | null;
  quantity: number;
  unit: string;
  sellingPrice: number;
  costPrice: number;
  total: number;
  packetWeight: number | null;
  packetUnit: string | null;
}

export interface Bill {
  id: string;
  shopId: string;
  billNumber: number;
  customerName: string | null;
  customerPhone: string | null;
  totalAmount: number;
  profit: number;
  status: 'PAID' | 'UNPAID';
  paymentMethod: string | null;
  orderStatus: 'PENDING' | 'COMPLETED';
  notes: string | null;
  items: BillItem[];
  /** ISO timestamp */
  createdAt: string;
  /** Firestore server timestamp — used for ordering */
  date?: any;
}

// ── Cart (client-side only, not stored in Firestore) ─────────────────────────

export interface CartItem {
  productId: string;
  name: string;
  localName: string | null;
  imageUrl: string | null;
  price: number;
  costPrice: number;
  unit: string;
  baseUnit: string;
  baseQuantity: number;
  packetWeight: number | null;
  packetUnit: string | null;
  quantity: number;
}

// ── Global Catalog ────────────────────────────────────────────────────────────

export interface GlobalCatalogProduct {
  id: string;
  name: string;
  localName: string | null;
  barcode: string | null;
  price: number;
  costPrice: number;
  baseUnit: string;
  baseQuantity: number;
  packetWeight: number | null;
  packetUnit: string | null;
  category: string | null;
  imageUrl: string | null;
  sourceShopId: string;
  createdAt: string;
  updatedAt: string;
}

// ── Business Type ─────────────────────────────────────────────────────────────

export interface BusinessTypeItem {
  id: string;
  name: string;
  baseUnit: string;
}

export interface BusinessType {
  id: string;
  name: string;
  items: BusinessTypeItem[];
}

// ── API Response helpers ──────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  details?: string;
}

export type ApiResponse<T> = T | ApiError;

/** Type guard: check if an API response is an error */
export function isApiError(res: any): res is ApiError {
  return res && typeof res.error === 'string';
}
