import { parseTransactionMessage } from './smsParser';
import { addExpense } from '../db/expensesRepo';
import { getSetting } from '../db/settingsRepo';
import {
  isAvailable,
  consumePendingNotifications,
  addNotificationListener,
  type NotificationData,
} from '../../modules/notification-listener';

// ─── Deduplication ───────────────────────────────────────────────────
// Prevents saving the same transaction twice within a 2-minute window.
const recentSaves = new Map<string, number>();
const DEDUP_WINDOW_MS = 2 * 60 * 1000;

function dedupeKey(amount: number, merchant: string): string {
  return `${amount.toFixed(2)}|${merchant.toLowerCase()}`;
}

function isDuplicate(amount: number, merchant: string): boolean {
  const key = dedupeKey(amount, merchant);
  const lastTs = recentSaves.get(key);
  return lastTs != null && Date.now() - lastTs < DEDUP_WINDOW_MS;
}

function markSaved(amount: number, merchant: string): void {
  const key = dedupeKey(amount, merchant);
  recentSaves.set(key, Date.now());
  // Prune expired entries
  const cutoff = Date.now() - DEDUP_WINDOW_MS;
  for (const [k, ts] of recentSaves) {
    if (ts < cutoff) recentSaves.delete(k);
  }
}

// ─── Process a single notification ──────────────────────────────────
async function processNotification(n: NotificationData): Promise<void> {
  // Respect the user's toggle
  const enabled = await getSetting('auto_capture_enabled');
  if (enabled === 'false') return;

  const combinedText = `${n.title} ${n.text}`;
  const parsed = parseTransactionMessage(combinedText);
  if (!parsed) return;

  if (isDuplicate(parsed.amount, parsed.merchant)) return;

  try {
    await addExpense({
      amount: parsed.amount,
      merchant: parsed.merchant,
      category: parsed.category,
      app_name: parsed.app_name,
      notes: `[auto] ${combinedText.slice(0, 100)}`,
      source: 'notification',
    });
    markSaved(parsed.amount, parsed.merchant);
  } catch {
    // Silently ignore — never crash the listener loop
  }
}

// ─── Public init (call once at app startup) ──────────────────────────
/**
 * Drain notifications captured while app was closed, then subscribe to
 * live events. Safe to call even when the native module is unavailable
 * (Expo Go / iOS) — it simply no-ops.
 */
export function initAutoCapture(): void {
  if (!isAvailable) return;

  // 1. Drain pending queue (captured while backgrounded / closed)
  const pending = consumePendingNotifications();
  for (const n of pending) {
    void processNotification(n);
  }

  // 2. Subscribe to real-time events
  addNotificationListener((data) => {
    void processNotification(data);
  });
}
