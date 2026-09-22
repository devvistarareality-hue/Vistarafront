import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { NOTIFICATION_ENDPOINTS } from '../../constants/api';
import { routeForNotifType } from '../../navigation/notifRouting';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

import AppIcon from '../../components/AppIcon';
import AppLoader from '../../components/AppLoader';
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary; const NAVY = COLORS.navy; const BLUE = COLORS.link;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 22, padding: 14, ...CARD_SHADOW , borderWidth: 1, borderColor: COLORS.cardBorder };

const TYPE_STYLE = {
  new_lead:         { icon: 'person-add',       color: COLORS.success, bg: COLORS.successBg },
  followup:         { icon: 'call',             color: COLORS.link, bg: COLORS.accentSoft },
  sv:               { icon: 'location',         color: COLORS.success, bg: COLORS.successBg },
  sv_done:          { icon: 'checkmark-done',   color: COLORS.success, bg: COLORS.successBg },
  booking_approval: { icon: 'document-text',    color: COLORS.warning, bg: COLORS.warningBg },
  booking_approved: { icon: 'trophy',           color: COLORS.success, bg: COLORS.successBg },
  booking_rejected: { icon: 'close-circle',     color: COLORS.error, bg: COLORS.errorBg },
  booking_submitted: { icon: 'document-text',   color: COLORS.link, bg: COLORS.accentSoft },
  booking_update:   { icon: 'document-text',    color: COLORS.link, bg: COLORS.accentSoft },
  booking_cancelled: { icon: 'close-circle',    color: COLORS.error, bg: COLORS.errorBg },
  accounts_booking_approval: { icon: 'wallet',  color: COLORS.warning, bg: COLORS.warningBg },
  accounts_booking_update: { icon: 'wallet',    color: COLORS.link, bg: COLORS.accentSoft },
  accounts_booking_approved: { icon: 'checkmark-done', color: COLORS.success, bg: COLORS.successBg },
  accounts_booking_rejected: { icon: 'close-circle', color: COLORS.error, bg: COLORS.errorBg },
  accounts_booking_cancelled: { icon: 'close-circle', color: COLORS.error, bg: COLORS.errorBg },
  ar_followup_assigned: { icon: 'call', color: COLORS.link, bg: COLORS.accentSoft },
  ar_followup_due: { icon: 'call', color: COLORS.warning, bg: COLORS.warningBg },
  ar_followup_overdue: { icon: 'alarm', color: COLORS.error, bg: COLORS.errorBg },
  ar_collections_digest: { icon: 'cash', color: COLORS.link, bg: COLORS.accentSoft },
  ar_due_soon: { icon: 'calendar', color: COLORS.warning, bg: COLORS.warningBg },
  lead_transfer_requested: { icon: 'swap-horizontal', color: COLORS.warning, bg: COLORS.warningBg },
  lead_transfer_approved: { icon: 'swap-horizontal', color: COLORS.success, bg: COLORS.successBg },
  lead_transfer_rejected: { icon: 'swap-horizontal', color: COLORS.error, bg: COLORS.errorBg },
  closure:          { icon: 'ribbon',           color: COLORS.link, bg: COLORS.accentSoft },
  overdue:          { icon: 'alarm',            color: COLORS.error, bg: COLORS.errorBg },
  followup_overdue: { icon: 'alarm',            color: COLORS.error, bg: COLORS.errorBg },
  sv_overdue:       { icon: 'alarm',            color: COLORS.error, bg: COLORS.errorBg },
  mark_available:   { icon: 'radio-button-on',  color: COLORS.success, bg: COLORS.successBg },
  availability_reminder: { icon: 'radio-button-on', color: COLORS.success, bg: COLORS.successBg },
  test:             { icon: 'notifications',    color: COLORS.link, bg: COLORS.accentSoft },
};
const styleFor = (t) => TYPE_STYLE[t] || { icon: 'notifications', color: COLORS.link, bg: COLORS.accentSoft };

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
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'transparent', borderBottomWidth: 0, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 32, height: 32, borderRadius: 20, backgroundColor: COLORS.screenBg, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: TEXT }}>Notifications</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {loading ? <AppLoader style={{ marginTop: 24 }} /> : rows.length === 0 ? (
          <View style={[CARD, { alignItems: 'center', padding: 30 }]}><Text style={{ color: MUTED }}>You're all caught up <AppIcon name="party" size={15} /></Text></View>
        ) : rows.map((n) => {
          const target = routeForNotifType(n.type);
          const st = styleFor(n.type);
          return (
          <TouchableOpacity key={n.id} activeOpacity={target ? 0.7 : 1} onPress={() => target && navigation.navigate(target.screen, target.params)}
            style={[CARD, { marginBottom: 10, flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14,
              borderLeftWidth: n.is_read ? 0 : 3, borderLeftColor: st.color,
              backgroundColor: n.is_read ? COLORS.cardBg : COLORS.accentSofter, elevation: n.is_read ? CARD.elevation : 0 }]}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: st.bg, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={st.icon} size={20} color={st.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT }}>{n.title}</Text>
              {!!n.body && <Text style={{ fontSize: 12.5, color: MUTED, marginTop: 2, lineHeight: 17 }}>{n.body}</Text>}
              <Text style={{ fontSize: 11, color: COLORS.textTertiary, marginTop: 4 }}>{ago(n.created_at)}</Text>
            </View>
            {!n.is_read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: st.color }} />}
            {!!target && <Ionicons name="chevron-forward" size={16} color={COLORS.borderStrong} />}
          </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
