import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';
import { AR_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import common from '../../styles/common';
import FormSheet from '../../components/FormSheet';
import AppLoader from '../../components/AppLoader';
import { Button } from '../../components/ui';
import { rupee, withCompany } from './arShared';

// Raise a plot cancellation for approval — mirrors the web's _CancelModal. Shows
// what it settles to first (we keep 10% of the deal net of stamp duty and
// registration, capped at what was paid; the rest is refunded).
export default function CancelSheet({ row, companyId, onClose, onDone }) {
  const [prev, setPrev] = useState(null);
  const [err, setErr] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!row) return;
    setPrev(null); setErr(''); setReason('');
    apiFetch(withCompany(AR_ENDPOINTS.accountCancellation(row.id), companyId))
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) { setErr(d.detail || 'Could not work out the settlement.'); setPrev({}); return; }
        setPrev(d);
      })
      .catch(() => { setErr('Check your connection and try again.'); setPrev({}); });
  }, [row, companyId]);

  async function submit() {
    setSaving(true); setErr('');
    try {
      const r = await apiFetch(withCompany(AR_ENDPOINTS.accountCancellation(row.id), companyId), {
        method: 'POST', body: JSON.stringify({ reason }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.detail || d.reason || 'Could not raise the cancellation.'); setSaving(false); return; }
      setSaving(false);
      onDone?.(d);
      onClose();
    } catch (e) { setErr('Check your connection and try again.'); setSaving(false); }
  }

  const active = prev?.active;
  return (
    <FormSheet visible={!!row} onClose={() => !saving && onClose()}>
      {row ? (
        <ScrollView style={s.scroll} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>Cancel plot</Text>
          <Text style={s.sub}>{row.client_name} · {row.project} · Plot {row.plots}</Text>
          {err ? <Text style={s.err}>{err}</Text> : null}
          {prev === null ? <AppLoader label="Working out the settlement…" /> : active ? (
            <Text style={s.warn}>A cancellation is already {active.status === 'pending' ? 'awaiting approval' : 'approved'} for this plot — see Cancellations.</Text>
          ) : prev.deal_net != null ? (
            <>
              <View style={s.settle}>
                <Line k="Deal value (net of stamp & registration)" v={rupee(prev.deal_net)} />
                <Line k="Received from client" v={rupee(prev.received)} />
                <Line k={`We keep — ${prev.forfeit_pct}% of deal value`} v={`− ${rupee(prev.forfeit)}`} tone="bad" />
                <Line k="Refund to client" v={rupee(prev.refund_due)} tone="refund" last />
              </View>
              <Text style={s.hint}>On approval the plot goes back on sale in Sales at once, this account is frozen, and a cancellation letter with the statement can be issued. The refund is recorded when it is actually paid, from a bank.</Text>
              <Text style={[common.label, s.gap]}>Reason</Text>
              <TextInput style={[common.input, s.reason]} value={reason} onChangeText={setReason} multiline
                placeholder="e.g. No payment for 14 months despite repeated follow-ups" placeholderTextColor={COLORS.textTertiary} />
            </>
          ) : null}
          <View style={s.foot}>
            <Button title="Close" variant="secondary" onPress={onClose} disabled={saving} style={s.flex} />
            {prev?.can_request ? (
              <Button title="Send for approval" variant="danger" loading={saving} disabled={!reason.trim()} onPress={submit} style={s.flex} />
            ) : null}
          </View>
        </ScrollView>
      ) : null}
    </FormSheet>
  );
}

function Line({ k, v, tone, last }) {
  return (
    <View style={[s.line, last && s.lineLast, tone === 'refund' && s.lineRefund]}>
      <Text style={[s.lineK, tone === 'refund' && s.lineKRefund]}>{k}</Text>
      <Text style={[s.lineV, tone === 'bad' && s.bad, tone === 'refund' && s.refund]}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexShrink: 1 },
  body: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2, marginBottom: 12 },
  err: { fontSize: 13, color: COLORS.error, marginBottom: 10 },
  warn: { fontSize: 13, color: COLORS.warning, backgroundColor: COLORS.warningBg, padding: 12, borderRadius: 12 },
  settle: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, overflow: 'hidden' },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingHorizontal: 14, paddingVertical: 11,
          borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt },
  lineLast: { borderBottomWidth: 0 },
  lineRefund: { backgroundColor: COLORS.accentSoft },
  lineK: { flex: 1, fontSize: 13, color: COLORS.textSecondary },
  lineKRefund: { fontWeight: '800', color: COLORS.textPrimary },
  lineV: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  bad: { color: COLORS.error },
  refund: { color: COLORS.link, fontSize: 16 },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 10, lineHeight: 17 },
  gap: { marginTop: 14 },
  reason: { minHeight: 80, textAlignVertical: 'top' },
  foot: { flexDirection: 'row', gap: 10, marginTop: 20 },
});
