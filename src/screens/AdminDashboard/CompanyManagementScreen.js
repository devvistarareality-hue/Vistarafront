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
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const STATUS_FILTERS = ['All', 'Active', 'Inactive'];

const AVATAR_COLORS = [COLORS.navy, COLORS.info, COLORS.link, COLORS.success, COLORS.warning, COLORS.purple, COLORS.warningAlt];

function avatarColor(name = '') {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx] || COLORS.navy;
}

function CompanyCard({ company, onEdit, onDeactivate, onActivate, onDelete }) {
  const initial = company.name ? company.name[0].toUpperCase() : '?';
  const bg      = avatarColor(company.name);

  return (
    <View style={[s.card, !company.is_active && s.cardInactive]}>
      <View style={[s.avatar, { backgroundColor: bg }]}>
        <Text style={s.avatarText}>{initial}</Text>
      </View>
      <View style={s.cardBody}>
        <Text style={s.companyName} numberOfLines={1}>{company.name}</Text>
        <View style={s.tagRow}>
          {company.code && <View style={s.codeBadge}><Text style={s.codeText}>{company.code}</Text></View>}
          <View style={[s.statusBadge, { backgroundColor: company.is_active ? COLORS.successBg : COLORS.errorBg }]}>
            <Text style={[s.statusText, { color: company.is_active ? COLORS.success : COLORS.error }]}>
              {company.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'column', gap: 6 }}>
        <TouchableOpacity style={s.editBtn} onPress={() => onEdit(company)}>
          <Ionicons name="pencil" size={16} color={COLORS.link} />
        </TouchableOpacity>
        {company.is_active ? (
          <TouchableOpacity style={s.deactBtn} onPress={() => onDeactivate(company)}>
            <Ionicons name="pause-circle" size={18} color={COLORS.warning} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.activateBtn} onPress={() => onActivate(company)}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.deleteBtn} onPress={() => onDelete(company)}>
          <Ionicons name="trash-outline" size={16} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CompanyManagementScreen({ navigation }) {
  const dispatch = useDispatch();
  const { companies, loading, updateLoading, error, updateError, updateSuccess, deleteSuccess } = useSelector((s) => s.companies);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => { dispatch(fetchCompanies()); }, [dispatch]));

  useEffect(() => {
    if (updateSuccess) { dispatch(resetUpdateCompany()); dispatch(fetchCompanies()); }
    if (deleteSuccess) { dispatch(fetchCompanies()); }
  }, [updateSuccess, deleteSuccess]);

  useEffect(() => {
    if (error) Alert.alert('Error', error);
    if (updateError) Alert.alert('Update Error', updateError);
  }, [error, updateError]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchCompanies());
    setRefreshing(false);
  }, [dispatch]);

  const handleEdit     = (c) => navigation.navigate('EditCompany', { company: c });
  const handleDeactivate = (c) => dispatch(updateCompany({ id: c.id, is_active: false }));
  const handleActivate   = (c) => dispatch(updateCompany({ id: c.id, is_active: true }));
  const handleDelete     = (c) => {
    Alert.alert('Delete Company', `Delete ${c.name}? This action cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(deleteCompany(c.id)) },
    ]);
  };

  const filtered = companies.filter((c) => {
    const matchStatus = statusFilter === 'All' ||
      (statusFilter === 'Active' && c.is_active) ||
      (statusFilter === 'Inactive' && !c.is_active);
    const matchSearch = !search.trim() ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Company Management</Text>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: COLORS.navy }]}
          onPress={() => navigation.navigate('EditCompany')}
        >
          <Ionicons name="add" size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
        <TextInput style={s.searchInput} placeholder="Search by name or code…" value={search} onChangeText={setSearch} />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color={COLORS.textSecondary} /></TouchableOpacity> : null}
      </View>

      {/* Status tabs */}
      <View style={s.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabsRow}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity key={f} onPress={() => setStatusFilter(f)} style={[s.tab, statusFilter === f && s.tabActive]}>
              <Text style={[s.tabText, statusFilter === f && s.tabTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={s.countLabel}>{filtered.length} company{filtered.length !== 1 ? 'ies' : 'y'}</Text>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.navy} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => String(c.id)}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.navy]} tintColor={COLORS.navy} />}
          renderItem={({ item }) => <CompanyCard company={item} onEdit={handleEdit} onDeactivate={handleDeactivate} onActivate={handleActivate} onDelete={handleDelete} />}
          ListEmptyComponent={
            <Text style={s.emptyText}>No companies found</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: COLORS.screenBg },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.cardBg, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt },
  iconBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },

  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.cardBg, marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, ...CARD_SHADOW },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },

  tabsWrapper: { height: 44, marginTop: 14 },
  tabsRow:     { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tab:         { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.cardBg, borderWidth: 1.5, borderColor: COLORS.divider },
  tabActive:   { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  tabText:     { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white, fontWeight: '700' },

  countLabel: { marginHorizontal: 16, marginTop: 12, marginBottom: 4, fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },

  card:       { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 14, marginBottom: 10, ...CARD_SHADOW },
  avatar:     { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700', color: COLORS.white },
  cardBody:   { flex: 1 },
  companyName:{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },

  tagRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  codeBadge:  { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, backgroundColor: COLORS.linkBg },
  codeText:   { fontSize: 11, fontWeight: '700', color: COLORS.navy, letterSpacing: 0.5 },
  statusBadge:{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },

  cardInactive: { backgroundColor: COLORS.screenBg, opacity: 0.85 },
  editBtn:    { padding: 6, borderRadius: 8, backgroundColor: COLORS.linkBg },
  deactBtn:   { padding: 6, borderRadius: 8, backgroundColor: COLORS.warningBg },
  activateBtn:{ padding: 6, borderRadius: 8, backgroundColor: COLORS.screenBg },
  deleteBtn:  { padding: 6, borderRadius: 8, backgroundColor: COLORS.screenBg },

  errorText:  { textAlign: 'center', marginTop: 40, color: COLORS.error, fontSize: 14 },
  emptyText:  { textAlign: 'center', marginTop: 40, color: COLORS.textSecondary, fontSize: 14 },

  fab: {
    position:        'absolute',
    bottom:          28,
    right:           20,
    width:           56,
    height:          56,
    borderRadius:    28,
    backgroundColor: COLORS.navy,
    justifyContent:  'center',
    alignItems:      'center',
    elevation:       6,
    shadowColor:     COLORS.navy,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.30,
    shadowRadius:    8,
  },
});
