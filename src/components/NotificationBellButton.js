// The bell with its unread count, for a screen's header. The count refreshes whenever
// the screen comes back into view; tapping clears the badge and opens the list via
// `onOpen` (each navigator reaches the Notifications screen its own way).
import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { NOTIFICATION_ENDPOINTS } from '../constants/api';
import { apiFetch } from '../utils/apiFetch';

export default function NotificationBellButton({ onOpen }) {
  const [unread, setUnread] = useState(0);
  useFocusEffect(useCallback(() => {
    let alive = true;
    apiFetch(NOTIFICATION_ENDPOINTS.list).then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setUnread(d.unread || 0); }).catch(() => {});
    return () => { alive = false; };
  }, []));
  return (
    <TouchableOpacity style={s.btn} onPress={() => { setUnread(0); onOpen?.(); }} accessibilityLabel="Notifications">
      <Ionicons name="notifications-outline" size={20} color={COLORS.textPrimary} />
      {unread > 0 ? (
        <View style={s.badge}><Text style={s.badgeText}>{unread > 99 ? '99+' : unread}</Text></View>
      ) : null}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
         backgroundColor: COLORS.surfaceAlt },
  badge: { position: 'absolute', top: 3, right: 3, minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8,
           backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: COLORS.textInverse, fontSize: 9, fontWeight: '800' },
});
