import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const NAVY = COLORS.navy; const BLUE = COLORS.link; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, ...CARD_SHADOW };

const SV_COLOR = {
  scheduled: { bg: COLORS.warningBg, text: COLORS.warning },
  completed: { bg: COLORS.successBg, text: COLORS.success },
  no_show: { bg: COLORS.errorBg, text: COLORS.error },
  cancelled: { bg: COLORS.surfaceAlt, text: MUTED },
};

const CLOSURE_COLOR = {
  booked: { bg: COLORS.successBg, text: COLORS.success },
  cancelled: { bg: COLORS.errorBg, text: COLORS.error },
  refunded: { bg: COLORS.warningBg, text: COLORS.warning },
};

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function StatusBadge({ status, colors }) {
  const c = colors[status] || { bg: COLORS.surfaceAlt, text: MUTED };
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: c.bg }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: c.text }}>{(status || '').replace(/_/g, ' ').toUpperCase()}</Text>
    </View>
  );
}

function StatCard({ label, value, color, bg }) {
  return (
    <View style={[CARD, { flex: 1, padding: 14, alignItems: 'center', backgroundColor: bg }]}>
      <Text style={{ fontSize: 24, fontWeight: '800', color }}>{value ?? '—'}</Text>
      <Text style={{ fontSize: 10, color, marginTop: 3, textAlign: 'center', fontWeight: '600', opacity: 0.8 }}>{label}</Text>
    </View>
  );
}

export default function SalesMyConversionsScreen({ navigation }) {
  const user = useSelector((s) => s.auth.user);
  const [tab, setTab] = useState('sv');
  const [visits, setVisits] = useState([]);
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const [svRes, clRes] = await Promise.all([
        apiFetch(SALES_ENDPOINTS.siteVisits),
        apiFetch(SALES_ENDPOINTS.closures),
      ]);
      if (svRes.ok) setVisits(await svRes.json());
      if (clRes.ok) setClosures(await clRes.json());
    } catch (e) {}
    setLoading(false); setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const svCompleted = visits.filter(v => v.status === 'completed');
  const svScheduled = visits.filter(v => v.status === 'scheduled');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>My Conversions</Text>
          <Text style={{ fontSize: 13, color: MUTED }}>Track SV & closures from your leads</Text>
        </View>
        <TouchableOpacity onPress={() => load(true)} disabled={refreshing} style={{ padding: 6, backgroundColor: BG, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
          <Ionicons name="refresh-outline" size={20} color={NAVY} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={NAVY} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}>

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 16, marginBottom: 12 }}>
            <StatCard label="Site Visits Done" value={svCompleted.length} color={COLORS.success} bg={COLORS.successBg} />
            <StatCard label="Closures" value={closures.length} color={COLORS.link} bg={COLORS.linkBg} />
            <StatCard label="Upcoming Visits" value={svScheduled.length} color={COLORS.warning} bg={COLORS.warningBg} />
          </View>

          {/* Tabs */}
          <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, borderBottomWidth: 2, borderBottomColor: COLORS.surfaceAlt }}>
            {[
              { key: 'sv', label: 'Site Visits' },
              { key: 'closures', label: 'Closures' },
            ].map(t => (
              <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
                style={{ paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: tab === t.key ? COLORS.warning : 'transparent', marginBottom: -2 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: tab === t.key ? COLORS.warning : MUTED }}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          {tab === 'sv' ? (
            visits.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Ionicons name="location-outline" size={40} color={MUTED} />
                <Text style={{ fontSize: 14, color: MUTED, marginTop: 12, textAlign: 'center' }}>No site visits from your referred leads yet.</Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 16 }}>
                {visits.map(v => (
                  <View key={v.id} style={[CARD, { padding: 14, marginBottom: 10 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>{v.lead_name || '—'}</Text>
                        <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{v.lead_phone || '—'}</Text>
                      </View>
                      <StatusBadge status={v.status} colors={SV_COLOR} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase' }}>Project</Text>
                        <Text style={{ fontSize: 13, color: TEXT, marginTop: 2 }}>{v.project_name || '—'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase' }}>Visit Date</Text>
                        <Text style={{ fontSize: 13, color: TEXT, marginTop: 2 }}>{fmtDate(v.visited_at || v.scheduled_at)}</Text>
                      </View>
                    </View>
                    {v.stm_name ? (
                      <View style={{ marginTop: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase' }}>STM</Text>
                        <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{v.stm_name}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            )
          ) : (
            closures.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Ionicons name="checkmark-circle-outline" size={40} color={MUTED} />
                <Text style={{ fontSize: 14, color: MUTED, marginTop: 12, textAlign: 'center' }}>No closures from your referred leads yet.</Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 16 }}>
                {closures.map(c => (
                  <View key={c.id} style={[CARD, { padding: 14, marginBottom: 10 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>{c.lead_name || '—'}</Text>
                      </View>
                      <StatusBadge status={c.status} colors={CLOSURE_COLOR} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 16, marginBottom: 6 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase' }}>Project</Text>
                        <Text style={{ fontSize: 13, color: TEXT, marginTop: 2 }}>{c.project_name || '—'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase' }}>Date</Text>
                        <Text style={{ fontSize: 13, color: TEXT, marginTop: 2 }}>{fmtDate(c.closure_date)}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 16, marginBottom: 6 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase' }}>Unit</Text>
                        <Text style={{ fontSize: 13, color: TEXT, marginTop: 2 }}>{(c.unit_type || '') + ' ' + (c.unit_no || '')}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase' }}>Amount</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.success, marginTop: 2 }}>
                          {c.total_amount ? '₹' + Number(c.total_amount).toLocaleString('en-IN') : '—'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
