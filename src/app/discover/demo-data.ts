// Presentation fixtures only. Never use these as connected retailer inventory.
export type DemoMode = 'shirts' | 'groceries';
export type DemoSort = 'price-asc' | 'price-desc' | 'distance';
export type DemoProduct = {
  id: string;
  name: string;
  detail: string;
  price: number;
  shop: number;
  image: string;
  stock: number;
};
export type DemoShop = {
  id: string;
  name: string;
  street: string;
  distance: number;
  image: string;
};

export const demoQueries: Record<DemoMode, string> = {
  shirts: 'White shirt near me at the lowest price',
  groceries: 'Fresh milk and brown bread near me',
};

export function resolveDemoQuery(value: string): DemoMode | null {
  const query = value.toLowerCase().replace(/\s+/g, ' ').trim();
  if (/white/.test(query) && /shirts?/.test(query)) return 'shirts';
  if (/milk/.test(query) && /brown\s+bread/.test(query)) return 'groceries';
  return null;
}

export const demoShops: Record<DemoMode, DemoShop[]> = {
  shirts: [
    { id: 'cotton-house', name: 'The Cotton House', street: 'Market Road', distance: 0.4, image: '/discover/shop-fashion-1.webp' },
    { id: 'urban-thread', name: 'Urban Thread', street: 'High Street', distance: 0.8, image: '/discover/shop-fashion-2.webp' },
    { id: 'everyday-menswear', name: 'Everyday Menswear', street: 'Station Road', distance: 1.2, image: '/discover/shop-fashion-3.jpg' },
  ],
  groceries: [
    { id: 'sharma-fresh', name: 'Sharma Fresh Mart', street: 'Market Road', distance: 0.3, image: '/discover/shop-grocery-1.jpeg' },
    { id: 'daily-basket', name: 'Daily Basket', street: 'High Street', distance: 0.6, image: '/discover/shop-grocery-2.webp' },
    { id: 'gupta-general', name: 'Gupta General Store', street: 'Station Road', distance: 1.1, image: '/discover/shop-grocery-3.jpg' },
  ],
};

const shirts: DemoProduct[] = [
  { id: 'cotton', name: 'Everyday cotton shirt', detail: 'White · Regular fit · S–XL', price: 399, shop: 0, image: '/discover/shirt-cotton.jpg', stock: 6 },
  { id: 'oxford', name: 'Classic Oxford shirt', detail: 'White · Regular fit · M–XL', price: 549, shop: 2, image: '/discover/shirt-oxford.jpg', stock: 4 },
  { id: 'essential', name: 'Essential white shirt', detail: 'White · Slim fit · S–L', price: 599, shop: 1, image: '/discover/shirt-essential.jpg', stock: 8 },
  { id: 'casual', name: 'Soft cotton casual shirt', detail: 'White · Relaxed fit · M–XL', price: 649, shop: 0, image: '/discover/shirt-casual.jpg', stock: 3 },
  { id: 'textured', name: 'Textured white shirt', detail: 'White · Regular fit · S–L', price: 749, shop: 2, image: '/discover/shirt-textured.jpg', stock: 5 },
  { id: 'premium', name: 'Premium white shirt', detail: 'White · Relaxed fit · M–XL', price: 899, shop: 1, image: '/discover/shirt-premium.jpg', stock: 2 },
];

const groceryCatalog = [
  { id: 'amul', name: 'Amul Taaza milk', detail: 'Toned milk · 500 ml', price: 28, image: '/discover/amul.jpg', stock: 18 },
  { id: 'sanchi', name: 'Sanchi Taaza milk', detail: 'Toned milk · 500 ml', price: 27, image: '/discover/sanchi.jpg', stock: 12 },
  { id: 'bread-200', name: 'Brown bread', detail: 'Whole wheat · 200 g', price: 25, image: '/discover/bread-200.png', stock: 8 },
  { id: 'bread-400', name: 'Brown bread', detail: 'Whole wheat · 400 g', price: 45, image: '/discover/bread-400.png', stock: 5 },
];

export function getDemoProducts(mode: DemoMode, selectedShop: number | null, sort: DemoSort = 'price-asc'): DemoProduct[] {
  const products = mode === 'shirts'
    ? shirts.filter(product => selectedShop === null || product.shop === selectedShop)
    : selectedShop === null ? [] : groceryCatalog.map((product, index) => ({
      ...product,
      shop: selectedShop,
      price: product.price + (selectedShop === 2 ? 2 : 0),
      stock: selectedShop === 1 && index === 1 ? 0 : Math.max(1, product.stock - selectedShop * 2),
    }));
  return [...products].sort((a, b) => sort === 'distance'
    ? demoShops[mode][a.shop].distance - demoShops[mode][b.shop].distance || a.price - b.price
    : sort === 'price-desc' ? b.price - a.price : a.price - b.price);
}
