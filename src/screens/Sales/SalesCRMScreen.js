import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  { key: 'SalesProjects',     label: 'Projects',      icon: 'business-outline',        color: COLORS.success, bg: COLORS.successBg,  adminOnly: true  },
  { key: 'SalesSources',      label: 'Lead Setup',    icon: 'git-network-outline',     color: COLORS.info, bg: COLORS.infoBg,  adminOnly: true  },
  { key: 'SalesTeam',         label: 'Team Users',    icon: 'person-circle-outline',   color: COLORS.purple, bg: COLORS.purpleBg,  adminOnly: true  },
  { key: 'SalesDistribution', label: 'Distribution',  icon: 'shuffle-outline',         color: COLORS.warning, bg: COLORS.warningBg,  adminOnly: true  },
  { key: 'SalesImport',       label: 'Import Leads',  icon: 'cloud-upload-outline',    color: COLORS.info, bg: COLORS.infoBg,  adminOnly: true  },
  { key: 'SalesReports',      label: 'Reports',       icon: 'bar-chart-outline',       color: COLORS.linkPressed, bg: COLORS.infoBg,  adminOnly: false },
];

function getDesignationLabel(user) {
  const des = (user?.designation || '').toLowerCase();
  if (des.includes('telecaller') || des.includes('tele caller')) return { title: 'Telecaller Portal', sub: 'Your call queue & leads' };
  if (des.includes('stm') || des.includes('sales team') || des.includes('sales executive')) return { title: 'Sales Executive', sub: 'Your pipeline & site visits' };
  return { title: 'Sales CRM', sub: 'Vistara Realty' };
}

export default function SalesCRMScreen({ navigation }) {
  const user      = useSelector((s) => s.auth.user);
  const companyId = useSelector((s) => s.adminFilter?.companyId);
  const isAdmin   = user?.role === 'Admin' || user?.is_staff;
  const visibleMenu = MENU.filter(m => !m.adminOnly || isAdmin);
  const { title: screenTitle, sub: screenSub } = getDesignationLabel(user);

  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cache key is per-company so switching company never shows stale data from another company
  const STATS_CACHE_KEY = `@vistara_sales_stats_${companyId || 'all'}`;
  const STATS_TTL_MS    = 2 * 60 * 1000; // 2 minutes

  useEffect(() => { loadStats(); }, [companyId]);

  async function loadStats(refresh = false) {
    // Always show cached data immediately (even if stale) — no spinner on repeat visits
    try {
      const raw = await AsyncStorage.getItem(STATS_CACHE_KEY);
      if (raw) {
        const { ts, data } = JSON.parse(raw);
        setStats(data);
        setLoading(false);
        // If cache is fresh and not a manual refresh, skip network call
        if (!refresh && Date.now() - ts < STATS_TTL_MS) return;
      }
    } catch {}

    // Fetch fresh data in background (show spinner only if no cached data at all)
    if (refresh) setRefreshing(true);
    else if (!stats) setLoading(true);

    try {
      const headers = await authHeaders();
      const url = companyId
        ? `${SALES_ENDPOINTS.stats}?company_id=${companyId}`
        : SALES_ENDPOINTS.stats;
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        await AsyncStorage.setItem(STATS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
      }
    } catch (e) {}
    setLoading(false);
    setRefreshing(false);
  }

  const STAT_CARDS = [
    { label: 'Total Leads',  value: stats?.total_leads    ?? '—', color: BLUE,      bg: COLORS.linkBg },
    { label: 'New Today',    value: stats?.leads_today     ?? '—', color: COLORS.success, bg: COLORS.successBg },
    { label: 'Unassigned',   value: stats?.new_leads       ?? '—', color: COLORS.warning, bg: COLORS.warningBg },
    { label: 'Closures',     value: stats?.closures        ?? '—', color: COLORS.error, bg: COLORS.errorBg },
    { label: 'Site Visits',  value: stats?.sv_done         ?? '—', color: COLORS.purple, bg: COLORS.purpleBg },
    { label: 'Projects',     value: stats?.active_projects ?? '—', color: COLORS.info, bg: COLORS.infoBg },
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

        {/* Stats */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, marginBottom: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 12 }}>Overview</Text>
          {loading ? (
            <ActivityIndicator color={NAVY} style={{ marginVertical: 20 }} />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {STAT_CARDS.map(s => (
                <View key={s.label} style={[CARD, { width: '30%', flexGrow: 1, padding: 12, alignItems: 'center' }]}>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: s.color }}>{s.value}</Text>
                  <Text style={{ fontSize: 10, color: MUTED, marginTop: 3, textAlign: 'center', fontWeight: '600' }}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Menu */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 12 }}>Modules</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {visibleMenu.map(m => (
              <TouchableOpacity key={m.key} onPress={() => navigation.navigate(m.key)}
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
