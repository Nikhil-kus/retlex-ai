/**
 * Lightweight sessionStorage cache for Firestore data.
 * Data lives for the browser session only — cleared on tab close.
 * Safe to use for shop info and product catalog which rarely change mid-session.
 */

const SHOP_KEY = 'cache_shop';
const CATALOG_KEY = 'cache_catalog';
const CATALOG_SHOP_KEY = 'cache_catalog_shopId'; // track which shop the catalog belongs to

export const shopCache = {
  get(): any | null {
    try {
      const raw = sessionStorage.getItem(SHOP_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  set(shop: any) {
    try { sessionStorage.setItem(SHOP_KEY, JSON.stringify(shop)); } catch {}
  },
  clear() {
    try { sessionStorage.removeItem(SHOP_KEY); } catch {}
  },
};

export const catalogCache = {
  get(shopId: string): any[] | null {
    try {
      const cachedShopId = sessionStorage.getItem(CATALOG_SHOP_KEY);
      if (cachedShopId !== shopId) return null; // different shop, ignore
      const raw = sessionStorage.getItem(CATALOG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  set(shopId: string, catalog: any[]) {
    try {
      sessionStorage.setItem(CATALOG_SHOP_KEY, shopId);
      sessionStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
    } catch {}
  },
  clear() {
    try {
      sessionStorage.removeItem(CATALOG_KEY);
      sessionStorage.removeItem(CATALOG_SHOP_KEY);
    } catch {}
  },
};
