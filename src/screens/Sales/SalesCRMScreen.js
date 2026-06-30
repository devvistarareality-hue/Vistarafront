import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiFetch } from '../../utils/apiFetch';
import { useSelector } from 'react-redux';
import { SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const NAVY = COLORS.navy; const BLUE = COLORS.link; const BG = COLORS.screenBg; const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 16, ...CARD_SHADOW };

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

const MENU = [
  { key: 'SalesLeads',        label: 'All Leads',    icon: 'people-outline',         color: COLORS.link, bg: COLORS.linkBg,  adminOnly: false },
  { key: 'SalesFollowUps',    label: 'Follow-Ups',   icon: 'calendar-outline',        color: COLORS.warning, bg: COLORS.warningBg,  adminOnly: false },
  { key: 'SalesSiteVisits',   label: 'Site Visits',  icon: 'location-outline',        color: COLORS.success, bg: COLORS.successBg,  adminOnly: false, stmOnly: true },
  { key: 'ClosureProjects',   label: 'Booking',      icon: 'document-text-outline',   color: COLORS.link, bg: COLORS.linkBg,  adminOnly: false, stmOnly: true },
  { key: 'SalesMyConversions', label: 'My Conversions', icon: 'trending-up-outline',   color: COLORS.success, bg: COLORS.successBg,  adminOnly: false, tcStmOnly: true },
  { key: 'MyTeam',            label: 'My Team',      icon: 'people-circle-outline',   color: COLORS.purple, bg: COLORS.purpleBg,  adminOnly: false, managerOnly: true, navParams: { module: 'Sales', title: 'My Team' } },
  { key: 'BookingApprovals',  label: 'Approvals',    icon: 'checkmark-done-outline',  color: COLORS.success, bg: COLORS.successBg, adminOnly: false, managerOnly: true },
  { key: 'SalesProjects',     label: 'Projects',      icon: 'business-outline',        color: COLORS.success, bg: COLORS.successBg,  adminOnly: true  },
  { key: 'SalesSources',      label: 'Lead Setup',    icon: 'git-network-outline',     color: COLORS.info, bg: COLORS.infoBg,  adminOnly: true  },
  { key: 'SalesTeam',         label: 'Team Users',    icon: 'person-circle-outline',   color: COLORS.purple, bg: COLORS.purpleBg,  adminOnly: true  },
  { key: 'SalesDistribution', label: 'Distribution',  icon: 'shuffle-outline',         color: COLORS.warning, bg: COLORS.warningBg,  adminOnly: true  },
  { key: 'SalesImport',       label: 'Import Leads',  icon: 'cloud-upload-outline',    color: COLORS.info, bg: COLORS.infoBg,  adminOnly: true  },
  { key: 'SalesDataReset',    label: 'Data Reset',    icon: 'trash-outline',           color: COLORS.error, bg: COLORS.errorBg,  adminOnly: true  },
  { key: 'SalesReports',      label: 'Reports',       icon: 'bar-chart-outline',       color: COLORS.linkPressed, bg: COLORS.infoBg,  adminOnly: false },
];

function getDesignationLabel(user) {
  const des = (user?.designation || '').toLowerCase();
  if (des.includes('telecaller') || des.includes('tele caller')) return { title: 'Telecaller Portal', sub: 'Your call queue & leads' };
  if (des.includes('cp cluster head')) return { title: 'Channel Partner', sub: 'Your CP team' };
  if (des.includes('cp executive') || des.includes('channel partner')) return { title: 'Channel Partner', sub: 'Your pipeline & site visits' };
  if (des.includes('stm') || des.includes('sales team') || des.includes('sales executive')) return { title: 'Sales Executive', sub: 'Your pipeline & site visits' };
  return { title: 'Sales CRM', sub: 'Vistara Realty' };
}

