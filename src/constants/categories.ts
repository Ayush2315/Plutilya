// ─── Category Definitions ────────────────────────────────────────────
export interface CategoryDef {
  key: string;
  label: string;
  icon: string;
  color: string;
}

export const CATEGORIES: CategoryDef[] = [
  { key: 'food',          label: 'Food',          icon: '🍔', color: '#FF6B6B' },
  { key: 'shopping',      label: 'Shopping',      icon: '🛒', color: '#4ECDC4' },
  { key: 'travel',        label: 'Travel',        icon: '🚗', color: '#FFD93D' },
  { key: 'miscellaneous', label: 'Miscellaneous', icon: '📦', color: '#7C5CFC' },
];

export const CATEGORY_MAP: Record<string, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.key, c]),
);

// ─── Popular App Quick-Picks ─────────────────────────────────────────
export interface AppDef {
  key: string;
  label: string;
  emoji: string;
}

export const POPULAR_APPS: AppDef[] = [
  { key: 'zepto',    label: 'Zepto',    emoji: '⚡' },
  { key: 'blinkit',  label: 'Blinkit',  emoji: '🟡' },
  { key: 'swiggy',   label: 'Swiggy',   emoji: '🟠' },
  { key: 'zomato',   label: 'Zomato',   emoji: '🔴' },
  { key: 'amazon',   label: 'Amazon',   emoji: '📦' },
  { key: 'flipkart', label: 'Flipkart', emoji: '🛍️' },
  { key: 'uber',     label: 'Uber',     emoji: '🚕' },
  { key: 'rapido',   label: 'Rapido',   emoji: '🏍️' },
  { key: 'other',    label: 'Other',    emoji: '✏️' },
];
