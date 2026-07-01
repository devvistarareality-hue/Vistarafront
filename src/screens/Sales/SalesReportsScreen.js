import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl, Platform, Modal, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle, Rect, Text as SvgText } from 'react-native-svg';
import { apiFetch } from '../../utils/apiFetch';
import { useSelector } from 'react-redux';
import { SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const NAVY = COLORS.navy;
const BLUE = COLORS.link;
const BG   = COLORS.screenBg;
const TEXT = COLORS.textPrimary;
const MUTED = COLORS.textSecondary;
const CARD  = { backgroundColor: COLORS.cardBg, borderRadius: 16, ...CARD_SHADOW };

function fillDates(rows, dateFrom, dateTo) {
  const map = {};
  (rows || []).forEach(r => { map[r.date] = r.count; });
  const result = [];
  const cur = new Date(dateFrom + 'T00:00:00');
  const end = new Date(dateTo + 'T00:00:00');
  const localKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  while (cur <= end) {
    const key = localKey(cur);
    result.push({ date: key, count: map[key] ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

function MiniAreaChart({ data = [], color, gradId, width }) {
  const H = 110, padL = 28, padR = 8, padT = 8, padB = 22;
  const W = width - padL - padR;
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const [activeIdx, setActiveIdx] = useState(null);

  const shortDate = (s) => { const d = new Date(s + 'T00:00:00'); return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const x = e.nativeEvent.locationX;
      const idx = Math.round((x - padL) / W * (data.length - 1));
      setActiveIdx(Math.max(0, Math.min(data.length - 1, idx)));
    },
    onPanResponderMove: (e) => {
      const x = e.nativeEvent.locationX;
      const idx = Math.round((x - padL) / W * (data.length - 1));
      setActiveIdx(Math.max(0, Math.min(data.length - 1, idx)));
    },
    onPanResponderRelease: () => setActiveIdx(null),
    onPanResponderTerminate: () => setActiveIdx(null),
  })).current;

  if (!data.length || !width) return null;

  const px = (i) => padL + (i / (data.length - 1 || 1)) * W;
  const py = (v) => padT + (1 - v / maxVal) * (H - padT - padB);
  const linePts = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(d.count).toFixed(1)}`).join(' ');
  const fillPts = `${linePts} L${px(data.length - 1).toFixed(1)},${(H - padB).toFixed(1)} L${padL},${(H - padB).toFixed(1)} Z`;
  const labelIdxs = data.length <= 5 ? data.map((_, i) => i) : [0, Math.floor(data.length * 0.25), Math.floor(data.length * 0.5), Math.floor(data.length * 0.75), data.length - 1];

  const active = activeIdx !== null ? data[activeIdx] : null;
  const activePx = active ? px(activeIdx) : null;
  const activePy = active ? py(active.count) : null;

  // Tooltip box placement: keep within chart bounds
  const tooltipW = 72, tooltipH = 34;
  const tooltipX = active ? Math.min(Math.max(activePx - tooltipW / 2, padL), padL + W - tooltipW) : 0;
  const tooltipY = active ? Math.max(activePy - tooltipH - 8, padT) : 0;

  return (
    <View {...panResponder.panHandlers}>
      <Svg width={width} height={H}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Line x1={padL} y1={H - padB} x2={padL + W} y2={H - padB} stroke="#F0F3FA" strokeWidth={1} />
        <Path d={fillPts} fill={`url(#${gradId})`} />
        <Path d={linePts} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {labelIdxs.map(i => (
          <SvgText key={i} x={px(i)} y={H - 4} fontSize={9} fill={MUTED} textAnchor="middle">{shortDate(data[i].date)}</SvgText>
        ))}
        <SvgText x={padL - 4} y={padT + 4} fontSize={9} fill={MUTED} textAnchor="end">{maxVal}</SvgText>

        {active && (
          <>
            <Line x1={activePx} y1={padT} x2={activePx} y2={H - padB} stroke={color} strokeWidth={1} strokeDasharray="3 3" />
            <Circle cx={activePx} cy={activePy} r={5} fill={color} stroke="#fff" strokeWidth={2} />
            <Rect x={tooltipX} y={tooltipY} width={tooltipW} height={tooltipH} rx={6} fill="#1A1A2E" />
            <SvgText x={tooltipX + tooltipW / 2} y={tooltipY + 13} fontSize={9} fill="#B0BAD0" textAnchor="middle">{shortDate(active.date)}</SvgText>
            <SvgText x={tooltipX + tooltipW / 2} y={tooltipY + 27} fontSize={13} fontWeight="700" fill="#fff" textAnchor="middle">{active.count}</SvgText>
          </>
        )}
      </Svg>
    </View>
  );
}

function TrendCard({ title, badge, total, data, color, gradId }) {
  const [width, setWidth] = useState(0);
  return (
    <View style={[CARD, { marginBottom: 12, padding: 16, overflow: 'hidden' }]} onLayout={e => setWidth(e.nativeEvent.layout.width - 32)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <View>
          <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>{title}</Text>
          <Text style={{ fontSize: 26, fontWeight: '800', color: TEXT }}>{total}</Text>
        </View>
        <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: color + '22' }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color }}>{badge}</Text>
        </View>
      </View>
      {width > 0 && data.length > 0
        ? <MiniAreaChart data={data} color={color} gradId={gradId} width={width} />
        : <View style={{ height: 90, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 12, color: MUTED }}>No data</Text></View>
      }
    </View>
  );
}

