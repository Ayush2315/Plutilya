import { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, Alert,
  Modal, ScrollView, Share, StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  getGroupById, deleteGroup, removeMemberFromGroup,
  addMemberToGroup, getAllFriends, type GroupWithMembers,
} from '../../src/db/groupsRepo';
import { getGroupDuesSummary, type GroupDuesRow } from '../../src/db/splitsRepo';
import type { Friend } from '../../src/types/models';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const groupId = Number(id);

  const [group, setGroup] = useState<GroupWithMembers | null>(null);
  const [allFriends, setAllFriends] = useState<Friend[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [dues, setDues] = useState<GroupDuesRow[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    const [g, friends, d] = await Promise.all([
      getGroupById(groupId),
      getAllFriends(),
      getGroupDuesSummary(groupId),
    ]);
    setGroup(g);
    setAllFriends(friends);
    setDues(d);
  }, [id, groupId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function confirmRemoveMember(friend: Friend) {
    if (!group) return;
    Alert.alert('Remove member?', `Remove "${friend.name}" from "${group.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await removeMemberFromGroup(group.id, friend.id); load(); } },
    ]);
  }

  const nonMembers = allFriends.filter((f) => !group?.members.some((m) => m.id === f.id));

  async function handleAddMember(friendId: number) {
    if (!group) return;
    await addMemberToGroup(group.id, friendId);
    setShowAddModal(false);
    load();
  }

  function confirmDeleteGroup() {
    if (!group) return;
    Alert.alert('Delete group?', `Permanently delete "${group.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteGroup(group.id); router.back(); } },
    ]);
  }

  async function handleReminder(d: GroupDuesRow) {
    const msg = `Hey ${d.friend_name}! 👋\nYou owe ₹${d.total_unsettled.toFixed(2)} from shared expenses in "${group?.name ?? 'our group'}". Please settle when convenient!\n\n📲 _Sent via Plutilya_`;
    await Share.share({ message: msg });
  }

  if (!group) {
    return (
      <View style={styles.center}><Text style={styles.emptyText}>Loading…</Text></View>
    );
  }

  const pendingDues = dues.filter((d) => d.total_unsettled > 0);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={group.members}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <>
          <View style={styles.header}>
            <Text style={styles.headerIcon}>👥</Text>
            <Text style={styles.headerName}>{group.name}</Text>
            <Text style={styles.headerCount}>
              {group.member_count} member{group.member_count !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* ── Pending Dues ───────────────────────── */}
          {pendingDues.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>💸 Pending Dues</Text>
              {pendingDues.map((d) => (
                <View key={d.friend_id} style={styles.duesRow}>
                  <View style={styles.duesLeft}>
                    <Text style={styles.duesName}>{d.friend_name}</Text>
                    <Text style={styles.duesAmount}>owes ₹{d.total_unsettled.toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity style={styles.reminderBtn} onPress={() => handleReminder(d)}>
                    <Text style={styles.reminderBtnText}>📤 Remind</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
          {pendingDues.length === 0 && dues.length > 0 && (
            <View style={styles.allClearCard}>
              <Text style={styles.allClearText}>✅ All settled — no pending dues!</Text>
            </View>
          )}

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Members</Text>
            {nonMembers.length > 0 && (
              <TouchableOpacity style={styles.addMemberBtn} onPress={() => setShowAddModal(true)}>
                <Text style={styles.addMemberBtnText}>+ Add</Text>
              </TouchableOpacity>
            )}
          </View>
          {group.members.length === 0 && <Text style={styles.emptyText}>No members yet.</Text>}
        </>
      }
      renderItem={({ item }) => (
        <View style={styles.memberCard}>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{item.name}</Text>
            {item.phone_number ? <Text style={styles.memberPhone}>{item.phone_number}</Text> : null}
          </View>
          <TouchableOpacity style={styles.removeBtn} onPress={() => confirmRemoveMember(item)}>
            <Text style={styles.removeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}
      ListFooterComponent={
        <TouchableOpacity style={styles.deleteGroupBtn} onPress={confirmDeleteGroup}>
          <Text style={styles.deleteGroupBtnText}>🗑  Delete Group</Text>
        </TouchableOpacity>
      }
    >
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add Member</Text>
            {nonMembers.length === 0
              ? <Text style={styles.emptyText}>All friends are in this group.</Text>
              : (
                <ScrollView style={styles.friendList}>
                  {nonMembers.map((f) => (
                    <TouchableOpacity key={f.id} style={styles.friendRow} onPress={() => handleAddMember(f.id)}>
                      <Text style={styles.friendName}>{f.name}</Text>
                      <Text style={styles.friendAdd}>+ Add</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
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

  header: { alignItems: 'center', paddingVertical: 16 },
  headerIcon: { fontSize: 44 },
  headerName: { color: '#F5F5F5', fontSize: 24, fontWeight: '800', marginTop: 8 },
  headerCount: { color: '#888', fontSize: 13, marginTop: 2 },

  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 10 },
  sectionTitle: { color: '#F5F5F5', fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 10 },
  addMemberBtn: { backgroundColor: '#7C5CFC25', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#7C5CFC' },
  addMemberBtnText: { color: '#7C5CFC', fontSize: 13, fontWeight: '600' },

  emptyText: { color: '#555', fontSize: 14, textAlign: 'center', marginTop: 12 },

  /* dues */
  duesRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#161616',
    borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#FF6B6B30',
  },
  duesLeft: { flex: 1 },
  duesName: { color: '#F5F5F5', fontSize: 15, fontWeight: '600' },
  duesAmount: { color: '#FF6B6B', fontSize: 13, marginTop: 2 },
  reminderBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#25D36620', borderWidth: 1, borderColor: '#25D366',
  },
  reminderBtnText: { color: '#25D366', fontSize: 12, fontWeight: '700' },

  allClearCard: {
    backgroundColor: '#161616', borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: '#4ECDC430',
  },
  allClearText: { color: '#4ECDC4', fontSize: 14, fontWeight: '600' },

  memberCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#161616',
    borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#1E1E1E',
  },
  memberInfo: { flex: 1 },
  memberName: { color: '#F5F5F5', fontSize: 15, fontWeight: '600' },
  memberPhone: { color: '#666', fontSize: 12, marginTop: 2 },
  removeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FF6B6B20', alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { color: '#FF6B6B', fontSize: 14, fontWeight: '700' },

  deleteGroupBtn: { marginTop: 24, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FF6B6B40', alignItems: 'center' },
  deleteGroupBtnText: { color: '#FF6B6B', fontSize: 15, fontWeight: '600' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalSheet: { backgroundColor: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  modalTitle: { color: '#F5F5F5', fontSize: 20, fontWeight: '800', marginBottom: 16 },
  friendList: { maxHeight: 300 },
  friendRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#252525' },
  friendName: { color: '#F5F5F5', fontSize: 15 },
  friendAdd: { color: '#7C5CFC', fontSize: 13, fontWeight: '700' },
  cancelBtn: { marginTop: 16, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
  cancelBtnText: { color: '#888', fontSize: 15, fontWeight: '600' },
});
