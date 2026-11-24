import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { CATEGORIES, POPULAR_APPS } from '../../src/constants/categories';
import { addExpense } from '../../src/db/expensesRepo';
import { saveExpenseWithItems, getDistinctPastItems, type ItemInput } from '../../src/db/itemsRepo';
import { searchItemSuggestions, type ItemSuggestion } from '../../src/constants/itemCatalog';

// ─── Local item row state ────────────────────────────────────────────
interface ItemRow {
  key: string; // unique key for list
  item_name: string;
  unit_price: number;
  quantity: number;
}

let _itemKey = 0;
function nextKey() { return `item-${++_itemKey}`; }

export default function AddExpenseScreen() {
  const router = useRouter();

  // ── Core fields ──────────────────────────────
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('');
  const [appKey, setAppKey] = useState('');
  const [customApp, setCustomApp] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // ── Itemize toggle ───────────────────────────
  const [itemize, setItemize] = useState(false);
  const [items, setItems] = useState<ItemRow[]>([]);

  // ── Autocomplete state ───────────────────────
  const [itemQuery, setItemQuery] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [suggestions, setSuggestions] = useState<ItemSuggestion[]>([]);
  const [pastItems, setPastItems] = useState<ItemSuggestion[]>([]);

  // Load past items once on focus
  useFocusEffect(
    useCallback(() => {
      resetForm();
      getDistinctPastItems().then(setPastItems);
    }, []),
  );

  // Live autocomplete
  useEffect(() => {
    if (itemQuery.trim().length >= 1) {
      setSuggestions(searchItemSuggestions(itemQuery, pastItems));
    } else {
      setSuggestions([]);
    }
  }, [itemQuery, pastItems]);

  // Auto-sync amount from items
  useEffect(() => {
    if (itemize && items.length > 0) {
      const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
      setAmount(total.toFixed(2));
    }
  }, [items, itemize]);

  function resetForm() {
    setAmount('');
    setMerchant('');
    setCategory('');
    setAppKey('');
    setCustomApp('');
    setNotes('');
    setItemize(false);
    setItems([]);
    setItemQuery('');
    setItemPrice('');
    setSuggestions([]);
  }

  function resolvedAppName(): string | null {
    if (!appKey) return null;
    if (appKey === 'other') return customApp.trim() || null;
    return POPULAR_APPS.find((a) => a.key === appKey)?.label ?? null;
  }

  // ── Item CRUD ────────────────────────────────
  function addItem(name: string, price: number) {
    const existing = items.find(
      (i) => i.item_name.toLowerCase() === name.toLowerCase() && i.unit_price === price,
    );
    if (existing) {
      setItems((prev) =>
        prev.map((i) => (i.key === existing.key ? { ...i, quantity: i.quantity + 1 } : i)),
      );
    } else {
      setItems((prev) => [...prev, { key: nextKey(), item_name: name, unit_price: price, quantity: 1 }]);
    }
    setItemQuery('');
    setItemPrice('');
    setSuggestions([]);
  }

  function handleAddCustomItem() {
    const name = itemQuery.trim();
    const price = parseFloat(itemPrice);
    if (!name) { Alert.alert('Enter item name'); return; }
    if (isNaN(price) || price <= 0) { Alert.alert('Enter a valid price'); return; }
    addItem(name, price);
  }

  function updateQty(key: string, delta: number) {
    setItems((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0),
    );
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  // ── Save ─────────────────────────────────────
  async function handleSave() {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Invalid amount', 'Enter a positive number.');
      return;
    }
    if (!merchant.trim()) {
      Alert.alert('Missing title', 'Enter a merchant or title.');
      return;
    }
    if (!category) {
      Alert.alert('No category', 'Pick a category.');
      return;
    }

    setSaving(true);
    try {
      const input = {
        amount: numAmount,
        merchant: merchant.trim(),
        category,
        app_name: resolvedAppName(),
        notes: notes.trim() || null,
      };

      if (itemize && items.length > 0) {
        const itemInputs: ItemInput[] = items.map((i) => ({
          item_name: i.item_name,
          unit_price: i.unit_price,
          quantity: i.quantity,
        }));
        await saveExpenseWithItems(input, itemInputs);
      } else {
        await addExpense(input);
      }

      Alert.alert('✅ Saved!', `₹${numAmount.toFixed(2)} added.`, [
        { text: 'OK', onPress: () => router.navigate('/(tabs)/dashboard') },
      ]);
      resetForm();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }

  const itemsTotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Amount ───────────────────────────────── */}
        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountRow}>
          <Text style={styles.rupee}>₹</Text>
          <TextInput
            style={[styles.input, styles.amountInput]}
            placeholder="0.00"
            placeholderTextColor="#555"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          {itemize && items.length > 0 && (
            <Text style={styles.autoLabel}>auto</Text>
          )}
        </View>

        {/* ── Merchant ─────────────────────────────── */}
        <Text style={styles.label}>Merchant / Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Late night snacks"
          placeholderTextColor="#555"
          value={merchant}
          onChangeText={setMerchant}
        />

        {/* ── Category Pills ──────────────────────── */}
        <Text style={styles.label}>Category</Text>
        <View style={styles.pillRow}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[
                styles.pill,
                category === c.key && { backgroundColor: c.color + '30', borderColor: c.color },
              ]}
              onPress={() => setCategory(c.key)}
            >
              <Text style={styles.pillIcon}>{c.icon}</Text>
              <Text style={[styles.pillLabel, category === c.key && { color: c.color }]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── App Chips ───────────────────────────── */}
        <Text style={styles.label}>App Used</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {POPULAR_APPS.map((a) => (
            <TouchableOpacity
              key={a.key}
              style={[styles.chip, appKey === a.key && styles.chipActive]}
              onPress={() => setAppKey(appKey === a.key ? '' : a.key)}
            >
              <Text style={styles.chipEmoji}>{a.emoji}</Text>
              <Text style={[styles.chipLabel, appKey === a.key && styles.chipLabelActive]}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {appKey === 'other' && (
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Enter app name"
            placeholderTextColor="#555"
            value={customApp}
            onChangeText={setCustomApp}
          />
        )}

        {/* ── Itemize Toggle ──────────────────────── */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>📝 Itemize Order</Text>
          <Switch
            value={itemize}
            onValueChange={setItemize}
            trackColor={{ false: '#333', true: '#7C5CFC60' }}
            thumbColor={itemize ? '#7C5CFC' : '#888'}
          />
        </View>

        {/* ── Itemize Section ─────────────────────── */}
        {itemize && (
          <View style={styles.itemSection}>
            {/* add item input */}
            <View style={styles.addItemRow}>
              <TextInput
                style={[styles.input, styles.itemNameInput]}
                placeholder="Search or type item…"
                placeholderTextColor="#555"
                value={itemQuery}
                onChangeText={setItemQuery}
              />
              <TextInput
                style={[styles.input, styles.itemPriceInput]}
                placeholder="₹"
                placeholderTextColor="#555"
                keyboardType="numeric"
                value={itemPrice}
                onChangeText={setItemPrice}
              />
              <TouchableOpacity style={styles.addItemBtn} onPress={handleAddCustomItem}>
                <Text style={styles.addItemBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* autocomplete dropdown */}
            {suggestions.length > 0 && (
              <View style={styles.sugBox}>
                {suggestions.map((s, i) => (
                  <TouchableOpacity
                    key={`sug-${i}`}
                    style={styles.sugRow}
                    onPress={() => addItem(s.name, s.defaultPrice)}
                  >
                    <Text style={styles.sugName} numberOfLines={1}>{s.name}</Text>
                    <Text style={styles.sugPrice}>₹{s.defaultPrice}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* items list */}
            {items.map((item) => (
              <View key={item.key} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.item_name}</Text>
                  <Text style={styles.itemUnit}>₹{item.unit_price}</Text>
                </View>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => updateQty(item.key, -1)}
                  >
                    <Text style={styles.stepBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.stepQty}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => updateQty(item.key, 1)}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.itemSubtotal}>
                  ₹{(item.unit_price * item.quantity).toFixed(0)}
                </Text>
                <TouchableOpacity onPress={() => removeItem(item.key)} style={styles.itemDel}>
                  <Text style={styles.itemDelText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {items.length > 0 && (
              <View style={styles.itemsTotalRow}>
                <Text style={styles.itemsTotalLabel}>Items Total</Text>
                <Text style={styles.itemsTotalValue}>₹{itemsTotal.toFixed(2)}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Notes ───────────────────────────────── */}
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Any details…"
          placeholderTextColor="#555"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        {/* ── Save ────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Saving…' : '💾  Save Expense'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#0D0D0D' },
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  content: { padding: 20, paddingBottom: 40 },

  label: { color: '#AAA', fontSize: 13, fontWeight: '600', marginTop: 18, marginBottom: 6 },

  input: {
    backgroundColor: '#1A1A1A',
    color: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },

  amountRow: { flexDirection: 'row', alignItems: 'center' },
  rupee: { color: '#7C5CFC', fontSize: 22, fontWeight: '700', marginRight: 8 },
  amountInput: { flex: 1, fontSize: 22, fontWeight: '700' },
  autoLabel: { color: '#7C5CFC', fontSize: 11, marginLeft: 8, fontWeight: '600' },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5,
    borderColor: '#2A2A2A', backgroundColor: '#1A1A1A',
  },
  pillIcon: { fontSize: 18, marginRight: 6 },
  pillLabel: { color: '#CCC', fontSize: 14, fontWeight: '600' },

  chipScroll: { marginTop: 2 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: '#2A2A2A', backgroundColor: '#1A1A1A', marginRight: 8,
  },
  chipActive: { borderColor: '#7C5CFC', backgroundColor: '#7C5CFC20' },
  chipEmoji: { fontSize: 14, marginRight: 4 },
  chipLabel: { color: '#AAA', fontSize: 13 },
  chipLabelActive: { color: '#7C5CFC', fontWeight: '600' },

  /* toggle */
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 20, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: '#1E1E1E',
  },
  toggleLabel: { color: '#F5F5F5', fontSize: 15, fontWeight: '600' },

  /* itemize section */
  itemSection: { marginTop: 8 },

  addItemRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  itemNameInput: { flex: 1 },
  itemPriceInput: { width: 72 },
  addItemBtn: {
    backgroundColor: '#7C5CFC', borderRadius: 10,
    width: 44, alignItems: 'center', justifyContent: 'center',
  },
  addItemBtnText: { color: '#FFF', fontSize: 22, fontWeight: '700' },

  /* suggestions */
  sugBox: {
    backgroundColor: '#1E1E1E', borderRadius: 10,
    marginBottom: 10, borderWidth: 1, borderColor: '#2A2A2A',
  },
  sugRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 12,
    borderBottomWidth: 1, borderBottomColor: '#252525',
  },
  sugName: { color: '#F5F5F5', fontSize: 14, flex: 1, marginRight: 8 },
  sugPrice: { color: '#7C5CFC', fontSize: 13, fontWeight: '700' },

  /* item rows */
  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#161616', borderRadius: 10,
    padding: 10, marginBottom: 6,
    borderWidth: 1, borderColor: '#1E1E1E',
  },
  itemInfo: { flex: 1, marginRight: 6 },
  itemName: { color: '#F5F5F5', fontSize: 13, fontWeight: '600' },
  itemUnit: { color: '#666', fontSize: 11, marginTop: 1 },

  stepper: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  stepBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#252525', alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { color: '#F5F5F5', fontSize: 16, fontWeight: '700' },
  stepQty: { color: '#F5F5F5', fontSize: 15, fontWeight: '700', marginHorizontal: 10 },

  itemSubtotal: { color: '#4ECDC4', fontSize: 14, fontWeight: '700', width: 50, textAlign: 'right' },
  itemDel: { marginLeft: 6, padding: 4 },
  itemDelText: { color: '#FF6B6B', fontSize: 12, fontWeight: '700' },

  itemsTotalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, paddingHorizontal: 4,
    borderTopWidth: 1, borderTopColor: '#2A2A2A', marginTop: 4,
  },
  itemsTotalLabel: { color: '#888', fontSize: 13, fontWeight: '600' },
  itemsTotalValue: { color: '#4ECDC4', fontSize: 15, fontWeight: '700' },

  notesInput: { height: 70, textAlignVertical: 'top' },

  saveBtn: {
    backgroundColor: '#7C5CFC', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 28,
  },
  saveBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
