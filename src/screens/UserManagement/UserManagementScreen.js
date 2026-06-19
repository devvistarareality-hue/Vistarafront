import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StatusBar, ActivityIndicator, Alert, StyleSheet, ScrollView, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchUsers, deleteUser,
  updateUser, resetUpdateUser,
} from '../../redux/actions/userManagementActions';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const ROLES = ['All', 'Admin', 'Sales', 'HR', 'Exec'];

const ROLE_AVATAR_COLOR = {
  Admin:       COLORS.navy,
  Sales:       '#F9A825',
  HR:          COLORS.link,
  Exec:        '#7B1FA2',
};

const ROLE_BADGE_STYLE = {
  Admin:  { bg: '#E8EEFF', text: COLORS.navy },
  Sales:  { bg: '#FFF8E1', text: '#F9A825' },
  HR:     { bg: '#EEF0FF', text: COLORS.link },
  Exec:   { bg: '#F3E5F5', text: '#7B1FA2' },
};

export default function UserManagementScreen({ navigation }) {
  const dispatch = useDispatch();
  const { users, loading, error } = useSelector((s) => s.userManagement);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { dispatch(fetchUsers()); }, [dispatch]));
  useEffect(() => { if (error) Alert.alert('Error', error); }, [error]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchUsers());
    setRefreshing(false);
  }, [dispatch]);

  const handleToggle = (user) => {
    dispatch(updateUser({ id: user.id, is_active: !user.is_active }));
  };

  const handleDelete = (user) => {
    Alert.alert('Delete User', `Delete ${user.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteUser(user.id)) },
    ]);
  };

  const filtered = users.filter((u) => {
    const matchRole = role === 'All' || u.role === role;
    const matchSearch = !search.trim() ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.user_code?.toLowerCase().includes(search.toLowerCase()) ||
      u.phone?.toLowerCase().includes(search.toLowerCase()) ||
      u.designation?.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const activeCount   = users.filter((u) => u.is_active).length;
  const inactiveCount = users.filter((u) => !u.is_active).length;

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>User Management</Text>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: COLORS.navy }]}
          onPress={() => navigation.navigate('CreateUser')}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats strip */}
      <View style={s.statsStrip}>
        <View style={s.statItem}><View style={[s.statDot, { backgroundColor: '#2E7D32' }]} /><Text style={s.statText}>{activeCount} Active</Text></View>
        <View style={s.statItem}><View style={[s.statDot, { backgroundColor: '#EF4444' }]} /><Text style={s.statText}>{inactiveCount} Inactive</Text></View>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
        <TextInput style={s.searchInput} placeholder="Search users…" value={search} onChangeText={setSearch} />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={COLORS.textSecondary} /></TouchableOpacity> : null}
      </View>

      {/* Role tabs */}
      <View style={s.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
          {ROLES.map((r) => (
            <TouchableOpacity key={r} onPress={() => setRole(r)} style={[s.tab, role === r && s.tabActive]}>
              <Text style={[s.tabText, role === r && s.tabTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.navy} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => String(u.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.navy]} tintColor={COLORS.navy} />}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={[s.avatar, { backgroundColor: ROLE_AVATAR_COLOR[item.role] || '#8492A6' }]}>
                <Text style={s.avatarText}>{(item.name?.[0] || '?').toUpperCase()}</Text>
              </View>
              <View style={s.cardBody}>
                <Text style={s.userName}>{item.name}</Text>
                <Text style={s.userMeta}>{item.email || item.phone || '—'}</Text>
                <View style={s.badgeRow}>
                  <View style={[s.badge, { backgroundColor: (ROLE_BADGE_STYLE[item.role] || {}).bg || '#F5F6FA' }]}>
                    <Text style={[s.badgeText, { color: (ROLE_BADGE_STYLE[item.role] || {}).text || COLORS.textSecondary }]}>{item.role}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: item.is_active ? '#E8F5E9' : '#FEE2E2' }]}>
                    <Text style={[s.statusText, { color: item.is_active ? '#2E7D32' : '#EF4444' }]}>{item.is_active ? 'Active' : 'Inactive'}</Text>
                  </View>
                </View>
              </View>
              <View style={s.actions}>
                <TouchableOpacity style={s.editBtn} onPress={() => navigation.navigate('CreateUser', { user: item })}>
                  <Ionicons name="pencil" size={16} color={COLORS.link} />
                </TouchableOpacity>
                <TouchableOpacity style={s.toggleBtn} onPress={() => handleToggle(item)}>
                  <Ionicons name={item.is_active ? 'pause-circle' : 'checkmark-circle'} size={20} color={item.is_active ? '#E65100' : '#2E7D32'} />
                </TouchableOpacity>
                <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item)}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            !loading && <Text style={{ textAlign: 'center', marginTop: 40, color: COLORS.textSecondary }}>No users found</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: COLORS.screenBg },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.cardBg, borderBottomWidth: 1, borderBottomColor: '#F0F3FA' },
  iconBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F3FA', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },

  statsStrip:  { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.cardBg, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  statItem:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statDot:     { width: 7, height: 7, borderRadius: 4 },
  statText:    { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },

  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.cardBg, marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, ...CARD_SHADOW },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },

  tabsWrapper:  { height: 44, marginTop: 14 },
  tabsRow:      { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tab:          { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.cardBg, borderWidth: 1.5, borderColor: '#DDE3F0' },
  tabActive:    { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  tabText:      { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  tabTextActive:{ color: '#fff', fontWeight: '700' },

  card:        { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 14, marginTop: 10, ...CARD_SHADOW },
  avatar:      { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText:  { fontSize: 18, fontWeight: '700', color: '#fff' },
  cardBody:    { flex: 1 },
  userName:    { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  userMeta:    { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  badgeRow:    { flexDirection: 'row', gap: 6 },
  badge:       { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText:  { fontSize: 10, fontWeight: '700' },

  actions:     { flexDirection: 'column', gap: 6, marginLeft: 8 },
  editBtn:     { padding: 6, borderRadius: 8, backgroundColor: '#EEF1FF' },
  toggleBtn:   { padding: 2 },
  deleteBtn:   { padding: 6, borderRadius: 8, backgroundColor: '#FEF2F2' },
});
