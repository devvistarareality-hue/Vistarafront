import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StatusBar, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { AR_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import common from '../../styles/common';
import AppLoader from '../../components/AppLoader';
import LoadError from '../../components/LoadError';
import FilterSelect from '../../components/FilterSelect';
import { Badge } from '../../components/ui';
import { inrShort, AGE_LABELS, ISSUES, hasIssue, worstBucket, today, withCompany } from './arShared';

const SHOW = [
  { value: '', label: 'All accounts' },
  { value: 'overdue', label: 'Overdue only' },
  { value: 'any', label: 'Needs attention' },
  ...ISSUES.map((i) => ({ value: i.value, label: i.label })),
];

// AR Register — one card per approved booking (the old workbook's Plot Master).
// Tapping a card opens its ledger.
export default function ARRegisterScreen({ navigation, route }) {
  const companyId = useSelector((st) => st.adminFilter?.companyId);
  const p = route?.params || {};
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [project, setProject] = useState(p.project || '');
  const [show, setShow] = useState(p.issue || (p.overdue ? 'overdue' : ''));
  const [q, setQ] = useState('');
  const [showAgeing, setShowAgeing] = useState(false);

  const load = useCallback(async () => {
    setErr('');
    try {
      const r = await apiFetch(withCompany(AR_ENDPOINTS.accounts, companyId, [`as_of=${today()}`]));
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.detail || 'Could not load the register.'); return; }
      setRows(d.results || []);
    } catch (e) { setErr('Check your connection and try again.'); }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);
  // A payment recorded in the ledger changes this account's figures.
  useEffect(() => navigation.addListener('focus', () => { if (rows) load(); }), [navigation, rows, load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const projects = useMemo(() => {
    const m = new Map();
    (rows || []).forEach((r) => { if (r.project_id) m.set(String(r.project_id), r.project); });
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const issue = ISSUES.find((i) => i.value === show);
    return (rows || []).filter((r) =>
      (!project || String(r.project_id) === String(project))
      && (!show || (show === 'overdue' ? r.overdue > 0 : show === 'any' ? hasIssue(r) : issue?.test(r)))
      && (!needle || r.client_name.toLowerCase().includes(needle) || (r.phone || '').includes(needle)
        || String(r.plots).toLowerCase().includes(needle)));
  }, [rows, project, show, q]);

  const totals = useMemo(() => shown.reduce((t, r) => ({
    outstanding: t.outstanding + r.outstanding, overdue: t.overdue + r.overdue, os: t.os + r.os_with_interest,
  }), { outstanding: 0, overdue: 0, os: 0 }), [shown]);

  const header = (
    <View>
      <View style={[common.searchBox, s.search]}>
        <Ionicons name="search" size={16} color={COLORS.textSecondary} />
        <TextInput style={s.searchInput} value={q} onChangeText={setQ} placeholder="Search client, phone or plot"
          placeholderTextColor={COLORS.textTertiary} autoCorrect={false} />
      </View>
      <View style={s.filters}>
        <FilterSelect label="Project" value={project} onChange={setProject}
          options={[{ value: '', label: 'All projects' }, ...projects.map(([id, name]) => ({ value: id, label: name }))]} />
        <FilterSelect label="Show" value={show} onChange={setShow} options={SHOW} />
        <TouchableOpacity onPress={() => setShowAgeing((v) => !v)} activeOpacity={0.8} style={[s.toggle, showAgeing && s.toggleOn]}>
          <Ionicons name={showAgeing ? 'checkbox' : 'square-outline'} size={15} color={showAgeing ? COLORS.link : COLORS.textSecondary} />
          <Text style={[s.toggleText, showAgeing && s.toggleTextOn]}>Show ageing</Text>
        </TouchableOpacity>
      </View>
      <View style={s.totals}>
        <Total label="Outstanding" value={totals.outstanding} />
        <Total label="Overdue" value={totals.overdue} bad />
        <Total label="With interest" value={totals.os} bad />
      </View>
      <Text style={common.sectionLabel}>{shown.length} account{shown.length === 1 ? '' : 's'}</Text>
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
          <Text style={common.headerTitle}>AR Register</Text>
          <Text style={common.headerSub}>Approved by Sales and Accounts</Text>
        </View>
      </View>

      {rows === null && !err ? <AppLoader label="Calculating accounts…" /> : err && !rows ? <LoadError message={err} onRetry={load} /> : (
        <FlatList
          data={shown}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={common.scroll}
          ListHeaderComponent={header}
          initialNumToRender={12}
          windowSize={7}
          removeClippedSubviews
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.link} />}
          ListEmptyComponent={<Text style={s.empty}>{(rows || []).length === 0
            ? 'No bookings are fully approved yet. An account appears once Sales and Accounts have both approved a booking.'
            : 'No accounts match these filters.'}</Text>}
          extraData={showAgeing}
          renderItem={({ item }) => <AccountCard r={item} ageing={showAgeing} onPress={() => navigation.navigate('ARLedger', { id: item.id })} />}
        />
      )}
    </SafeAreaView>
  );
}

