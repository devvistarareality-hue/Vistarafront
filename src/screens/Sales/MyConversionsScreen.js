import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StatusBar, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import AppLoader from '../../components/AppLoader';

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
  const [tab, setTab] = useState(TABS.some((t) => t.key === route?.params?.initialTab) ? route.params.initialTab : 'sv');
  const [visits, setVisits] = useState([]);
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const q = [companyId ? `company_id=${companyId}` : '', adminView ? 'admin_view=1' : '']
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

  const done = visits.filter((v) => v.status === 'completed');
  const upcoming = visits.filter((v) => v.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduled_at || 0) - new Date(b.scheduled_at || 0));
  const counts = { sv: done.length, upcoming: upcoming.length, closures: closures.length };
  const rows = tab === 'sv' ? done : tab === 'upcoming' ? upcoming : closures;

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

  const empty = tab === 'upcoming' ? 'No visits scheduled.'
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
  screen:   { flex: 1, backgroundColor: COLORS.screenBg },
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
