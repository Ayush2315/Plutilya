import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import {
  parseTransactionMessage,
  type ParsedTransaction,
} from '../../src/services/smsParser';
import { SAMPLE_MESSAGES } from '../../src/services/smsParser.samples';
import { CATEGORY_MAP } from '../../src/constants/categories';
import { addExpense } from '../../src/db/expensesRepo';

export default function SettingsScreen() {
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<ParsedTransaction | null | undefined>(
    undefined, // undefined = not yet parsed; null = ignored
  );
  const [saved, setSaved] = useState(false);

  function handleParse() {
    const trimmed = inputText.trim();
    if (!trimmed) {
      Alert.alert('Empty', 'Paste or pick a message first.');
      return;
    }
    const parsed = parseTransactionMessage(trimmed);
    setResult(parsed);
    setSaved(false);
  }

  async function handleSave() {
    if (!result) return;
    try {
      await addExpense({
        amount: result.amount,
        merchant: result.merchant,
        category: result.category,
        app_name: result.app_name,
        notes: `[parser-lab] ${result.raw_text.slice(0, 80)}…`,
        source: 'sms',
      });
      setSaved(true);
      Alert.alert('✅ Saved!', `₹${result.amount.toFixed(2)} from "${result.merchant}" added.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Error', msg);
    }
  }

  function fillSample(text: string) {
    setInputText(text);
    setResult(undefined);
    setSaved(false);
  }

  const cat = result ? CATEGORY_MAP[result.category] : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Header ───────────────────────────────── */}
      <Text style={styles.title}>🧪 Parser Lab</Text>
      <Text style={styles.subtitle}>
        Test the SMS / Notification parser engine
      </Text>

      {/* ── Quick-fill chips ─────────────────────── */}
      <Text style={styles.label}>Quick-fill samples</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
      >
        {SAMPLE_MESSAGES.map((s, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.chip,
              inputText === s.text && styles.chipActive,
            ]}
            onPress={() => fillSample(s.text)}
          >
            <Text
              style={[
                styles.chipLabel,
                inputText === s.text && styles.chipLabelActive,
              ]}
            >
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Input ────────────────────────────────── */}
      <Text style={styles.label}>Paste SMS / Notification</Text>
      <TextInput
        style={styles.textArea}
        placeholder="Paste a bank SMS or notification here…"
        placeholderTextColor="#555"
        value={inputText}
        onChangeText={(t) => {
          setInputText(t);
          setResult(undefined);
          setSaved(false);
        }}
        multiline
        textAlignVertical="top"
      />

      {/* ── Parse button ─────────────────────────── */}
      <TouchableOpacity style={styles.parseBtn} onPress={handleParse}>
        <Text style={styles.parseBtnText}>🔍  Parse Message</Text>
      </TouchableOpacity>

      {/* ── Result ────────────────────────────────── */}
      {result === null && (
        <View style={styles.ignoredCard}>
          <Text style={styles.ignoredEmoji}>🚫</Text>
          <Text style={styles.ignoredText}>
            Ignored — Not a debit transaction
          </Text>
          <Text style={styles.ignoredHint}>
            OTP, credit, refund, or promo detected
          </Text>
        </View>
      )}

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Parsed Transaction</Text>

          <Row label="Amount" value={`₹${result.amount.toFixed(2)}`} accent="#4ECDC4" />
          <Row label="Merchant" value={result.merchant} />
          <Row
            label="Detected App"
            value={result.app_name ?? '—'}
            accent={result.app_name ? '#FFD93D' : '#555'}
          />
          <Row
            label="Auto-Category"
            value={`${cat?.icon ?? '📦'} ${cat?.label ?? result.category}`}
            accent={cat?.color}
          />

          {/* ── Save button ──────────────────────── */}
          <TouchableOpacity
            style={[styles.saveBtn, saved && styles.saveBtnDone]}
            onPress={handleSave}
            disabled={saved}
          >
            <Text style={styles.saveBtnText}>
              {saved ? '✅ Saved to Plutilya' : '💾  Save to Plutilya'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Clear button ─────────────────────────── */}
      {inputText.length > 0 && (
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={() => {
            setInputText('');
            setResult(undefined);
            setSaved(false);
          }}
        >
          <Text style={styles.clearBtnText}>Clear</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

// ─── Helper row component ────────────────────────────────────────────
function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, accent ? { color: accent } : undefined]}>
        {value}
      </Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  label: { color: '#888', fontSize: 13 },
  value: { color: '#F5F5F5', fontSize: 14, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
});

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  content: { padding: 20, paddingBottom: 48 },

  title: { color: '#F5F5F5', fontSize: 24, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: '#888', fontSize: 13, marginBottom: 16 },

  label: { color: '#AAA', fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 8 },

  chipScroll: { marginBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1A1A1A',
    marginRight: 8,
  },
  chipActive: { borderColor: '#7C5CFC', backgroundColor: '#7C5CFC20' },
  chipLabel: { color: '#AAA', fontSize: 12 },
  chipLabelActive: { color: '#7C5CFC', fontWeight: '600' },

  textArea: {
    backgroundColor: '#1A1A1A',
    color: '#F5F5F5',
    borderRadius: 10,
    padding: 14,
    fontSize: 13,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    lineHeight: 20,
  },

  parseBtn: {
    backgroundColor: '#7C5CFC',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  parseBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  ignoredCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FF6B6B30',
  },
  ignoredEmoji: { fontSize: 36, marginBottom: 8 },
  ignoredText: { color: '#FF6B6B', fontSize: 16, fontWeight: '700' },
  ignoredHint: { color: '#666', fontSize: 12, marginTop: 4 },

  resultCard: {
    backgroundColor: '#161616',
    borderRadius: 14,
    padding: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  resultTitle: { color: '#F5F5F5', fontSize: 16, fontWeight: '700', marginBottom: 8 },

  saveBtn: {
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnDone: { backgroundColor: '#333' },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  clearBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 10,
  },
  clearBtnText: { color: '#666', fontSize: 13, textDecorationLine: 'underline' },
});
