import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Share, Alert, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { CATEGORY_MAP } from '../../src/constants/categories';
import { getExpenseById, getItemsByExpenseId } from '../../src/db/itemsRepo';
import { getSplitsByExpenseId, toggleFriendExpenseSettled, type FriendSplitSummary } from '../../src/db/splitsRepo';
import { formatSplitShareMessage, type ParticipantResult } from '../../src/services/splitEngine';
import type { Expense, ExpenseItem } from '../../src/types/models';

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const expenseId = Number(id);

  const [expense, setExpense] = useState<Expense | null>(null);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [splits, setSplits] = useState<FriendSplitSummary[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    const [exp, itms, sp] = await Promise.all([
      getExpenseById(expenseId),
      getItemsByExpenseId(expenseId),
      getSplitsByExpenseId(expenseId),
    ]);
    setExpense(exp);
    setItems(itms);
    setSplits(sp);
  }, [id, expenseId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleToggleSettled(friendId: number, currentSettled: number) {
    await toggleFriendExpenseSettled(expenseId, friendId, currentSettled === 0);
    load();
  }

  async function handleShare() {
    if (!expense) return;
    const fakeResults: ParticipantResult[] = splits.map((s) => ({
      participantId: s.friend_id,
      name: s.friend_name,
      itemSubtotal: s.total_owed,
      extraFeeShare: 0,
      finalTotal: s.total_owed,
      itemBreakdown: [],
    }));
    const msg = formatSplitShareMessage(expense, fakeResults);
    await Share.share({ message: msg });
  }

  if (!expense) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  const cat = CATEGORY_MAP[expense.category];
  const itemsTotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const diff = expense.amount - itemsTotal;

  const sourceColors: Record<string, string> = {
    manual: '#7C5CFC', sms: '#4ECDC4', notification: '#FFD93D', ocr: '#FF6B6B',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Header ──────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>{cat?.icon ?? '📦'}</Text>
        <Text style={styles.headerAmount}>₹{expense.amount.toFixed(2)}</Text>
        <Text style={styles.headerMerchant}>{expense.merchant}</Text>
      </View>

      {/* ── Info rows ───────────────────────────── */}
      <View style={styles.infoCard}>
        <InfoRow label="Category" value={`${cat?.icon ?? ''} ${cat?.label ?? expense.category}`} accent={cat?.color} />
        {expense.app_name && <InfoRow label="App" value={expense.app_name} />}
        <InfoRow label="Source" value={expense.source} accent={sourceColors[expense.source]} />
        <InfoRow label="Date" value={new Date(expense.timestamp).toLocaleString()} />
        {expense.notes && <InfoRow label="Notes" value={expense.notes} />}
      </View>

      {/* ── Itemized Breakdown ──────────────────── */}
      {items.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Itemized Breakdown</Text>
          <View style={styles.itemCard}>
            {items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={1}>{item.item_name}</Text>
                <Text style={styles.itemCalc}>{item.quantity} × ₹{item.unit_price}</Text>
                <Text style={styles.itemSub}>= ₹{(item.unit_price * item.quantity).toFixed(0)}</Text>
              </View>
            ))}
            <View style={styles.totalSep} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Items Subtotal</Text>
              <Text style={styles.totalValue}>₹{itemsTotal.toFixed(2)}</Text>
            </View>
            {Math.abs(diff) >= 0.01 && (
              <View style={styles.totalRow}>
                <Text style={styles.diffLabel}>{diff > 0 ? 'Extra fees / Charges' : 'Discount'}</Text>
                <Text style={[styles.diffValue, { color: diff > 0 ? '#FF6B6B' : '#4ECDC4' }]}>
                  {diff > 0 ? '+' : ''}₹{diff.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        </>
      )}

      {/* ── Split Breakdown ────────────────────── */}
      {splits.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Split Breakdown</Text>
          {splits.map((s) => (
            <View key={s.friend_id} style={styles.splitRow}>
              <View style={styles.splitLeft}>
                <Text style={styles.splitName}>{s.friend_name}</Text>
                <Text style={[styles.splitStatus, { color: s.is_settled ? '#4ECDC4' : '#FF6B6B' }]}>
                  {s.is_settled ? '✓ Settled' : '⏳ Pending'}
                </Text>
              </View>
              <Text style={styles.splitAmount}>₹{s.total_owed.toFixed(2)}</Text>
              <TouchableOpacity
                style={[styles.settleBtn, s.is_settled ? styles.settleBtnDone : undefined]}
                onPress={() => handleToggleSettled(s.friend_id, s.is_settled)}
              >
                <Text style={styles.settleBtnText}>{s.is_settled ? 'Unsettle' : 'Settle'}</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>📤  Share Bill (WhatsApp / SMS)</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── Split button ───────────────────────── */}
      <TouchableOpacity
        style={styles.splitNavBtn}
        onPress={() => router.push(`/split/${expense.id}` as `/split/${string}`)}
      >
        <Text style={styles.splitNavBtnText}>
          👥  {splits.length > 0 ? 'Re-Split with Friends' : 'Split with Friends'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, accent ? { color: accent } : undefined]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#555', fontSize: 14 },

  header: { alignItems: 'center', paddingVertical: 20 },
  headerIcon: { fontSize: 40 },
  headerAmount: { color: '#F5F5F5', fontSize: 36, fontWeight: '800', marginTop: 8 },
  headerMerchant: { color: '#AAA', fontSize: 16, marginTop: 4 },

  infoCard: { backgroundColor: '#161616', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#1E1E1E' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1E1E1E' },
  infoLabel: { color: '#888', fontSize: 13 },
  infoValue: { color: '#F5F5F5', fontSize: 14, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },

  sectionTitle: { color: '#F5F5F5', fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  itemCard: { backgroundColor: '#161616', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#1E1E1E' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1E1E1E' },
  itemName: { flex: 1, color: '#F5F5F5', fontSize: 14, marginRight: 8 },
  itemCalc: { color: '#888', fontSize: 12, marginRight: 8 },
  itemSub: { color: '#4ECDC4', fontSize: 14, fontWeight: '700', width: 60, textAlign: 'right' },

  totalSep: { height: 1, backgroundColor: '#2A2A2A', marginVertical: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalLabel: { color: '#AAA', fontSize: 13, fontWeight: '600' },
  totalValue: { color: '#F5F5F5', fontSize: 14, fontWeight: '700' },
  diffLabel: { color: '#888', fontSize: 12 },
  diffValue: { fontSize: 13, fontWeight: '700' },

  /* split breakdown */
  splitRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#161616',
    borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#1E1E1E',
  },
  splitLeft: { flex: 1 },
  splitName: { color: '#F5F5F5', fontSize: 15, fontWeight: '600' },
  splitStatus: { fontSize: 11, marginTop: 2 },
  splitAmount: { color: '#F5F5F5', fontSize: 16, fontWeight: '700', marginRight: 10 },
  settleBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#4ECDC420', borderWidth: 1, borderColor: '#4ECDC4',
  },
  settleBtnDone: { backgroundColor: '#33333380', borderColor: '#555' },
  settleBtnText: { color: '#4ECDC4', fontSize: 11, fontWeight: '700' },

  shareBtn: {
    backgroundColor: '#25D366', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 12,
  },
  shareBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  splitNavBtn: {
    marginTop: 20, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#7C5CFC', alignItems: 'center',
  },
  splitNavBtnText: { color: '#7C5CFC', fontSize: 15, fontWeight: '700' },
});
