import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  getGroupById,
  deleteGroup,
  removeMemberFromGroup,
  addMemberToGroup,
  getAllFriends,
  type GroupWithMembers,
} from '../../src/db/groupsRepo';
import type { Friend } from '../../src/types/models';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [allFriends, setAllFriends] = useState<Friend[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [g, friends] = await Promise.all([
      getGroupById(Number(id)),
      getAllFriends(),
    ]);
    setGroup(g);
    setAllFriends(friends);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // ── Remove member ─────────────────────────────
  function confirmRemoveMember(friend: Friend) {
    if (!group) return;
    Alert.alert(
      'Remove member?',
      `Remove "${friend.name}" from "${group.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeMemberFromGroup(group.id, friend.id);
            load();
          },
        },
      ],
    );
  }

  // ── Add member ────────────────────────────────
  const nonMembers = allFriends.filter(
    (f) => !group?.members.some((m) => m.id === f.id),
  );

  async function handleAddMember(friendId: number) {
    if (!group) return;
    await addMemberToGroup(group.id, friendId);
    setShowAddModal(false);
    load();
  }

  // ── Delete group ──────────────────────────────
  function confirmDeleteGroup() {
    if (!group) return;
    Alert.alert('Delete group?', `Permanently delete "${group.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteGroup(group.id);
          router.back();
        },
      },
    ]);
  }

  if (!group) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Loading…</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={group.members}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <>
          {/* ── Group header ───────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.headerIcon}>👥</Text>
            <Text style={styles.headerName}>{group.name}</Text>
            <Text style={styles.headerCount}>
              {group.member_count} member{group.member_count !== 1 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Members</Text>
            {nonMembers.length > 0 && (
              <TouchableOpacity
                style={styles.addMemberBtn}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.addMemberBtnText}>+ Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {group.members.length === 0 && (
            <Text style={styles.emptyText}>No members yet.</Text>
          )}
        </>
      }
      renderItem={({ item }) => (
        <View style={styles.memberCard}>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{item.name}</Text>
            {item.phone_number ? (
              <Text style={styles.memberPhone}>{item.phone_number}</Text>
            ) : null}
          </View>
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => confirmRemoveMember(item)}
          >
            <Text style={styles.removeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
      ListFooterComponent={
        <>
          {/* ── Placeholder for future ─────────────── */}
          <View style={styles.placeholderCard}>
            <Text style={styles.placeholderIcon}>📋</Text>
            <Text style={styles.placeholderTitle}>
              Shared Expenses &amp; Dues
            </Text>
            <Text style={styles.placeholderSub}>
              Coming in Milestone 5/6 — split bills, track who owes whom, and settle up.
            </Text>
          </View>

          {/* ── Delete group ──────────────────────── */}
          <TouchableOpacity
            style={styles.deleteGroupBtn}
            onPress={confirmDeleteGroup}
          >
            <Text style={styles.deleteGroupBtnText}>🗑  Delete Group</Text>
          </TouchableOpacity>
        </>
      }
    >
      {/* ═══ Add Member Modal ══════════════════════ */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Member</Text>
            {nonMembers.length === 0 ? (
              <Text style={styles.emptyText}>
                All your friends are already in this group.
              </Text>
            ) : (
              <ScrollView style={styles.friendList}>
                {nonMembers.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={styles.friendRow}
                    onPress={() => handleAddMember(f.id)}
                  >
                    <Text style={styles.friendName}>{f.name}</Text>
                    <Text style={styles.friendAdd}>+ Add</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowAddModal(false)}
            >
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </FlatList>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: '#0D0D0D', alignItems: 'center', justifyContent: 'center' },

  /* header */
  header: { alignItems: 'center', paddingVertical: 16 },
  headerIcon: { fontSize: 44 },
  headerName: { color: '#F5F5F5', fontSize: 24, fontWeight: '800', marginTop: 8 },
  headerCount: { color: '#888', fontSize: 13, marginTop: 2 },

  /* section */
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 10 },
  sectionTitle: { color: '#F5F5F5', fontSize: 16, fontWeight: '700' },
  addMemberBtn: {
    backgroundColor: '#7C5CFC25',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#7C5CFC',
  },
  addMemberBtnText: { color: '#7C5CFC', fontSize: 13, fontWeight: '600' },

  emptyText: { color: '#555', fontSize: 14, textAlign: 'center', marginTop: 12 },

  /* member card */
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  memberInfo: { flex: 1 },
  memberName: { color: '#F5F5F5', fontSize: 15, fontWeight: '600' },
  memberPhone: { color: '#666', fontSize: 12, marginTop: 2 },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B6B20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: '#FF6B6B', fontSize: 14, fontWeight: '700' },

  /* placeholder */
  placeholderCard: {
    backgroundColor: '#161616',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginTop: 28,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderStyle: 'dashed',
  },
  placeholderIcon: { fontSize: 32, marginBottom: 8 },
  placeholderTitle: { color: '#7C5CFC', fontSize: 16, fontWeight: '700' },
  placeholderSub: { color: '#666', fontSize: 13, textAlign: 'center', marginTop: 6, lineHeight: 19 },

  /* delete group */
  deleteGroupBtn: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B6B40',
    alignItems: 'center',
  },
  deleteGroupBtnText: { color: '#FF6B6B', fontSize: 15, fontWeight: '600' },

  /* modal */
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: { color: '#F5F5F5', fontSize: 20, fontWeight: '800', marginBottom: 16 },

  friendList: { maxHeight: 300 },
  friendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  friendName: { color: '#F5F5F5', fontSize: 15 },
  friendAdd: { color: '#7C5CFC', fontSize: 13, fontWeight: '700' },

  cancelBtn: {
    marginTop: 16,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  cancelBtnText: { color: '#888', fontSize: 15, fontWeight: '600' },
});
