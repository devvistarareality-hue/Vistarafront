import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const NAVY = COLORS.navy; const BLUE = COLORS.link; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, ...CARD_SHADOW };

const STATUS_COLOR = { pending: COLORS.warning, completed: COLORS.success, missed: COLORS.error, rescheduled: COLORS.info };

const TABS = [
  { key: 'today',   label: "Today's" },
  { key: 'overdue', label: 'Overdue' },
  { key: 'pending', label: 'All Pending' },
  { key: 'all',     label: 'All' },
];

function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const endOfToday   = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; };

export default function SalesFollowUpsScreen({ navigation }) {
  const user      = useSelector((s) => s.auth.user);
  const companyId = useSelector((s) => s.adminFilter?.companyId);

  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState('today');

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const url = companyId ? `${SALES_ENDPOINTS.followUps}?company_id=${companyId}` : SALES_ENDPOINTS.followUps;
      const res = await apiFetch(url);
      if (res.ok) setItems(await res.json());
    } catch (e) {}
    setLoading(false);
    setRefreshing(false);
  }, [companyId]);

  useFocusEffect(useCallback(() => { load(); }, [load, companyId]));

  async function markDone(id) {
    try {
      const res = await apiFetch(SALES_ENDPOINTS.followUp(id), {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed', completed_at: new Date().toISOString() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((list) => list.map((f) => (f.id === id ? updated : f)));
      }
    } catch (e) {}
  }

  const now = new Date();
  const visible = items.filter((fu) => {
    const at = new Date(fu.scheduled_at);
    if (filter === 'all')     return true;
    if (filter === 'pending') return fu.status === 'pending';
    if (filter === 'today')   return fu.status === 'pending' && at >= startOfToday() && at <= endOfToday();
    if (filter === 'overdue') return fu.status === 'pending' && at < now;
    return true;
  });

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
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>Follow-Ups</Text>
          <Text style={{ fontSize: 13, color: MUTED }}>{visible.length} item{visible.length === 1 ? '' : 's'} · {user?.name || ''}</Text>
        </View>
        <TouchableOpacity onPress={() => load(true)} disabled={refreshing} style={{ padding: 6, backgroundColor: BG, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
          <Ionicons name="refresh-outline" size={20} color={NAVY} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        {TABS.map((t) => {
          const active = filter === t.key;
          return (
            <TouchableOpacity key={t.key} onPress={() => setFilter(t.key)}
              style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: active ? BLUE : 'transparent' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: active ? BLUE : MUTED }}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={NAVY} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 36 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}>
          {visible.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="calendar-outline" size={40} color={COLORS.border} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: MUTED, marginTop: 12 }}>No follow-ups</Text>
              <Text style={{ fontSize: 13, color: COLORS.textTertiary || MUTED, marginTop: 4 }}>Schedule follow-ups from lead details</Text>
            </View>
          ) : visible.map((fu) => {
            const overdue = fu.status === 'pending' && new Date(fu.scheduled_at) < now;
            return (
              <View key={fu.id} style={[CARD, { padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: overdue ? COLORS.errorBg : COLORS.border, backgroundColor: overdue ? COLORS.errorBg : COLORS.cardBg }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>{fu.lead_name || 'Lead'}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: fu.role_context === 'stm' ? COLORS.error : COLORS.info }}>{fu.role_context}</Text>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: (STATUS_COLOR[fu.status] || MUTED) + '22' }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: STATUS_COLOR[fu.status] || MUTED }}>{fu.status}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: overdue ? COLORS.error : MUTED, marginTop: 6 }}>{fmtDateTime(fu.scheduled_at)}</Text>
                    {!!fu.assigned_to_name && <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Assigned to: {fu.assigned_to_name}</Text>}
                    {!!fu.remarks && <Text style={{ fontSize: 12, color: COLORS.textPrimary, marginTop: 6, fontStyle: 'italic' }}>“{fu.remarks}”</Text>}
                  </View>
                  {fu.status === 'pending' && (
                    <TouchableOpacity onPress={() => markDone(fu.id)}
                      style={{ borderWidth: 1.5, borderColor: COLORS.success, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.success }}>Mark Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
