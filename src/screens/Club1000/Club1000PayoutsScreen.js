import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, StatusBar, RefreshControl, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { can } from '../../lib/roles';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { CLUB1000_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { isClub1000Manager } from '../../utils/club1000Access';
import { formatDMY } from '../../utils/dateFormat';
import AppLoader from '../../components/AppLoader';
import FormSheet from '../../components/FormSheet';
import FilterSelect from '../../components/FilterSelect';
import { onlyPresent } from '../../lib/presentOptions';
import { errText } from '../../lib/apiError';

const NAVY = COLORS.navy; const TEAL = COLORS.success; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 22, ...CARD_SHADOW , borderWidth: 1, borderColor: COLORS.cardBorder };

const TYPE_LABELS = { interest: 'Interest', maturity: 'Maturity', premature_redemption: 'Premature Redemption' };
const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));
const EMPTY_FILTERS = { payout_type: '', scheme_id: '', date_from: '', date_to: '' };

function fmtMoney(n) {
  const num = Number(n || 0);
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

const fsLbl = { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.8, marginBottom: 8 };

/* ── Filter Bottom Sheet ── mirrors Club 1000 Leads, so the two screens are
   filtered the same way. Type and scheme live here rather than as more chips
   up top; the ones in the header are the ones reached for every day. */
function FilterSheet({ visible, onClose, filters, setFilters, schemes, facets }) {
  const fx = (key) => facets?.[key] ?? null;
  const [local, setLocal] = useState(filters);
  useEffect(() => { if (visible) setLocal(filters); }, [visible]);
  const set = (k, v) => setLocal((f) => ({ ...f, [k]: v }));
  const iso = (d) => d.toISOString().slice(0, 10);
  const shifted = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const today = iso(new Date());
  // Dated by due date, so the useful spans run both ways — what was owed and
  // what is coming.
  const RANGES = [
    ['Last 30 days', shifted(-30), today],
    ['Next 30 days', today, shifted(30)],
    ['Next 90 days', today, shifted(90)],
  ];

  return (
    <FormSheet visible={visible} onClose={onClose}>
      <View style={ClubPayoutsScreenS.sheetHead}>
        <Text style={ClubPayoutsScreenS.sheetTitle}>Filters</Text>
        <TouchableOpacity onPress={() => { setLocal(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); onClose(); }}>
          <Text style={ClubPayoutsScreenS.clearAll}>Clear All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={ClubPayoutsScreenS.sheetBody} contentContainerStyle={ClubPayoutsScreenS.sheetContent}>
        <View>
          <Text style={fsLbl}>DUE DATE</Text>
          <View style={ClubPayoutsScreenS.rangeRow}>
            {RANGES.map(([label, from, to]) => {
              const active = local.date_from === from && local.date_to === to;
              return (
                <TouchableOpacity key={label} onPress={() => { set('date_from', active ? '' : from); set('date_to', active ? '' : to); }}
                  style={[ClubPayoutsScreenS.rangeBtn, active && ClubPayoutsScreenS.rangeBtnOn]}>
                  <Text style={[ClubPayoutsScreenS.rangeTxt, active && ClubPayoutsScreenS.rangeTxtOn]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View>
          <Text style={fsLbl}>TYPE</Text>
          <FilterSelect label="All Types" value={local.payout_type} onChange={(v) => set('payout_type', v)}
            options={[{ value: '', label: 'All Types' }, ...onlyPresent(TYPE_OPTIONS, fx('types'), local.payout_type)]} />
        </View>

        <View>
          <Text style={fsLbl}>SCHEME</Text>
          <FilterSelect label="All Schemes" value={local.scheme_id} onChange={(v) => set('scheme_id', v)}
            options={[{ value: '', label: 'All Schemes' },
              ...onlyPresent(schemes.map((s) => ({ value: String(s.id), label: s.name })), fx('scheme_ids'), local.scheme_id)]} />
        </View>

        <TouchableOpacity onPress={() => { setFilters(local); onClose(); }} style={ClubPayoutsScreenS.apply}>
          <Text style={ClubPayoutsScreenS.applyTxt}>Apply</Text>
        </TouchableOpacity>
      </ScrollView>
    </FormSheet>
  );
}

export default function Club1000PayoutsScreen({ navigation, route }) {
  const user = useSelector((s) => s.auth.user);
  const manager = isClub1000Manager(user);

  const [payouts,    setPayouts]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Deep-link support: the dashboard's Pending/Paid Payouts stat cards pass
  // initialFilter so this screen opens already switched to the matching tab.
  const [filter,     setFilter]     = useState(route?.params?.initialFilter ?? 'pending');
  // The two live questions no stored column answers: what has slipped past its
  // date, and what lands next. Both mean pending — something already paid is
  // not late however old it is.
  const [bucket,     setBucket]     = useState(route?.params?.initialBucket ?? '');
  const [filters,    setFilters]    = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [schemes,    setSchemes]    = useState([]);
  const [facets,     setFacets]     = useState(null);
  const [search,     setSearch]     = useState('');
  const [searchText, setSearchText] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchText), 400);
    return () => clearTimeout(t);
  }, [searchText]);
  const [payingFor,  setPayingFor]  = useState(null);
  const [payForm,    setPayForm]    = useState({ amount: '', notes: '' });
  const [saving,     setSaving]     = useState(false);

  useEffect(() => { if (!manager) navigation.goBack(); }, [manager]);

  // Only the values these rows hold, and the schemes to name them by.
  useEffect(() => {
    if (!manager) return;
    apiFetch(`${CLUB1000_ENDPOINTS.payouts}?facets=1`).then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setFacets(d)).catch(() => {});
    apiFetch(CLUB1000_ENDPOINTS.schemes).then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSchemes(d)).catch(() => {});
  }, [manager]);

  // Filters change faster than the network answers; only the newest request is
  // allowed to write to state, or a slower earlier one lands last and wins.
  const reqRef = useRef(0);

  async function load(refresh = false) {
    const ticket = ++reqRef.current;
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      if (bucket) params.set('bucket', bucket);
      if (search) params.set('search', search);
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const q = params.toString();
      const res = await apiFetch(`${CLUB1000_ENDPOINTS.payouts}${q ? `?${q}` : ''}`);
      const rows = res.ok ? await res.json() : null;
      if (ticket !== reqRef.current) return;
      if (rows) setPayouts(rows);
    } catch (_) {}
    if (ticket === reqRef.current) { setLoading(false); setRefreshing(false); }
  }

  useFocusEffect(React.useCallback(() => { if (manager) load(); },
    [manager, filter, bucket, search, filters]));

  const narrowed = !!(bucket || search || Object.values(filters).some(Boolean) || filter !== 'pending');
  const activeCount = (bucket ? 1 : 0) + Object.values(filters).filter(Boolean).length
    - (filters.date_from && filters.date_to ? 1 : 0);
  const listedTotal = payouts.reduce((sum, p) => sum + Number(p.amount_due || 0), 0);

  function openMarkPaid(p) {
    setPayForm({ amount: String(p.amount_due), notes: '' });
    setPayingFor(p);
  }

  async function submitMarkPaid() {
    if (!payForm.amount) { Alert.alert('Amount required', 'Enter the amount paid.'); return; }
    setSaving(true);
    try {
      const res = await apiFetch(CLUB1000_ENDPOINTS.payoutMarkPaid(payingFor.id), {
        method: 'POST',
        body: JSON.stringify({ amount: payForm.amount, notes: payForm.notes }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { Alert.alert('Could not mark paid', errText(d, 'Please try again.')); return; }
      setPayingFor(null);
      load();
    } finally {
      setSaving(false);
    }
  }

  if (!manager) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={BG} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'transparent', borderBottomWidth: 0, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={ClubPayoutsScreenS.titleWrap}>
          <Text style={ClubPayoutsScreenS.title}>Payouts</Text>
          {/* What is on screen, not what the page is for — a stock description
              over a filtered list is how a working filter looks broken. */}
          {!loading && (
            <Text style={ClubPayoutsScreenS.sub}>
              {payouts.length} {filter || ''} payout{payouts.length === 1 ? '' : 's'} · {fmtMoney(listedTotal)}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => setShowFilters(true)} style={ClubPayoutsScreenS.filterBtn}>
          <Ionicons name="options-outline" size={18} color={activeCount ? COLORS.white : COLORS.textPrimary} />
          {activeCount > 0 && <Text style={ClubPayoutsScreenS.filterCount}>{activeCount}</Text>}
        </TouchableOpacity>
      </View>

      <View style={ClubPayoutsScreenS.searchRow}>
        <Ionicons name="search-outline" size={16} color={MUTED} />
        <TextInput value={searchText} onChangeText={setSearchText} placeholder="Search investor name or phone…"
          placeholderTextColor={COLORS.text3} style={ClubPayoutsScreenS.searchInput} returnKeyType="search" />
        {searchText ? <TouchableOpacity onPress={() => setSearchText('')}><Ionicons name="close-circle" size={16} color={MUTED} /></TouchableOpacity> : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ClubPayoutsScreenS.chipRow}>
        {onlyPresent([{ value: 'pending', label: 'Pending' }, { value: 'paid', label: 'Paid' }], facets?.statuses ?? null, filter)
          .concat([{ value: '', label: 'All' }]).map((f) => (
          <TouchableOpacity key={f.value} onPress={() => setFilter(f.value)}
            style={[ClubPayoutsScreenS.chip, filter === f.value && ClubPayoutsScreenS.chipOn]}>
            <Text style={[ClubPayoutsScreenS.chipTxt, filter === f.value && ClubPayoutsScreenS.chipTxtOn]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
        {/* Each implies pending on its own, so picking one also moves the status
            chip — otherwise "Paid · Overdue" would show an empty list and look
            like a bug rather than a contradiction. */}
        {[{ value: 'overdue', label: 'Overdue' }, { value: 'due_soon', label: 'Due in 30 days' }].map((b) => (
          <TouchableOpacity key={b.value}
            onPress={() => { const on = bucket === b.value; setBucket(on ? '' : b.value); if (!on) setFilter('pending'); }}
            style={[ClubPayoutsScreenS.chip, bucket === b.value && ClubPayoutsScreenS.chipWarn]}>
            <Text style={[ClubPayoutsScreenS.chipTxt, bucket === b.value && ClubPayoutsScreenS.chipTxtWarn]}>{b.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}>
        {loading ? <AppLoader style={{ marginTop: 24 }} /> : payouts.length === 0 ? (
          <Text style={ClubPayoutsScreenS.empty}>
            {narrowed ? 'No payouts match these filters.' : 'No payouts.'}
          </Text>
        ) : payouts.map((p) => (
          <View key={p.id} style={[CARD, { padding: 14, marginBottom: 10 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT }}>{p.investor_name}</Text>
                <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{p.scheme_name} · {TYPE_LABELS[p.payout_type] || p.payout_type}</Text>
                <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Due {formatDMY(p.due_date)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: TEAL }}>{fmtMoney(p.amount_due)}</Text>
                {p.status === 'paid' && p.paid_amount != null && Number(p.paid_amount) !== Number(p.amount_due) && (
                  <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.warning }}>Paid {fmtMoney(p.paid_amount)}</Text>
                )}
              </View>
            </View>
            {p.status === 'paid' && !!p.notes && (
              <Text style={{ fontSize: 12, color: MUTED, marginTop: 6, fontStyle: 'italic' }}>"{p.notes}"</Text>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: p.status === 'paid' ? COLORS.successBg : COLORS.warningBg }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: p.status === 'paid' ? COLORS.success : COLORS.warning }}>
                  {p.status === 'paid' ? 'Paid' : 'Pending'}
                </Text>
              </View>
              {p.status === 'pending' && can(user, 'club.payout.mark_paid') && (
                <TouchableOpacity onPress={() => openMarkPaid(p)} style={ClubPayoutsScreenS.btn}>
                  <Text style={ClubPayoutsScreenS.box}>Mark Paid</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      <FilterSheet visible={showFilters} onClose={() => setShowFilters(false)}
        filters={filters} setFilters={setFilters} schemes={schemes} facets={facets} />

      <Modal visible={!!payingFor} transparent animationType="slide" onRequestClose={() => setPayingFor(null)}>
        <View style={{ flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 24 }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT }}>Mark Payout Paid</Text>
              {!!payingFor && (
                <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                  {payingFor.investor_name} · {TYPE_LABELS[payingFor.payout_type] || payingFor.payout_type} · Due {formatDMY(payingFor.due_date)}
                </Text>
              )}
            </View>
            <View style={{ padding: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6 }}>Amount Paid (₹)</Text>
              <TextInput value={payForm.amount} onChangeText={(v) => setPayForm((f) => ({ ...f, amount: v }))} keyboardType="decimal-pad"
                style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: TEXT }} />
              {!!payingFor && <Text style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>Scheduled: {fmtMoney(payingFor.amount_due)}</Text>}

              <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginTop: 14, marginBottom: 6 }}>Remarks</Text>
              <TextInput value={payForm.notes} onChangeText={(v) => setPayForm((f) => ({ ...f, notes: v }))}
                placeholder="e.g. paid via NEFT, rounded to nearest ₹10…" placeholderTextColor={MUTED} multiline
                style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: TEXT, minHeight: 70, textAlignVertical: 'top' }} />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <TouchableOpacity onPress={() => setPayingFor(null)} style={{ flex: 1, height: 46, borderRadius: 16, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: MUTED }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={submitMarkPaid} disabled={saving} style={{ flex: 1, height: 46, borderRadius: 16, backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center', opacity: saving ? 0.6 : 1 }}>
                  {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.white }}>Mark Paid</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Styles moved out of JSX (see AGENTS.md: no inline styles).
const ClubPayoutsScreenS = StyleSheet.create({
  btn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: COLORS.btnTintSuccess, borderWidth: 1, borderColor: COLORS.btnBorderSuccess },
  box: { fontSize: 12, fontWeight: '700', color: COLORS.btnTextSuccess },

  titleWrap: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, paddingHorizontal: 12,
    borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterCount: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },

  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 4,
    paddingHorizontal: 12, height: 42, borderRadius: 14, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: COLORS.textPrimary },

  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 2 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border },
  chipOn: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  chipWarn: { backgroundColor: COLORS.warningBg, borderColor: COLORS.warning },
  chipTxt: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  chipTxtOn: { color: COLORS.white },
  chipTxtWarn: { color: COLORS.warning },

  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 30 },

  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  clearAll: { fontSize: 13, fontWeight: '700', color: COLORS.error },
  sheetBody: { flexShrink: 1 },
  sheetContent: { padding: 16, gap: 16 },
  rangeRow: { flexDirection: 'row', gap: 8 },
  rangeBtn: { flex: 1, paddingVertical: 9, borderRadius: 14, alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5, borderColor: COLORS.border },
  rangeBtnOn: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  rangeTxt: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  rangeTxtOn: { color: COLORS.white },
  apply: { height: 48, borderRadius: 16, backgroundColor: COLORS.navy, alignItems: 'center', justifyContent: 'center' },
  applyTxt: { fontSize: 14, fontWeight: '800', color: COLORS.white },
});