export default function SalesCRMScreen({ navigation }) {
  const user      = useSelector((s) => s.auth.user);
  const companyId = useSelector((s) => s.adminFilter?.companyId);
  const isAdmin   = user?.role === 'Admin' || user?.is_staff;
  const _des = (user?.designation || '').toLowerCase();
  const isStm = _des.includes('stm') || _des.includes('sales team') || _des.includes('sales executive');
  const isTelecaller = _des.includes('telecaller') || _des.includes('tele caller');
  // Managers also get the STM-portal modules (Site Visits, Booking, My Conversions).
  const isManager = user?.role === 'Manager';
  // CP Executive works their own leads like an STM (no Meta) → same modules.
  const isCp = _des.includes('cp executive') || _des.includes('channel partner');
  const visibleMenu = MENU.filter(m => (!m.adminOnly || isAdmin) && (!m.managerOnly || isAdmin || isManager) && (!m.stmOnly || isAdmin || isStm || isManager || isCp) && (!m.tcOnly || isAdmin || isTelecaller) && (!m.tcStmOnly || isAdmin || isTelecaller || isStm || isManager || isCp));
  const { title: screenTitle, sub: screenSub } = getDesignationLabel(user);

  const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const fmtLabel = (d) => d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All';
  const today = new Date(); today.setHours(0,0,0,0);
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0,0,0,0); return d; };

  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  // Applied filter (triggers fetch)
  const [dateFrom,     setDateFrom]     = useState(null);
  const [dateTo,       setDateTo]       = useState(null);
  // Filter sheet state (pending = not yet applied)
  const [showFilter,   setShowFilter]   = useState(false);
  const [pendingFrom,  setPendingFrom]  = useState(null);
  const [pendingTo,    setPendingTo]    = useState(null);
  const [showFromPick, setShowFromPick] = useState(false);
  const [showToPick,   setShowToPick]   = useState(false);

  const openFilter = () => { setPendingFrom(dateFrom); setPendingTo(dateTo); setShowFilter(true); };
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
        if (dateFrom) params.set('date_from', fmtDate(dateFrom));
        if (dateTo)   params.set('date_to',   fmtDate(dateTo));
        if (companyId) params.set('company_id', companyId);
        const qs = params.toString() ? `?${params}` : '';
        const res = await apiFetch(`${SALES_ENDPOINTS.stats}${qs}`);
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setStats(data);
        }
      } catch (_) {}
      if (!cancelled) { setLoading(false); setRefreshing(false); }
    })();
    return () => { cancelled = true; };
  }, [companyId, dateFrom, dateTo]);

  async function loadStats(refresh = false) {
    if (refresh) {
      setStats(null); setRefreshing(true); setLoading(true);
      try {
        const params = new URLSearchParams();
        if (dateFrom) params.set('date_from', fmtDate(dateFrom));
        if (dateTo)   params.set('date_to',   fmtDate(dateTo));
        if (companyId) params.set('company_id', companyId);
        const qs = params.toString() ? `?${params}` : '';
        const res = await apiFetch(`${SALES_ENDPOINTS.stats}${qs}`);
        if (res.ok) { const data = await res.json(); setStats(data); }
      } catch (_) {}
      setLoading(false); setRefreshing(false);
    }
  }

  const isActiveRange = (from, to) => {
    if (!dateFrom || !dateTo) return false;
    return fmtDate(dateFrom) === fmtDate(from) && fmtDate(dateTo) === fmtDate(to);
  };

  const _called  = stats?.called_count ?? 0;
  const _svDone  = stats?.sv_done      ?? 0;
  const _mqlToSv = _called > 0 ? (_svDone / _called * 100).toFixed(1) + '%' : '—';

  const STAT_CARDS = [
    { label: 'My Leads',      value: stats?.total_leads    ?? '—', color: BLUE,           bg: COLORS.linkBg,    target: 'SalesLeads' },
    { label: 'New Today',     value: stats?.leads_today    ?? '—', color: COLORS.success,  bg: COLORS.successBg, target: 'SalesLeads' },
    { label: 'Called/MQL',   value: _called,                       color: COLORS.success,  bg: COLORS.successBg, target: 'SalesLeads', params: { initialWorkTab: 'called' } },
    { label: 'Hot',           value: stats?.hot_count      ?? '—', color: COLORS.error,    bg: COLORS.errorBg,   target: 'SalesLeads', params: { initialFilter: { telecaller_status: 'hot' } } },
    { label: 'Warm/SQL',      value: stats?.warm_count     ?? '—', color: COLORS.warning,  bg: COLORS.warningBg, target: 'SalesLeads', params: { initialFilter: { telecaller_status: 'warm' } } },
    { label: 'SV Done',       value: _svDone,                      color: COLORS.purple,   bg: COLORS.purpleBg,  target: 'SalesMyConversions', params: { initialTab: 'sv' } },
    { label: 'MQL→SV Ratio',  value: _mqlToSv,                     color: BLUE,            bg: COLORS.linkBg,    target: 'SalesMyConversions' },
    { label: 'Callback Due',  value: stats?.callback_count ?? '—', color: COLORS.purple,   bg: COLORS.purpleBg,  target: 'SalesLeads', params: { initialFilter: { telecaller_status: 'callback' } } },
    { label: 'Closures',      value: stats?.closures       ?? '—', color: COLORS.error,    bg: COLORS.errorBg,   target: 'SalesMyConversions', params: { initialTab: 'closures' } },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        {navigation.canGoBack() && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={20} color={NAVY} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>{screenTitle}</Text>
          <Text style={{ fontSize: 13, color: MUTED }}>{screenSub}</Text>
        </View>
        <TouchableOpacity onPress={() => loadStats(true)} disabled={refreshing} style={{ padding: 6, backgroundColor: BG, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
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

          {/* Quick buttons */}
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

          {/* Custom date range */}
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

          {/* Apply button */}
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadStats(true)} colors={[NAVY]} tintColor={NAVY} />}>

        {/* Active filter label */}
        {filterActive && (
          <TouchableOpacity onPress={openFilter} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginTop: 10, marginBottom: 2 }}>
            <Ionicons name="calendar-outline" size={13} color={BLUE} />
            <Text style={{ fontSize: 12, color: BLUE, fontWeight: '600' }}>
              {fmtLabel(dateFrom)} → {fmtLabel(dateTo)}
            </Text>
            <TouchableOpacity onPress={() => { setDateFrom(null); setDateTo(null); }} style={{ marginLeft: 2 }}>
              <Ionicons name="close-circle" size={15} color={MUTED} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* Stats */}
        <View style={{ paddingHorizontal: 16, paddingTop: 4, marginBottom: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 12 }}>Overview</Text>
          {loading ? (
            <ActivityIndicator color={NAVY} style={{ marginVertical: 20 }} />
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
        </View>

        {/* Menu */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 12 }}>Modules</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {visibleMenu.map(m => (
              <TouchableOpacity key={m.key} onPress={() => navigation.navigate(m.key, m.navParams)}
                style={[CARD, { width: '47%', padding: 16 }]} activeOpacity={0.8}>
                <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: m.bg, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                  <Ionicons name={m.icon} size={22} color={m.color} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 6 }}>{m.label}</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: m.color }}>Open →</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
