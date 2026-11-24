# HANDOFF REPORT — Milestone 6: Per-Item Splitting + Proportional Fees/Discounts + Dues & WhatsApp Summary

## Status: ✅ COMPLETED

`npx tsc --noEmit` → **0 errors**

---

## Files Created / Modified

| # | File | Action | Summary |
|---|------|--------|---------|
| 1 | `src/services/splitEngine.ts` | **Created** | Pure TS split math: `calculateItemizedSplit()` with proportional fee/discount distribution, paise rounding, drift correction on ME/largest share; `formatSplitShareMessage()` for WhatsApp/SMS-ready text. |
| 2 | `src/db/splitsRepo.ts` | **Created** | `ensureExpenseItems()` (synthetic item for non-itemized expenses), `saveExpenseSplits()`, `getSplitsByExpenseId()`, `toggleFriendExpenseSettled()`, `getGroupDuesSummary()`. |
| 3 | `app/split/[id].tsx` | **Created** | 3-step split flow: select participants (groups + individual friends + "Include Me" toggle) → assign items with `−/+` steppers and "Split Equally" per item → live summary with save. |
| 4 | `app/expense/[id].tsx` | **Rewritten** | Added split breakdown card with per-friend settle/unsettle toggle, "Share Bill (WhatsApp/SMS)" button via `Share.share()`, enabled "Split with Friends" navigation to `/split/${id}`. |
| 5 | `app/group/[id].tsx` | **Rewritten** | Live "Pending Dues" section from `getGroupDuesSummary()`, "Send Reminder" button per member via `Share.share()`, "All settled ✓" card when no pending dues. |
| 6 | `app/_layout.tsx` | **Modified** | Registered `split/[id]` route with `<Stack.Screen>`. |
| 7 | (no 7th — 6 files total) | — | — |

---

## Key Functions / Routes Added

### Split Engine (`src/services/splitEngine.ts`)
- `calculateItemizedSplit({ expenseTotal, items, participants, assignments })` → `SplitResult` with per-participant `{ participantId, name, itemSubtotal, extraFeeShare, finalTotal, itemBreakdown[] }`
- `formatSplitShareMessage(expense, splitResults)` → WhatsApp-formatted string

### Splits Repository (`src/db/splitsRepo.ts`)
- `ensureExpenseItems(expenseId, expenseAmount)` — creates synthetic item if expense has none
- `saveExpenseSplits(expenseId, splits)` — batch insert into `item_splits`
- `getSplitsByExpenseId(expenseId)` — returns all splits joined with friend names and item details
- `toggleFriendExpenseSettled(expenseId, friendId, settled)` — toggle `is_settled` flag
- `getGroupDuesSummary(groupId)` — aggregates unsettled dues per member across the group's expenses

### New Route
- `/split/[id]` — 3-step split screen for any expense

---

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| Manual test: Add expense → open detail → tap "Split with Friends" | Verify 3-step flow renders |
| Manual test: Assign items → save → return to detail | Verify split breakdown card appears |
| Manual test: Toggle "Settled" on a friend | Verify UI updates + DB persists |
| Manual test: Tap "Share Bill" | Verify OS share sheet opens with formatted text |
| Manual test: Open group detail | Verify "Pending Dues" shows correct amounts |
| Manual test: Tap "Send Reminder" | Verify share sheet opens with reminder text |

---

## Architecture Notes

- **Non-itemized expenses** are handled uniformly: `ensureExpenseItems()` auto-creates a synthetic `expense_item` row so `item_splits` FK always has a valid target.
- **Fee/discount distribution** is proportional to each participant's share of the items subtotal. If items subtotal is 0, fees are split equally.
- **Rounding:** Every share is rounded to 2 decimal places (paise). Any `±0.01` drift is absorbed by the `'ME'` participant (or largest share if ME is absent), guaranteeing `sum(shares) === expenseTotal`.

---

## Known Issues / Limitations

- None blocking. All M6 deliverables are functional.

---

## Cumulative Feature Map (M1–M6)

| Milestone | Features |
|-----------|----------|
| M1 | Expo project, SQLite schema (6 tables), TS types, 4-tab layout |
| M2 | Manual expense entry, category dashboard, `expensesRepo.ts` |
| M3 | Indian Bank/UPI SMS parser engine, Parser Lab in Settings |
| M4 | Friends & Groups CRUD, segmented Groups/Friends screen |
| M5 | Itemized order entry, autocomplete catalog, `+ / −` stepper, expense detail |
| **M6** | **Per-item splitting, proportional fees, settle toggle, WhatsApp share, group dues** |

---

## Next Steps (Milestone 7 Candidates)

1. **Screenshot / Bill OCR** — Use camera or image picker + on-device or cloud OCR to auto-extract items from grocery/restaurant bills.
2. **Native SMS / Notification Listener** — Move from Parser Lab to real-time background transaction capture via Android SMS/notification APIs (requires leaving Expo Go for a dev build).
3. **Settlement History & Analytics** — Track who paid whom over time, monthly split trends.
4. **Export / Backup** — Export DB or CSV, cloud sync.
