// ─── Expense Source ──────────────────────────────────────────────────
export type ExpenseSource = 'sms' | 'notification' | 'ocr' | 'manual';

// ─── Expenses ────────────────────────────────────────────────────────
export interface Expense {
  id: number;
  amount: number;
  merchant: string;
  app_name: string | null;
  category: string;
  source: ExpenseSource;
  timestamp: string; // ISO 8601
  notes: string | null;
}

// ─── Expense Items (line items on a receipt) ─────────────────────────
export interface ExpenseItem {
  id: number;
  expense_id: number;
  item_name: string;
  unit_price: number;
  quantity: number;
}

// ─── Friends ─────────────────────────────────────────────────────────
export interface Friend {
  id: number;
  name: string;
  phone_number: string | null;
}

// ─── Groups ──────────────────────────────────────────────────────────
export interface Group {
  id: number;
  name: string;
  created_at: string; // ISO 8601
}

// ─── Group Members (junction) ────────────────────────────────────────
export interface GroupMember {
  group_id: number;
  friend_id: number;
}

// ─── Item Splits ─────────────────────────────────────────────────────
export interface ItemSplit {
  id: number;
  expense_item_id: number;
  friend_id: number;
  share_quantity: number;
  share_amount: number;
  is_settled: boolean; // stored as INTEGER 0/1 in SQLite
}
