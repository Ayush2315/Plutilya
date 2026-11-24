import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { CATEGORY_MAP } from '../../src/constants/categories';
import {
  getExpensesByCategory,
  getAppBreakdown,
  deleteExpense,
  type AppBreakdownRow,
} from '../../src/db/expensesRepo';
import type { Expense } from '../../src/types/models';

export default function CategoryDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const cat = CATEGORY_MAP[name ?? ''];

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [appBreakdown, setAppBreakdown] = useState<AppBreakdownRow[]>([]);

  const load = useCallback(async () => {
    if (!name) return;
    const [exps, apps] = await Promise.all([
      getExpensesByCategory(name),
      getAppBreakdown(name),
    ]);
    setExpenses(exps);
    setAppBreakdown(apps);
  }, [name]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function confirmDelete(id: number) {
    Alert.alert('Delete expense?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteExpense(id);
          load();
        },
      },
    ]);
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={expenses}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <>
          <View style={styles.header}>
            <Text style={styles.headerIcon}>{cat?.icon ?? '📦'}</Text>
            <Text style={[styles.headerLabel, { color: cat?.color ?? '#888' }]}>
              {cat?.label ?? name}
            </Text>
            <Text style={styles.headerTotal}>₹{total.toFixed(2)}</Text>
            <Text style={styles.headerCount}>
              {expenses.length} transaction{expenses.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {appBreakdown.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Spent by App</Text>
              {appBreakdown.map((a, i) => (
                <View key={`app-${i}`} style={styles.appRow}>
                  <Text style={styles.appName}>
                    {a.app_name ?? 'No app tagged'}
                  </Text>
                  <Text style={styles.appTotal}>₹{a.total.toFixed(2)}</Text>
                </View>
              ))}
            </>
          )}

          <Text style={styles.sectionTitle}>All Expenses</Text>
          {expenses.length === 0 && (
            <Text style={styles.empty}>No expenses in this category.</Text>
          )}
        </>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.7}
          onPress={() => router.push(`/expense/${item.id}` as `/expense/${string}`)}
        >
          <View style={styles.rowLeft}>
            <Text style={styles.rowMerchant} numberOfLines={1}>
              {item.merchant}
            </Text>
            <View style={styles.rowMeta}>
              {item.app_name ? (
                <Text style={styles.rowApp}>{item.app_name}</Text>
              ) : null}
              <Text style={styles.rowDate}>
                {new Date(item.timestamp).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <Text style={styles.rowAmount}>₹{item.amount.toFixed(2)}</Text>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => confirmDelete(item.id)}
          >
            <Text style={styles.deleteBtnText}>🗑</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  content: { padding: 16, paddingBottom: 32 },

  header: { alignItems: 'center', paddingVertical: 16 },
  headerIcon: { fontSize: 40 },
  headerLabel: { fontSize: 22, fontWeight: '800', marginTop: 6 },
  headerTotal: { color: '#F5F5F5', fontSize: 32, fontWeight: '800', marginTop: 4 },
  headerCount: { color: '#666', fontSize: 13, marginTop: 2 },

  sectionTitle: { color: '#F5F5F5', fontSize: 16, fontWeight: '700', marginTop: 20, marginBottom: 10 },

  appRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: '#161616', borderRadius: 10, padding: 12,
    marginBottom: 6, borderWidth: 1, borderColor: '#1E1E1E',
  },
  appName: { color: '#CCC', fontSize: 14 },
  appTotal: { color: '#F5F5F5', fontSize: 14, fontWeight: '700' },

  empty: { color: '#555', fontSize: 14, textAlign: 'center', marginTop: 8 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#161616', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#1E1E1E',
  },
  rowLeft: { flex: 1 },
  rowMerchant: { color: '#F5F5F5', fontSize: 15, fontWeight: '600' },
  rowMeta: { flexDirection: 'row', marginTop: 3, gap: 8 },
  rowApp: {
    color: '#AAA', fontSize: 11, backgroundColor: '#252525',
    paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden',
  },
  rowDate: { color: '#555', fontSize: 11 },
  rowAmount: { color: '#F5F5F5', fontSize: 16, fontWeight: '700', marginRight: 8 },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 18 },
});
