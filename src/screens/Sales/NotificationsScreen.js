import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { NOTIFICATION_ENDPOINTS } from '../../constants/api';
import { screenForNotifType } from '../../navigation/notifRouting';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary; const NAVY = COLORS.navy; const BLUE = COLORS.link;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 12, padding: 14, ...CARD_SHADOW };

const ICON = {
  new_lead: 'person-add', followup: 'call', sv: 'location', sv_done: 'checkmark-done',
  booking_approval: 'document-text', booking_approved: 'trophy', booking_rejected: 'close-circle',
  closure: 'ribbon', overdue: 'alarm', mark_available: 'radio-button-on', test: 'notifications',
};

function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationsScreen({ navigation }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(NOTIFICATION_ENDPOINTS.list);
      if (res.ok) { const d = await res.json(); setRows(Array.isArray(d.results) ? d.results : []); }
      // Opening the screen marks everything read.
      await apiFetch(NOTIFICATION_ENDPOINTS.readAll, { method: 'POST' }).catch(() => {});
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.screenBg }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.screenBg, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: TEXT }}>Notifications</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {loading ? <ActivityIndicator color={BLUE} style={{ marginTop: 30 }} /> : rows.length === 0 ? (
          <View style={[CARD, { alignItems: 'center', padding: 30 }]}><Text style={{ color: MUTED }}>You're all caught up 🎉</Text></View>
        ) : rows.map((n) => {
          const target = screenForNotifType(n.type);
          return (
          <TouchableOpacity key={n.id} activeOpacity={target ? 0.6 : 1} onPress={() => target && navigation.navigate(target)}
            style={[CARD, { marginBottom: 10, flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: n.is_read ? COLORS.cardBg : '#F3F6FF' }]}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={ICON[n.type] || 'notifications'} size={18} color={BLUE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>{n.title}</Text>
              {!!n.body && <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{n.body}</Text>}
              <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>{ago(n.created_at)}</Text>
            </View>
            {!!target && <Ionicons name="chevron-forward" size={16} color="#C4CDDA" />}
          </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
