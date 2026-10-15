// One person's notification settings, from User Management. Each kind follows their
// designation ("Default") unless set here on purpose. Mirrors the website's
// components/UserNotificationsModal.js.
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FormSheet from './FormSheet';
import { Button } from './ui';
import AppLoader from './AppLoader';
import NotificationPrefsEditor from './NotificationPrefsEditor';
import { COLORS } from '../constants/theme';
import { BASE_URL, USER_ENDPOINTS } from '../constants/api';
import { apiFetch } from '../utils/apiFetch';

export default function UserNotificationsSheet({ user, visible, onClose }) {
  const [catalogue, setCatalogue] = useState(null);
  const [data, setData] = useState(null);
  const [value, setValue] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!visible || !user) return;
    setErr(''); setData(null);
    apiFetch(`${BASE_URL}/api/auth/designations/capabilities/`).then((r) => r.json()).then(setCatalogue)
      .catch(() => setErr('Could not load the notification list.'));
    apiFetch(USER_ENDPOINTS.notifications(user.id)).then((r) => r.json())
      .then((d) => { setData(d); setValue(d.overrides || {}); })
      .catch(() => setErr('Could not load this person’s settings.'));
  }, [visible, user?.id]);

  if (!user) return null;
  const ready = catalogue && data;
  const save = async () => {
    setSaving(true); setErr('');
    try {
      const r = await apiFetch(USER_ENDPOINTS.notifications(user.id), {
        method: 'PATCH', body: JSON.stringify({ notification_overrides: value }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setErr(d.detail || 'Could not save.'); return; }
      onClose();
    } catch (e) {
      setErr('Could not save. Check your connection.');
    } finally { setSaving(false); }
  };

  return (
    <FormSheet visible={visible} onClose={onClose}>
      <View style={s.head}>
        <View style={s.badge}><Ionicons name="notifications" size={17} color={COLORS.link} /></View>
        <View style={s.flex}>
          <Text style={s.title} numberOfLines={1}>{user.name} — Notifications</Text>
          <Text style={s.sub} numberOfLines={1}>
            {data?.designation_name ? `Follows ${data.designation_name} unless set here` : 'Set what they get here'}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={10} style={s.x}>
          <Ionicons name="close" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {err ? <Text style={s.err}>{err}</Text> : null}
        {!ready ? <AppLoader style={s.loader} /> : (
          <NotificationPrefsEditor kinds={catalogue.notifications || []} fallback={catalogue.notification_default}
            value={value} onChange={setValue} inherit={data.designation || {}}
            inheritLabel={data.designation_name || 'the designation'} modules={user.modules || null} />
        )}
      </ScrollView>
      <View style={s.foot}>
        <Text style={s.summary} numberOfLines={1}>{Object.keys(value).length} set for this person</Text>
        <Button title="Cancel" variant="secondary" size="sm" onPress={onClose} disabled={saving} />
        <Button title="Save" size="sm" onPress={save} loading={saving} disabled={!ready} />
      </View>
    </FormSheet>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingBottom: 10 },
  badge: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accentSoft },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  x: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceAlt },
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 12 },
  err: { color: COLORS.danger, fontSize: 13, marginTop: 8 },
  loader: { marginTop: 24 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6,
          borderTopWidth: 1, borderTopColor: COLORS.border },
  summary: { flex: 1, fontSize: 11.5, color: COLORS.textSecondary },
});