function Total({ label, value, bad }) {
  return (
    <View style={s.total}>
      <Text style={s.totalLabel}>{label}</Text>
      <Text style={[s.totalValue, bad && value > 0 && s.bad]} numberOfLines={1} adjustsFontSizeToFit>{inrShort(value)}</Text>
    </View>
  );
}

const AccountCard = React.memo(function AccountCard({ r, ageing, onPress }) {
  const oldest = worstBucket(r.ageing);
  return (
    <TouchableOpacity style={[common.card, s.card]} activeOpacity={0.8} onPress={onPress}>
      <View style={s.cardTop}>
        <View style={s.flex}>
          <Text style={s.name} numberOfLines={1}>{r.client_name || '—'}</Text>
          <Text style={s.sub} numberOfLines={1}>{r.project} · Plot {r.plots}{r.status === 'frozen' ? ' · Cancelled' : ''}</Text>
        </View>
        <View style={s.right}>
          <Text style={s.os}>{inrShort(r.os_with_interest)}</Text>
          <Text style={s.osLabel}>O/s + interest</Text>
        </View>
      </View>
      <View style={s.metrics}>
        <Metric label="Received" value={`${inrShort(r.received)} · ${r.pct_realised}%`} />
        <Metric label="Overdue" value={inrShort(r.overdue)} bad={r.overdue > 0} />
        <Metric label="Interest" value={inrShort(r.net_interest)} />
      </View>
      {ageing && r.overdue > 0 ? (
        <View style={s.ages}>
          {AGE_LABELS.filter((a) => r.ageing[a] > 0).map((a) => (
            <View key={a} style={s.age}><Text style={s.ageLabel}>{a}d</Text><Text style={s.ageValue}>{inrShort(r.ageing[a])}</Text></View>
          ))}
        </View>
      ) : null}
      {(oldest || hasIssue(r)) ? (
        <View style={s.badges}>
          {oldest ? <Badge label={`${oldest} days`} tone="danger" /> : null}
          {ISSUES.filter((i) => i.test(r)).map((i) => <Badge key={i.value} label={i.label} tone={i.tone} />)}
        </View>
      ) : null}
    </TouchableOpacity>
  );
});

function Metric({ label, value, bad }) {
  return (
    <View style={s.metric}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={[s.metricValue, bad && s.bad]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  search: { marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, paddingVertical: 0 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  totals: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  total: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: COLORS.cardBorder },
  totalLabel: { fontSize: 10.5, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  totalValue: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginTop: 3 },
  bad: { color: COLORS.error },
  card: { marginBottom: 10, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  os: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  osLabel: { fontSize: 10.5, color: COLORS.textSecondary, marginTop: 1 },
  metrics: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  metric: { flex: 1 },
  metricLabel: { fontSize: 10.5, color: COLORS.textSecondary, fontWeight: '600' },
  metricValue: { fontSize: 12.5, color: COLORS.textPrimary, fontWeight: '700', marginTop: 2 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  toggleOn: { borderColor: COLORS.link, backgroundColor: COLORS.accentSoft },
  toggleText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  toggleTextOn: { color: COLORS.link, fontWeight: '700' },
  ages: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  age: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, backgroundColor: COLORS.errorBg },
  ageLabel: { fontSize: 10.5, fontWeight: '700', color: COLORS.textSecondary },
  ageValue: { fontSize: 12.5, fontWeight: '800', color: COLORS.error },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 13.5, paddingVertical: 36, paddingHorizontal: 20, lineHeight: 20 },
});
