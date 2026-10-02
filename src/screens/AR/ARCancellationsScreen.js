import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { AR_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import { formatDMY } from '../../utils/dateFormat';
import common from '../../styles/common';
import AppLoader from '../../components/AppLoader';
import LoadError from '../../components/LoadError';
import FormSheet from '../../components/FormSheet';
import { Button } from '../../components/ui';
import { rupee, withCompany, today, cleanAmount, groupINR, DateField, shareCancellationLetter } from './arShared';

const STAGES = [['pending', 'Awaiting approval'], ['refund_pending', 'Refund pending'], ['refunded', 'Settled'], ['rejected', 'Rejected'], ['all', 'All']];
const BADGE = {
  pending: ['Awaiting approval', COLORS.warning, COLORS.warningBg],
  refund_pending: ['Refund pending', COLORS.error, COLORS.errorBg],
  refunded: ['Refunded', COLORS.success, COLORS.successBg],
  closed: ['No refund due', COLORS.success, COLORS.successBg],
  rejected: ['Rejected', COLORS.textSecondary, COLORS.surfaceAlt],
};
const ask = (title, msg, ok, danger) => new Promise((res) => Alert.alert(title, msg, [
  { text: 'Cancel', style: 'cancel', onPress: () => res(false) },
  { text: ok, style: danger ? 'destructive' : 'default', onPress: () => res(true) }]));

// Plot cancellations — mirrors the web page (m/[module]/cancellations).
export default function ARCancellationsScreen({ navigation }) {
  const companyId = useSelector((st) => st.adminFilter?.companyId);
  const [rows, setRows] = useState(null);
  const [counts, setCounts] = useState({});
  const [canRefund, setCanRefund] = useState(false);
  const [err, setErr] = useState('');
  const [stage, setStage] = useState('pending');
  const [refreshing, setRefreshing] = useState(false);
  const [banks, setBanks] = useState([]);
  const [refund, setRefund] = useState(null);
  const [refundErr, setRefundErr] = useState({});
  const [busy, setBusy] = useState(false);

  const loadBanks = useCallback(() => {
    apiFetch(withCompany(AR_ENDPOINTS.banks, companyId)).then((r) => (r.ok ? r.json() : { results: [] }))
      .then((d) => setBanks((d.results || []).filter((b) => b.is_active))).catch(() => {});
  }, [companyId]);
  const load = useCallback(async () => {
    setErr('');
    try {
      const r = await apiFetch(withCompany(AR_ENDPOINTS.cancellations, companyId));
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.detail || 'Could not load cancellations.'); setRows([]); return; }
      setRows(d.results || []); setCounts(d.counts || {}); setCanRefund(!!d.can_refund);
    } catch (e) { setErr('Check your connection and try again.'); setRows([]); }
  }, [companyId]);
  useEffect(() => { load(); loadBanks(); }, [load, loadBanks]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const settled = (counts.refunded || 0) + (counts.closed || 0);
  const count = (k) => (k === 'all' ? (rows || []).length : k === 'refunded' ? settled : (counts[k] || 0));
  const shown = useMemo(() => (rows || []).filter((c) => stage === 'all' || c.stage === stage
    || (stage === 'refunded' && c.stage === 'closed')), [rows, stage]);

  async function decide(c, action) {
    const ok = await ask(action === 'approve' ? 'Approve cancellation?' : 'Reject cancellation?',
      action === 'approve'
        ? `Plot ${c.plots} (${c.client}) goes back on sale in Sales immediately and the account is frozen. Refund due: ${rupee(c.refund_due)}.`
        : 'The booking stays as it is.',
      action === 'approve' ? 'Approve' : 'Reject', action === 'approve');
    if (!ok) return;
    setBusy(true);
    const r = await apiFetch(withCompany(AR_ENDPOINTS.cancellationDecide(c.id), companyId), { method: 'POST', body: JSON.stringify({ action }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r?.ok) { Alert.alert('Not saved', d.detail || 'Could not save the decision.'); return; }
    load();
  }

  async function saveRefund() {
    setBusy(true); setRefundErr({});
    const { c, ...body } = refund;
    const r = await apiFetch(withCompany(AR_ENDPOINTS.cancellationRefunds(c.id), companyId), { method: 'POST', body: JSON.stringify(body) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r?.ok) { setRefundErr(d.detail ? { _: d.detail } : d); return; }
    setRefund(null); load(); loadBanks();
  }

  async function deleteRefund(x) {
    const ok = await ask('Delete refund?', `Delete the ${rupee(x.amount)} refund of ${formatDMY(x.paid_on)}? It goes back into ${x.bank_name}'s balance.`, 'Delete', true);
    if (!ok) return;
    const r = await apiFetch(withCompany(AR_ENDPOINTS.refund(x.id), companyId), { method: 'DELETE' }).catch(() => null);
    if (r?.ok) { load(); loadBanks(); } else Alert.alert('Error', 'Could not delete the refund.');
  }

  async function letter(c) {
    const msg = await shareCancellationLetter(c.id, companyId, `${c.client} · Plot ${c.plots}`);
    if (msg) Alert.alert('Letter', msg);
  }

  const picked = refund ? banks.find((b) => String(b.id) === String(refund.bank)) : null;

  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <View style={common.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={common.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={s.flex}>
          <Text style={common.headerTitle} numberOfLines={1}>Cancellations</Text>
          <Text style={common.headerSub} numberOfLines={1}>We keep 10% of the deal; the rest is refunded</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} style={s.chipsBar}>
        {STAGES.map(([k, label]) => (
          <TouchableOpacity key={k} onPress={() => setStage(k)} style={[s.chip, stage === k && s.chipOn]} activeOpacity={0.8}>
            <Text style={[s.chipText, stage === k && s.chipTextOn]}>{label} · {count(k)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {rows === null ? <AppLoader label="Loading cancellations…" /> : err && !rows.length ? <LoadError message={err} onRetry={load} /> : (
        <ScrollView contentContainerStyle={s.body} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {!shown.length ? (
            <Text style={s.empty}>Nothing here. Raise a cancellation from Collections or a client's ledger with “Cancel plot”.</Text>
          ) : shown.map((c) => {
            const [label, fg, bg] = BADGE[c.stage] || [c.stage, COLORS.textSecondary, COLORS.surfaceAlt];
            const pct = c.refund_due > 0 ? Math.min(100, Math.round((c.refunded / c.refund_due) * 100)) : 100;
            return (
              <View key={c.id} style={[common.card, s.card]}>
                <View style={s.head}>
                  <View style={s.flex}>
                    <Text style={s.client} numberOfLines={1}>{c.client || '—'}</Text>
                    <Text style={s.sub} numberOfLines={1}>{c.project} · Plot {c.plots}</Text>
                  </View>
                  <Text style={[s.badge, { color: fg, backgroundColor: bg }]}>{label}</Text>{/* inline-ok: colour per stage */}
                </View>
                <View style={s.figs}>
                  <Fig k="Received" v={rupee(c.received)} />
                  <Fig k={`We keep (${c.forfeit_pct}%)`} v={rupee(c.forfeit)} tone="bad" />
                  <Fig k="Refund" v={rupee(c.refund_due)} tone="refund" />
                </View>
                {c.status === 'approved' && c.refund_due > 0 ? (
                  <View style={s.progress}>
                    <View style={s.track}><View style={[s.fill, { width: `${pct}%` }]} /></View>{/* inline-ok: computed refund progress */}
                    <Text style={s.progressText}>{rupee(c.refunded)} paid · {rupee(c.refund_balance)} left</Text>
                  </View>
                ) : null}
                <Text style={s.reason}>“{c.reason}”</Text>
                <Text style={s.who}>Raised by {c.requested_by || '—'}{c.decided_by ? ` · ${c.status === 'rejected' ? 'Rejected' : 'Approved'} by ${c.decided_by}` : ''}</Text>
                {c.refunds.map((x) => (
                  <View key={x.id} style={s.refundRow}>
                    <Text style={[s.refundText, s.flex]} numberOfLines={1}>{formatDMY(x.paid_on)} · {x.bank_name}{x.reference ? ` · ${x.reference}` : ''}</Text>
                    <Text style={s.refundAmt}>− {rupee(x.amount)}</Text>
                    {canRefund ? <TouchableOpacity onPress={() => deleteRefund(x)} hitSlop={8}><Ionicons name="trash-outline" size={16} color={COLORS.textSecondary} /></TouchableOpacity> : null}
                  </View>
                ))}
                <View style={s.actions}>
                  <Button title="Ledger" size="sm" variant="secondary" onPress={() => navigation.navigate('ARLedger', { id: c.account_id })} />
                  {c.status === 'approved' ? <Button title="Letter" icon="file" size="sm" variant="secondary" onPress={() => letter(c)} /> : null}
                  {c.can_decide ? <Button title="Reject" size="sm" variant="secondary" disabled={busy} onPress={() => decide(c, 'reject')} /> : null}
                  {c.can_decide ? <Button title="Approve" size="sm" variant="danger" disabled={busy} onPress={() => decide(c, 'approve')} /> : null}
                  {c.stage === 'refund_pending' && canRefund ? (
                    <Button title="Record refund" size="sm" variant="primary"
                      onPress={() => { setRefundErr({}); setRefund({ c, paid_on: today(), amount: String(c.refund_balance), bank: '', reference: '' }); }} />
                  ) : null}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <FormSheet visible={!!refund} onClose={() => !busy && setRefund(null)}>
        {refund ? (
          <ScrollView style={s.sheetScroll} contentContainerStyle={s.sheetBody} keyboardShouldPersistTaps="handled">
            <Text style={s.sheetTitle}>Record refund</Text>
            <Text style={s.sub}>{refund.c.client} · Plot {refund.c.plots} · {rupee(refund.c.refund_balance)} left</Text>
            {refundErr._ ? <Text style={s.fieldErr}>{refundErr._}</Text> : null}
            <Text style={[common.label, s.gap]}>Paid on</Text>
            <DateField value={refund.paid_on} maxToday onChange={(d) => setRefund({ ...refund, paid_on: d })} />
            {refundErr.paid_on ? <Text style={s.fieldErr}>{refundErr.paid_on}</Text> : null}
            <Text style={[common.label, s.gap]}>Amount (₹)</Text>
            <TextInput style={common.input} value={groupINR(refund.amount)} keyboardType="decimal-pad"
              onChangeText={(v) => setRefund({ ...refund, amount: cleanAmount(v) })} />
            {refundErr.amount ? <Text style={s.fieldErr}>{refundErr.amount}</Text> : null}
            <Text style={[common.label, s.gap]}>Paid from bank</Text>
            {banks.length ? banks.map((b) => {
              const on = String(refund.bank) === String(b.id);
              return (
                <TouchableOpacity key={b.id} onPress={() => setRefund({ ...refund, bank: String(b.id) })} style={[s.bankRow, on && s.bankRowOn]} activeOpacity={0.8}>
                  <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={18} color={on ? COLORS.link : COLORS.textTertiary} />
                  <Text style={[s.bankName, s.flex]} numberOfLines={1}>{b.name}{b.account_no ? ` · ${b.account_no}` : ''}</Text>
                  <Text style={s.bankBal}>{rupee(b.balance)}</Text>
                </TouchableOpacity>
              );
            }) : <Text style={s.fieldErr}>No banks yet — add one in Bank Master first.</Text>}
            {picked ? (
              <View style={s.pick}>
                <View style={s.flex}><Text style={s.pickLabel}>CURRENT BALANCE</Text><Text style={s.pickNow}>{rupee(picked.balance)}</Text></View>
                {Number(refund.amount) > 0 ? (
                  <>
                    <Ionicons name="arrow-forward" size={18} color={COLORS.textSecondary} />
                    <View style={[s.flex, s.pickRight]}><Text style={s.pickLabel}>AFTER REFUND</Text><Text style={s.pickAfter}>{rupee(picked.balance - Number(refund.amount))}</Text></View>
                  </>
                ) : null}
              </View>
            ) : null}
            {refundErr.bank ? <Text style={s.fieldErr}>{refundErr.bank}</Text> : null}
            <Text style={[common.label, s.gap]}>UTR / cheque no.</Text>
            <TextInput style={common.input} value={refund.reference} onChangeText={(v) => setRefund({ ...refund, reference: v })} />
            <View style={s.sheetFoot}>
              <Button title="Cancel" variant="secondary" onPress={() => setRefund(null)} disabled={busy} style={s.flex} />
              <Button title="Record refund" variant="primary" loading={busy} style={s.flex}
                disabled={!refund.bank || !(Number(refund.amount) > 0) || !refund.paid_on} onPress={saveRefund} />
            </View>
          </ScrollView>
        ) : null}
      </FormSheet>
    </SafeAreaView>
  );
}

function Fig({ k, v, tone }) {
  return (
    <View style={s.flex}>
      <Text style={s.figK}>{k}</Text>
      <Text style={[s.figV, tone === 'bad' && s.bad, tone === 'refund' && s.refundV]} numberOfLines={1}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  chipsBar: { flexGrow: 0 },
  chips: { gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipOn: { borderColor: COLORS.link, backgroundColor: COLORS.accentSoft },
  chipText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  chipTextOn: { color: COLORS.link },
  body: { padding: 16, paddingTop: 4, paddingBottom: 40 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, fontSize: 14, paddingHorizontal: 20 },
  card: { padding: 16, marginBottom: 12, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  client: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 2 },
  badge: { fontSize: 11, fontWeight: '800', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  figs: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.surfaceAlt },
  figK: { fontSize: 10.5, fontWeight: '700', color: COLORS.textSecondary },
  figV: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginTop: 3 },
  bad: { color: COLORS.error },
  refundV: { color: COLORS.link },
  progress: { gap: 4 },
  track: { height: 7, borderRadius: 999, backgroundColor: COLORS.surfaceAlt, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, backgroundColor: COLORS.success },
  progressText: { fontSize: 12, color: COLORS.textSecondary },
  reason: { fontSize: 13, fontStyle: 'italic', color: COLORS.textSecondary },
  who: { fontSize: 11.5, color: COLORS.textTertiary },
  refundRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderTopWidth: 1, borderTopColor: COLORS.surfaceAlt },
  refundText: { fontSize: 12.5, color: COLORS.textSecondary },
  refundAmt: { fontSize: 13, fontWeight: '800', color: COLORS.error },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  sheetScroll: { flexShrink: 1 },
  sheetBody: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  sheetFoot: { flexDirection: 'row', gap: 10, marginTop: 20 },
  gap: { marginTop: 14 },
  fieldErr: { fontSize: 12, color: COLORS.error, marginTop: 4 },
  bankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1.5,
             borderColor: COLORS.border, backgroundColor: COLORS.surface, marginTop: 8 },
  bankRowOn: { borderColor: COLORS.link, backgroundColor: COLORS.accentSoft },
  bankName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  bankBal: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, padding: 12, borderRadius: 12,
          backgroundColor: COLORS.errorBg, borderWidth: 1, borderColor: COLORS.error },
  pickRight: { alignItems: 'flex-end' },
  pickLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: COLORS.textSecondary },
  pickNow: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  pickAfter: { fontSize: 17, fontWeight: '800', color: COLORS.error, marginTop: 2 },
});
