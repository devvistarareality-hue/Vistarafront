import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StatusBar, ActivityIndicator, Alert, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchUsers, deleteUser,
  updateUser, resetUpdateUser,
} from '../../redux/actions/userManagementActions';
import { COLORS } from '../../constants/theme';

const ROLES = ['All', 'Admin', 'Sales', 'Pre-Sales', 'HR', 'Exec'];

const ROLE_AVATAR_COLOR = {
  Admin:       '#182350',
  Sales:       '#F9A825',
  'Pre-Sales': '#0097A7',
  HR:          '#3D5AFE',
  Exec:        '#7B1FA2',
};

const ROLE_BADGE_STYLE = {
  Admin:       { bg: '#E8EEFF', text: '#3D5AFE' },
  Sales:       { bg: '#FFF8E1', text: '#E6960A' },
  'Pre-Sales': { bg: '#E0F7FA', text: '#0097A7' },
  HR:          { bg: '#E8EEFF', text: '#3D5AFE' },
  Exec:        { bg: '#F3E5F5', text: '#7B1FA2' },
};

function UserCard({ user, onDelete, onEdit, onDeactivate, onActivate }) {
  const initials = user.name ? user.name[0].toUpperCase() : '?';
  const avatarBg = user.is_active
    ? (ROLE_AVATAR_COLOR[user.role] || '#8492A6')
    : '#9CA3AF';
  const badge    = ROLE_BADGE_STYLE[user.role] || { bg: '#F0F0F0', text: '#555' };

  const confirmDelete = () =>
    Alert.alert(
      'Delete User',
      `Permanently delete ${user.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(user.id) },
      ],
    );

  const confirmDeactivate = () =>
    Alert.alert(
      'Deactivate User',
      `Deactivate ${user.name}? They will no longer be able to log in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Deactivate', style: 'destructive', onPress: () => onDeactivate(user.id) },
      ],
    );

  const confirmActivate = () =>
    Alert.alert(
      'Reactivate User',
      `Reactivate ${user.name}? They will regain access to the system.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Activate', onPress: () => onActivate(user.id) },
      ],
    );

  return (
    <TouchableOpacity
      style={[s.card, !user.is_active && s.cardInactive]}
      activeOpacity={0.85}
      onPress={onEdit}
    >
      {/* Avatar */}
      <View style={[s.avatar, { backgroundColor: avatarBg }]}>
        <Text style={s.avatarText}>{initials}</Text>
      </View>

      {/* Info */}
      <View style={s.cardBody}>
        <Text style={[s.userName, !user.is_active && { color: '#9CA3AF' }]}>{user.name}</Text>
        <Text style={s.userEmail} numberOfLines={1}>{user.email}</Text>
        <View style={s.tagRow}>
          <View style={[s.roleBadge, { backgroundColor: user.is_active ? badge.bg : '#F3F4F6' }]}>
            <Text style={[s.roleBadgeText, { color: user.is_active ? badge.text : '#9CA3AF' }]}>
              {user.role}
            </Text>
          </View>
          {user.is_manager && user.is_active && (
            <View style={s.managerBadge}>
              <Ionicons name="shield-checkmark" size={11} color="#E6960A" />
              <Text style={s.managerBadgeText}>Manager</Text>
            </View>
          )}
          {!user.is_active && (
            <View style={s.inactiveBadge}>
              <Ionicons name="ban" size={10} color="#9CA3AF" />
              <Text style={s.inactiveBadgeText}>Inactive</Text>
            </View>
          )}
          <Text style={s.moduleCount}>
            {user.module_count} {user.module_count === 1 ? 'module' : 'modules'}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={{ gap: 6, alignItems: 'center' }}>
        <TouchableOpacity
          style={s.editBtn}
          onPress={onEdit}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="pencil-outline" size={15} color={COLORS.secondary} />
        </TouchableOpacity>

        {user.is_active
          ? (
            <TouchableOpacity
              style={s.deactBtn}
              onPress={confirmDeactivate}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="ban-outline" size={15} color="#EA580C" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={s.activateBtn}
              onPress={confirmActivate}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="checkmark-circle-outline" size={15} color="#15803D" />
            </TouchableOpacity>
          )
        }

        <TouchableOpacity
          style={s.deleteBtn}
          onPress={confirmDelete}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="trash-outline" size={15} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function UserManagementScreen({ navigation }) {
  const dispatch = useDispatch();
  const { users, loading, error, updating, updateSuccess, updateError } =
    useSelector((s) => s.userManagement);
  const [search,     setSearch]     = useState('');
  const [activeRole, setActiveRole] = useState('All');

  useFocusEffect(
    useCallback(() => { dispatch(fetchUsers()); }, [dispatch]),
  );

  useEffect(() => {
    if (updateSuccess) {
      dispatch(resetUpdateUser());
      // user list updates automatically via USER_UPDATE_SUCCESS in reducer
    }
    if (updateError) {
      Alert.alert('Error', updateError);
      dispatch(resetUpdateUser());
    }
  }, [updateSuccess, updateError]);

  const handleDelete     = useCallback((id) => dispatch(deleteUser(id)), [dispatch]);
  const handleDeactivate = useCallback((id) => dispatch(updateUser(id, { is_active: false })), [dispatch]);
  const handleActivate   = useCallback((id) => dispatch(updateUser(id, { is_active: true  })), [dispatch]);

  const filtered = users.filter((u) => {
    const matchRole   = activeRole === 'All' || u.role === activeRole;
    const matchSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const activeCount   = users.filter((u) => u.is_active).length;
  const inactiveCount = users.filter((u) => !u.is_active).length;

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>User Management</Text>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: COLORS.secondary }]}
          onPress={() => navigation.navigate('CreateUser')}
        >
          <Ionicons name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* ── Stats strip ── */}
      <View style={s.statsStrip}>
        <View style={s.statItem}>
          <View style={[s.statDot, { backgroundColor: '#22C55E' }]} />
          <Text style={s.statText}>{activeCount} active</Text>
        </View>
        {inactiveCount > 0 && (
          <View style={s.statItem}>
            <View style={[s.statDot, { backgroundColor: '#9CA3AF' }]} />
            <Text style={s.statText}>{inactiveCount} inactive</Text>
          </View>
        )}
      </View>

      {/* ── Search ── */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name or email..."
          placeholderTextColor={COLORS.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Role filter tabs ── */}
      <View style={s.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r}
              style={[s.tab, activeRole === r && s.tabActive]}
              onPress={() => setActiveRole(r)}
            >
              <Text style={[s.tabText, activeRole === r && s.tabTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Count ── */}
      <Text style={s.countLabel}>
        {loading ? '' : `${filtered.length} ${filtered.length === 1 ? 'user' : 'users'}`}
      </Text>

      {/* ── Content ── */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.secondary} style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={s.errorText}>{error}</Text>
      ) : filtered.length === 0 ? (
        <Text style={s.emptyText}>No users found.</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => String(u.id)}
          renderItem={({ item }) => (
            <UserCard
              user={item}
              onDelete={handleDelete}
              onDeactivate={handleDeactivate}
              onActivate={handleActivate}
              onEdit={() => navigation.navigate('CreateUser', { user: item })}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30, paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: '#F5F6FA' },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEF1F7' },
  iconBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F0F3FA', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },

  statsStrip:  { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  statItem:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statDot:     { width: 7, height: 7, borderRadius: 4 },
  statText:    { fontSize: 12, fontWeight: '600', color: '#6B7280' },

  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, elevation: 2, shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 6 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },

  tabsWrapper:  { height: 44, marginTop: 14 },
  tabsRow:      { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tab:          { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#DDE3F0' },
  tabActive:    { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  tabText:      { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  tabTextActive:{ color: '#fff', fontWeight: '700' },

  countLabel:   { marginHorizontal: 16, marginTop: 12, marginBottom: 4, fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },

  card:        { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 8 },
  cardInactive:{ backgroundColor: '#F9FAFB', opacity: 0.85 },
  avatar:      { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText:  { fontSize: 18, fontWeight: '700', color: '#fff' },
  cardBody:    { flex: 1 },
  userName:    { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2 },
  userEmail:   { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },

  tagRow:           { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  roleBadge:        { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  roleBadgeText:    { fontSize: 11, fontWeight: '600' },
  managerBadge:     { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1, borderColor: '#F9A825', backgroundColor: '#FFFBF0' },
  managerBadgeText: { fontSize: 11, fontWeight: '600', color: '#E6960A' },
  inactiveBadge:    { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: '#F3F4F6' },
  inactiveBadgeText:{ fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  moduleCount:      { fontSize: 11, color: COLORS.textSecondary },

  editBtn:     { padding: 6, borderRadius: 8, backgroundColor: '#EEF1FF' },
  deactBtn:    { padding: 6, borderRadius: 8, backgroundColor: '#FFF7ED' },
  activateBtn: { padding: 6, borderRadius: 8, backgroundColor: '#F0FDF4' },
  deleteBtn:   { padding: 6, borderRadius: 8, backgroundColor: '#FEF2F2' },

  errorText:   { textAlign: 'center', marginTop: 40, color: COLORS.error, fontSize: 14 },
  emptyText:   { textAlign: 'center', marginTop: 40, color: COLORS.textSecondary, fontSize: 14 },
});
