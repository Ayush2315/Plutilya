import * as SQLite from 'expo-sqlite';

const DB_NAME = 'plutilya.db';

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  return SQLite.openDatabaseAsync(DB_NAME);
}

// ─── Input for saving splits ─────────────────────────────────────────
export interface SplitInput {
  expense_item_id: number;
  friend_id: number;
  share_quantity: number;
  share_amount: number;
}

// ─── Summary row for display ─────────────────────────────────────────
export interface FriendSplitSummary {
  friend_id: number;
  friend_name: string;
  phone_number: string | null;
  total_owed: number;
  is_settled: number; // 0 or 1 (all rows settled?)
  split_ids: string; // comma-separated
}

// ─── Group dues row ──────────────────────────────────────────────────
export interface GroupDuesRow {
  friend_id: number;
  friend_name: string;
  phone_number: string | null;
  total_unsettled: number;
}

// ═════════════════════════════════════════════════════════════════════
//  ENSURE SYNTHETIC ITEM (for non-itemized expenses)
// ═════════════════════════════════════════════════════════════════════

/**
 * If an expense has no rows in expense_items, insert 1 synthetic row
 * so item_splits works uniformly. Returns the item IDs for the expense.
 */
export async function ensureExpenseItems(
  expenseId: number,
): Promise<{ id: number; item_name: string; unit_price: number; quantity: number }[]> {
  const db = await getDb();
  let items = await db.getAllAsync<{
    id: number;
    item_name: string;
    unit_price: number;
    quantity: number;
  }>(
    `SELECT id, item_name, unit_price, quantity FROM expense_items WHERE expense_id = ?`,
    [expenseId],
  );

  if (items.length === 0) {
    // Insert synthetic item from the expense itself
    const expense = await db.getAllAsync<{ merchant: string; amount: number }>(
      `SELECT merchant, amount FROM expenses WHERE id = ?`,
      [expenseId],
    );
    if (expense[0]) {
      await db.runAsync(
        `INSERT INTO expense_items (expense_id, item_name, unit_price, quantity)
         VALUES (?, ?, ?, 1)`,
        [expenseId, expense[0].merchant, expense[0].amount],
      );
      items = await db.getAllAsync<{
        id: number;
        item_name: string;
        unit_price: number;
        quantity: number;
      }>(
        `SELECT id, item_name, unit_price, quantity FROM expense_items WHERE expense_id = ?`,
        [expenseId],
      );
    }
  }

  return items;
}

// ═════════════════════════════════════════════════════════════════════
//  SAVE / READ / TOGGLE SPLITS
// ═════════════════════════════════════════════════════════════════════

/** Replace existing splits for this expense's items and insert new ones (friends only, not 'ME'). */
export async function saveExpenseSplits(
  expenseId: number,
  splits: SplitInput[],
): Promise<void> {
  const db = await getDb();

  // Delete existing splits for all items of this expense
  await db.runAsync(
    `DELETE FROM item_splits WHERE expense_item_id IN
       (SELECT id FROM expense_items WHERE expense_id = ?)`,
    [expenseId],
  );

  for (const s of splits) {
    await db.runAsync(
      `INSERT INTO item_splits (expense_item_id, friend_id, share_quantity, share_amount, is_settled)
       VALUES (?, ?, ?, ?, 0)`,
      [s.expense_item_id, s.friend_id, s.share_quantity, s.share_amount],
    );
  }
}

/** Friend split summaries for an expense. */
export async function getSplitsByExpenseId(
  expenseId: number,
): Promise<FriendSplitSummary[]> {
  const db = await getDb();
  return db.getAllAsync<FriendSplitSummary>(
    `SELECT
       s.friend_id,
       f.name AS friend_name,
       f.phone_number,
       COALESCE(SUM(s.share_amount), 0) AS total_owed,
       MIN(s.is_settled) AS is_settled,
       GROUP_CONCAT(s.id) AS split_ids
     FROM item_splits s
     INNER JOIN expense_items ei ON ei.id = s.expense_item_id
     INNER JOIN friends f ON f.id = s.friend_id
     WHERE ei.expense_id = ?
     GROUP BY s.friend_id
     ORDER BY f.name COLLATE NOCASE ASC`,
    [expenseId],
  );
}

/** Toggle is_settled for all of a friend's splits on an expense. */
export async function toggleFriendExpenseSettled(
  expenseId: number,
  friendId: number,
  settled: boolean,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE item_splits SET is_settled = ?
     WHERE friend_id = ?
       AND expense_item_id IN (SELECT id FROM expense_items WHERE expense_id = ?)`,
    [settled ? 1 : 0, friendId, expenseId],
  );
}

/** Total unsettled amount owed by each member of a group. */
export async function getGroupDuesSummary(
  groupId: number,
): Promise<GroupDuesRow[]> {
  const db = await getDb();
  return db.getAllAsync<GroupDuesRow>(
    `SELECT
       f.id AS friend_id,
       f.name AS friend_name,
       f.phone_number,
       COALESCE(SUM(s.share_amount), 0) AS total_unsettled
     FROM friends f
     INNER JOIN group_members gm ON gm.friend_id = f.id
     LEFT JOIN item_splits s ON s.friend_id = f.id AND s.is_settled = 0
     WHERE gm.group_id = ?
     GROUP BY f.id
     ORDER BY total_unsettled DESC`,
    [groupId],
  );
}
