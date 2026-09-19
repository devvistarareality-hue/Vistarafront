import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { getCache, setCache, key as cacheKey } from '../../utils/dataCache';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

import AppIcon from '../../components/AppIcon';
import { withAlpha } from '../../constants/theme';
import AppLoader from '../../components/AppLoader';
import LoadError from '../../components/LoadError';
const HISTORY_LABEL = {
  created: 'Lead Created', status: 'Overall Status', telecaller_status: 'TC Status',
  stm_status: 'STM Status', telecaller: 'Telecaller Assigned', stm: 'STM Assigned',
  warm_transfer: 'Transferred to STM', site_visit: 'Site Visit', closure: 'Closure',
};
const HISTORY_COLOR = {
  created: COLORS.text3, status: COLORS.link, telecaller_status: COLORS.success, stm_status: COLORS.warning,
  telecaller: COLORS.purple, stm: COLORS.success, warm_transfer: COLORS.error, site_visit: COLORS.warningAlt, closure: COLORS.success,
};

const NAVY = COLORS.navy; const BLUE = COLORS.link; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const PAGE_SIZE = 50;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 22, ...CARD_SHADOW , borderWidth: 1, borderColor: COLORS.cardBorder };

const SV_COLOR = {
  scheduled: { bg: COLORS.warningBg, text: COLORS.warning },
  completed: { bg: COLORS.successBg, text: COLORS.success },
  no_show: { bg: COLORS.errorBg, text: COLORS.error },
  cancelled: { bg: COLORS.surfaceAlt, text: MUTED },
};

