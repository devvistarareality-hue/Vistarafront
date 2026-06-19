import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StatusBar, ActivityIndicator, Alert, ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { fetchCompanies, updateCompany, resetUpdateCompany, deleteCompany } from '../../redux/actions/companiesActions';
import { COLORS } from '../../constants/theme';

const STATUS_FILTERS = ['All', 'Active', 'Inactive'];

const AVATAR_COLORS = ['#182350', '#0097A7', '#3D5AFE', '#2E7D32', '#E65100', '#6A1B9A', '#F9A825'];

function avatarColor(name = '') {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx] || '#182350';
}

function CompanyCard({ company, onEdit, onDeactivate, onActivate, onDelete }) {
  const initial = company.name ? company.name[0].toUpperCase() : '?';
  const bg      = avatarColor(company.name);

  return (
    <TouchableOpacity style={[s.card, !company.is_active && s.cardInactive]} activeOpacity={0.85} onPress={onEdit}>
      <View style={[s.avatar, { backgroundColor: company.is_active ? bg : '#9CA3AF' }]}>
        <Text style={s.avatarText}>{initial}</Text>
      </View>

      <View style={s.cardBody}>
        <Text style={[s.companyName, !company.is_active && { color: '#9CA3AF' }]} numberOfLines={1}>
          {company.name}
        </Text>
        <View style={s.tagRow}>
          <View style={s.codeBadge}>
            <Text style={s.codeText}>{company.code}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: company.is_active ? '#E8F5E9' : '#F5F6FA' }]}>
            <Text style={[s.statusText, { color: company.is_active ? COLORS.success : COLORS.textSecondary }]}>
              {company.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ gap: 6, alignItems: 'center' }}>
        <TouchableOpacity
          style={s.editBtn}
          onPress={onEdit}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="pencil-outline" size={15} color={COLORS.secondary} />
        </TouchableOpacity>

        {company.is_active ? (
          <TouchableOpacity
            style={s.deactBtn}
            onPress={onDeactivate}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="ban-outline" size={15} color="#EA580C" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={s.activateBtn}
            onPress={onActivate}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="checkmark-circle-outline" size={15} color="#15803D" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={s.deleteBtn}
          onPress={onDelete}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="trash-outline" size={15} color="#DC2626" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function CompanyManagementScreen({ navigation }) {
  const dispatch = useDispatch();
  const { companies, loading, error, updating, updateSuccess, updateError } = useSelector((s) => s.companies);
  const [search,       setSearch]       = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [refreshing,   setRefreshing]   = useState(false);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchCompanies());
    }, [dispatch]),
  );

  useEffect(() => {
    if (!loading) setRefreshing(false);
  }, [loading]);

  useEffect(() => {
    if (updateError) Alert.alert('Error', updateError, [{ text: 'OK', onPress: () => dispatch(resetUpdateCompany()) }]);
    if (updateSuccess) dispatch(resetUpdateCompany());
  }, [updateSuccess, updateError]);

  const handleDeactivate = useCallback((company) => {
    Alert.alert(
      'Deactivate Company',
      `Deactivate "${company.name}"? Users of this company will no longer be able to log in.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Deactivate', style: 'destructive', onPress: () => dispatch(updateCompany(company.id, { is_active: false })) },
      ],
    );
  }, [dispatch]);

  const handleActivate = useCallback((company) => {
    Alert.alert(
      'Reactivate Company',
      `Reactivate "${company.name}"? Users will regain access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Activate', onPress: () => dispatch(updateCompany(company.id, { is_active: true })) },
      ],
    );
  }, [dispatch]);

  const handleDelete = useCallback((company) => {
    Alert.alert(
      'Delete Company',
      `Permanently delete "${company.name}"? This cannot be undone and all related data will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await dispatch(deleteCompany(company.id));
            if (result && !result.success) {
              Alert.alert('Error', result.error || 'Failed to delete company.');
            }
          },
        },
      ],
    );
  }, [dispatch]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchCompanies());
  }, [dispatch]);

  const filtered = companies.filter((c) => {
    const matchStatus =
      activeFilter === 'All' ||
      (activeFilter === 'Active' && c.is_active) ||
      (activeFilter === 'Inactive' && !c.is_active);
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Company Management</Text>
        <TouchableOpacity
          style={s.iconBtn}
          onPress={() => dispatch(fetchCompanies())}
        >
          <Ionicons name="refresh-outline" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name or code..."
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

      {/* Filter tabs */}
      <View style={s.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[s.tab, activeFilter === f && s.tabActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[s.tabText, activeFilter === f && s.tabTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Count */}
      <Text style={s.countLabel}>
        {loading ? '' : `${filtered.length} ${filtered.length === 1 ? 'company' : 'companies'}`}
      </Text>

      {/* Content */}
      {loading && companies.length === 0 ? (
        <ActivityIndicator size="large" color={COLORS.secondary} style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={s.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item }) => (
            <CompanyCard
              company={item}
              onEdit={() => navigation.navigate('EditCompany', { company: item })}
              onDeactivate={() => handleDeactivate(item)}
              onActivate={() => handleActivate(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 4 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={s.emptyText}>No companies found.</Text>}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.secondary]}
              tintColor={COLORS.secondary}
            />
          }
        />
      )}

      {/* FAB — Create Company */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate('EditCompany', {})}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: '#F5F6FA' },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EEF1F7' },
  iconBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F0F3FA', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },

  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, elevation: 2, shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 6 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },

  tabsWrapper: { height: 44, marginTop: 14 },
  tabsRow:     { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tab:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#DDE3F0' },
  tabActive:   { backgroundColor: COLORS.secondary, borderColor: COLORS.secondary },
  tabText:     { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  countLabel: { marginHorizontal: 16, marginTop: 12, marginBottom: 4, fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },

  card:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 8 },
  avatar:     { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  cardBody:   { flex: 1 },
  companyName:{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },

  tagRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  codeBadge:  { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, backgroundColor: '#E8EEFF' },
  codeText:   { fontSize: 11, fontWeight: '700', color: COLORS.primary, letterSpacing: 0.5 },
  statusBadge:{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },

  cardInactive: { backgroundColor: '#F9FAFB', opacity: 0.85 },
  editBtn:    { padding: 6, borderRadius: 8, backgroundColor: '#EEF1FF' },
  deactBtn:   { padding: 6, borderRadius: 8, backgroundColor: '#FFF7ED' },
  activateBtn:{ padding: 6, borderRadius: 8, backgroundColor: '#F0FDF4' },
  deleteBtn:  { padding: 6, borderRadius: 8, backgroundColor: '#FEF2F2' },

  errorText:  { textAlign: 'center', marginTop: 40, color: COLORS.error, fontSize: 14 },
  emptyText:  { textAlign: 'center', marginTop: 40, color: COLORS.textSecondary, fontSize: 14 },

  fab: {
    position:        'absolute',
    bottom:          28,
    right:           20,
    width:           56,
    height:          56,
    borderRadius:    28,
    backgroundColor: '#182350',
    justifyContent:  'center',
    alignItems:      'center',
    elevation:       6,
    shadowColor:     '#182350',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.30,
    shadowRadius:    8,
  },
});
