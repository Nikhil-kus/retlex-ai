/**
 * Lightweight sessionStorage cache for Firestore data.
 * Data lives for the browser session only — cleared on tab close.
 * Safe to use for shop info and product catalog which rarely change mid-session.
 *
 * persistentCatalogCache uses localStorage so it survives tab/app restarts.
 * Same 3-minute TTL — on cold open the stale-but-valid cache is shown
 * instantly while a background refresh runs if the data is near/past expiry.
 */

// ── Cache version — bump this string whenever the sort order or product schema
// changes so all existing browser/PWA caches are instantly invalidated.
const CACHE_VERSION = 'v2';

const SHOP_KEY = `cache_shop_${CACHE_VERSION}`;
const CATALOG_KEY = `cache_catalog_${CACHE_VERSION}`;
const CATALOG_SHOP_KEY = `cache_catalog_shopId_${CACHE_VERSION}`; // track which shop the catalog belongs to
const CATALOG_TS_KEY = `cache_catalog_ts_${CACHE_VERSION}`; // timestamp for TTL
const CATALOG_TTL_MS = 3 * 60 * 1000; // 3 minutes — ensures fresh baseUnit after product edits

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
      const ts = sessionStorage.getItem(CATALOG_TS_KEY);
      if (!ts || Date.now() - Number(ts) > CATALOG_TTL_MS) return null; // expired
      const raw = sessionStorage.getItem(CATALOG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  set(shopId: string, catalog: any[]) {
    try {
      sessionStorage.setItem(CATALOG_SHOP_KEY, shopId);
      sessionStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
      sessionStorage.setItem(CATALOG_TS_KEY, String(Date.now()));
    } catch {}
  },
  clear() {
    try {
      sessionStorage.removeItem(CATALOG_KEY);
      sessionStorage.removeItem(CATALOG_SHOP_KEY);
      sessionStorage.removeItem(CATALOG_TS_KEY);
    } catch {}
  },
};

// ── persistentCatalogCache ────────────────────────────────────────────────────
// Same TTL as catalogCache but stored in localStorage so it survives tab/app
// restarts. On a cold PWA open the caller should:
//   1. Serve the persistent cache immediately (zero network wait).
//   2. Kick off a background fetch and call persistentCatalogCache.set() once done.
// This does NOT replace catalogCache — it is an additional warm-start layer.

const PERSIST_CATALOG_KEY = `p_cache_catalog_${CACHE_VERSION}`;
const PERSIST_CATALOG_SHOP_KEY = `p_cache_catalog_shopId_${CACHE_VERSION}`;
const PERSIST_CATALOG_TS_KEY = `p_cache_catalog_ts_${CACHE_VERSION}`;
const PERSIST_CATALOG_TTL_MS = 3 * 60 * 1000; // 3 minutes — same as session cache

export const persistentCatalogCache = {
  get(shopId: string): any[] | null {
    try {
      const cachedShopId = localStorage.getItem(PERSIST_CATALOG_SHOP_KEY);
      if (cachedShopId !== shopId) return null;
      const ts = localStorage.getItem(PERSIST_CATALOG_TS_KEY);
      if (!ts || Date.now() - Number(ts) > PERSIST_CATALOG_TTL_MS) return null;
      const raw = localStorage.getItem(PERSIST_CATALOG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  /** Returns true if data exists for this shopId, even if it has expired. */
  getStale(shopId: string): any[] | null {
    try {
      const cachedShopId = localStorage.getItem(PERSIST_CATALOG_SHOP_KEY);
      if (cachedShopId !== shopId) return null;
      const raw = localStorage.getItem(PERSIST_CATALOG_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  isExpired(shopId: string): boolean {
    try {
      const cachedShopId = localStorage.getItem(PERSIST_CATALOG_SHOP_KEY);
      if (cachedShopId !== shopId) return true;
      const ts = localStorage.getItem(PERSIST_CATALOG_TS_KEY);
      return !ts || Date.now() - Number(ts) > PERSIST_CATALOG_TTL_MS;
    } catch { return true; }
  },
  set(shopId: string, catalog: any[]) {
    try {
      localStorage.setItem(PERSIST_CATALOG_SHOP_KEY, shopId);
      localStorage.setItem(PERSIST_CATALOG_KEY, JSON.stringify(catalog));
      localStorage.setItem(PERSIST_CATALOG_TS_KEY, String(Date.now()));
    } catch {}
  },
  clear() {
    try {
      localStorage.removeItem(PERSIST_CATALOG_KEY);
      localStorage.removeItem(PERSIST_CATALOG_SHOP_KEY);
      localStorage.removeItem(PERSIST_CATALOG_TS_KEY);
    } catch {}
  },
};

/**
 * Persistent voice keyword preferences (localStorage — survives tab close).
 * Keyed by shopId + spoken word so each shop has independent preferences.
 * When a shop owner long-presses a suggestion card, that product becomes
 * the default match for that spoken word in future voice sessions.
 */
export const voicePrefsCache = {
  _key(shopId: string, spokenWord: string) {
    return `voice_pref_${shopId}_${spokenWord.toLowerCase().trim()}`;
  },
  get(shopId: string, spokenWord: string): any | null {
    if (!shopId || !spokenWord) return null;
    try {
      const raw = localStorage.getItem(this._key(shopId, spokenWord));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  set(shopId: string, spokenWord: string, productOverride: any) {
    if (!shopId || !spokenWord) return;
    try {
      localStorage.setItem(this._key(shopId, spokenWord), JSON.stringify(productOverride));
    } catch {}
  },
  clear(shopId: string, spokenWord: string) {
    if (!shopId || !spokenWord) return;
    try { localStorage.removeItem(this._key(shopId, spokenWord)); } catch {}
  },
};
