import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
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

export default function SalesReportsScreen({ navigation }) {
  const companyId = useSelector((s) => s.adminFilter?.companyId);

  const fmtDate  = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const fmtLabel = (d) => d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All';
  const today    = new Date(); today.setHours(0,0,0,0);
  const daysAgo  = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0,0,0,0); return d; };

  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [dateFrom,     setDateFrom]     = useState(null);
  const [dateTo,       setDateTo]       = useState(null);
  const [showFilter,   setShowFilter]   = useState(false);
  const [pendingFrom,  setPendingFrom]  = useState(null);
  const [pendingTo,    setPendingTo]    = useState(null);
  const [showFromPick, setShowFromPick] = useState(false);
  const [showToPick,   setShowToPick]   = useState(false);

  const openFilter  = () => { setPendingFrom(dateFrom); setPendingTo(dateTo); setShowFilter(true); };
  const applyFilter = () => { setDateFrom(pendingFrom); setDateTo(pendingTo); setShowFilter(false); };
  const clearFilter = () => { setPendingFrom(null); setPendingTo(null); };
  const filterActive = !!(dateFrom || dateTo);

  useEffect(() => {
    let cancelled = false;
    setStats(null);
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams();
        if (dateFrom)  params.set('date_from',  fmtDate(dateFrom));
        if (dateTo)    params.set('date_to',     fmtDate(dateTo));
        if (companyId) params.set('company_id',  companyId);
        const qs  = params.toString() ? `?${params}` : '';
        const res = await apiFetch(`${SALES_ENDPOINTS.stats}${qs}`);
        if (cancelled) return;
        if (res.ok) { const data = await res.json(); if (!cancelled) setStats(data); }
      } catch (_) {}
      if (!cancelled) { setLoading(false); setRefreshing(false); }
    })();
    return () => { cancelled = true; };
  }, [companyId, dateFrom, dateTo]);

  async function reload(refresh = false) {
    if (refresh) { setStats(null); setRefreshing(true); setLoading(true); }
    try {
      const params = new URLSearchParams();
      if (dateFrom)  params.set('date_from',  fmtDate(dateFrom));
      if (dateTo)    params.set('date_to',     fmtDate(dateTo));
      if (companyId) params.set('company_id',  companyId);
      const qs  = params.toString() ? `?${params}` : '';
      const res = await apiFetch(`${SALES_ENDPOINTS.stats}${qs}`);
      if (res.ok) { const data = await res.json(); setStats(data); }
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
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
