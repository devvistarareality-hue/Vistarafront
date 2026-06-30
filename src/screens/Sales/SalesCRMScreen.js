import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl, Platform } from 'react-native';
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
  const [dateFrom,     setDateFrom]     = useState(null);
  const [dateTo,       setDateTo]       = useState(null);
  const [showFromPick, setShowFromPick] = useState(false);
  const [showToPick,   setShowToPick]   = useState(false);

  useEffect(() => { loadStats(); }, [companyId, dateFrom, dateTo]);

  async function loadStats(refresh = false) {
    if (refresh) setRefreshing(true);
    else if (!stats) setLoading(true);

    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('date_from', fmtDate(dateFrom));
      if (dateTo)   params.set('date_to',   fmtDate(dateTo));
      if (companyId) params.set('company_id', companyId);
      const qs = params.toString() ? `?${params}` : '';
      const res = await apiFetch(`${SALES_ENDPOINTS.stats}${qs}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {}
    setLoading(false);
    setRefreshing(false);
  }

  const isActiveRange = (from, to) => {
    if (!dateFrom || !dateTo) return false;
    return fmtDate(dateFrom) === fmtDate(from) && fmtDate(dateTo) === fmtDate(to);
  };

  // Each card deep-links to its corresponding list (Projects only for admins,
  // who have that screen registered).
  const STAT_CARDS = [
    { label: 'Total Leads',  value: stats?.total_leads    ?? '—', color: BLUE,      bg: COLORS.linkBg,    target: 'SalesLeads' },
    { label: 'New Today',    value: stats?.leads_today     ?? '—', color: COLORS.success, bg: COLORS.successBg, target: 'SalesLeads', params: { initialFilter: { date_from: 'today' } } },
    // CP leads are always self-assigned, so "Unassigned" isn't meaningful for CPs.
    ...(isCp || _des.includes('cp cluster head') ? [] : [{ label: 'Unassigned', value: stats?.new_leads ?? '—', color: COLORS.warning, bg: COLORS.warningBg, target: 'SalesLeads', params: { initialFilter: { status: 'new' } } }]),
    ...(isTelecaller ? [{ label: 'Called/MQL', value: stats?.called_count ?? '—', color: COLORS.success, bg: COLORS.successBg, target: 'SalesLeads', params: { initialWorkTab: 'called' } }] : []),
    { label: 'Closures',     value: stats?.closures        ?? '—', color: COLORS.error, bg: COLORS.errorBg,    target: 'SalesMyConversions', params: { initialTab: 'closures' } },
    { label: 'Site Visits',  value: stats?.sv_done         ?? '—', color: COLORS.purple, bg: COLORS.purpleBg,  target: 'SalesMyConversions', params: { initialTab: 'sv' } },
    { label: 'Projects',     value: stats?.active_projects ?? '—', color: COLORS.info, bg: COLORS.infoBg,      target: 'ClosureProjects' },
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
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadStats(true)} colors={[NAVY]} tintColor={NAVY} />}>

        {/* Date Filter */}
        <View style={{ marginHorizontal: 16, marginTop: 14, marginBottom: 10, backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.surfaceAlt, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 }}>Date</Text>
            <TouchableOpacity onPress={() => setShowFromPick(true)}
              style={{ height: 34, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.screenBg, justifyContent: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: dateFrom ? TEXT : MUTED }}>{dateFrom ? fmtLabel(dateFrom) : 'From'}</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: MUTED }}>→</Text>
            <TouchableOpacity onPress={() => setShowToPick(true)}
              style={{ height: 34, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.screenBg, justifyContent: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: dateTo ? TEXT : MUTED }}>{dateTo ? fmtLabel(dateTo) : 'To'}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Today', from: today,        to: today },
              { label: 'Week',  from: daysAgo(6),   to: today },
              { label: 'Month', from: daysAgo(29),  to: today },
            ].map(({ label, from, to }) => {
              const active = isActiveRange(from, to);
              return (
                <TouchableOpacity key={label} onPress={() => { setDateFrom(from); setDateTo(to); }}
                  style={{ height: 32, paddingHorizontal: 16, borderRadius: 8, backgroundColor: active ? NAVY : COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: active ? COLORS.white : MUTED }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity onPress={() => { setDateFrom(null); setDateTo(null); }}
              style={{ height: 32, paddingHorizontal: 16, borderRadius: 8, backgroundColor: !dateFrom && !dateTo ? NAVY : COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: !dateFrom && !dateTo ? COLORS.white : MUTED }}>All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {showFromPick && (
          <DateTimePicker value={dateFrom || new Date()} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'}
            maximumDate={dateTo || new Date()}
            onChange={(_, d) => { setShowFromPick(false); if (d) setDateFrom(d); }} />
        )}
        {showToPick && (
          <DateTimePicker value={dateTo || new Date()} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={dateFrom || undefined} maximumDate={new Date()}
            onChange={(_, d) => { setShowToPick(false); if (d) setDateTo(d); }} />
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
