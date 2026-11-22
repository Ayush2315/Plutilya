import * as SQLite from 'expo-sqlite';

const DB_NAME = 'plutilya.db';

/**
 * Opens (or creates) the database and ensures all tables exist.
 * Call once at app startup.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS expenses (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      amount     REAL    NOT NULL,
      merchant   TEXT    NOT NULL DEFAULT '',
      app_name   TEXT,
      category   TEXT    NOT NULL DEFAULT 'uncategorized',
      source     TEXT    NOT NULL CHECK (source IN ('sms','notification','ocr','manual')),
      timestamp  TEXT    NOT NULL DEFAULT (datetime('now')),
      notes      TEXT
    );

    CREATE TABLE IF NOT EXISTS expense_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_id  INTEGER NOT NULL,
      item_name   TEXT    NOT NULL,
      unit_price  REAL    NOT NULL,
      quantity    REAL    NOT NULL DEFAULT 1,
      FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS friends (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      phone_number TEXT
    );

    CREATE TABLE IF NOT EXISTS groups (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT    NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id  INTEGER NOT NULL,
      friend_id INTEGER NOT NULL,
      PRIMARY KEY (group_id, friend_id),
      FOREIGN KEY (group_id)  REFERENCES groups(id)  ON DELETE CASCADE,
      FOREIGN KEY (friend_id) REFERENCES friends(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS item_splits (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_item_id INTEGER NOT NULL,
      friend_id       INTEGER NOT NULL,
      share_quantity   REAL    NOT NULL DEFAULT 0,
      share_amount     REAL    NOT NULL DEFAULT 0,
      is_settled       INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (expense_item_id) REFERENCES expense_items(id) ON DELETE CASCADE,
      FOREIGN KEY (friend_id)       REFERENCES friends(id)       ON DELETE CASCADE
    );
  `);

  return db;
}
