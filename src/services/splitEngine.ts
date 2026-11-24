// ─── Pure TypeScript split calculation engine (zero UI deps) ─────────

export interface SplitItem {
  id: number;
  item_name: string;
  unit_price: number;
  quantity: number;
}

export interface SplitParticipant {
  id: number | 'ME';
  name: string;
}

/** itemId → participantKey → shareWeight (qty assigned to that person) */
export type SplitAssignments = Record<number, Record<string, number>>;

export interface ParticipantItemDetail {
  item_name: string;
  shareQty: number;
  amount: number;
}

export interface ParticipantResult {
  participantId: number | 'ME';
  name: string;
  itemSubtotal: number;
  extraFeeShare: number;
  finalTotal: number;
  itemBreakdown: ParticipantItemDetail[];
}

/**
 * Calculates per-participant split with proportional extra fee/discount distribution.
 * Rounding drift is adjusted on the largest share (or 'ME') so sum === expenseTotal.
 */
export function calculateItemizedSplit(params: {
  expenseTotal: number;
  items: SplitItem[];
  participants: SplitParticipant[];
  assignments: SplitAssignments;
}): ParticipantResult[] {
  const { expenseTotal, items, participants, assignments } = params;

  const itemsSubtotal = items.reduce(
    (s, i) => s + i.unit_price * i.quantity,
    0,
  );
  const extraDiff = expenseTotal - itemsSubtotal;

  // Build per-participant raw item subtotals
  const results: ParticipantResult[] = participants.map((p) => {
    const pKey = String(p.id);
    const breakdown: ParticipantItemDetail[] = [];
    let subtotal = 0;

    for (const item of items) {
      const itemAssign = assignments[item.id];
      const shareQty = itemAssign?.[pKey] ?? 0;
      if (shareQty > 0) {
        // proportion of this item that this participant gets
        const totalAssignedForItem = Object.values(itemAssign ?? {}).reduce(
          (s, v) => s + v,
          0,
        );
        const fraction =
          totalAssignedForItem > 0 ? shareQty / totalAssignedForItem : 0;
        const amount =
          Math.round(item.unit_price * item.quantity * fraction * 100) / 100;
        subtotal += amount;
        breakdown.push({ item_name: item.item_name, shareQty, amount });
      }
    }

    return {
      participantId: p.id,
      name: p.name,
      itemSubtotal: Math.round(subtotal * 100) / 100,
      extraFeeShare: 0,
      finalTotal: 0,
      itemBreakdown: breakdown,
    };
  });

  // Distribute extra fee/discount proportionally
  const totalItemSubs = results.reduce((s, r) => s + r.itemSubtotal, 0);

  for (const r of results) {
    if (totalItemSubs > 0) {
      r.extraFeeShare =
        Math.round((r.itemSubtotal / totalItemSubs) * extraDiff * 100) / 100;
    } else {
      // equal distribution when no items subtotal
      r.extraFeeShare =
        Math.round((extraDiff / results.length) * 100) / 100;
    }
    r.finalTotal = Math.round((r.itemSubtotal + r.extraFeeShare) * 100) / 100;
  }

  // Fix rounding drift: adjust on 'ME' or largest share
  const currentSum = results.reduce((s, r) => s + r.finalTotal, 0);
  const drift = Math.round((expenseTotal - currentSum) * 100) / 100;

  if (Math.abs(drift) >= 0.01) {
    const meIdx = results.findIndex((r) => r.participantId === 'ME');
    const targetIdx =
      meIdx >= 0
        ? meIdx
        : results.reduce(
            (maxI, r, i, arr) =>
              r.finalTotal > arr[maxI].finalTotal ? i : maxI,
            0,
          );
    results[targetIdx].extraFeeShare =
      Math.round((results[targetIdx].extraFeeShare + drift) * 100) / 100;
    results[targetIdx].finalTotal =
      Math.round((results[targetIdx].finalTotal + drift) * 100) / 100;
  }

  return results;
}

/**
 * Formats a WhatsApp-friendly share message.
 */
export function formatSplitShareMessage(
  expense: { merchant: string; amount: number },
  splitResults: ParticipantResult[],
): string {
  const lines: string[] = [
    `💰 *Bill Split — ${expense.merchant}*`,
    `Total: ₹${expense.amount.toFixed(2)}`,
    '',
  ];

  for (const r of splitResults) {
    lines.push(`👤 *${r.name}*: ₹${r.finalTotal.toFixed(2)}`);
    for (const item of r.itemBreakdown) {
      lines.push(`   • ${item.item_name} (${item.shareQty}x) = ₹${item.amount.toFixed(2)}`);
    }
    if (Math.abs(r.extraFeeShare) >= 0.01) {
      lines.push(
        `   ${r.extraFeeShare > 0 ? '+ Fees' : '− Discount'}: ₹${Math.abs(r.extraFeeShare).toFixed(2)}`,
      );
    }
  }

  lines.push('', '📲 _Sent via Plutilya_');
  return lines.join('\n');
}