const CLOSURE_COLOR = {
  booked: { bg: COLORS.successBg, text: COLORS.success },
  cancelled: { bg: COLORS.errorBg, text: COLORS.error },
  refunded: { bg: COLORS.warningBg, text: COLORS.warning },
};

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Read-only lead detail + full history. Opens instantly with the row data we
// already have, then loads the timeline from a single lead-detail fetch — no
// navigation, no leads-list mount.
function LeadHistoryModal({ lead, onClose }) {
  const [detail, setDetail] = useState(null);
  useEffect(() => {
    if (!lead) return;
    let alive = true;
    setDetail(null);
    (async () => {
      try {
        const res = await apiFetch(SALES_ENDPOINTS.lead(lead.id));
        if (res.ok && alive) setDetail(await res.json());
      } catch (_) {}
    })();
    return () => { alive = false; };
  }, [lead?.id]);

  const d = detail || {};
  const rows = [
    ['Phone', d.phone || lead?.phone],
    ['Project', d.project_name || lead?.project_name],
    ['Source', d.source_name],
    ['Telecaller', d.telecaller_name],
    ['STM', d.stm_name],
    ['Status', (d.status || '').replace(/_/g, ' ')],
  ];
  const events = (d.history || []).filter(h => h.field_changed !== 'created');

  return (
    <Modal visible={!!lead} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%', overflow: 'hidden' }}>
          {/* Header */}
          <View style={SalesMyConversionsScreenS.panel}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.white }}>{lead?.name || '—'}</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{d.phone || lead?.phone || ''}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            {/* Quick detail */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {rows.map(([k, v]) => (
                <View key={k} style={{ width: '50%', marginBottom: 12 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase', letterSpacing: 0.4 }}>{k}</Text>
                  <Text style={{ fontSize: 13, color: TEXT, marginTop: 2, textTransform: k === 'Status' ? 'capitalize' : 'none' }}>{v || '—'}</Text>
                </View>
              ))}
            </View>

            <Text style={{ fontSize: 12, fontWeight: '800', color: NAVY, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4, marginBottom: 14 }}>History</Text>

            {/* Lead received */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 32, height: 32, borderRadius: 20, backgroundColor: withAlpha(COLORS.link, '18'), alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16 }}><AppIcon name="download" size={16} /></Text>
                </View>
                <View style={{ width: 2, flex: 1, backgroundColor: COLORS.surfaceAlt, marginTop: 4 }} />
              </View>
              <View style={{ flex: 1, paddingBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT }}>Lead Received</Text>
                <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Source: {d.source_name || '—'} · Project: {d.project_name || lead?.project_name || '—'}</Text>
                <Text style={{ fontSize: 11, color: COLORS.textTertiary, marginTop: 2 }}>{fmtDateTime(d.created_at)}</Text>
              </View>
            </View>

            {!detail && <ActivityIndicator size="small" color={MUTED} style={{ marginTop: 8 }} />}
            {detail && events.length === 0 && (
              <Text style={{ fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', marginTop: 8 }}>No changes recorded yet.</Text>
            )}
            {events.map((h, idx, arr) => {
              const isLast = idx === arr.length - 1;
              const color  = HISTORY_COLOR[h.field_changed] || MUTED;
              const icon   = h.field_changed === 'warm_transfer' ? 'flame'
                           : h.field_changed === 'telecaller'    ? 'user'
                           : h.field_changed === 'stm'           ? 'building'
                           : h.field_changed === 'site_visit'    ? 'home'
                           : h.field_changed === 'closure'       ? 'check-circle'
                           : h.field_changed.includes('status')  ? 'refresh' : 'pencil';
              const singleValue = ['created', 'warm_transfer', 'closure'].includes(h.field_changed) || !h.old_value;
              const byLabel = h.changed_by_name || (['created', 'telecaller', 'stm'].includes(h.field_changed) ? 'System (auto)' : null);
              return (
                <View key={h.id} style={{ flexDirection: 'row', gap: 12, marginBottom: isLast ? 0 : 16 }}>
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ width: 32, height: 32, borderRadius: 20, backgroundColor: withAlpha(color, '18'), alignItems: 'center', justifyContent: 'center' }}>
                      <AppIcon name={icon} size={16} color={color} />
                    </View>
                    {!isLast && <View style={{ width: 2, flex: 1, backgroundColor: COLORS.surfaceAlt, marginTop: 4 }} />}
                  </View>
                  <View style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT }}>{HISTORY_LABEL[h.field_changed] || h.field_changed}</Text>
                    <Text style={{ fontSize: 12, color: TEXT, marginTop: 2 }}>
                      {singleValue ? (
                        <Text style={{ color, fontWeight: '700' }}>{h.new_value || '—'}</Text>
                      ) : (
                        <>
                          <Text style={{ color: MUTED }}>{h.old_value || '—'}</Text>
                          <Text> → </Text>
                          <Text style={{ color, fontWeight: '700' }}>{h.new_value || '—'}</Text>
                        </>
                      )}
                    </Text>
                    {!!byLabel && <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>by {byLabel}</Text>}
                    <Text style={{ fontSize: 11, color: COLORS.textTertiary, marginTop: 2 }}>{fmtDateTime(h.created_at)}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function StatusBadge({ status, colors }) {
  const c = colors[status] || { bg: COLORS.surfaceAlt, text: MUTED };
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: c.bg }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: c.text }}>{(status || '').replace(/_/g, ' ').toUpperCase()}</Text>
    </View>
  );
}

function StatCard({ label, value, color, bg }) {
  return (
    <View style={[CARD, { flex: 1, padding: 14, alignItems: 'center', backgroundColor: bg }]}>
      <Text style={{ fontSize: 24, fontWeight: '800', color }}>{value ?? '—'}</Text>
      <Text style={{ fontSize: 10, color, marginTop: 3, textAlign: 'center', fontWeight: '600', opacity: 0.8 }}>{label}</Text>
    </View>
  );
}

const Field = React.memo(function Field({ label, value, strong, money }) {
  return (
    <View style={mc.field}>
      <Text style={mc.fieldLabel}>{label}</Text>
      <Text style={[mc.fieldValue, strong && mc.fieldValueStrong, money && mc.fieldValueMoney]}>{value}</Text>
    </View>
  );
});

