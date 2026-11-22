import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { CATEGORIES, POPULAR_APPS } from '../../src/constants/categories';
import { addExpense } from '../../src/db/expensesRepo';

export default function AddExpenseScreen() {
  const router = useRouter();

  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('');
  const [appKey, setAppKey] = useState('');
  const [customApp, setCustomApp] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset form whenever screen gains focus
  useFocusEffect(
    useCallback(() => {
      resetForm();
    }, []),
  );

  function resetForm() {
    setAmount('');
    setMerchant('');
    setCategory('');
    setAppKey('');
    setCustomApp('');
    setNotes('');
  }

  function resolvedAppName(): string | null {
    if (!appKey) return null;
    if (appKey === 'other') return customApp.trim() || null;
    const def = POPULAR_APPS.find((a) => a.key === appKey);
    return def?.label ?? null;
  }

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
      await addExpense({
        amount: numAmount,
        merchant: merchant.trim(),
        category,
        app_name: resolvedAppName(),
        notes: notes.trim() || null,
      });
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
              <Text
                style={[
                  styles.pillLabel,
                  category === c.key && { color: c.color },
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── App Chips ───────────────────────────── */}
        <Text style={styles.label}>App Used</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
        >
          {POPULAR_APPS.map((a) => (
            <TouchableOpacity
              key={a.key}
              style={[
                styles.chip,
                appKey === a.key && styles.chipActive,
              ]}
              onPress={() => setAppKey(appKey === a.key ? '' : a.key)}
            >
              <Text style={styles.chipEmoji}>{a.emoji}</Text>
              <Text
                style={[
                  styles.chipLabel,
                  appKey === a.key && styles.chipLabelActive,
                ]}
              >
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

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
  },
  pillIcon: { fontSize: 18, marginRight: 6 },
  pillLabel: { color: '#CCC', fontSize: 14, fontWeight: '600' },

  chipScroll: { marginTop: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
    marginRight: 8,
  },
  chipActive: { borderColor: '#7C5CFC', backgroundColor: '#7C5CFC20' },
  chipEmoji: { fontSize: 14, marginRight: 4 },
  chipLabel: { color: '#AAA', fontSize: 13 },
  chipLabelActive: { color: '#7C5CFC', fontWeight: '600' },

  notesInput: { height: 70, textAlignVertical: 'top' },

  saveBtn: {
    backgroundColor: '#7C5CFC',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
  },
  saveBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
