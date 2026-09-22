import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StatusBar, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { ACTIVITY_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import common from '../../styles/common';
import AppLoader from '../../components/AppLoader';
import LoadError from '../../components/LoadError';
import FilterSelect from '../../components/FilterSelect';
import { Button } from '../../components/ui';
import { ActivityRows } from '../../components/ActivityHistory';

const ACTIONS = [
  { value: '', label: 'Any action' }, { value: 'created', label: 'Created' }, { value: 'submitted', label: 'Submitted' },
  { value: 'updated', label: 'Edited' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' }, { value: 'deleted', label: 'Deleted' },
];

// Every change anyone made, newest first — same as /admin/activity on the website.
export default function ActivityLogScreen({ navigation, route }) {
  const companyId = useSelector((st) => st.adminFilter?.companyId);
  const user = useSelector((st) => st.auth.user);
  // A module's Log tab passes its module name(s); Admin → Activity Log passes none.
  const modules = route?.params?.modules || null;
  const title = route?.params?.title || 'Activity Log';
  const allowed = user?.role === 'Admin' || user?.is_staff;
  const [f, setF] = useState({ module: modules ? modules.join(',') : '', actor: '', action: '', q: '' });
  const [q, setQ] = useState('');
  const [rows, setRows] = useState(null);
  const [meta, setMeta] = useState({ modules: [], actors: [], can_see_all: false });
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { const t = setTimeout(() => setF((x) => ({ ...x, q })), 400); return () => clearTimeout(t); }, [q]);

  const load = useCallback(async (pg = 1) => {
    setErr('');
    const p = [`page=${pg}`];
    Object.entries(f).forEach(([k, v]) => { if (v) p.push(`${k}=${encodeURIComponent(v)}`); });
    if (companyId) p.push(`company_id=${companyId}`);
    try {
      const r = await apiFetch(`${ACTIVITY_ENDPOINTS.log}?${p.join('&')}`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.detail || 'Could not load the activity log.'); if (pg === 1) setRows([]); return; }
      setRows((prev) => (pg === 1 ? d.results : [...(prev || []), ...d.results]));
      setMore(!!d.has_more);
      setPage(pg);
      if (pg === 1) setMeta({ modules: d.modules || [], actors: d.actors || [], can_see_all: d.can_see_all });
    } catch (e) { setErr('Check your connection and try again.'); if (pg === 1) setRows([]); }
  }, [f, companyId]);

  useEffect(() => { if (allowed) { setRows(null); load(1); } }, [load, allowed]);
  const onRefresh = async () => { setRefreshing(true); await load(1); setRefreshing(false); };
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  const header = (
    <View>
      <View style={[common.searchBox, s.search]}>
        <Ionicons name="search" size={16} color={COLORS.textSecondary} />
        <TextInput style={s.searchInput} value={q} onChangeText={setQ} placeholder="Client, plot, person…"
          placeholderTextColor={COLORS.textTertiary} autoCorrect={false} />
      </View>
      <View style={s.filters}>
        {!modules ? (
          <FilterSelect label="Module" value={f.module} onChange={set('module')}
            options={[{ value: '', label: 'All modules' }, ...meta.modules.map((m) => ({ value: m, label: m }))]} />
        ) : null}
        {meta.can_see_all ? (
          <FilterSelect label="Person" value={f.actor} onChange={set('actor')}
            options={[{ value: '', label: 'Everyone' }, ...meta.actors.map((a) => ({ value: String(a.id), label: a.name || '—' }))]} />
        ) : null}
        <FilterSelect label="Action" value={f.action} onChange={set('action')} options={ACTIONS} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      <View style={common.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={common.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={s.flex}>
          <Text style={common.headerTitle} numberOfLines={1}>{title}</Text>
          <Text style={common.headerSub}>Who changed what, and when</Text>
        </View>
      </View>
      {!allowed ? <Text style={s.denied}>Only admins can see the log.</Text> : rows === null && !err ? <AppLoader label="Loading…" /> : err && !rows?.length ? <LoadError message={err} onRetry={() => load(1)} /> : (
        <FlatList
          data={[0]}
          keyExtractor={() => 'log'}
          contentContainerStyle={common.scroll}
          ListHeaderComponent={header}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.link} />}
          renderItem={() => (
            <View style={[common.card, s.card]}>
              <ActivityRows rows={rows || []} showModule={!modules || modules.length > 1} />
              {more ? <Button title="Load more" variant="secondary" size="sm" onPress={() => load(page + 1)} style={s.more} /> : null}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  search: { marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, paddingVertical: 0 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  card: { padding: 14 },
  more: { alignSelf: 'center', marginTop: 6 },
  denied: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 14, paddingVertical: 40, paddingHorizontal: 24 },
});