// Rows are memoised and rendered through a FlatList: this screen routinely holds
// a thousand-plus visits, and mapping them all into a ScrollView mounted every
// card at once — which is what froze the phone.
const VisitCard = React.memo(function VisitCard({ v, onOpen }) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => onOpen(v.lead, v.lead_name, v.lead_phone)} style={mc.card}>
      <View style={mc.cardHead}>
        <View style={mc.cardHeadMain}>
          <Text style={mc.name}>{v.lead_name || '—'}</Text>
          <Text style={mc.phone}>{v.lead_phone || '—'}</Text>
        </View>
        <StatusBadge status={v.status} colors={SV_COLOR} />
      </View>
      <View style={mc.row}>
        <Field label="Project" value={v.project_name || '—'} strong />
        <Field label="Visit Date" value={fmtDate(v.visited_at || v.scheduled_at)} strong />
      </View>
      <View style={[mc.row, mc.rowGap]}>
        <Field label="STM" value={v.stm_name || '—'} />
        <Field label="Telecaller" value={v.referred_by_telecaller_name || '—'} />
      </View>
    </TouchableOpacity>
  );
});

const ClosureCard = React.memo(function ClosureCard({ c, onOpen }) {
  return (
    <TouchableOpacity activeOpacity={c.lead ? 0.7 : 1} onPress={() => onOpen(c.lead, c.lead_name, c.lead_phone)} style={mc.card}>
      <View style={mc.cardHead}>
        <View style={mc.cardHeadMain}><Text style={mc.name}>{c.lead_name || '—'}</Text></View>
        <StatusBadge status={c.status} colors={CLOSURE_COLOR} />
      </View>
      <View style={[mc.row, mc.rowGap]}>
        <Field label="Project" value={c.project_name || '—'} strong />
        <Field label="Date" value={fmtDate(c.closure_date)} strong />
      </View>
      <View style={[mc.row, mc.rowGap]}>
        <Field label="Unit" value={`${c.unit_type || ''} ${c.unit_no || ''}`} strong />
        <Field label="Amount" value={c.total_amount ? '₹' + Number(c.total_amount).toLocaleString('en-IN') : '—'} money />
      </View>
      <View style={[mc.row, mc.rowGap]}>
        <Field label="STM" value={c.stm_name || '—'} />
        <Field label="Telecaller" value={c.referred_by_telecaller_name || '—'} />
      </View>
    </TouchableOpacity>
  );
});

