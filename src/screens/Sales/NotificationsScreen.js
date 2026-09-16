import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { NOTIFICATION_ENDPOINTS } from '../../constants/api';
import { routeForNotifType } from '../../navigation/notifRouting';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary; const NAVY = COLORS.navy; const BLUE = COLORS.link;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 14, ...CARD_SHADOW };

const TYPE_STYLE = {
  new_lead:         { icon: 'person-add',       color: '#23874A', bg: '#E9FBEA' },
  followup:         { icon: 'call',             color: '#2F6DB5', bg: '#E6F2FF' },
  sv:               { icon: 'location',         color: '#23874A', bg: '#E9FBEA' },
  sv_done:          { icon: 'checkmark-done',   color: '#23874A', bg: '#E9FBEA' },
  booking_approval: { icon: 'document-text',    color: '#A3671A', bg: '#FFF3E0' },
  booking_approved: { icon: 'trophy',           color: '#23874A', bg: '#E9FBEA' },
  booking_rejected: { icon: 'close-circle',     color: '#D9434B', bg: '#FDECEC' },
  closure:          { icon: 'ribbon',           color: '#2F6DB5', bg: '#E6F2FF' },
  overdue:          { icon: 'alarm',            color: '#D9434B', bg: '#FDECEC' },
  followup_overdue: { icon: 'alarm',            color: '#D9434B', bg: '#FDECEC' },
  sv_overdue:       { icon: 'alarm',            color: '#D9434B', bg: '#FDECEC' },
  mark_available:   { icon: 'radio-button-on',  color: '#23874A', bg: '#E9FBEA' },
  availability_reminder: { icon: 'radio-button-on', color: '#23874A', bg: '#E9FBEA' },
  test:             { icon: 'notifications',    color: '#2F6DB5', bg: '#E6F2FF' },
};
const styleFor = (t) => TYPE_STYLE[t] || { icon: 'notifications', color: '#2F6DB5', bg: '#E6F2FF' };

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
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 32, height: 32, borderRadius: 20, backgroundColor: COLORS.screenBg, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: TEXT }}>Notifications</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {loading ? <ActivityIndicator color={BLUE} style={{ marginTop: 30 }} /> : rows.length === 0 ? (
          <View style={[CARD, { alignItems: 'center', padding: 30 }]}><Text style={{ color: MUTED }}>You're all caught up 🎉</Text></View>
        ) : rows.map((n) => {
          const target = routeForNotifType(n.type);
          const st = styleFor(n.type);
          return (
          <TouchableOpacity key={n.id} activeOpacity={target ? 0.7 : 1} onPress={() => target && navigation.navigate(target.screen, target.params)}
            style={[CARD, { marginBottom: 10, flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14,
              borderLeftWidth: n.is_read ? 0 : 3, borderLeftColor: st.color,
              backgroundColor: n.is_read ? COLORS.cardBg : '#F3F9FF' }]}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: st.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={st.icon} size={20} color={st.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT }}>{n.title}</Text>
              {!!n.body && <Text style={{ fontSize: 12.5, color: MUTED, marginTop: 2, lineHeight: 17 }}>{n.body}</Text>}
              <Text style={{ fontSize: 11, color: '#9A9EA5', marginTop: 4 }}>{ago(n.created_at)}</Text>
            </View>
            {!n.is_read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: st.color }} />}
            {!!target && <Ionicons name="chevron-forward" size={16} color="#C9CDD2" />}
          </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
