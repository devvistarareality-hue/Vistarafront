import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SALES_ENDPOINTS, getBaseUrl, setBaseUrl, RAILWAY_URL } from '../../constants/api';

const NAVY = '#182350'; const BLUE = '#3D5AFE'; const BG = '#F5F6FA'; const TEXT = '#1A1A2E'; const MUTED = '#8492A6';
const CARD = { backgroundColor: '#fff', borderRadius: 16, shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 4 };
const SERVER_CACHE_KEY = '@vistara_server_url';

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

const MENU = [
  { key: 'SalesLeads',        label: 'All Leads',    icon: 'people-outline',         color: '#3D5AFE', bg: '#EEF0FF' },
  { key: 'SalesProjects',     label: 'Projects',      icon: 'business-outline',        color: '#2E7D32', bg: '#E8F5E9' },
  { key: 'SalesSources',      label: 'Lead Sources',  icon: 'git-network-outline',     color: '#0097A7', bg: '#E0F7FA' },
  { key: 'SalesTeam',         label: 'Team Users',    icon: 'person-circle-outline',   color: '#7B1FA2', bg: '#F3E5F5' },
  { key: 'SalesDistribution', label: 'Distribution',  icon: 'shuffle-outline',         color: '#E65100', bg: '#FFF3E0' },
  { key: 'SalesImport',       label: 'Import Leads',  icon: 'cloud-upload-outline',    color: '#00796B', bg: '#E0F2F1' },
  { key: 'SalesReports',      label: 'Reports',       icon: 'bar-chart-outline',       color: '#1565C0', bg: '#E3F2FD' },
];

export default function SalesCRMScreen({ navigation }) {
  const [stats,       setStats]       = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [serverModal, setServerModal] = useState(false);
  const [serverInput, setServerInput] = useState('');
  const [currentUrl,  setCurrentUrl]  = useState('');
  const [testing,     setTesting]     = useState(false);

  useEffect(() => {
    setCurrentUrl(getBaseUrl());
    loadStats();
  }, []);

  async function loadStats(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const headers = await authHeaders();
      const endpoint = SALES_ENDPOINTS.stats;
      const res = await fetch(endpoint, { headers });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        const text = await res.text();
      }
    } catch (e) {
      console.log('[SalesCRM] Stats exception:', e);
    }
    setLoading(false); setRefreshing(false);
  }

  function openServerConfig() {
    setServerInput(getBaseUrl());
    setCurrentUrl(getBaseUrl());
    setServerModal(true);
  }

  async function testAndSave() {
    const url = serverInput.trim().replace(/\/$/, '');
    if (!url) return;
    setTesting(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${url}/api/sales/stats/`, { headers, signal: AbortSignal.timeout(4000) });
      if (res.ok || res.status === 401 || res.status === 403) {
        setBaseUrl(url);
        setCurrentUrl(url);
        await AsyncStorage.setItem(SERVER_CACHE_KEY, url);
        setServerModal(false);
        Alert.alert('Server set', `Now using:\n${url}`);
        loadStats();
      } else {
        Alert.alert('Cannot reach server', `Got ${res.status} from ${url}.\nCheck the IP/port and make sure Django is running on 0.0.0.0:8000`);
      }
    } catch (e) {
      Alert.alert('Connection failed', `${e.message}\n\nMake sure:\n• Django is running: python manage.py runserver 0.0.0.0:8000\n• Phone and Mac are on same WiFi`);
    }
    setTesting(false);
  }

  async function resetToRailway() {
    setBaseUrl(RAILWAY_URL);
    setCurrentUrl(RAILWAY_URL);
    await AsyncStorage.removeItem(SERVER_CACHE_KEY);
    setServerModal(false);
    Alert.alert('Reset', 'Now using Railway (production).');
    loadStats();
  }

  const isRailway = currentUrl?.includes('railway.app');

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>Sales CRM</Text>
          <Text style={{ fontSize: 12, color: MUTED }}>Vistara Realty</Text>
        </View>
        <TouchableOpacity onPress={openServerConfig} style={{ padding: 6 }}>
          <Ionicons name="server-outline" size={20} color={isRailway ? '#E65100' : '#2E7D32'} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => loadStats(true)} disabled={refreshing} style={{ padding: 6 }}>
          <Ionicons name="refresh-outline" size={20} color={refreshing ? MUTED : BLUE} />
        </TouchableOpacity>
      </View>

      {/* Railway warning banner */}
      {isRailway && (
        <TouchableOpacity onPress={openServerConfig}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF3E0', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#FFE0B2' }}>
          <Ionicons name="warning-outline" size={16} color="#E65100" />
          <Text style={{ flex: 1, fontSize: 12, color: '#E65100', fontWeight: '600' }}>Using Railway — sales data unavailable. Tap to set local server IP.</Text>
          <Ionicons name="chevron-forward" size={14} color="#E65100" />
        </TouchableOpacity>
      )}

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
            {MENU.map(m => (
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

      {/* Server config modal */}
      <Modal visible={serverModal} transparent animationType="slide" onRequestClose={() => setServerModal(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <Ionicons name="server-outline" size={22} color={NAVY} />
              <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: TEXT, marginLeft: 10 }}>Server Settings</Text>
              <TouchableOpacity onPress={() => setServerModal(false)}><Ionicons name="close" size={22} color={MUTED} /></TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: MUTED, marginBottom: 6, fontWeight: '600' }}>Current server</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isRailway ? '#FFF3E0' : '#E8F5E9', borderRadius: 10, padding: 10, marginBottom: 20, gap: 8 }}>
              <Ionicons name={isRailway ? 'warning-outline' : 'checkmark-circle-outline'} size={16} color={isRailway ? '#E65100' : '#2E7D32'} />
              <Text style={{ fontSize: 11, color: isRailway ? '#E65100' : '#2E7D32', fontWeight: '700', flex: 1 }} numberOfLines={1}>{currentUrl}</Text>
            </View>

            <Text style={{ fontSize: 12, color: MUTED, marginBottom: 8, fontWeight: '600' }}>Set local server IP</Text>
            <Text style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>
              1. On your Mac: run{' '}
              <Text style={{ fontFamily: 'monospace', color: NAVY, fontWeight: '700' }}>python manage.py runserver 0.0.0.0:8000</Text>
              {'\n'}2. Find your Mac's IP (System Settings → WiFi → Details)
              {'\n'}3. Enter it below, e.g. http://192.168.1.5:8000
            </Text>
            <TextInput
              value={serverInput}
              onChangeText={setServerInput}
              placeholder="http://192.168.x.x:8000"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={{ borderWidth: 1.5, borderColor: '#E0E6F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: TEXT, marginBottom: 14 }}
            />

            <TouchableOpacity onPress={testAndSave} disabled={testing}
              style={{ paddingVertical: 14, backgroundColor: NAVY, borderRadius: 12, alignItems: 'center', marginBottom: 10, opacity: testing ? 0.6 : 1 }}>
              {testing ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Test & Save</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={resetToRailway}
              style={{ paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E6F0' }}>
              <Text style={{ color: MUTED, fontWeight: '600', fontSize: 13 }}>Reset to Railway (Production)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
