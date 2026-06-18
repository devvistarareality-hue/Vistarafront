import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { SALES_ENDPOINTS } from '../../constants/api';

const NAVY = '#182350'; const BLUE = '#3D5AFE'; const BG = '#F5F6FA'; const TEXT = '#1A1A2E'; const MUTED = '#8492A6';
const CARD = { backgroundColor: '#fff', borderRadius: 16, shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 4 };

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

const MENU = [
  { key: 'SalesLeads',        label: 'All Leads',    icon: 'people-outline',         color: '#3D5AFE', bg: '#EEF0FF',  adminOnly: false },
  { key: 'SalesProjects',     label: 'Projects',      icon: 'business-outline',        color: '#2E7D32', bg: '#E8F5E9',  adminOnly: true  },
  { key: 'SalesSources',      label: 'Lead Setup',    icon: 'git-network-outline',     color: '#0097A7', bg: '#E0F7FA',  adminOnly: true  },
  { key: 'SalesTeam',         label: 'Team Users',    icon: 'person-circle-outline',   color: '#7B1FA2', bg: '#F3E5F5',  adminOnly: true  },
  { key: 'SalesDistribution', label: 'Distribution',  icon: 'shuffle-outline',         color: '#E65100', bg: '#FFF3E0',  adminOnly: true  },
  { key: 'SalesImport',       label: 'Import Leads',  icon: 'cloud-upload-outline',    color: '#00796B', bg: '#E0F2F1',  adminOnly: true  },
  { key: 'SalesReports',      label: 'Reports',       icon: 'bar-chart-outline',       color: '#1565C0', bg: '#E3F2FD',  adminOnly: false },
];

function getDesignationLabel(user) {
  const des = (user?.designation || '').toLowerCase();
  if (des.includes('telecaller') || des.includes('tele caller')) return { title: 'Telecaller Portal', sub: 'Your call queue & leads' };
  if (des.includes('stm') || des.includes('sales team') || des.includes('sales executive')) return { title: 'Sales Executive', sub: 'Your pipeline & site visits' };
  return { title: 'Sales CRM', sub: 'Vistara Realty' };
}

export default function SalesCRMScreen({ navigation }) {
  const user     = useSelector((s) => s.auth.user);
  const isAdmin  = user?.role === 'Admin' || user?.is_staff;
  const visibleMenu = MENU.filter(m => !m.adminOnly || isAdmin);
  const { title: screenTitle, sub: screenSub } = getDesignationLabel(user);

  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadStats(); }, []);

  async function loadStats(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(SALES_ENDPOINTS.stats, { headers });
      if (res.ok) setStats(await res.json());
    } catch (e) {}
    setLoading(false); setRefreshing(false);
  }

  const STAT_CARDS = [
    { label: 'Total Leads',  value: stats?.total_leads    ?? '—', color: BLUE,      bg: '#EEF0FF' },
    { label: 'New Today',    value: stats?.new_today       ?? '—', color: '#2E7D32', bg: '#E8F5E9' },
    { label: 'Unassigned',   value: stats?.unassigned      ?? '—', color: '#E65100', bg: '#FFF3E0' },
    { label: 'Closures',     value: stats?.closures        ?? '—', color: '#EF4444', bg: '#FEE2E2' },
    { label: 'Site Visits',  value: stats?.sv_done         ?? '—', color: '#7B1FA2', bg: '#F3E5F5' },
    { label: 'Projects',     value: stats?.active_projects ?? '—', color: '#0097A7', bg: '#E0F7FA' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F3FA' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>{screenTitle}</Text>
          <Text style={{ fontSize: 12, color: MUTED }}>{screenSub}</Text>
        </View>
        <TouchableOpacity onPress={() => loadStats(true)} disabled={refreshing} style={{ padding: 6 }}>
          <Ionicons name="refresh-outline" size={20} color={refreshing ? MUTED : BLUE} />
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
