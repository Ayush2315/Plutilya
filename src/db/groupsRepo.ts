import * as SQLite from 'expo-sqlite';
import type { Friend, Group } from '../types/models';

const DB_NAME = 'plutilya.db';

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  return SQLite.openDatabaseAsync(DB_NAME);
}

// ─── Composite types ─────────────────────────────────────────────────
export interface GroupWithMembers extends Group {
  member_count: number;
  members: Friend[];
}

// ═══════════════════════════════════════════════════════════════════════
//  FRIENDS
// ═══════════════════════════════════════════════════════════════════════

/** Add a friend and return their new ID. */
export async function addFriend(
  name: string,
  phone_number?: string,
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO friends (name, phone_number) VALUES (?, ?)`,
    [name, phone_number ?? null],
  );
  return result.lastInsertRowId;
}

/** All friends sorted alphabetically. */
export async function getAllFriends(): Promise<Friend[]> {
  const db = await getDb();
  return db.getAllAsync<Friend>(
    `SELECT * FROM friends ORDER BY name COLLATE NOCASE ASC`,
  );
}

/** Delete a friend by ID. Returns true if removed. */
export async function deleteFriend(id: number): Promise<boolean> {
  const db = await getDb();
  const result = await db.runAsync(`DELETE FROM friends WHERE id = ?`, [id]);
  return result.changes > 0;
}

// ═══════════════════════════════════════════════════════════════════════
//  GROUPS
// ═══════════════════════════════════════════════════════════════════════

/** Create a group, link the given friend IDs, and return the new group ID. */
export async function createGroup(
  name: string,
  friendIds: number[],
): Promise<number> {
  const db = await getDb();

  const result = await db.runAsync(
    `INSERT INTO groups (name) VALUES (?)`,
    [name],
  );
  const groupId = result.lastInsertRowId;

  for (const fid of friendIds) {
    await db.runAsync(
      `INSERT OR IGNORE INTO group_members (group_id, friend_id) VALUES (?, ?)`,
      [groupId, fid],
    );
  }

  return groupId;
}

/** All groups with member count and member details. */
export async function getAllGroupsWithMembers(): Promise<GroupWithMembers[]> {
  const db = await getDb();

  const groups = await db.getAllAsync<Group>(
    `SELECT * FROM groups ORDER BY created_at DESC`,
  );

  const result: GroupWithMembers[] = [];
  for (const g of groups) {
    const members = await db.getAllAsync<Friend>(
      `SELECT f.* FROM friends f
       INNER JOIN group_members gm ON gm.friend_id = f.id
       WHERE gm.group_id = ?
       ORDER BY f.name COLLATE NOCASE ASC`,
      [g.id],
    );
    result.push({ ...g, member_count: members.length, members });
  }

  return result;
}

/** Single group with its members. Returns null if not found. */
export async function getGroupById(
  id: number,
): Promise<GroupWithMembers | null> {
  const db = await getDb();

  const rows = await db.getAllAsync<Group>(
    `SELECT * FROM groups WHERE id = ?`,
    [id],
  );
  const group = rows[0];
  if (!group) return null;

  const members = await db.getAllAsync<Friend>(
    `SELECT f.* FROM friends f
     INNER JOIN group_members gm ON gm.friend_id = f.id
     WHERE gm.group_id = ?
     ORDER BY f.name COLLATE NOCASE ASC`,
    [id],
  );

  return { ...group, member_count: members.length, members };
}

/** Add a friend to a group. */
export async function addMemberToGroup(
  groupId: number,
  friendId: number,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR IGNORE INTO group_members (group_id, friend_id) VALUES (?, ?)`,
    [groupId, friendId],
  );
}

/** Remove a friend from a group. */
export async function removeMemberFromGroup(
  groupId: number,
  friendId: number,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `DELETE FROM group_members WHERE group_id = ? AND friend_id = ?`,
    [groupId, friendId],
  );
}

/** Delete a group by ID. Returns true if removed. */
export async function deleteGroup(id: number): Promise<boolean> {
  const db = await getDb();
  const result = await db.runAsync(`DELETE FROM groups WHERE id = ?`, [id]);
  return result.changes > 0;
}
