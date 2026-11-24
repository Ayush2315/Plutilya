import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { CATEGORIES, CATEGORY_MAP } from '../../src/constants/categories';
import {
  getCategorySummary,
  getRecentExpenses,
  type CategorySummaryRow,
} from '../../src/db/expensesRepo';
import type { Expense } from '../../src/types/models';

type TimeFilter = 'month' | 'all';

export default function DashboardScreen() {
  const router = useRouter();

  const [filter, setFilter] = useState<TimeFilter>('month');
  const [summaries, setSummaries] = useState<CategorySummaryRow[]>([]);
  const [recent, setRecent] = useState<Expense[]>([]);

  const loadData = useCallback(async () => {
    const now = new Date();
    const monthStr =
      filter === 'month'
        ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        : undefined;
    const [cats, rec] = await Promise.all([
      getCategorySummary(monthStr),
      getRecentExpenses(5),
    ]);
    setSummaries(cats);
    setRecent(rec);
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const grandTotal = summaries.reduce((s, r) => s + r.total, 0);

  const catData = CATEGORIES.map((c) => {
    const row = summaries.find((s) => s.category === c.key);
    return { ...c, total: row?.total ?? 0, count: row?.count ?? 0 };
  });

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={recent}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <>
          {/* ── Total Card ─────────────────────────── */}
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total Spent</Text>
            <Text style={styles.totalAmount}>₹{grandTotal.toFixed(2)}</Text>
            <View style={styles.filterRow}>
              {(['month', 'all'] as TimeFilter[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text
                    style={[styles.filterText, filter === f && styles.filterTextActive]}
                  >
                    {f === 'month' ? 'This Month' : 'All Time'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Category Breakdown ─────────────────── */}
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.catGrid}>
            {catData.map((c) => {
              const pct = grandTotal > 0 ? c.total / grandTotal : 0;
              return (
                <TouchableOpacity
                  key={c.key}
                  style={styles.catCard}
                  onPress={() =>
                    router.push(`/category/${c.key}` as `/category/${string}`)
                  }
                >
                  <View style={styles.catHeader}>
                    <Text style={styles.catIcon}>{c.icon}</Text>
                    <Text style={[styles.catLabel, { color: c.color }]}>
                      {c.label}
                    </Text>
                  </View>
                  <Text style={styles.catAmount}>₹{c.total.toFixed(2)}</Text>
                  <Text style={styles.catCount}>
                    {c.count} txn{c.count !== 1 ? 's' : ''}
                  </Text>
                  <View style={styles.barBg}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${Math.round(pct * 100)}%`, backgroundColor: c.color },
                      ]}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Recent Expenses header ─────────────── */}
          <Text style={styles.sectionTitle}>Recent Expenses</Text>
          {recent.length === 0 && (
            <Text style={styles.empty}>No expenses yet — tap Add to start.</Text>
          )}
        </>
      }
      renderItem={({ item }) => (
        <RecentRow expense={item} onPress={() => router.push(`/expense/${item.id}` as `/expense/${string}`)} />
      )}
    />
  );
}

// ─── Recent expense row (now tappable) ───────────────────────────────
function RecentRow({ expense, onPress }: { expense: Expense; onPress: () => void }) {
  const cat = CATEGORY_MAP[expense.category];
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.rowIcon}>{cat?.icon ?? '📦'}</Text>
      <View style={styles.rowMid}>
        <Text style={styles.rowMerchant} numberOfLines={1}>
          {expense.merchant}
        </Text>
        <View style={styles.rowMeta}>
          {expense.app_name ? (
            <Text style={styles.rowApp}>{expense.app_name}</Text>
          ) : null}
          <Text style={[styles.rowCat, { color: cat?.color ?? '#888' }]}>
            {cat?.label ?? expense.category}
          </Text>
        </View>
      </View>
      <Text style={styles.rowAmount}>₹{expense.amount.toFixed(2)}</Text>
    </TouchableOpacity>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  content: { padding: 16, paddingBottom: 32 },

  totalCard: {
    backgroundColor: '#161616', borderRadius: 16, padding: 20,
    alignItems: 'center', borderWidth: 1, borderColor: '#2A2A2A',
  },
  totalLabel: { color: '#888', fontSize: 14 },
  totalAmount: { color: '#F5F5F5', fontSize: 36, fontWeight: '800', marginTop: 4 },
  filterRow: { flexDirection: 'row', marginTop: 14, gap: 10 },
  filterBtn: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: '#333',
  },
  filterBtnActive: { backgroundColor: '#7C5CFC30', borderColor: '#7C5CFC' },
  filterText: { color: '#888', fontSize: 13 },
  filterTextActive: { color: '#7C5CFC', fontWeight: '600' },

  sectionTitle: { color: '#F5F5F5', fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 12 },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: {
    width: '48%', backgroundColor: '#161616', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#2A2A2A',
  },
  catHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  catIcon: { fontSize: 20, marginRight: 6 },
  catLabel: { fontSize: 14, fontWeight: '700' },
  catAmount: { color: '#F5F5F5', fontSize: 20, fontWeight: '700' },
  catCount: { color: '#666', fontSize: 12, marginTop: 2 },
  barBg: { height: 4, borderRadius: 2, backgroundColor: '#2A2A2A', marginTop: 8, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },

  empty: { color: '#555', fontSize: 14, textAlign: 'center', marginTop: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#161616', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#1E1E1E',
  },
  rowIcon: { fontSize: 24, marginRight: 12 },
  rowMid: { flex: 1 },
  rowMerchant: { color: '#F5F5F5', fontSize: 15, fontWeight: '600' },
  rowMeta: { flexDirection: 'row', marginTop: 3, gap: 8 },
  rowApp: {
    color: '#AAA', fontSize: 11, backgroundColor: '#252525',
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden',
  },
  rowCat: { fontSize: 11 },
  rowAmount: { color: '#F5F5F5', fontSize: 16, fontWeight: '700' },
});
