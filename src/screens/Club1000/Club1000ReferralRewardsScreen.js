import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, StatusBar, RefreshControl, StyleSheet } from 'react-native';
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

const NAVY = COLORS.navy; const TEAL = COLORS.success; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 22, ...CARD_SHADOW , borderWidth: 1, borderColor: COLORS.cardBorder };

// The rate a reward was locked in at is the only record of what earned it.
const PCT_OPTIONS = [
  { value: '0.50', label: 'New investment (0.5%)' },
  { value: '0.25', label: 'Renewal (0.25%)' },
];
const EMPTY_FILTERS = { pct: '', scheme_id: '', date_from: '', date_to: '' };
// One referrer is one person however their number was typed: 8866339595 and
// +91 88663 39595 are the same card, the same filter, the same total. The last
// ten digits are what the server matches on too.
const phoneKey = (v) => String(v || '').replace(/\D/g, '').slice(-10);

/* Filters that don't belong as chips, in the sheet Club 1000 Leads uses. */
function FilterSheet({ visible, onClose, filters, setFilters, schemes, facets }) {
  const fx = (key) => facets?.[key] ?? null;
  const [local, setLocal] = useState(filters);
  useEffect(() => { if (visible) setLocal(filters); }, [visible]);
  const set = (k, v) => setLocal((f) => ({ ...f, [k]: v }));
  const iso = (d) => d.toISOString().slice(0, 10);
  const ago = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
  const today = iso(new Date());
  const RANGES = [['Last 30 days', ago(30), today], ['Last 90 days', ago(90), today], ['This year', today.slice(0, 4) + '-01-01', today]];

  return (
    <FormSheet visible={visible} onClose={onClose}>
      <View style={ClubReferralRewardsScreenS.sheetHead}>
        <Text style={ClubReferralRewardsScreenS.sheetTitle}>Filters</Text>
        <TouchableOpacity onPress={() => { setLocal(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); onClose(); }}>
          <Text style={ClubReferralRewardsScreenS.clearAll}>Clear All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={ClubReferralRewardsScreenS.sheetBody} contentContainerStyle={ClubReferralRewardsScreenS.sheetContent}>
        <View>
          <Text style={ClubReferralRewardsScreenS.fsLbl}>EARNED</Text>
          <View style={ClubReferralRewardsScreenS.rangeRow}>
            {RANGES.map(([label, from, to]) => {
              const active = local.date_from === from && local.date_to === to;
              return (
                <TouchableOpacity key={label} onPress={() => { set('date_from', active ? '' : from); set('date_to', active ? '' : to); }}
                  style={[ClubReferralRewardsScreenS.rangeBtn, active && ClubReferralRewardsScreenS.rangeBtnOn]}>
                  <Text style={[ClubReferralRewardsScreenS.rangeTxt, active && ClubReferralRewardsScreenS.rangeTxtOn]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        <View>
          <Text style={ClubReferralRewardsScreenS.fsLbl}>EARNED ON</Text>
          <FilterSelect label="New and renewal" value={local.pct} onChange={(v) => set('pct', v)}
            options={[{ value: '', label: 'New and renewal' }, ...onlyPresent(PCT_OPTIONS, fx('pcts'), local.pct)]} />
        </View>
        <View>
          <Text style={ClubReferralRewardsScreenS.fsLbl}>SCHEME</Text>
          <FilterSelect label="All Schemes" value={local.scheme_id} onChange={(v) => set('scheme_id', v)}
            options={[{ value: '', label: 'All Schemes' },
              ...onlyPresent(schemes.map((s) => ({ value: String(s.id), label: s.name })), fx('scheme_ids'), local.scheme_id)]} />
        </View>
        <TouchableOpacity onPress={() => { setFilters(local); onClose(); }} style={ClubReferralRewardsScreenS.apply}>
          <Text style={ClubReferralRewardsScreenS.applyTxt}>Apply</Text>
        </TouchableOpacity>
      </ScrollView>
    </FormSheet>
  );
}

function fmtMoney(n) {
  const num = Number(n || 0);
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function groupByReferrer(rewards) {
  const groups = new Map();
  for (const r of rewards) {
    const key = phoneKey(r.reference_phone) || (r.reference_name || '').trim().toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, { reference_name: r.reference_name, reference_phone: r.reference_phone, total: 0, pending: 0, count: 0 });
    }
    const g = groups.get(key);
    const amount = Number(r.amount) || 0;
    g.total += amount;
    g.count += 1;
    if (r.status !== 'paid') g.pending += amount;
  }
  return Array.from(groups.values()).sort((a, b) => b.total - a.total);
}

export default function Club1000ReferralRewardsScreen({ navigation }) {
  const user = useSelector((s) => s.auth.user);
  const manager = isClub1000Manager(user);

  const [rewards,    setRewards]    = useState([]);
  const [schemes,    setSchemes]    = useState([]);
  const [facets,     setFacets]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState('pending');
  const [filters,    setFilters]    = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  // Which referrer's rewards to show. Held by phone, not name: the name is
  // free-typed and drifts, the number does not.
  const [referrer,   setReferrer]   = useState('');
  const [search,     setSearch]     = useState('');
  const [searchText, setSearchText] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchText), 400);
    return () => clearTimeout(t);
  }, [searchText]);

  useEffect(() => {
    apiFetch(`${CLUB1000_ENDPOINTS.referralRewards}?facets=1`).then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setFacets(d)).catch(() => {});
    apiFetch(CLUB1000_ENDPOINTS.schemes).then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setSchemes(d)).catch(() => {});
  }, []);

  // Only the newest request writes to state; filters outpace the network.
  const reqRef = useRef(0);

  async function load(refresh = false) {
    const ticket = ++reqRef.current;
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      if (search) params.set('search', search);
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      // `reference` is deliberately not sent: the cards above are the whole
      // picture of who referred whom, and filtering server-side would collapse
      // them to the one already picked. The rows are narrowed below instead.
      const q = params.toString();
      const res = await apiFetch(`${CLUB1000_ENDPOINTS.referralRewards}${q ? `?${q}` : ''}`);
      const data = res.ok ? await res.json() : null;
      if (ticket !== reqRef.current) return;
      if (data) setRewards(data);
    } catch (_) {}
    if (ticket === reqRef.current) { setLoading(false); setRefreshing(false); }
  }

  useFocusEffect(React.useCallback(() => { load(); }, [filter, search, filters]));

  const narrowed = !!(referrer || search || Object.values(filters).some(Boolean) || filter !== 'pending');
  const activeCount = Object.values(filters).filter(Boolean).length
    - (filters.date_from && filters.date_to ? 1 : 0);

  function markPaid(id) {
    Alert.alert('Mark as paid?', 'This confirms the referral reward has been disbursed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Paid', onPress: async () => {
        const res = await apiFetch(CLUB1000_ENDPOINTS.referralRewardMarkPaid(id), { method: 'POST' });
        if (res.ok) load();
      } },
    ]);
  }

  // Cards from everything the filters allow, before the referrer choice, so a
  // picked card reads as one of a set rather than the only one there is.
  const referrers = groupByReferrer(rewards);
  const rows = referrer ? rewards.filter((r) => phoneKey(r.reference_phone) === referrer) : rewards;
  const listedTotal = rows.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={BG} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'transparent', borderBottomWidth: 0, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={ClubReferralRewardsScreenS.titleWrap}>
          <Text style={ClubReferralRewardsScreenS.title}>Referral Rewards</Text>
          {!loading && (
            <Text style={ClubReferralRewardsScreenS.sub}>
              {rows.length} {filter || ''} reward{rows.length === 1 ? '' : 's'} · {fmtMoney(listedTotal)}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => setShowFilters(true)} style={ClubReferralRewardsScreenS.filterBtn}>
          <Ionicons name="options-outline" size={18} color={COLORS.textPrimary} />
          {activeCount > 0 && <Text style={ClubReferralRewardsScreenS.filterCount}>{activeCount}</Text>}
        </TouchableOpacity>
      </View>

      <View style={ClubReferralRewardsScreenS.searchRow}>
        <Ionicons name="search-outline" size={16} color={MUTED} />
        <TextInput value={searchText} onChangeText={setSearchText} placeholder="Search referrer or referred investor…"
          placeholderTextColor={COLORS.text3} style={ClubReferralRewardsScreenS.searchInput} returnKeyType="search" />
        {searchText ? <TouchableOpacity onPress={() => setSearchText('')}><Ionicons name="close-circle" size={16} color={MUTED} /></TouchableOpacity> : null}
      </View>

      <View style={ClubReferralRewardsScreenS.chipRow}>
        {onlyPresent([{ value: 'pending', label: 'Pending' }, { value: 'paid', label: 'Paid' }], facets?.statuses ?? null, filter)
          .concat([{ value: '', label: 'All' }]).map((f) => (
          <TouchableOpacity key={f.value} onPress={() => setFilter(f.value)}
            style={[ClubReferralRewardsScreenS.chip, filter === f.value && ClubReferralRewardsScreenS.chipOn]}>
            <Text style={[ClubReferralRewardsScreenS.chipTxt, filter === f.value && ClubReferralRewardsScreenS.chipTxtOn]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}>
        {loading ? <AppLoader style={{ marginTop: 24 }} /> : (
          <>
            {referrers.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                {referrers.map((g) => {
                  const key = phoneKey(g.reference_phone);
                  const on = !!key && referrer === key;
                  /* A card is a filter: its figure counts rows the list below
                     was not showing. */
                  return (
                    <TouchableOpacity key={g.reference_phone || g.reference_name} disabled={!key}
                      onPress={() => setReferrer(on ? '' : key)}
                      style={[CARD, ClubReferralRewardsScreenS.refCard, on && ClubReferralRewardsScreenS.refCardOn]}>
                      <Text style={ClubReferralRewardsScreenS.refName} numberOfLines={1}>{g.reference_name || '—'}</Text>
                      {!!g.reference_phone && <Text style={ClubReferralRewardsScreenS.refPhone}>{g.reference_phone}</Text>}
                      <Text style={ClubReferralRewardsScreenS.refAmt}>{fmtMoney(g.total)}</Text>
                      <Text style={ClubReferralRewardsScreenS.refMeta}>{g.count} referral{g.count === 1 ? '' : 's'}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {rows.length === 0 ? (
              <Text style={ClubReferralRewardsScreenS.empty}>
                {narrowed ? 'No referral rewards match these filters.' : 'No referral rewards yet.'}
              </Text>
            ) : rows.map((r) => (
              <View key={r.id} style={[CARD, { padding: 14, marginBottom: 10 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT }}>{r.reference_name}</Text>
                    <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{r.reference_phone}</Text>
                    <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Referred {r.investor_name}</Text>
                    <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Earned {formatDMY(r.created_at?.slice(0, 10))}</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: TEAL }}>{fmtMoney(r.amount)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: r.status === 'paid' ? COLORS.successBg : COLORS.warningBg }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: r.status === 'paid' ? COLORS.success : COLORS.warning }}>
                      {r.status === 'paid' ? 'Paid' : 'Pending'}
                    </Text>
                  </View>
                  {manager && r.status === 'pending' && can(user, 'club.payout.mark_paid') && (
                    <TouchableOpacity onPress={() => markPaid(r.id)} style={ClubReferralRewardsScreenS.btn}>
                      <Text style={ClubReferralRewardsScreenS.box}>Mark Paid</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <FilterSheet visible={showFilters} onClose={() => setShowFilters(false)}
        filters={filters} setFilters={setFilters} schemes={schemes} facets={facets} />
    </SafeAreaView>
  );
}

// Styles moved out of JSX (see AGENTS.md: no inline styles).
const ClubReferralRewardsScreenS = StyleSheet.create({
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

  chipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border },
  chipOn: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  chipTxt: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  chipTxtOn: { color: COLORS.white },

  refCard: { width: '47%', padding: 14 },
  refCardOn: { borderColor: COLORS.navy, borderWidth: 2 },
  refName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  refPhone: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  refAmt: { fontSize: 17, fontWeight: '800', color: COLORS.success, marginTop: 6 },
  refMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3 },

  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 30 },

  fsLbl: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.8, marginBottom: 8 },
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
