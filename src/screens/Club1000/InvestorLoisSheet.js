// Every signed LOI of one investment, newest first — the original, each revision,
// renewal and redemption — same as the website's _LoisModal.js (the card's LOIs button).
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { CLUB1000_ENDPOINTS } from '../../constants/api';
import { COLORS } from '../../constants/theme';
import { formatDMY } from '../../utils/dateFormat';
import { errText } from '../../lib/apiError';
import FormSheet from '../../components/FormSheet';
import AppLoader from '../../components/AppLoader';

export default function InvestorLoisSheet({ investor, onClose }) {
  const [lois, setLois] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!investor) { setLois(null); return undefined; }
    let alive = true;
    setLois(null); setErr('');
    apiFetch(CLUB1000_ENDPOINTS.investorLois(investor.id))
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        if (r.ok) setLois(d.lois || []); else setErr(errText(d, 'Could not load the LOIs.'));
      })
      .catch(() => alive && setErr('Could not reach the server.'));
    return () => { alive = false; };
  }, [investor]);
  if (!investor) return null;

  async function open(l) {
    try {
      const r = await apiFetch(`${CLUB1000_ENDPOINTS.investorLoiUrl(investor.id)}?loi=${l.i}`);
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.url) Linking.openURL(d.url); else Alert.alert('LOI unavailable', errText(d, 'Could not open the LOI.'));
    } catch (e) { Alert.alert('LOI unavailable', e.message); }
  }

  return (
    <FormSheet visible={!!investor} onClose={onClose}>
      <View style={s.head}>
        <View style={s.flex}>
          <Text style={s.title}>LOIs</Text>
          <Text style={s.sub} numberOfLines={1}>{investor.name}{investor.loi_no ? ` · ${investor.loi_no}` : ''} · newest first</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={s.close}><Ionicons name="close" size={18} color={COLORS.textPrimary} /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.body}>
        {!lois && !err && <AppLoader />}
        {!!err && <Text style={s.bad}>{err}</Text>}
        {lois && lois.length === 0 && <Text style={s.help}>No signed LOI is on record for this investment.</Text>}
        {lois && lois.length > 0 && (
          <View style={s.card}>
            {lois.map((l, k) => (
              <View key={l.i} style={[s.row, k > 0 && s.rowLine]}>
                <View style={s.flex}>
                  <Text style={s.label}>{l.label}{l.current ? '  · current' : ''}</Text>
                  <Text style={s.meta}>{l.at ? formatDMY(String(l.at).slice(0, 10)) : '—'}{l.by ? ` · approved by ${l.by}` : ''}</Text>
                </View>
                <TouchableOpacity onPress={() => open(l)} style={s.open}><Text style={s.openText}>Open</Text></TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </FormSheet>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.screenBg, justifyContent: 'center', alignItems: 'center' },
  body: { paddingHorizontal: 16, paddingBottom: 30 },
  bad: { fontSize: 12.5, color: COLORS.error, marginTop: 8 },
  help: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
  card: { borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.cardBg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11 },
  rowLine: { borderTopWidth: 1, borderTopColor: COLORS.surfaceAlt },
  label: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 2 },
  open: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  openText: { fontSize: 12.5, fontWeight: '700', color: COLORS.link },
});
