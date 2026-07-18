import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSelector } from 'react-redux';
import { apiFetch } from '../../utils/apiFetch';
import { CLUB1000_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { isClub1000Manager } from '../../utils/club1000Access';

const NAVY  = COLORS.navy;
const TEAL  = '#00838F';
const BG    = COLORS.screenBg;
const TEXT  = COLORS.textPrimary;
const MUTED = COLORS.textSecondary;
const CARD  = { backgroundColor: COLORS.cardBg, borderRadius: 16, ...CARD_SHADOW };

const MENU = [
  { key: 'Club1000Investors',  label: 'Investors',   icon: 'people-outline',        color: TEAL,           bg: '#E0F7FA',        managerOnly: false },
  { key: 'Club1000Schemes',    label: 'Schemes',      icon: 'layers-outline',        color: COLORS.link,     bg: COLORS.linkBg,   managerOnly: true },
  { key: 'Club1000Payouts',    label: 'Payouts',      icon: 'wallet-outline',        color: COLORS.success,  bg: COLORS.successBg, managerOnly: true },
  { key: 'Club1000ReferralRewards', label: 'Referral Rewards', icon: 'gift-outline', color: COLORS.warning, bg: COLORS.warningBg, managerOnly: true },
  { key: 'MyTeam',             label: 'My Team',      icon: 'people-circle-outline', color: COLORS.purple,   bg: COLORS.purpleBg,  managerOnly: true, navParams: { module: 'Club 1000', title: 'My Team' } },
];

function fmtMoney(n) {
  const num = Number(n || 0);
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function Club1000HubScreen({ navigation }) {
  const user      = useSelector((s) => s.auth.user);
  const companyId = useSelector((s) => s.adminFilter?.companyId);
  const manager   = isClub1000Manager(user);
  const visibleMenu = MENU.filter((m) => !m.managerOnly || manager);

  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Date filter (Today/Week/Month/All quick-select + Financial Year / Quarter
  // / Month multi-select + custom range) — mirrors Sales' SalesReportsScreen. ──
  const fmtDate  = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fmtLabel = (d) => d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All';
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const daysAgo  = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0, 0, 0, 0); return d; };

  const [dateFrom,        setDateFrom]        = useState(null);
  const [dateTo,          setDateTo]          = useState(null);
  const [showFilter,      setShowFilter]      = useState(false);
  const [pendingFrom,     setPendingFrom]     = useState(null);
  const [pendingTo,       setPendingTo]       = useState(null);
  const [showFromPick,    setShowFromPick]    = useState(false);
  const [showToPick,      setShowToPick]      = useState(false);
  const [selectedMonths,  setSelectedMonths]  = useState([]);
  const [pendingMonths,   setPendingMonths]   = useState([]);
  const [selectedQuarter, setSelectedQuarter] = useState([]);
  const [pendingQuarter,  setPendingQuarter]  = useState([]);
  const [selectedFyYear,  setSelectedFyYear]  = useState(null);
  const [pendingFyYear,   setPendingFyYear]   = useState(null);
  const [iosPickerDate,   setIosPickerDate]   = useState(null);

  const openFilter  = () => { setPendingFrom(dateFrom); setPendingTo(dateTo); setPendingMonths(selectedMonths); setPendingQuarter(selectedQuarter); setPendingFyYear(selectedFyYear); setShowFilter(true); };
  const applyFilter = () => { setDateFrom(pendingFrom); setDateTo(pendingTo); setSelectedMonths(pendingMonths); setSelectedQuarter(pendingQuarter); setSelectedFyYear(pendingFyYear); setShowFilter(false); setShowFromPick(false); setShowToPick(false); };
  const closeFilter = () => { setShowFilter(false); setShowFromPick(false); setShowToPick(false); };
  const clearFilter = () => { setPendingFrom(null); setPendingTo(null); setPendingMonths([]); setPendingQuarter([]); setPendingFyYear(null); };
  const filterActive = !!(dateFrom || dateTo || selectedMonths.length > 0 || selectedQuarter.length > 0 || selectedFyYear !== null);

  // Financial year starts April; compute quarter/month date ranges.
  const currentYear    = today.getFullYear();
  const currentFyStart = today.getMonth() >= 3 ? currentYear : currentYear - 1;
  const fyY             = selectedFyYear ?? currentFyStart;

  const makeQuarters = (fy) => [
    { key: 'Q1', label: 'Q1', sub: 'Apr – Jun', from: `${fy}-04-01`,   to: `${fy}-06-30` },
    { key: 'Q2', label: 'Q2', sub: 'Jul – Sep', from: `${fy}-07-01`,   to: `${fy}-09-30` },
    { key: 'Q3', label: 'Q3', sub: 'Oct – Dec', from: `${fy}-10-01`,   to: `${fy}-12-31` },
    { key: 'Q4', label: 'Q4', sub: 'Jan – Mar', from: `${fy+1}-01-01`, to: `${fy+1}-03-31` },
  ];
  const makeMonthOptions = (fy) => Array.from({ length: 12 }, (_, i) => {
    const mIdx = (i + 3) % 12; // Apr=3, May=4, ..., Dec=11, Jan=0, Feb=1, Mar=2
    const y = i < 9 ? fy : fy + 1;
    return {
      key: `${y}-${String(mIdx + 1).padStart(2, '0')}`,
      label: new Date(y, mIdx, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    };
  });

  const QUARTERS   = makeQuarters(fyY);
  const FY_OPTIONS = Array.from({ length: 4 }, (_, i) => currentFyStart - i).filter(y => y >= 2020).map(y => ({ key: y, label: `FY ${y}-${String(y + 1).slice(2)}` }));

  // Effective date range: quarter > months > year (full FY) > custom range.
  const effectiveDates = (() => {
    if (selectedQuarter.length > 0) {
      const qs = QUARTERS.filter(q => selectedQuarter.includes(q.key));
      const froms = qs.map(q => q.from).sort();
      const tos   = qs.map(q => q.to).sort();
      return { from: froms[0], to: tos[tos.length - 1] };
    }
    if (selectedMonths.length > 0) {
      const sorted = [...selectedMonths].sort();
      const [ey, em] = sorted[0].split('-').map(Number);
      const [ly, lm] = sorted[sorted.length - 1].split('-').map(Number);
      const from = `${ey}-${String(em).padStart(2, '0')}-01`;
      const lastDay = new Date(ly, lm, 0).getDate();
      const to = `${ly}-${String(lm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      return { from, to };
    }
    if (selectedFyYear !== null) return { from: `${fyY}-04-01`, to: `${fyY + 1}-03-31` };
    return { from: dateFrom ? fmtDate(dateFrom) : null, to: dateTo ? fmtDate(dateTo) : null };
  })();

  const pendingFyY       = pendingFyYear ?? currentFyStart;
  const pendingQUARTERS  = makeQuarters(pendingFyY);
  const pendingMonthOpts = makeMonthOptions(pendingFyY);

  async function loadStats(refresh = false) {
    if (refresh) { setRefreshing(true); } else { setLoading(true); }
    try {
      const params = new URLSearchParams();
      if (companyId) params.set('company_id', companyId);
      if (effectiveDates.from) params.set('date_from', effectiveDates.from);
      if (effectiveDates.to)   params.set('date_to', effectiveDates.to);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await apiFetch(`${CLUB1000_ENDPOINTS.stats}${qs}`);
      if (res.ok) setStats(await res.json());
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { loadStats(); }, [companyId, dateFrom, dateTo, selectedMonths, selectedQuarter, selectedFyYear]);

  const STAT_CARDS = manager
    ? [
        { label: 'Total Invested',   value: fmtMoney(stats?.total_invested),  color: TEAL,           target: 'Club1000Investors' },
        { label: 'Investors',        value: stats?.investor_count ?? '—',     color: COLORS.link,    target: 'Club1000Investors' },
        { label: 'Active Schemes',   value: stats?.active_scheme_count ?? '—', color: COLORS.success, target: 'Club1000Schemes' },
        { label: 'Pending Payouts',  value: stats?.pending_payout_count ?? '—', color: COLORS.warning, target: 'Club1000Payouts', params: { initialFilter: 'pending' } },
        { label: 'Paid Payouts',     value: stats?.paid_payout_count ?? '—',   color: COLORS.success, target: 'Club1000Payouts', params: { initialFilter: 'paid' } },
      ]
    : [
        { label: 'My Investors',     value: stats?.investor_count ?? '—',     color: COLORS.link,    target: 'Club1000Investors' },
        { label: 'Total Invested',   value: fmtMoney(stats?.total_invested),  color: TEAL,           target: 'Club1000Investors' },
        { label: 'Pending Payouts',  value: stats?.pending_payout_count ?? '—', color: COLORS.warning },
        { label: 'Paid Payouts',     value: stats?.paid_payout_count ?? '—',   color: COLORS.success },
      ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        {navigation.canGoBack() && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={20} color={NAVY} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>Club 1000</Text>
          <Text style={{ fontSize: 13, color: MUTED }}>Investment portfolio and returns tracking</Text>
        </View>
        <TouchableOpacity onPress={openFilter} style={{ padding: 6, backgroundColor: filterActive ? NAVY : BG, borderWidth: 1, borderColor: filterActive ? NAVY : COLORS.border, borderRadius: 8 }}>
          <Ionicons name="filter-outline" size={20} color={filterActive ? COLORS.white : NAVY} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => loadStats(true)} disabled={refreshing} style={{ padding: 6, backgroundColor: BG, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
          <Ionicons name="refresh-outline" size={20} color={NAVY} />
        </TouchableOpacity>
      </View>

      {/* Filter Bottom Sheet */}
      <Modal visible={showFilter} transparent animationType="slide" onRequestClose={closeFilter}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={closeFilter} />
        <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 36, maxHeight: '80%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT }}>Filter</Text>
            <TouchableOpacity onPress={closeFilter}>
              <Ionicons name="close" size={22} color={MUTED} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Quick Select */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Quick Select</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {[
                { label: 'Today', from: today,       to: today },
                { label: 'Week',  from: daysAgo(6),  to: today },
                { label: 'Month', from: daysAgo(29), to: today },
              ].map(({ label, from, to }) => {
                const active = pendingFrom && pendingTo && fmtDate(pendingFrom) === fmtDate(from) && fmtDate(pendingTo) === fmtDate(to);
                return (
                  <TouchableOpacity key={label} onPress={() => { setPendingFrom(from); setPendingTo(to); setPendingMonths([]); setPendingQuarter([]); setPendingFyYear(null); }}
                    style={{ height: 36, paddingHorizontal: 20, borderRadius: 8, backgroundColor: active ? NAVY : COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: active ? COLORS.white : MUTED }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity onPress={clearFilter}
                style={{ height: 36, paddingHorizontal: 20, borderRadius: 8, backgroundColor: !pendingFrom && !pendingTo && pendingMonths.length === 0 && pendingQuarter.length === 0 && pendingFyYear === null ? NAVY : COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: !pendingFrom && !pendingTo && pendingMonths.length === 0 && pendingQuarter.length === 0 && pendingFyYear === null ? COLORS.white : MUTED }}>All</Text>
              </TouchableOpacity>
            </View>

            {/* Financial Year Select */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Financial Year</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {FY_OPTIONS.map(({ key, label }) => {
                const sel = pendingFyYear === key;
                return (
                  <TouchableOpacity key={key}
                    onPress={() => { setPendingFyYear(sel ? null : key); setPendingMonths([]); setPendingQuarter([]); setPendingFrom(null); setPendingTo(null); }}
                    style={{ height: 36, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1.5, borderColor: sel ? NAVY : COLORS.border, backgroundColor: sel ? NAVY : COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: sel ? COLORS.white : MUTED }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quarter Select */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Quarter (FY {pendingFyY}-{String(pendingFyY + 1).slice(2)})</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {pendingQUARTERS.map(({ key, label, sub }) => {
                const sel = pendingQuarter.includes(key);
                return (
                  <TouchableOpacity key={key}
                    onPress={() => { setPendingQuarter(prev => sel ? prev.filter(k => k !== key) : [...prev, key]); setPendingFrom(null); setPendingTo(null); setPendingMonths([]); }}
                    style={{ flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: sel ? NAVY : COLORS.border, backgroundColor: sel ? NAVY : COLORS.screenBg, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: sel ? COLORS.white : TEXT }}>{label}</Text>
                    <Text style={{ fontSize: 9, fontWeight: '600', color: sel ? COLORS.white + 'CC' : MUTED, marginTop: 2 }}>{sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Month Select */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Select Month</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {pendingMonthOpts.map(({ key, label }) => {
                const sel = pendingMonths.includes(key);
                return (
                  <TouchableOpacity key={key}
                    onPress={() => { setPendingFrom(null); setPendingTo(null); setPendingQuarter([]); setPendingMonths(prev => sel ? prev.filter(m => m !== key) : [...prev, key]); }}
                    style={{ height: 36, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1.5, borderColor: sel ? NAVY : COLORS.border, backgroundColor: sel ? NAVY : COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: sel ? COLORS.white : MUTED }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Range */}
            <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Custom Range</Text>

            {Platform.OS === 'ios' && showFromPick ? (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: NAVY, marginBottom: 4 }}>From Date</Text>
                <DateTimePicker value={iosPickerDate || new Date()} mode="date" display="spinner"
                  maximumDate={pendingTo || new Date()}
                  onChange={(_, d) => { if (d) setIosPickerDate(d); }}
                  style={{ height: 160 }} />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <TouchableOpacity onPress={() => setShowFromPick(false)}
                    style={{ flex: 1, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: MUTED }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setShowFromPick(false); if (iosPickerDate) { setPendingFrom(iosPickerDate); setPendingMonths([]); setPendingQuarter([]); setPendingFyYear(null); } }}
                    style={{ flex: 1, height: 40, borderRadius: 10, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.white }}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : Platform.OS === 'ios' && showToPick ? (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: NAVY, marginBottom: 4 }}>To Date</Text>
                <DateTimePicker value={iosPickerDate || new Date()} mode="date" display="spinner"
                  minimumDate={pendingFrom || undefined} maximumDate={new Date()}
                  onChange={(_, d) => { if (d) setIosPickerDate(d); }}
                  style={{ height: 160 }} />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  <TouchableOpacity onPress={() => setShowToPick(false)}
                    style={{ flex: 1, height: 40, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: MUTED }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setShowToPick(false); if (iosPickerDate) { setPendingTo(iosPickerDate); setPendingMonths([]); setPendingQuarter([]); setPendingFyYear(null); } }}
                    style={{ flex: 1, height: 40, borderRadius: 10, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.white }}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <TouchableOpacity onPress={() => { setIosPickerDate(pendingFrom || new Date()); setShowFromPick(true); }}
                  style={{ flex: 1, height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: pendingFrom ? TEXT : MUTED }}>{pendingFrom ? fmtLabel(pendingFrom) : 'From date'}</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 14, color: MUTED }}>→</Text>
                <TouchableOpacity onPress={() => { setIosPickerDate(pendingTo || new Date()); setShowToPick(true); }}
                  style={{ flex: 1, height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: pendingTo ? TEXT : MUTED }}>{pendingTo ? fmtLabel(pendingTo) : 'To date'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity onPress={applyFilter}
            style={{ backgroundColor: NAVY, borderRadius: 12, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.white }}>Apply Filter</Text>
          </TouchableOpacity>
        </View>

        {Platform.OS !== 'ios' && showFromPick && (
          <DateTimePicker value={pendingFrom || new Date()} mode="date" display="default"
            maximumDate={pendingTo || new Date()}
            onChange={(_, d) => { setShowFromPick(false); if (d) { setPendingFrom(d); setPendingMonths([]); setPendingQuarter([]); setPendingFyYear(null); } }} />
        )}
        {Platform.OS !== 'ios' && showToPick && (
          <DateTimePicker value={pendingTo || new Date()} mode="date" display="default"
            minimumDate={pendingFrom || undefined} maximumDate={new Date()}
            onChange={(_, d) => { setShowToPick(false); if (d) { setPendingTo(d); setPendingMonths([]); setPendingQuarter([]); setPendingFyYear(null); } }} />
        )}
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadStats(true)} colors={[NAVY]} tintColor={NAVY} />}>

        <View style={{ paddingHorizontal: 16, paddingTop: 14, marginBottom: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 12 }}>Overview</Text>
          {loading ? (
            <ActivityIndicator color={NAVY} style={{ marginVertical: 20 }} />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {STAT_CARDS.map((s) => (
                <TouchableOpacity key={s.label} activeOpacity={s.target ? 0.7 : 1}
                  onPress={() => s.target && navigation.navigate(s.target, s.params)}
                  style={[CARD, { width: '30%', flexGrow: 1, padding: 12, alignItems: 'center' }]}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: s.color }}>{s.value}</Text>
                  <Text style={{ fontSize: 10, color: MUTED, marginTop: 3, textAlign: 'center', fontWeight: '600', minHeight: 26, lineHeight: 13 }}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 12 }}>Menu</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {visibleMenu.map((m) => (
              <TouchableOpacity key={m.key} onPress={() => navigation.navigate(m.key, m.navParams)}
                style={[CARD, { width: '47%', padding: 16 }]} activeOpacity={0.8}>
                <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: m.bg, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name={m.icon} size={22} color={m.color} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
