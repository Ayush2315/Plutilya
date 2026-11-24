// ─── Item Catalog Entry ──────────────────────────────────────────────
export interface CatalogItem {
  name: string;
  defaultPrice: number;
  category: string;
}

export const ITEM_CATALOG: CatalogItem[] = [
  // Snacks & Chips
  { name: 'Lays Classic Salted', defaultPrice: 20, category: 'food' },
  { name: "Lays India's Magic Masala", defaultPrice: 20, category: 'food' },
  { name: 'Kurkure Masala Munch', defaultPrice: 20, category: 'food' },
  { name: 'Bingo Mad Angles', defaultPrice: 20, category: 'food' },
  { name: 'Haldirams Aloo Bhujia', defaultPrice: 55, category: 'food' },

  // Chocolates & Sweets
  { name: 'Cadbury Dairy Milk Silk', defaultPrice: 80, category: 'food' },
  { name: 'KitKat', defaultPrice: 20, category: 'food' },
  { name: '5 Star', defaultPrice: 20, category: 'food' },
  { name: 'Hide & Seek Biscuit', defaultPrice: 30, category: 'food' },
  { name: 'Oreo', defaultPrice: 30, category: 'food' },

  // Beverages
  { name: 'Coca-Cola 750ml', defaultPrice: 40, category: 'food' },
  { name: 'Thumbs Up 750ml', defaultPrice: 40, category: 'food' },
  { name: 'Sprite 750ml', defaultPrice: 40, category: 'food' },
  { name: 'Red Bull 250ml', defaultPrice: 125, category: 'food' },
  { name: 'Sting Energy Drink', defaultPrice: 20, category: 'food' },
  { name: 'Paper Boat Aam Panna', defaultPrice: 30, category: 'food' },
  { name: 'Cold Coffee', defaultPrice: 120, category: 'food' },
  { name: 'Chai (Cutting)', defaultPrice: 15, category: 'food' },

  // Instant & Staples
  { name: 'Maggi 2-Min Noodles', defaultPrice: 14, category: 'food' },
  { name: 'Amul Taaza Milk 500ml', defaultPrice: 27, category: 'food' },
  { name: 'Brown Bread', defaultPrice: 50, category: 'food' },
  { name: 'Eggs (6 pack)', defaultPrice: 55, category: 'food' },
  { name: 'Paneer 200g', defaultPrice: 95, category: 'food' },
  { name: 'Curd 400g', defaultPrice: 40, category: 'food' },
  { name: 'Atta 1kg', defaultPrice: 55, category: 'food' },

  // Prepared Food
  { name: 'Veg Biryani', defaultPrice: 220, category: 'food' },
  { name: 'Margherita Pizza', defaultPrice: 199, category: 'food' },
  { name: 'Chicken Tikka Roll', defaultPrice: 150, category: 'food' },
  { name: 'Masala Dosa', defaultPrice: 80, category: 'food' },
  { name: 'Vada Pav', defaultPrice: 25, category: 'food' },
  { name: 'Samosa (2 pcs)', defaultPrice: 30, category: 'food' },

  // Fees & Misc
  { name: 'Delivery & Handling Fee', defaultPrice: 35, category: 'miscellaneous' },
  { name: 'Platform Fee', defaultPrice: 5, category: 'miscellaneous' },
  { name: 'Packing Charges', defaultPrice: 20, category: 'miscellaneous' },
  { name: 'Tip', defaultPrice: 20, category: 'miscellaneous' },
];

// ─── Autocomplete helper ─────────────────────────────────────────────
export interface ItemSuggestion {
  name: string;
  defaultPrice: number;
}

/**
 * Returns up to `limit` suggestions matching `query`, prioritizing
 * pastItems (user history) over the built-in catalog. De-duplicates by
 * lowercase name.
 */
export function searchItemSuggestions(
  query: string,
  pastItems: ItemSuggestion[],
  limit = 6,
): ItemSuggestion[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const seen = new Set<string>();
  const results: ItemSuggestion[] = [];

  // Past items first (personalised)
  for (const item of pastItems) {
    if (results.length >= limit) break;
    const key = item.name.toLowerCase();
    if (key.includes(q) && !seen.has(key)) {
      seen.add(key);
      results.push(item);
    }
  }

  // Then catalog
  for (const item of ITEM_CATALOG) {
    if (results.length >= limit) break;
    const key = item.name.toLowerCase();
    if (key.includes(q) && !seen.has(key)) {
      seen.add(key);
      results.push({ name: item.name, defaultPrice: item.defaultPrice });
    }
  }

  return results;
}