export default function SalesMyConversionsScreen({ navigation, route }) {
  const user = useSelector((s) => s.auth.user);
  const companyId = useSelector((s) => s.adminFilter?.companyId);
  // Pushed from the Admin section (see SalesCRMScreen) — request full company data.
  const adminView = !!route?.params?.adminView;
  const cpOnly = !!route?.params?.cpOnly;
  const cqParts = [];
  if (companyId) cqParts.push(`company_id=${companyId}`);
  if (adminView) cqParts.push('admin_view=1');
  // Channel Partner module: the same screen, restricted to partner-sourced work.
  if (cpOnly) cqParts.push('cp_only=true');
  const cq = cqParts.length ? `?${cqParts.join('&')}` : '';
  const des = (user?.designation || '').toLowerCase();
  const isStm = des.includes('stm') || des.includes('sales team') || des.includes('sales executive');
  // Cancelling a booking lives on Bookings & Approvals — this screen is read-only.
  const [tab, setTab] = useState(route?.params?.initialTab === 'closures' ? 'closures' : 'sv');
  const [visits, setVisits] = useState([]);
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [openLead, setOpenLead] = useState(null); // { id, name, phone } | null

  // Stable identity, or the memoised rows re-render on every parent update.
  const showHistory = useCallback((leadId, name, phone) => {
    if (leadId) setOpenLead({ id: leadId, name, phone });
  }, []);

  // Paged: this screen used to pull every site visit and closure (thousands of
  // rows on an established company) on every open. Page 1 lands fast, the rest
  // arrives as the list is scrolled.
  const [svPage, setSvPage] = useState({ page: 1, hasNext: false, total: 0 });
  const [clPage, setClPage] = useState({ page: 1, hasNext: false, total: 0 });
  const [loadingMore, setLoadingMore] = useState(false);
  const svKey = cacheKey('visits', cq);
  const clKey = cacheKey('closures', cq);

  const fetchPage = useCallback(async (endpoint, page) => {
    const sep = cq ? '&' : '?';
    const res = await apiFetch(`${endpoint}${cq}${sep}page=${page}&page_size=${PAGE_SIZE}`);
    if (!res.ok) return null;
    const d = await res.json();
    // The endpoint still answers with a plain array when it isn't asked to page,
    // and older backends ignore the params entirely — handle both shapes.
    return Array.isArray(d)
      ? { rows: d, hasNext: false, count: d.length }
      : { rows: d.results || [], hasNext: !!d.has_next, count: d.count ?? (d.results || []).length };
  }, [cq]);

  const load = useCallback(async (refresh = false) => {
    const cachedSv = getCache(svKey);
    const cachedCl = getCache(clKey);
    if (!refresh && cachedSv && cachedCl) {
      // Paint the last result immediately; a focus return shouldn't show a spinner.
      setVisits(cachedSv.rows); setSvPage(cachedSv.page);
      setClosures(cachedCl.rows); setClPage(cachedCl.page);
      setLoading(false);
      return;
    }
    if (refresh) setRefreshing(true); else setLoading(true);
    setLoadErr('');
    try {
      const [sv, cl] = await Promise.all([
        fetchPage(SALES_ENDPOINTS.siteVisits, 1),
        fetchPage(SALES_ENDPOINTS.closures, 1),
      ]);
      if (sv) {
        const page = { page: 1, hasNext: sv.hasNext, total: sv.count };
        setVisits(sv.rows); setSvPage(page); setCache(svKey, { rows: sv.rows, page });
      }
      if (cl) {
        const page = { page: 1, hasNext: cl.hasNext, total: cl.count };
        setClosures(cl.rows); setClPage(page); setCache(clKey, { rows: cl.rows, page });
      }
    } catch (e) {
      setLoadErr(e?.message || 'Could not load your conversions.');
    }
    setLoading(false); setRefreshing(false);
  }, [fetchPage, svKey, clKey]);

  const loadMore = useCallback(async () => {
    const isSv = tab === 'sv';
    const state = isSv ? svPage : clPage;
    if (loadingMore || !state.hasNext) return;
    setLoadingMore(true);
    try {
      const next = await fetchPage(isSv ? SALES_ENDPOINTS.siteVisits : SALES_ENDPOINTS.closures, state.page + 1);
      if (next) {
        const page = { page: state.page + 1, hasNext: next.hasNext, total: next.count };
        if (isSv) {
          setVisits((prev) => { const rows = [...prev, ...next.rows]; setCache(svKey, { rows, page }); return rows; });
          setSvPage(page);
        } else {
          setClosures((prev) => { const rows = [...prev, ...next.rows]; setCache(clKey, { rows, page }); return rows; });
          setClPage(page);
        }
      }
    } catch (e) {}
    setLoadingMore(false);
  }, [tab, svPage, clPage, loadingMore, fetchPage, svKey, clKey]);

  useFocusEffect(useCallback(() => { load(); loadCounts(); }, [load, loadCounts]));

  // Totals come from the server's count query — with paging, counting the loaded
  // rows would silently under-report (and pulling every row is what we removed).
  const [counts, setCounts] = useState({ completed: 0, scheduled: 0, closures: 0 });
  const loadCounts = useCallback(async () => {
    const sep = cq ? '&' : '?';
    try {
      const [svRes, clRes] = await Promise.all([
        apiFetch(`${SALES_ENDPOINTS.siteVisits}${cq}${sep}counts_only=true`),
        apiFetch(`${SALES_ENDPOINTS.closures}${cq}${sep}counts_only=true`),
      ]);
      const sv = svRes.ok ? await svRes.json() : {};
      const cl = clRes.ok ? await clRes.json() : {};
      setCounts({ completed: sv.completed || 0, scheduled: sv.scheduled || 0, closures: cl.total || 0 });
    } catch (e) {}
  }, [cq]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.screenBg} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'transparent', borderBottomWidth: 0, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>My Conversions</Text>
          <Text style={{ fontSize: 13, color: MUTED }}>{isStm ? 'Track all your SV & closures' : 'Track SV & closures from your leads'}</Text>
        </View>
        <TouchableOpacity onPress={() => load(true)} disabled={refreshing} style={{ padding: 6, backgroundColor: BG, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
          <Ionicons name="refresh-outline" size={20} color={NAVY} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <AppLoader style={{ marginTop: 24 }} />
      ) : loadErr ? (
        <LoadError message={loadErr} onRetry={() => { setLoadErr(''); setLoading(true); load(true); }} />
      ) : (
        <FlatList
          data={tab === 'sv' ? visits : closures}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (tab === 'sv'
            ? <VisitCard v={item} onOpen={showHistory} />
            : <ClosureCard c={item} onOpen={showHistory} />)}
          contentContainerStyle={mc.listPad}
          showsVerticalScrollIndicator
          persistentScrollbar
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={7}
          removeClippedSubviews
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={mc.more} color={COLORS.link} /> : null}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}
          ListHeaderComponent={
            <>
              <View style={mc.stats}>
                <StatCard label="Site Visits Done" value={counts.completed} color={COLORS.success} bg={COLORS.successBg} />
                <StatCard label="Closures" value={counts.closures} color={COLORS.link} bg={COLORS.linkBg} />
                <StatCard label="Upcoming Visits" value={counts.scheduled} color={COLORS.warning} bg={COLORS.warningBg} />
              </View>
              <View style={mc.tabs}>
                {[{ key: 'sv', label: 'Site Visits' }, { key: 'closures', label: 'Closures' }].map((t) => (
                  <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[mc.tab, tab === t.key && mc.tabOn]}>
                    <Text style={[mc.tabText, tab === t.key && mc.tabTextOn]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={mc.empty}>
              <Ionicons name={tab === 'sv' ? 'location-outline' : 'checkmark-circle-outline'} size={40} color={MUTED} />
              <Text style={mc.emptyText}>
                {tab === 'sv'
                  ? (isStm ? 'No site visits recorded yet.' : 'No site visits from your referred leads yet.')
                  : (isStm ? 'No closures recorded yet.' : 'No closures from your referred leads yet.')}
              </Text>
            </View>
          }
        />
      )}

      <LeadHistoryModal lead={openLead} onClose={() => setOpenLead(null)} />
    </SafeAreaView>
  );
}

// Styles moved out of JSX (see AGENTS.md: no inline styles).
const SalesMyConversionsScreenS = StyleSheet.create({
  panel: { backgroundColor: COLORS.panel, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
});

const mc = StyleSheet.create({
  listPad:   { paddingBottom: 36 },
  stats:     { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 16, marginBottom: 12 },
  tabs:      { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, borderBottomWidth: 2, borderBottomColor: COLORS.surfaceAlt },
  tab:       { paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -2 },
  tabOn:     { borderBottomColor: COLORS.warning },
  tabText:   { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  tabTextOn: { color: COLORS.warning },

  card:         { ...CARD, padding: 14, marginBottom: 10, marginHorizontal: 16 },
  cardHead:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardHeadMain: { flex: 1 },
  name:         { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  phone:        { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  row:          { flexDirection: 'row', gap: 16 },
  rowGap:       { marginTop: 6 },
  field:        { flex: 1 },
  fieldLabel:   { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' },
  fieldValue:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  fieldValueStrong: { fontSize: 13, color: COLORS.textPrimary },
  fieldValueMoney:  { fontSize: 13, fontWeight: '700', color: COLORS.success },

  more:      { marginVertical: 18 },
  empty:     { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 12, textAlign: 'center' },
});