export default function SalesReportsScreen({ navigation }) {
  const companyId = useSelector((s) => s.adminFilter?.companyId);

  const fmtDate  = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const fmtLabel = (d) => d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All';
  const today    = new Date(); today.setHours(0,0,0,0);
  const daysAgo  = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0,0,0,0); return d; };

  const [stats,           setStats]           = useState(null);
  const [trend,           setTrend]           = useState(null);
  const [monthTrend,      setMonthTrend]      = useState(null);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [dateFrom,        setDateFrom]        = useState(null);
  const [dateTo,          setDateTo]          = useState(null);
  const [showFilter,      setShowFilter]      = useState(false);
  const [pendingFrom,     setPendingFrom]     = useState(null);
  const [pendingTo,       setPendingTo]       = useState(null);
  const [showFromPick,    setShowFromPick]    = useState(false);
  const [showToPick,      setShowToPick]      = useState(false);
  const [selectedMonths,  setSelectedMonths]  = useState([]);
  const [pendingMonths,   setPendingMonths]   = useState([]);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const openFilter  = () => { setPendingFrom(dateFrom); setPendingTo(dateTo); setShowFilter(true); };
  const applyFilter = () => { setDateFrom(pendingFrom); setDateTo(pendingTo); setShowFilter(false); };
  const clearFilter = () => { setPendingFrom(null); setPendingTo(null); };
  const filterActive = !!(dateFrom || dateTo);

  // Generate last 24 months as options
  const monthOptions = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    return {
      key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
      label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    };
  });

  useEffect(() => {
    let cancelled = false;
    setStats(null);
    setTrend(null);
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams();
        if (dateFrom)  params.set('date_from',  fmtDate(dateFrom));
        if (dateTo)    params.set('date_to',     fmtDate(dateTo));
        if (companyId) params.set('company_id',  companyId);
        const qs  = params.toString() ? `?${params}` : '';
        const [statsRes, trendRes] = await Promise.all([
          apiFetch(`${SALES_ENDPOINTS.stats}${qs}`),
          apiFetch(`${SALES_ENDPOINTS.statsTrend}${qs}`),
        ]);
        if (cancelled) return;
        if (statsRes.ok) { const d = await statsRes.json(); if (!cancelled) setStats(d); }
        if (trendRes.ok) { const d = await trendRes.json(); if (!cancelled) setTrend(d); }
      } catch (_) {}
      if (!cancelled) { setLoading(false); setRefreshing(false); }
    })();
    return () => { cancelled = true; };
  }, [companyId, dateFrom, dateTo]);

  useEffect(() => {
    if (selectedMonths.length === 0) { setMonthTrend(null); return; }
    let cancelled = false;
    (async () => {
      const sorted = [...selectedMonths].sort();
      const [ey, em] = sorted[0].split('-').map(Number);
      const [ly, lm] = sorted[sorted.length - 1].split('-').map(Number);
      const from = `${ey}-${String(em).padStart(2,'0')}-01`;
      const lastDay = new Date(ly, lm, 0).getDate();
      const to = `${ly}-${String(lm).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;
      try {
        const params = new URLSearchParams({ date_from: from, date_to: to });
        if (companyId) params.set('company_id', companyId);
        const res = await apiFetch(`${SALES_ENDPOINTS.statsTrend}?${params}`);
        if (res.ok && !cancelled) { const d = await res.json(); setMonthTrend(d); }
      } catch (_) {}
    })();
    return () => { cancelled = true; };
  }, [selectedMonths, companyId]);

  async function reload(refresh = false) {
    if (refresh) { setStats(null); setTrend(null); setRefreshing(true); setLoading(true); }
    try {
      const params = new URLSearchParams();
      if (dateFrom)  params.set('date_from',  fmtDate(dateFrom));
      if (dateTo)    params.set('date_to',     fmtDate(dateTo));
      if (companyId) params.set('company_id',  companyId);
      const qs  = params.toString() ? `?${params}` : '';
      const [statsRes, trendRes] = await Promise.all([
        apiFetch(`${SALES_ENDPOINTS.stats}${qs}`),
        apiFetch(`${SALES_ENDPOINTS.statsTrend}${qs}`),
      ]);
      if (statsRes.ok) { const d = await statsRes.json(); setStats(d); }
      if (trendRes.ok) { const d = await trendRes.json(); setTrend(d); }
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }

  const _called  = stats?.called_count ?? 0;
  const _svDone  = stats?.sv_done      ?? 0;
  const _mqlToSv = _called > 0 ? (_svDone / _called * 100).toFixed(1) + '%' : '—';

  const STAT_CARDS = [
    { label: 'My Leads',     value: stats?.total_leads    ?? '—', color: BLUE,          bg: COLORS.linkBg,    target: 'SalesLeads' },
    { label: 'New Today',    value: stats?.leads_today    ?? '—', color: COLORS.success, bg: COLORS.successBg, target: 'SalesLeads' },
    { label: 'Called/MQL',  value: _called,                       color: COLORS.success, bg: COLORS.successBg, target: 'SalesLeads', params: { initialWorkTab: 'called' } },
    { label: 'Warm/SQL',     value: stats?.warm_count     ?? '—', color: COLORS.warning, bg: COLORS.warningBg, target: 'SalesLeads', params: { initialWorkTab: 'called', initialFilter: { tc_status: 'warm' } } },
    { label: 'SV Done',      value: _svDone,                      color: COLORS.purple,  bg: COLORS.purpleBg,  target: 'SalesMyConversions', params: { initialTab: 'sv' } },
    { label: 'MQL→SV Ratio', value: _mqlToSv,                     color: BLUE,           bg: COLORS.linkBg,    target: 'SalesMyConversions' },
    { label: 'Callback Due', value: stats?.callback_count ?? '—', color: COLORS.purple,  bg: COLORS.purpleBg,  target: 'SalesLeads', params: { initialWorkTab: 'called', initialFilter: { tc_status: 'callback' } } },
    { label: 'Closures',     value: stats?.closures       ?? '—', color: COLORS.error,   bg: COLORS.errorBg,   target: 'SalesMyConversions', params: { initialTab: 'closures' } },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 20, fontWeight: '800', color: TEXT }}>Reports</Text>
        <TouchableOpacity onPress={() => reload(true)} disabled={refreshing} style={{ padding: 6, backgroundColor: BG, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
          <Ionicons name="refresh-outline" size={20} color={NAVY} />
        </TouchableOpacity>
        <TouchableOpacity onPress={openFilter} style={{ padding: 6, backgroundColor: filterActive ? NAVY : BG, borderWidth: 1, borderColor: filterActive ? NAVY : COLORS.border, borderRadius: 8 }}>
          <Ionicons name="filter-outline" size={20} color={filterActive ? COLORS.white : NAVY} />
        </TouchableOpacity>
      </View>

      {/* Filter Bottom Sheet */}
      <Modal visible={showFilter} transparent animationType="slide" onRequestClose={() => setShowFilter(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={() => setShowFilter(false)} />
        <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT }}>Filter by Date</Text>
            <TouchableOpacity onPress={() => setShowFilter(false)}>
              <Ionicons name="close" size={22} color={MUTED} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Quick Select</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {[
              { label: 'Today', from: today,       to: today },
              { label: 'Week',  from: daysAgo(6),  to: today },
              { label: 'Month', from: daysAgo(29), to: today },
            ].map(({ label, from, to }) => {
              const active = pendingFrom && pendingTo && fmtDate(pendingFrom) === fmtDate(from) && fmtDate(pendingTo) === fmtDate(to);
              return (
                <TouchableOpacity key={label} onPress={() => { setPendingFrom(from); setPendingTo(to); }}
                  style={{ height: 36, paddingHorizontal: 20, borderRadius: 8, backgroundColor: active ? NAVY : COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: active ? COLORS.white : MUTED }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity onPress={clearFilter}
              style={{ height: 36, paddingHorizontal: 20, borderRadius: 8, backgroundColor: !pendingFrom && !pendingTo ? NAVY : COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: !pendingFrom && !pendingTo ? COLORS.white : MUTED }}>All</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Custom Range</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <TouchableOpacity onPress={() => setShowFromPick(true)}
              style={{ flex: 1, height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: pendingFrom ? TEXT : MUTED }}>{pendingFrom ? fmtLabel(pendingFrom) : 'From date'}</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 14, color: MUTED }}>→</Text>
            <TouchableOpacity onPress={() => setShowToPick(true)}
              style={{ flex: 1, height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: pendingTo ? TEXT : MUTED }}>{pendingTo ? fmtLabel(pendingTo) : 'To date'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={applyFilter}
            style={{ backgroundColor: NAVY, borderRadius: 12, height: 48, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.white }}>Apply Filter</Text>
          </TouchableOpacity>
        </View>

        {showFromPick && (
          <DateTimePicker value={pendingFrom || new Date()} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'}
            maximumDate={pendingTo || new Date()}
            onChange={(_, d) => { setShowFromPick(false); if (d) setPendingFrom(d); }} />
        )}
        {showToPick && (
          <DateTimePicker value={pendingTo || new Date()} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={pendingFrom || undefined} maximumDate={new Date()}
            onChange={(_, d) => { setShowToPick(false); if (d) setPendingTo(d); }} />
        )}
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => reload(true)} colors={[NAVY]} tintColor={NAVY} />}>

        {filterActive && (
          <TouchableOpacity onPress={openFilter} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Ionicons name="calendar-outline" size={13} color={BLUE} />
            <Text style={{ fontSize: 12, color: BLUE, fontWeight: '600' }}>
              {fmtLabel(dateFrom)} → {fmtLabel(dateTo)}
            </Text>
            <TouchableOpacity onPress={() => { setDateFrom(null); setDateTo(null); }} style={{ marginLeft: 2 }}>
              <Ionicons name="close-circle" size={15} color={MUTED} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 12 }}>Overview</Text>

        {loading ? (
          <ActivityIndicator color={NAVY} style={{ marginVertical: 40 }} />
        ) : (
          <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {STAT_CARDS.map(s => (
                <TouchableOpacity key={s.label} activeOpacity={s.target ? 0.7 : 1}
                  onPress={() => s.target && navigation.navigate(s.target, s.params)}
                  style={[CARD, { width: '30%', flexGrow: 1, padding: 12, alignItems: 'center' }]}>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: s.color }}>{s.value}</Text>
                  <Text style={{ fontSize: 10, color: MUTED, marginTop: 3, textAlign: 'center', fontWeight: '600' }}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {(trend || monthTrend) && (() => {
              const activeTrend = selectedMonths.length > 0 && monthTrend ? monthTrend : trend;
              if (!activeTrend) return null;
              const from = activeTrend.date_from;
              const to   = activeTrend.date_to;
              const mqlData  = fillDates(activeTrend.mql, from, to);
              const svData   = fillDates(activeTrend.sv,  from, to);
              const mqlTotal = mqlData.reduce((s, d) => s + d.count, 0);
              const svTotal  = svData.reduce((s, d) => s + d.count, 0);
              const shortFmt = (s) => new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
              const periodLabel = `${shortFmt(from)} – ${shortFmt(to)}`;
              return (
                <View style={{ marginTop: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.7 }}>Trends</Text>
                    <TouchableOpacity onPress={() => { setPendingMonths(selectedMonths); setShowMonthPicker(true); }}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: selectedMonths.length > 0 ? NAVY : COLORS.screenBg, borderWidth: 1, borderColor: selectedMonths.length > 0 ? NAVY : COLORS.border }}>
                      <Ionicons name="calendar-outline" size={13} color={selectedMonths.length > 0 ? COLORS.white : MUTED} />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: selectedMonths.length > 0 ? COLORS.white : MUTED }}>
                        {selectedMonths.length > 0 ? `${selectedMonths.length} Month${selectedMonths.length > 1 ? 's' : ''}` : 'Filter Month'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {selectedMonths.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {[...selectedMonths].sort().map(m => {
                        const [y, mo] = m.split('-').map(Number);
                        const label = new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
                        return (
                          <TouchableOpacity key={m} onPress={() => setSelectedMonths(prev => prev.filter(x => x !== m))}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: BLUE + '18' }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: BLUE }}>{label}</Text>
                            <Ionicons name="close-circle" size={13} color={BLUE} />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  <Text style={{ fontSize: 10, color: MUTED, fontWeight: '500', marginBottom: 10 }}>{periodLabel}</Text>
                  <TrendCard title="Called / MQL"     badge="MQL Trend" total={mqlTotal} data={mqlData} color={BLUE}           gradId="mqlGrad" />
                  <TrendCard title="Site Visits (SV)" badge="SV Trend"  total={svTotal}  data={svData}  color={COLORS.success} gradId="svGrad"  />
                </View>
              );
            })()}
          </>
        )}
      </ScrollView>

      {/* Month Picker Modal */}
      <Modal visible={showMonthPicker} transparent animationType="slide" onRequestClose={() => setShowMonthPicker(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={() => setShowMonthPicker(false)} />
        <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 36, maxHeight: '70%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT }}>Select Months</Text>
            <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
              <Ionicons name="close" size={22} color={MUTED} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {monthOptions.map(({ key, label }) => {
              const selected = pendingMonths.includes(key);
              return (
                <TouchableOpacity key={key} onPress={() => setPendingMonths(prev => selected ? prev.filter(m => m !== key) : [...prev, key])}
                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
                  <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: selected ? NAVY : COLORS.border, backgroundColor: selected ? NAVY : 'transparent', marginRight: 12, alignItems: 'center', justifyContent: 'center' }}>
                    {selected && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: selected ? '700' : '500', color: selected ? TEXT : MUTED }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity onPress={() => setPendingMonths([])}
              style={{ flex: 1, height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: MUTED }}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setSelectedMonths(pendingMonths); setShowMonthPicker(false); }}
              style={{ flex: 2, height: 46, borderRadius: 12, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.white }}>
                Apply{pendingMonths.length > 0 ? ` (${pendingMonths.length})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
