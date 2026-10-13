import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, Alert, StyleSheet } from 'react-native';
import { apiFetch } from '../utils/apiFetch';
import { SALES_ENDPOINTS } from '../constants/api';
import { COLORS, RADIUS } from '../constants/theme';
import { explainApiError } from '../lib/apiError';

// Lead Setup → "Send results back to Meta" (Conversions API for CRM). When a Meta lead
// is qualified, gets a site visit or books, Nexora tells Meta (backend sales/meta_capi.py).
// Mirrors the web's components/MetaCapiCard.
const STAGE_HELP = {
  Lead_Received: 'Meta form lead arrives',
  Qualified: 'Telecaller marks it warm',
  Site_Visit_Scheduled: 'Site visit booked',
  Site_Visit_Done: 'Site visit completed',
  Booked: 'Booking approved',
  Disqualified: 'Not qualified / not interested',
};

export default function MetaCapiCard({ cfg, companyId, onSaved }) {
  const [datasetId, setDatasetId] = useState(cfg?.capi_dataset_id || '');
  const [token, setToken] = useState('');
  const [testCode, setTestCode] = useState(cfg?.capi_test_code || '');
  const [enabled, setEnabled] = useState(!!cfg?.capi_enabled);
  const [busy, setBusy] = useState('');
  const tokenSet = !!cfg?.capi_token_set;
  const stats = cfg?.capi?.by_event || [];
  const failed = (cfg?.capi?.recent || []).find((r) => r.status === 'failed');

  async function call(action, extra) {
    const res = await apiFetch(SALES_ENDPOINTS.metaWebhookConfig, {
      method: 'POST', body: JSON.stringify({ action, ...extra, ...(companyId ? { company_id: companyId } : {}) }),
    });
    const d = await res.json().catch(() => ({}));
    return { res, d };
  }

  async function save() {
    setBusy('save');
    try {
      const { res, d } = await call('save_capi', { capi_dataset_id: datasetId, capi_token: token, capi_test_code: testCode, capi_enabled: enabled });
      if (!res.ok) { Alert.alert('Not saved', explainApiError(res, d, 'Could not save.')); return; }
      setToken(''); setEnabled(!!d.capi_enabled);
      Alert.alert('Saved', d.capi_enabled ? 'Lead stages will now be sent to Meta.'
        : (enabled ? 'It stays off until both the dataset ID and token are filled in.' : 'Switched off.'));
      onSaved && onSaved(d);
    } catch (e) { Alert.alert('Not saved', 'Check your connection and try again.'); }
    finally { setBusy(''); }
  }

  async function test() {
    setBusy('test');
    try {
      const { d } = await call('capi_test', {});
      Alert.alert(d.ok ? 'Test sent' : 'Meta refused it', d.detail || '');
    } catch (e) { Alert.alert('Not sent', 'Check your connection and try again.'); }
    finally { setBusy(''); }
  }

  return (
    <View style={s.card}>
      <View style={s.head}>
        <View style={s.flex}>
          <Text style={s.title}>Send results back to Meta</Text>
          <Text style={s.sub}>When a Meta lead is qualified, visits or books, Nexora tells Meta the same day.</Text>
        </View>
        <Switch value={enabled} onValueChange={setEnabled} />
      </View>
      <Text style={s.lbl}>Dataset ID</Text>
      <TextInput style={s.inp} value={datasetId} onChangeText={setDatasetId} keyboardType="numeric" placeholder="From Events Manager → dataset"
        placeholderTextColor={COLORS.textTertiary} />
      <Text style={s.lbl}>Access token</Text>
      <TextInput style={s.inp} value={token} onChangeText={setToken} secureTextEntry autoCapitalize="none"
        placeholder={tokenSet ? 'Saved — type a new one to replace it' : 'Dataset → Settings → Conversions API'} placeholderTextColor={COLORS.textTertiary} />
      <Text style={s.lbl}>Test event code (optional)</Text>
      <TextInput style={s.inp} value={testCode} onChangeText={setTestCode} autoCapitalize="characters"
        placeholder="e.g. TEST12345" placeholderTextColor={COLORS.textTertiary} />
      <View style={s.row}>
        <TouchableOpacity style={StyleSheet.compose(s.btn, s.primary)} onPress={save} disabled={!!busy}>
          <Text style={s.primaryText}>{busy === 'save' ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={StyleSheet.compose(s.btn, (!tokenSet || !cfg?.capi_dataset_id) && s.off)} onPress={test}
          disabled={!!busy || !tokenSet || !cfg?.capi_dataset_id}>
          <Text style={s.btnText}>{busy === 'test' ? 'Sending…' : 'Send a test event'}</Text>
        </TouchableOpacity>
      </View>
      {stats.map((x) => (
        <View key={x.event} style={s.stat}>
          <View style={s.flex}>
            <Text style={s.statName}>{x.event}</Text>
            <Text style={s.statHelp}>{STAGE_HELP[x.event]}</Text>
          </View>
          <Text style={s.statNum}>{x.sent} sent</Text>
          {x.failed > 0 && <Text style={s.statBad}>{x.failed} failed</Text>}
        </View>
      ))}
      {failed && <Text style={s.err}>Latest error from Meta: {failed.error || 'no reason given'}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: COLORS.cardBg, borderRadius: 22, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  flex: { flex: 1 },
  title: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3, lineHeight: 17 },
  lbl: { fontSize: 11, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase', marginTop: 8, marginBottom: 4 },
  inp: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
         color: COLORS.textPrimary, backgroundColor: COLORS.surface },
  row: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 10 },
  btn: { flex: 1, paddingVertical: 11, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  primary: { backgroundColor: COLORS.link, borderColor: COLORS.link },
  off: { opacity: 0.45 },
  btnText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  primaryText: { fontSize: 13, fontWeight: '700', color: COLORS.surface },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7, borderTopWidth: 1, borderTopColor: COLORS.border },
  statName: { fontSize: 12.5, fontWeight: '700', color: COLORS.textPrimary },
  statHelp: { fontSize: 11, color: COLORS.textSecondary },
  statNum: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  statBad: { fontSize: 12, fontWeight: '700', color: COLORS.error },
  err: { marginTop: 8, fontSize: 12, color: COLORS.error },
});
