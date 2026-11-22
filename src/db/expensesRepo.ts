import * as SQLite from 'expo-sqlite';
import type { Expense, ExpenseSource } from '../types/models';

const DB_NAME = 'plutilya.db';

/** Lazily resolved handle — same underlying connection opened in schema.ts. */
async function getDb(): Promise<SQLite.SQLiteDatabase> {
  return SQLite.openDatabaseAsync(DB_NAME);
}

// ─── Input type for expense creation ─────────────────────────────────
export interface AddExpenseInput {
  amount: number;
  merchant: string;
  category: string;
  app_name?: string | null;
  notes?: string | null;
  source?: ExpenseSource;
}

// ─── Summary row returned by getCategorySummary ──────────────────────
export interface CategorySummaryRow {
  category: string;
  total: number;
  count: number;
}

// ─── App breakdown row ───────────────────────────────────────────────
export interface AppBreakdownRow {
  app_name: string | null;
  total: number;
  count: number;
}

// ─── CRUD Functions ──────────────────────────────────────────────────

/** Insert an expense and return its new id. Source defaults to 'manual'. */
export async function addExpense(input: AddExpenseInput): Promise<number> {
  const db = await getDb();
  const source: ExpenseSource = input.source ?? 'manual';
  const result = await db.runAsync(
    `INSERT INTO expenses (amount, merchant, category, app_name, source, timestamp, notes)
     VALUES (?, ?, ?, ?, ?, datetime('now'), ?)`,
    [
      input.amount,
      input.merchant,
      input.category,
      input.app_name ?? null,
      source,
      input.notes ?? null,
    ],
  );
  return result.lastInsertRowId;
}

/**
 * Total amount + count per category.
 * Pass monthFilter as 'YYYY-MM' to restrict to a single month.
 */
export async function getCategorySummary(
  monthFilter?: string,
): Promise<CategorySummaryRow[]> {
  const db = await getDb();
  if (monthFilter) {
    return db.getAllAsync<CategorySummaryRow>(
      `SELECT category,
              COALESCE(SUM(amount), 0) AS total,
              COUNT(*) AS count
       FROM expenses
       WHERE strftime('%Y-%m', timestamp) = ?
       GROUP BY category`,
      [monthFilter],
    );
  }
  return db.getAllAsync<CategorySummaryRow>(
    `SELECT category,
            COALESCE(SUM(amount), 0) AS total,
            COUNT(*) AS count
     FROM expenses
     GROUP BY category`,
  );
}

/** All expenses in a category, newest first. */
export async function getExpensesByCategory(
  category: string,
): Promise<Expense[]> {
  const db = await getDb();
  return db.getAllAsync<Expense>(
    `SELECT * FROM expenses WHERE category = ? ORDER BY timestamp DESC`,
    [category],
  );
}

/** Totals grouped by app_name within a category. */
export async function getAppBreakdown(
  category: string,
): Promise<AppBreakdownRow[]> {
  const db = await getDb();
  return db.getAllAsync<AppBreakdownRow>(
    `SELECT app_name,
            COALESCE(SUM(amount), 0) AS total,
            COUNT(*) AS count
     FROM expenses
     WHERE category = ?
     GROUP BY app_name
     ORDER BY total DESC`,
    [category],
  );
}

/** Most recent expenses. */
export async function getRecentExpenses(limit = 5): Promise<Expense[]> {
  const db = await getDb();
  return db.getAllAsync<Expense>(
    `SELECT * FROM expenses ORDER BY timestamp DESC LIMIT ?`,
    [limit],
  );
}

/** Delete an expense by ID. Returns true if a row was removed. */
export async function deleteExpense(id: number): Promise<boolean> {
  const db = await getDb();
  const result = await db.runAsync(`DELETE FROM expenses WHERE id = ?`, [id]);
  return result.changes > 0;
}
