import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  getAllFriends,
  addFriend,
  deleteFriend,
  getAllGroupsWithMembers,
  createGroup,
  type GroupWithMembers,
} from '../../src/db/groupsRepo';
import type { Friend } from '../../src/types/models';

type Tab = 'groups' | 'friends';

export default function GroupsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('groups');

  // ── Data ─────────────────────────────────────────
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groups, setGroups] = useState<GroupWithMembers[]>([]);

  // ── Friend modal ────────────────────────────────
  const [showFriendModal, setShowFriendModal] = useState(false);
  const [friendName, setFriendName] = useState('');
  const [friendPhone, setFriendPhone] = useState('');

  // ── Group modal ─────────────────────────────────
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<Set<number>>(new Set());

  const loadData = useCallback(async () => {
    const [f, g] = await Promise.all([
      getAllFriends(),
      getAllGroupsWithMembers(),
    ]);
    setFriends(f);
    setGroups(g);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // ── Friend CRUD ────────────────────────────────
  async function handleAddFriend() {
    if (!friendName.trim()) {
      Alert.alert('Required', 'Enter a name.');
      return;
    }
    await addFriend(friendName.trim(), friendPhone.trim() || undefined);
    setFriendName('');
    setFriendPhone('');
    setShowFriendModal(false);
    loadData();
  }

  function confirmDeleteFriend(f: Friend) {
    Alert.alert('Delete friend?', `Remove "${f.name}"? They'll be removed from all groups.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteFriend(f.id);
          loadData();
        },
      },
    ]);
  }

  // ── Group CRUD ─────────────────────────────────
  function openGroupModal() {
    setGroupName('');
    setSelectedFriendIds(new Set());
    setShowGroupModal(true);
  }

  function toggleFriendSelection(id: number) {
    setSelectedFriendIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreateGroup() {
    if (!groupName.trim()) {
      Alert.alert('Required', 'Enter a group name.');
      return;
    }
    if (selectedFriendIds.size === 0) {
      Alert.alert('No members', 'Select at least one friend.');
      return;
    }
    await createGroup(groupName.trim(), Array.from(selectedFriendIds));
    setShowGroupModal(false);
    loadData();
  }

  // ════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════

  return (
    <View style={styles.container}>
      {/* ── Segmented toggle ────────────────────── */}
      <View style={styles.segRow}>
        {(['groups', 'friends'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.segBtn, tab === t && styles.segBtnActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.segText, tab === t && styles.segTextActive]}>
              {t === 'groups' ? '👥 Groups' : '🧑 Friends'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Groups list ─────────────────────────── */}
      {tab === 'groups' && (
        <>
          <FlatList
            data={groups}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.empty}>No groups yet — create one below.</Text>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => router.push(`/group/${item.id}` as `/group/${string}`)}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.member_count}</Text>
                  </View>
                </View>
                <Text style={styles.cardSub} numberOfLines={1}>
                  {item.members.length > 0
                    ? item.members.map((m) => m.name).join(', ')
                    : 'No members'}
                </Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.fab} onPress={openGroupModal}>
            <Text style={styles.fabText}>+ New Group</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ── Friends list ────────────────────────── */}
      {tab === 'friends' && (
        <>
          <FlatList
            data={friends}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.empty}>No friends added yet.</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.friendRow}>
                  <View style={styles.friendInfo}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    {item.phone_number ? (
                      <Text style={styles.cardSub}>{item.phone_number}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => confirmDeleteFriend(item)}
                  >
                    <Text style={styles.deleteBtnText}>🗑</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              setFriendName('');
              setFriendPhone('');
              setShowFriendModal(true);
            }}
          >
            <Text style={styles.fabText}>+ Add Friend</Text>
          </TouchableOpacity>
        </>
      )}

      {/* ═══ Add Friend Modal ═══════════════════════ */}
      <Modal
        visible={showFriendModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFriendModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Friend</Text>

            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Friend's name"
              placeholderTextColor="#555"
              value={friendName}
              onChangeText={setFriendName}
            />

            <Text style={styles.inputLabel}>Phone (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 9876543210"
              placeholderTextColor="#555"
              keyboardType="phone-pad"
              value={friendPhone}
              onChangeText={setFriendPhone}
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowFriendModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddFriend}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═══ Create Group Modal ═════════════════════ */}
      <Modal
        visible={showGroupModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGroupModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>New Group</Text>

            <Text style={styles.inputLabel}>Group Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Goa Trip, Flatmates"
              placeholderTextColor="#555"
              value={groupName}
              onChangeText={setGroupName}
            />

            <Text style={styles.inputLabel}>Select Members *</Text>
            {friends.length === 0 ? (
              <Text style={styles.hint}>
                Add friends first (switch to Friends tab).
              </Text>
            ) : (
              <ScrollView style={styles.memberPicker}>
                {friends.map((f) => {
                  const selected = selectedFriendIds.has(f.id);
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={[styles.memberRow, selected && styles.memberRowActive]}
                      onPress={() => toggleFriendSelection(f.id)}
                    >
                      <Text style={styles.checkbox}>
                        {selected ? '☑' : '☐'}
                      </Text>
                      <Text style={styles.memberName}>{f.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowGroupModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateGroup}>
                <Text style={styles.saveBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },

  /* segmented toggle */
  segRow: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  segBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  segBtnActive: { backgroundColor: '#7C5CFC25' },
  segText: { color: '#888', fontSize: 14, fontWeight: '600' },
  segTextActive: { color: '#7C5CFC' },

  /* list */
  listContent: { paddingHorizontal: 16, paddingBottom: 80 },
  empty: { color: '#555', fontSize: 14, textAlign: 'center', marginTop: 32 },

  /* card */
  card: {
    backgroundColor: '#161616',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#F5F5F5', fontSize: 16, fontWeight: '700' },
  cardSub: { color: '#888', fontSize: 13, marginTop: 4 },
  badge: {
    backgroundColor: '#7C5CFC30',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: '#7C5CFC', fontSize: 12, fontWeight: '700' },

  /* friend row */
  friendRow: { flexDirection: 'row', alignItems: 'center' },
  friendInfo: { flex: 1 },
  deleteBtn: { padding: 6 },
  deleteBtnText: { fontSize: 18 },

  /* fab */
  fab: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#7C5CFC',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 14,
    elevation: 6,
    shadowColor: '#7C5CFC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  fabText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  /* modal */
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalSheet: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: { color: '#F5F5F5', fontSize: 20, fontWeight: '800', marginBottom: 16 },

  inputLabel: { color: '#AAA', fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#252525',
    color: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
  },

  hint: { color: '#666', fontSize: 13, marginTop: 4 },

  memberPicker: { maxHeight: 200, marginTop: 4 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  memberRowActive: { backgroundColor: '#7C5CFC15' },
  checkbox: { color: '#7C5CFC', fontSize: 20, marginRight: 10 },
  memberName: { color: '#F5F5F5', fontSize: 15 },

  modalBtns: { flexDirection: 'row', marginTop: 20, gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  cancelBtnText: { color: '#888', fontSize: 15, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: '#7C5CFC',
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
