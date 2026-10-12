import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StatusBar, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import AppLoader from '../../components/AppLoader';
import BookFilter, { useBook } from '../../components/BookFilter';
import FilterSelect from '../../components/FilterSelect';
import MultiFilterSelect from '../../components/MultiFilterSelect';

// My Conversions — mirrors web/src/app/sales/my-conversions. The site visits and
// closures that came from the leads this person handled or referred.
//
// Lists only: the numbers ride on the tab labels, and the visuals (Upcoming SV,
// SV Done, Closures tiles and charts) live in the Reports tab. Each tab lists
// exactly what its label counts.
const TABS = [
  { key: 'sv',       label: 'Site Visits' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'closures', label: 'Closures' },
];

const fmtDate = (s) => (s ? new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const inr = (n) => (n ? `₹${new Intl.NumberFormat('en-IN').format(n)}` : '—');

export default function MyConversionsScreen({ navigation, route }) {
  const companyId = useSelector((s) => s.adminFilter?.companyId);
  const adminView = !!route?.params?.adminView;
  // Source filter: Sales / CP / All (components/BookFilter).
  const cpOnly = !!route?.params?.cpOnly;
  const [book, setBook] = useBook(cpOnly);
  const [tab, setTab] = useState(TABS.some((t) => t.key === route?.params?.initialTab) ? route.params.initialTab : 'sv');
  const [visits, setVisits] = useState([]);
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });
  const [projF, setProjF] = useState([]);   // project names; empty = all
  const [stmF, setStmF] = useState([]);     // STM names; empty = all

  const q = [companyId ? `company_id=${companyId}` : '', adminView ? 'admin_view=1' : '', cpOnly ? 'cp_only=true' : '', `book=${book}`]
    .filter(Boolean).join('&');
  const qs = q ? `?${q}` : '';

  const load = useCallback(async () => {
    try {
      const [sv, cl] = await Promise.all([
        apiFetch(SALES_ENDPOINTS.siteVisits + qs),
        apiFetch(SALES_ENDPOINTS.closures + qs),
      ]);
      if (sv.ok) { const d = await sv.json(); setVisits(Array.isArray(d) ? d : d.results || []); }
      if (cl.ok) { const d = await cl.json(); setClosures(Array.isArray(d) ? d : d.results || []); }
    } catch (e) { /* keep what is on screen */ }
    setLoading(false); setRefreshing(false);
  }, [qs]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const istToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const istDaysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); };
  const DATE_PRESETS = [
    ['All',        () => ({ from: '', to: '' })],
    ['Today',      () => ({ from: istToday(), to: istToday() })],
    ['7 days',     () => ({ from: istDaysAgo(6), to: istToday() })],
    ['30 days',    () => ({ from: istDaysAgo(29), to: istToday() })],
    ['This month', () => { const t = istToday(); return { from: `${t.slice(0, 7)}-01`, to: t }; }],
  ];
  const datePreset = (DATE_PRESETS.find(([, make]) => {
    const r = make(); return r.from === range.from && r.to === range.to;
  }) || ['All'])[0];
  const pickDatePreset = (label) => {
    const item = DATE_PRESETS.find(([l]) => l === (label || 'All')) || DATE_PRESETS[0];
    setRange(item[1]());
  };

  const done = visits.filter((v) => v.status === 'completed');
  const upcoming = visits.filter((v) => v.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0));
  // One box across every column a person would recognise a row by. Phone matters
  // most here: it is what someone has in hand when a client rings back.
  const needle = search.trim().toLowerCase();
  const match = (r) => [
    r.lead_name, r.lead_phone, r.project_name,
    r.stm_name, r.referred_by_telecaller_name, r.unit_type, r.unit_no,
  ].some((f) => String(f || '').toLowerCase().includes(needle));

  // Each pool is dated by the column it shows — a completed visit by when it
  // happened, an upcoming one by when it is due, a closure by its closure date.
  // One shared field would drop rows whose other date is blank, which is most.
  const dayOf = (v) => {
    if (!v) return '';
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? String(v).slice(0, 10) : d.toLocaleDateString('en-CA');
  };
  const inRange = (value) => {
    if (!range.from && !range.to) return true;
    const d = dayOf(value);
    if (!d) return false;
    return (!range.from || d >= range.from) && (!range.to || d <= range.to);
  };
  const narrow = (list, dateOf) => list.filter((r) => (!needle || match(r))
    && (!projF.length || projF.includes(r.project_name || '—'))
    && (!stmF.length || stmF.includes(r.stm_name || '—'))
    && inRange(dateOf(r)));

  // All three narrowed, not just the open tab's: the tab labels count these, and
  // "(51)" above a list of nine contradicts itself once a date range is set.
  const doneRows = narrow(done, (r) => r.visited_at || r.scheduled_at);
  const upcomingRows = narrow(upcoming, (r) => r.scheduled_at);
  const closureRows = narrow(closures, (r) => r.closure_date);
  const counts = { sv: doneRows.length, upcoming: upcomingRows.length, closures: closureRows.length };

  const rows = tab === 'sv' ? doneRows : tab === 'upcoming' ? upcomingRows : closureRows;
  // The date range counts as narrowing too, or an empty period reads as "nothing
  // here at all" rather than "nothing in the month you picked".
  const filtered = !!(needle || projF.length || stmF.length || range.from || range.to);

  // The pickers offer only what this tab's rows hold (as on the web); a pick made
  // on another tab stays listed so it can be seen and cleared. Built from the
  // unnarrowed pool, or picking a project would remove every other project from
  // the list and leave no way back.
  const tabPool = tab === 'sv' ? done : tab === 'upcoming' ? upcoming : closures;
  const present = (key, picked, none) => [...new Set([...tabPool.map((r) => r[key] || '—'), ...picked])]
    .sort((a, b) => (a === '—') - (b === '—') || a.localeCompare(b))
    .map((n) => ({ value: n, label: n === '—' ? none : n }));

  const renderVisit = ({ item: v }) => (
    <View style={st.row}>
      <View style={st.rowTop}>
        <Text style={st.name} numberOfLines={1}>{v.lead_name || '—'}</Text>
        <Text style={tab === 'upcoming' ? st.badgeWarn : st.badgeGood}>{tab === 'upcoming' ? 'Scheduled' : 'Completed'}</Text>
      </View>
      <Text style={st.meta}>{v.lead_phone || '—'} · {v.project_name || '—'}</Text>
      <Text style={st.meta}>
        {tab === 'upcoming' ? 'Visit on ' : 'Visited '}{fmtDate(tab === 'upcoming' ? v.scheduled_at : (v.visited_at || v.scheduled_at))}
      </Text>
      <Text style={st.muted}>STM {v.stm_name || '—'} · Telecaller {v.referred_by_telecaller_name || '—'}</Text>
    </View>
  );

  const renderClosure = ({ item: c }) => (
    <View style={st.row}>
      <View style={st.rowTop}>
        <Text style={st.name} numberOfLines={1}>{c.lead_name || '—'}</Text>
        <Text style={st.amount}>{inr(c.total_amount)}</Text>
      </View>
      <Text style={st.meta}>{c.project_name || '—'} · {`${c.unit_type || ''} ${c.unit_no || ''}`.trim() || '—'}</Text>
      <Text style={st.meta}>Closed {fmtDate(c.closure_date)}</Text>
      <Text style={st.muted}>STM {c.stm_name || '—'} · Telecaller {c.referred_by_telecaller_name || '—'}</Text>
    </View>
  );

  const empty = filtered
    ? (needle ? `Nothing matches "${search.trim()}" in this tab.` : 'Nothing matches these filters in this tab.')
    : tab === 'upcoming' ? 'No visits scheduled.'
      : tab === 'sv' ? 'No site visits completed yet.' : 'No closures yet.';

  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.screenBg} />
      <View style={st.header}>
        {navigation.canGoBack() && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.back}>
            <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={st.flex}>
          <Text style={st.title}>My Conversions</Text>
          <Text style={st.sub}>Site visits and closures from your leads</Text>
        </View>
      </View>

      <View style={st.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[st.tab, tab === t.key && st.tabOn]}>
            <Text style={[st.tabText, tab === t.key && st.tabTextOn]}>{t.label} ({counts[t.key]})</Text>
          </TouchableOpacity>
        ))}
      </View>

      <BookFilter hidden={cpOnly} value={book} onChange={setBook} style={st.book} />
      <View style={st.searchWrap}>
        <Ionicons name="search" size={16} color={COLORS.textSecondary} />
        <TextInput
          style={st.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search lead, phone, project, STM…"
          placeholderTextColor={COLORS.textTertiary}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {/* clearButtonMode is iOS-only, so Android gets a real button. */}
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')} style={st.searchClear} hitSlop={8}>
            <Ionicons name="close-circle" size={17} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={st.filters}>
        <FilterSelect label="Any date" value={datePreset === 'All' ? '' : datePreset}
          onChange={pickDatePreset}
          options={DATE_PRESETS.map(([l]) => ({ value: l === 'All' ? '' : l, label: l === 'All' ? 'Any date' : l }))} />
        <MultiFilterSelect label="All Projects" noun="projects" value={projF} onChange={setProjF}
          options={present('project_name', projF, 'No project')} />
        <MultiFilterSelect label="All STMs" noun="STMs" value={stmF} onChange={setStmF}
          options={present('stm_name', stmF, 'No STM')} />
      </View>

      {loading ? (
        <AppLoader size={0.7} style={st.loader} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.id)}
          renderItem={tab === 'closures' ? renderClosure : renderVisit}
          contentContainerStyle={st.list}
          ListEmptyComponent={<Text style={st.empty}>{empty}</Text>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}
            colors={[COLORS.navy]} tintColor={COLORS.navy} />}
        />
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  book: { marginHorizontal: 16, marginTop: 8 },
  screen:   { flex: 1, backgroundColor: COLORS.screenBg },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16,
                marginBottom: 10, paddingHorizontal: 12, height: 42, borderRadius: 14,
                borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  searchInput: { flex: 1, fontSize: 13.5, color: COLORS.textPrimary, padding: 0 },
  searchClear: { padding: 2 },
  filters:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 6 },
  header:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  back:     { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  flex:     { flex: 1 },
  title:    { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  sub:      { fontSize: 13, color: COLORS.textSecondary },
  tabs:     { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  tab:      { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.surfaceAlt },
  tabOn:    { backgroundColor: COLORS.linkBg },
  tabText:  { fontSize: 12.5, fontWeight: '700', color: COLORS.textSecondary },
  tabTextOn: { color: COLORS.link },
  loader:   { marginVertical: 40 },
  list:     { padding: 16, paddingBottom: 40, gap: 10 },
  row:      { backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.cardBorder, ...CARD_SHADOW },
  rowTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 },
  name:     { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  meta:     { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 2 },
  muted:    { fontSize: 11.5, color: COLORS.textTertiary, marginTop: 4 },
  amount:   { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  badgeGood: { fontSize: 10.5, fontWeight: '800', color: COLORS.success, backgroundColor: COLORS.successBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  badgeWarn: { fontSize: 10.5, fontWeight: '800', color: COLORS.warning, backgroundColor: COLORS.warningBg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  empty:    { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
});
