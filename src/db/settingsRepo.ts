import * as SQLite from 'expo-sqlite';

const DB_NAME = 'plutilya.db';
let _tableEnsured = false;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  if (!_tableEnsured) {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT);`,
    );
    _tableEnsured = true;
  }
  return db;
}

/** Get a setting value by key, or null if missing/empty. */
export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ value: string | null }>(
    `SELECT value FROM app_settings WHERE key = ?`,
    [key],
  );
  const val = rows[0]?.value;
  return val && val.trim().length > 0 ? val : null;
}

/** Save or update a setting value by key. */
export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}
