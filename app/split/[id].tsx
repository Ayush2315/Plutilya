import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Switch, Alert, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { getExpenseById, getItemsByExpenseId } from '../../src/db/itemsRepo';
import { getAllFriends } from '../../src/db/groupsRepo';
import { getAllGroupsWithMembers, type GroupWithMembers } from '../../src/db/groupsRepo';
import { ensureExpenseItems, saveExpenseSplits, type SplitInput } from '../../src/db/splitsRepo';
import {
  calculateItemizedSplit,
  type SplitItem,
  type SplitParticipant,
  type SplitAssignments,
  type ParticipantResult,
} from '../../src/services/splitEngine';
import type { Expense, Friend } from '../../src/types/models';

export default function SplitExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const expenseId = Number(id);

  const [expense, setExpense] = useState<Expense | null>(null);
  const [items, setItems] = useState<SplitItem[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);

  // Participant selection
  const [includeMe, setIncludeMe] = useState(true);
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<number>>(new Set());

  // Assignments: itemId -> participantKey -> qty
  const [assignments, setAssignments] = useState<SplitAssignments>({});

  // Results
  const [results, setResults] = useState<ParticipantResult[]>([]);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [exp, allF, allG] = await Promise.all([
          getExpenseById(expenseId),
          getAllFriends(),
          getAllGroupsWithMembers(),
        ]);
        setExpense(exp);
        setFriends(allF);
        setGroups(allG);

        // Ensure items exist (synthetic for non-itemized)
        const ensured = await ensureExpenseItems(expenseId);
        setItems(ensured);
      })();
    }, [expenseId]),
  );

  // Build participants list
  const participants: SplitParticipant[] = [];
  if (includeMe) participants.push({ id: 'ME', name: 'Me' });
  for (const fid of selectedFriendIds) {
    const f = friends.find((fr) => fr.id === fid);
    if (f) participants.push({ id: f.id, name: f.name });
  }

  // Recalculate whenever inputs change
  useEffect(() => {
    if (!expense || items.length === 0 || participants.length === 0) {
      setResults([]);
      return;
    }
    const r = calculateItemizedSplit({
      expenseTotal: expense.amount,
      items,
      participants,
      assignments,
    });
    setResults(r);
  }, [expense, items, participants.length, includeMe, selectedFriendIds, assignments]);

  // ── Helpers ──────────────────────────────────
  function toggleFriend(fid: number) {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(fid)) next.delete(fid); else next.add(fid);
      return next;
    });
  }

  function selectGroup(g: GroupWithMembers) {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      for (const m of g.members) next.add(m.id);
      return next;
    });
  }

  function setAssign(itemId: number, pKey: string, qty: number) {
    setAssignments((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? {}), [pKey]: Math.max(0, qty) },
    }));
  }

  function getAssign(itemId: number, pKey: string): number {
    return assignments[itemId]?.[pKey] ?? 0;
  }

  function splitItemEqually(itemId: number) {
    if (participants.length === 0) return;
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const newAssign: Record<string, number> = {};
    for (const p of participants) newAssign[String(p.id)] = 1;
    setAssignments((prev) => ({ ...prev, [itemId]: newAssign }));
  }

  // ── Save ─────────────────────────────────────
  async function handleSave() {
    if (results.length === 0) { Alert.alert('No split calculated'); return; }
    setSaving(true);
    try {
      const splitInputs: SplitInput[] = [];
      for (const r of results) {
        if (r.participantId === 'ME') continue; // Don't save ME rows
        for (const bd of r.itemBreakdown) {
          const item = items.find((i) => i.item_name === bd.item_name);
          if (item) {
            splitInputs.push({
              expense_item_id: item.id,
              friend_id: r.participantId as number,
              share_quantity: bd.shareQty,
              share_amount: bd.amount + (r.itemBreakdown.length > 0
                ? (r.extraFeeShare / r.itemBreakdown.length)
                : 0),
            });
          }
        }
        // If no item breakdown but has a final total (equal split of non-itemized)
        if (r.itemBreakdown.length === 0 && r.finalTotal > 0 && items.length > 0) {
          splitInputs.push({
            expense_item_id: items[0].id,
            friend_id: r.participantId as number,
            share_quantity: 1,
            share_amount: r.finalTotal,
          });
        }
      }

      await saveExpenseSplits(expenseId, splitInputs);
      Alert.alert('✅ Split Saved!', '', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unknown');
    } finally {
      setSaving(false);
    }
  }

  if (!expense) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* ── Header ──────────────────────────────── */}
      <Text style={styles.title}>Split: {expense.merchant}</Text>
      <Text style={styles.subtitle}>₹{expense.amount.toFixed(2)}</Text>

      {/* ── Step 1: Participants ────────────────── */}
      <Text style={styles.sectionTitle}>1. Select Participants</Text>

      <View style={styles.meRow}>
        <Text style={styles.meLabel}>🙋 Include Me</Text>
        <Switch value={includeMe} onValueChange={setIncludeMe}
          trackColor={{ false: '#333', true: '#7C5CFC60' }} thumbColor={includeMe ? '#7C5CFC' : '#888'} />
      </View>

      {/* Quick-pick groups */}
      {groups.length > 0 && (
        <>
          <Text style={styles.miniLabel}>Quick-pick Group</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {groups.map((g) => (
              <TouchableOpacity key={g.id} style={styles.groupChip} onPress={() => selectGroup(g)}>
                <Text style={styles.groupChipText}>{g.name} ({g.member_count})</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* Individual friends */}
      <Text style={styles.miniLabel}>Friends</Text>
      <View style={styles.friendsGrid}>
        {friends.map((f) => {
          const sel = selectedFriendIds.has(f.id);
          return (
            <TouchableOpacity key={f.id} style={[styles.friendChip, sel && styles.friendChipActive]}
              onPress={() => toggleFriend(f.id)}>
              <Text style={[styles.friendChipText, sel && styles.friendChipTextActive]}>
                {sel ? '☑ ' : '☐ '}{f.name}
              </Text>
            </TouchableOpacity>
          );
        })}
        {friends.length === 0 && <Text style={styles.muted}>Add friends in Groups tab first.</Text>}
      </View>

      {/* ── Step 2: Assign Items ───────────────── */}
      {participants.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>2. Assign Items</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName} numberOfLines={1}>{item.item_name}</Text>
                <Text style={styles.itemTotal}>₹{(item.unit_price * item.quantity).toFixed(0)}</Text>
              </View>
              <TouchableOpacity style={styles.eqBtn} onPress={() => splitItemEqually(item.id)}>
                <Text style={styles.eqBtnText}>Split Equally</Text>
              </TouchableOpacity>
              {participants.map((p) => {
                const pKey = String(p.id);
                const qty = getAssign(item.id, pKey);
                return (
                  <View key={pKey} style={styles.assignRow}>
                    <Text style={styles.assignName}>{p.name}</Text>
                    <View style={styles.stepper}>
                      <TouchableOpacity style={styles.stepBtn} onPress={() => setAssign(item.id, pKey, qty - 1)}>
                        <Text style={styles.stepBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.stepQty}>{qty}</Text>
                      <TouchableOpacity style={styles.stepBtn} onPress={() => setAssign(item.id, pKey, qty + 1)}>
                        <Text style={styles.stepBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}
        </>
      )}

      {/* ── Step 3: Summary ────────────────────── */}
      {results.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>3. Split Summary</Text>
          {results.map((r) => (
            <View key={String(r.participantId)} style={styles.summaryRow}>
              <View style={styles.summaryLeft}>
                <Text style={styles.summaryName}>{r.name}</Text>
                <Text style={styles.summaryDetail}>
                  Items ₹{r.itemSubtotal.toFixed(2)}
                  {Math.abs(r.extraFeeShare) >= 0.01
                    ? ` ${r.extraFeeShare > 0 ? '+' : ''}₹${r.extraFeeShare.toFixed(2)} fees`
                    : ''}
                </Text>
              </View>
              <Text style={styles.summaryTotal}>₹{r.finalTotal.toFixed(2)}</Text>
            </View>
          ))}

          <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]}
            onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : '💾  Save Split'}</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  content: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center' },
  muted: { color: '#555', fontSize: 13 },

  title: { color: '#F5F5F5', fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#7C5CFC', fontSize: 28, fontWeight: '800', marginTop: 2 },

  sectionTitle: { color: '#F5F5F5', fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 10 },
  miniLabel: { color: '#888', fontSize: 12, fontWeight: '600', marginTop: 8, marginBottom: 4 },

  meRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  meLabel: { color: '#F5F5F5', fontSize: 15, fontWeight: '600' },

  groupChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A', marginRight: 8,
  },
  groupChipText: { color: '#AAA', fontSize: 13 },

  friendsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  friendChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2A2A2A',
  },
  friendChipActive: { borderColor: '#7C5CFC', backgroundColor: '#7C5CFC20' },
  friendChipText: { color: '#AAA', fontSize: 13 },
  friendChipTextActive: { color: '#7C5CFC', fontWeight: '600' },

  itemCard: {
    backgroundColor: '#161616', borderRadius: 12, padding: 12,
    marginBottom: 10, borderWidth: 1, borderColor: '#1E1E1E',
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  itemName: { color: '#F5F5F5', fontSize: 14, fontWeight: '600', flex: 1, marginRight: 8 },
  itemTotal: { color: '#4ECDC4', fontSize: 14, fontWeight: '700' },

  eqBtn: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, backgroundColor: '#7C5CFC20', borderWidth: 1, borderColor: '#7C5CFC', marginBottom: 6,
  },
  eqBtnText: { color: '#7C5CFC', fontSize: 11, fontWeight: '600' },

  assignRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  assignName: { color: '#CCC', fontSize: 13, flex: 1 },

  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#252525', alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { color: '#F5F5F5', fontSize: 16, fontWeight: '700' },
  stepQty: { color: '#F5F5F5', fontSize: 15, fontWeight: '700', marginHorizontal: 10 },

  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#161616', borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#1E1E1E',
  },
  summaryLeft: { flex: 1 },
  summaryName: { color: '#F5F5F5', fontSize: 15, fontWeight: '700' },
  summaryDetail: { color: '#888', fontSize: 11, marginTop: 2 },
  summaryTotal: { color: '#4ECDC4', fontSize: 18, fontWeight: '800' },

  saveBtn: {
    backgroundColor: '#7C5CFC', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 20,
  },
  saveBtnText: { color: '#FFF', fontSize: 17, fontWeight: '700' },
});
