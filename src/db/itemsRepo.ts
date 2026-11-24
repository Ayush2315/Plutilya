import * as SQLite from 'expo-sqlite';
import type { Expense, ExpenseItem, ExpenseSource } from '../types/models';
import type { AddExpenseInput } from './expensesRepo';
import type { ItemSuggestion } from '../constants/itemCatalog';

const DB_NAME = 'plutilya.db';

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  return SQLite.openDatabaseAsync(DB_NAME);
}

// ─── Item input for saving ───────────────────────────────────────────
export interface ItemInput {
  item_name: string;
  unit_price: number;
  quantity: number;
}

// ─── Save expense + items in one go ──────────────────────────────────
export async function saveExpenseWithItems(
  expenseInput: AddExpenseInput,
  items: ItemInput[],
): Promise<number> {
  const db = await getDb();
  const source: ExpenseSource = expenseInput.source ?? 'manual';

  const expResult = await db.runAsync(
    `INSERT INTO expenses (amount, merchant, category, app_name, source, timestamp, notes)
     VALUES (?, ?, ?, ?, ?, datetime('now'), ?)`,
    [
      expenseInput.amount,
      expenseInput.merchant,
      expenseInput.category,
      expenseInput.app_name ?? null,
      source,
      expenseInput.notes ?? null,
    ],
  );
  const expenseId = expResult.lastInsertRowId;

  for (const item of items) {
    await db.runAsync(
      `INSERT INTO expense_items (expense_id, item_name, unit_price, quantity)
       VALUES (?, ?, ?, ?)`,
      [expenseId, item.item_name, item.unit_price, item.quantity],
    );
  }

  return expenseId;
}

// ─── Get a single expense ────────────────────────────────────────────
export async function getExpenseById(id: number): Promise<Expense | null> {
  const db = await getDb();
  const rows = await db.getAllAsync<Expense>(
    `SELECT * FROM expenses WHERE id = ?`,
    [id],
  );
  return rows[0] ?? null;
}

// ─── Get items for an expense ────────────────────────────────────────
export async function getItemsByExpenseId(
  expenseId: number,
): Promise<ExpenseItem[]> {
  const db = await getDb();
  return db.getAllAsync<ExpenseItem>(
    `SELECT * FROM expense_items WHERE expense_id = ? ORDER BY id ASC`,
    [expenseId],
  );
}

// ─── Distinct past items for autocomplete ────────────────────────────
export async function getDistinctPastItems(): Promise<ItemSuggestion[]> {
  const db = await getDb();
  return db.getAllAsync<ItemSuggestion>(
    `SELECT item_name AS name, unit_price AS defaultPrice
     FROM expense_items
     GROUP BY item_name, unit_price
     ORDER BY MAX(id) DESC`,
  );
}
