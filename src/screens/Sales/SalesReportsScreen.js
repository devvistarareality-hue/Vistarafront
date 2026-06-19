import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const NAVY = COLORS.navy; const BLUE = COLORS.link; const BG = COLORS.screenBg; const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, ...CARD_SHADOW };

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function SectionTitle({ title }) {
  return <Text style={{ fontSize: 13, fontWeight: '800', color: TEXT, marginBottom: 10, marginTop: 4 }}>{title}</Text>;
}

function StatCard({ label, value, sub, color = BLUE }) {
  return (
    <View style={[CARD, { flex: 1, padding: 14, alignItems: 'center', minWidth: '28%' }]}>
      <Text style={{ fontSize: 24, fontWeight: '800', color }}>{value ?? '—'}</Text>
      <Text style={{ fontSize: 10, color: MUTED, marginTop: 3, textAlign: 'center', fontWeight: '600' }}>{label}</Text>
      {sub ? <Text style={{ fontSize: 10, color: MUTED, marginTop: 1 }}>{sub}</Text> : null}
    </View>
  );
}

function PerformanceTable({ title, data = [], columns }) {
  if (!data.length) return null;
  return (
    <View style={[CARD, { marginBottom: 16, overflow: 'hidden' }]}>
      <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: '#F0F3FA', backgroundColor: '#FAFBFF' }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: TEXT }}>{title}</Text>
      </View>
      {data.map((row, i) => (
        <View key={i} style={{ flexDirection: 'row', padding: 12, borderBottomWidth: i < data.length - 1 ? 1 : 0, borderBottomColor: '#F0F3FA', alignItems: 'center' }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT }}>{row.name}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
              {columns.map(col => (
                <Text key={col.key} style={{ fontSize: 11, color: MUTED }}>
                  <Text style={{ fontWeight: '700', color: col.color || TEXT }}>{row[col.key] ?? 0}</Text> {col.label}
                </Text>
              ))}
            </View>
          </View>
          {row.conversion_pct !== undefined && (
            <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#E8F5E9' }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: '#2E7D32' }}>{row.conversion_pct}%</Text>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

export default function SalesReportsScreen({ navigation }) {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(SALES_ENDPOINTS.reports, { headers });
      if (res.ok) setData(await res.json());
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F3FA' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="arrow-back" size={20} color={NAVY} /></TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: TEXT }}>Reports</Text>
        <TouchableOpacity onPress={() => load(true)} disabled={refreshing} style={{ padding: 6, backgroundColor: BG, borderWidth: 1, borderColor: '#E0E6F0', borderRadius: 8 }}>
          <Ionicons name="refresh-outline" size={20} color={NAVY} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={NAVY} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}>

          {/* Summary */}
          <SectionTitle title="Summary" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
            <StatCard label="Site Visits"  value={data?.total_site_visits}  color="#3D5AFE" />
            <StatCard label="Closures"     value={data?.total_closures}     color="#2E7D32" />
            <StatCard label="Meta Leads"   value={data?.meta_leads}         color="#E65100" />
          </View>

          {/* Campaign performance */}
          <SectionTitle title="Campaign Performance" />
          <PerformanceTable
            title="Meta / Ad Campaigns"
            data={data?.campaign_performance || []}
            columns={[
              { key: 'total_leads',  label: 'Leads',      color: BLUE },
              { key: 'site_visits',  label: 'SV',         color: '#0097A7' },
              { key: 'closed',       label: 'Closed',     color: '#2E7D32' },
            ]}
          />

          {/* Telecaller performance */}
          <SectionTitle title="Telecaller Performance" />
          <PerformanceTable
            title="Pre-sales"
            data={data?.telecaller_performance || []}
            columns={[
              { key: 'total_leads',    label: 'Leads',     color: BLUE },
              { key: 'warm_leads',     label: 'Warm',      color: '#F9A825' },
              { key: 'transferred',    label: 'Transferred', color: '#E65100' },
            ]}
          />

          {/* STM performance */}
          <SectionTitle title="STM Performance" />
          <PerformanceTable
            title="Sales"
            data={data?.stm_performance || []}
            columns={[
              { key: 'total_leads',  label: 'Leads',     color: BLUE },
              { key: 'hot_leads',    label: 'Hot',        color: '#E65100' },
              { key: 'sv_done',      label: 'SV Done',    color: '#0097A7' },
              { key: 'closed',       label: 'Closed',     color: '#2E7D32' },
            ]}
          />

          {/* Recent closures */}
          {(data?.recent_closures || []).length > 0 && <>
            <SectionTitle title="Recent Closures" />
            <View style={[CARD, { marginBottom: 16, overflow: 'hidden' }]}>
              {data.recent_closures.map((c, i) => (
                <View key={i} style={{ padding: 14, borderBottomWidth: i < data.recent_closures.length - 1 ? 1 : 0, borderBottomColor: '#F0F3FA' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>{c.lead_name}</Text>
                      <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                        {c.project_name} {c.stm_name ? `· STM: ${c.stm_name}` : ''}
                      </Text>
                    </View>
                    {c.booking_amount ? (
                      <Text style={{ fontSize: 13, fontWeight: '800', color: '#2E7D32' }}>₹{c.booking_amount}</Text>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : ''}</Text>
                </View>
              ))}
            </View>
          </>}

          {!data && <Text style={{ color: MUTED, textAlign: 'center', marginTop: 40 }}>No report data available.</Text>}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
