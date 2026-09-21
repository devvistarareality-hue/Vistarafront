import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StatusBar, RefreshControl, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../../constants/theme';
import { AR_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import { formatDMY } from '../../utils/dateFormat';
import common from '../../styles/common';
import AppLoader from '../../components/AppLoader';
import LoadError from '../../components/LoadError';
import FormSheet from '../../components/FormSheet';
import { Badge, Button, Segmented } from '../../components/ui';
import { rupee, MODES, MODE_LABEL, AGE_LABELS, STATUS, today, withCompany, DateField, shareStatement } from './arShared';

const confirm = (title, message, okText, destructive) => new Promise((resolve) => {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
    { text: okText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
  ], { cancelable: true, onDismiss: () => resolve(false) });
});

// Account Ledger — one booking's plan, receipts, interest and ageing, plus the
// payment form. Only receipts are typed in; the plan comes from the booking and
// every figure comes back computed by the server.
export default function ARLedgerScreen({ navigation, route }) {
  const id = route?.params?.id;
  const companyId = useSelector((st) => st.adminFilter?.companyId);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [asOf, setAsOf] = useState(today());
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState(null);        // null | { id?, paid_on, amount, mode, remarks }
  const [formErr, setFormErr] = useState({});
  const [saving, setSaving] = useState(false);
  const [legalDate, setLegalDate] = useState('');
  const [audit, setAudit] = useState(null);      // null | { receipt, rows }
  const [sharing, setSharing] = useState(false);

  const url = useCallback((u) => withCompany(u, companyId, [`as_of=${asOf}`]), [companyId, asOf]);

  const load = useCallback(async () => {
    setErr('');
    try {
      const r = await apiFetch(url(AR_ENDPOINTS.account(id)));
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.detail || 'Could not load this account.'); return; }
      setData(d); setLegalDate(d.legal_due_date || '');
    } catch (e) { setErr('Check your connection and try again.'); }
  }, [id, url]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openNew = () => { setFormErr({}); setForm({ paid_on: today(), amount: '', mode: 'bank', remarks: '' }); };
  const openEdit = (rc) => { setFormErr({}); setForm({ id: rc.id, paid_on: rc.paid_on, amount: String(rc.amount), mode: rc.mode, remarks: rc.remarks }); };

  async function saveReceipt() {
    const ok = await confirm(form.id ? 'Update receipt?' : 'Record payment?',
      `${form.id ? 'Update this receipt to' : 'Record'} ${rupee(form.amount)} from ${data.client_name || 'this client'} on ${formatDMY(form.paid_on)} (${MODE_LABEL[form.mode]})?`,
      form.id ? 'Update' : 'Record');
    if (!ok) return;
    setSaving(true); setFormErr({});
    try {
      const r = await apiFetch(withCompany(form.id ? AR_ENDPOINTS.receipt(form.id) : AR_ENDPOINTS.receipts(id), companyId), {
        method: form.id ? 'PATCH' : 'POST',
        body: JSON.stringify({ paid_on: form.paid_on, amount: form.amount, mode: form.mode, remarks: form.remarks }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setFormErr(d.detail ? { _: d.detail } : d); setSaving(false); return; }
      setForm(null);
      await load();
    } catch (e) { setFormErr({ _: 'Could not save. Check your connection.' }); }
    setSaving(false);
  }

  async function deleteReceipt(rc) {
    const ok = await confirm('Delete receipt?', `Delete the ${rupee(rc.amount)} receipt of ${formatDMY(rc.paid_on)}? It stays in the history but no longer counts.`, 'Delete', true);
    if (!ok) return;
    const r = await apiFetch(withCompany(AR_ENDPOINTS.receipt(rc.id), companyId), { method: 'DELETE' }).catch(() => null);
    if (r?.ok) load(); else Alert.alert('Error', 'Could not delete the receipt.');
  }

  async function showAudit(rc) {
    setAudit({ receipt: rc, rows: null });
    const r = await apiFetch(withCompany(AR_ENDPOINTS.receiptAudit(rc.id), companyId)).catch(() => null);
    const d = r ? await r.json().catch(() => []) : [];
    setAudit({ receipt: rc, rows: r?.ok ? d : [] });
  }

  async function saveLegalDate() {
    const r = await apiFetch(url(AR_ENDPOINTS.account(id)), { method: 'PATCH', body: JSON.stringify({ legal_due_date: legalDate || null }) }).catch(() => null);
    if (r?.ok) { const d = await r.json(); setData(d); setLegalDate(d.legal_due_date || ''); } else Alert.alert('Error', 'Could not save the date.');
  }

  async function statement() {
    setSharing(true);
    const e = await shareStatement(id, asOf, companyId, `${data.client_name} ${data.project} ${data.plots}`);
    setSharing(false);
    if (e) Alert.alert('Error', e);
  }

  if (!data) {
    return (
      <SafeAreaView style={common.screen} edges={['top']}>
        <Header navigation={navigation} title="Account" />
        {err ? <LoadError message={err} onRetry={load} /> : <AppLoader label="Calculating ledger…" />}
      </SafeAreaView>
    );
  }

  const frozen = data.status === 'frozen';
  const legalDirty = (legalDate || null) !== (data.legal_due_date || null);

  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      <Header navigation={navigation} title={data.client_name || 'Account'}
        sub={`${data.project} · Plot ${data.plots}${data.phone ? ` · ${data.phone}` : ''}`} />

      <ScrollView contentContainerStyle={common.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.link} />}>
        <View style={s.actions}>
          <View style={s.asOf}>
            <Text style={s.asOfLabel}>Ledger date</Text>
            <DateField compact value={asOf} onChange={(d) => setAsOf(d || today())} />
          </View>
          <Button title="Statement" icon="download" size="sm" variant="secondary" loading={sharing} onPress={statement} />
        </View>
        {!frozen && <Button title="Record payment" icon="check-circle" variant="primary" full onPress={openNew} style={s.recordBtn} />}

        {frozen && <Note tone="warn" text="This booking was cancelled, so its account is frozen. Receipts and history are kept; no new payments can be recorded." />}
        {data.no_schedule && <Note tone="warn" text={`The booking has no installment schedule${String(data.plots).toUpperCase().startsWith('EOI') ? ' (an EOI)' : ''}, so the unscheduled amount shows as one undated Balance line with no interest. Ask Sales to add the installments to the booking.`} />}
        {data.suspect_amount && <Note tone="bad" text={`The deal amount on this booking is only ${rupee(data.total_deal)}, which looks like a typing mistake. Correct the booking in Sales before relying on these figures.`} />}
        {data.plan_mismatch !== 0 && <Note tone="warn" text={`The LOI schedule adds up to ${rupee(data.collectable)}, which is ${rupee(Math.abs(data.plan_mismatch))} ${data.plan_mismatch > 0 ? 'more' : 'less'} than Total Deal − Stamp Duty − Registration.`} />}

        <View style={[common.card, s.card]}>
          <Text style={s.cardTitle}>Summary</Text>
          <KV k="Total deal" v={data.total_deal} />
          <KV k="Stamp duty" v={data.stamp_duty} />
          <KV k="Registration" v={data.reg_fees} />
          <KV k="Received" v={data.received} tone="good" note={`${data.pct_realised}%`} />
          <KV k="Outstanding" v={data.outstanding} />
          <KV k="Overdue" v={data.overdue} tone={data.overdue > 0 ? 'bad' : undefined} />
          <KV k="Interest due" v={data.net_interest} />
          <KV k="O/s with interest" v={data.os_with_interest} total />
        </View>

        <View style={[common.card, s.card]}>
          <Text style={s.cardTitle}>O/s by month</Text>
          {data.os_summary.map((m) => <KV key={m.label} k={m.label} v={m.amount} dashZero />)}
          <KV k="Total" v={data.os_summary.reduce((t, m) => t + m.amount, 0)} total />
          <Text style={[s.cardTitle, s.gapTop]}>Overdue by age</Text>
          {AGE_LABELS.map((a) => <KV key={a} k={`${a} days`} v={data.ageing[a]} dashZero tone={data.ageing[a] ? 'bad' : undefined} />)}
          <KV k="Total overdue" v={data.overdue} total />
        </View>

        <View style={[common.card, s.card]}>
          <View style={s.cardHead}>
            <View style={s.flex}>
              <Text style={s.cardTitle}>Payment plan</Text>
              <Text style={s.cardSub}>From the approved LOI</Text>
            </View>
          </View>
          {data.plan.map((p) => (
            <View key={p.key} style={s.item}>
              <View style={s.itemTop}>
                <Text style={s.itemTitle} numberOfLines={1}>{p.no} · {p.label}</Text>
                <Badge label={STATUS[p.status].label} tone={STATUS[p.status].tone} />
              </View>
              {p.kind === 'legal' && !frozen ? (
                <View style={s.legalRow}>
                  <DateField compact value={legalDate} onChange={setLegalDate} placeholder="Set due date" style={s.flex} />
                  <Button title="Save" size="sm" variant="soft" disabled={!legalDirty} onPress={saveLegalDate} />
                </View>
              ) : (
                <Text style={s.itemSub}>Due {p.due ? formatDMY(p.due) : p.kind === 'balance' ? '— no schedule' : '— no date'}</Text>
              )}
              <View style={s.itemNums}>
                <Num label="Amount" v={p.amount} />
                <Num label="Paid" v={p.paid} />
                <Num label="Pending" v={p.pending} bad={p.pending > 0 && p.status !== 'completed'} />
              </View>
            </View>
          ))}
        </View>

        <View style={[common.card, s.card]}>
          <Text style={s.cardTitle}>Payments received</Text>
          <Text style={s.cardSub}>{data.receipts.length} receipt{data.receipts.length === 1 ? '' : 's'}</Text>
          {data.receipts.length === 0 ? <Text style={s.empty}>No payments recorded yet.</Text> : data.receipts.map((rc) => (
            <View key={rc.id} style={s.item}>
              <View style={s.itemTop}>
                <Text style={s.receiptAmt}>{rupee(rc.amount)}</Text>
                <Text style={s.itemSub}>{formatDMY(rc.paid_on)} · {rc.mode_label}</Text>
              </View>
              {rc.remarks ? <Text style={s.remarks}>{rc.remarks}</Text> : null}
              <View style={s.itemFoot}>
                <Text style={s.by} numberOfLines={1}>{rc.source === 'import' ? 'Excel import' : (rc.created_by || '—')}</Text>
                <View style={s.rowBtns}>
                  {!frozen && <IconBtn icon="pencil" label="Edit receipt" onPress={() => openEdit(rc)} />}
                  {!frozen && <IconBtn icon="trash-outline" label="Delete receipt" danger onPress={() => deleteReceipt(rc)} />}
                  <IconBtn icon="time-outline" label="Receipt history" onPress={() => showAudit(rc)} />
                </View>
              </View>
            </View>
          ))}
        </View>

        <View style={[common.card, s.card]}>
          <Text style={s.cardTitle}>Interest</Text>
          <Text style={s.cardSub}>2% a month when paid more than 10 days late · 1% a month credit when paid early (not on Legal & Other Charges)</Text>
          {data.interest_rows.length === 0 ? <Text style={s.empty}>Nothing allocated yet.</Text> : data.interest_rows.map((r, i) => (
            <View key={i} style={s.intRow}>
              <View style={s.flex}>
                <Text style={s.intTitle}>{r.inst_no} · {rupee(r.amount)}</Text>
                <Text style={s.itemSub}>Due {r.due ? formatDMY(r.due) : '—'} · {r.paid_on ? `paid ${formatDMY(r.paid_on)}` : 'unpaid'}{r.days != null ? ` · ${r.days} days` : ''}</Text>
              </View>
              <Text style={[s.intAmt, r.interest < 0 && s.good, r.interest > 0 && s.bad]}>{rupee(r.interest)}</Text>
            </View>
          ))}
          {data.overpaid > 0 && (
            <View style={s.intRow}>
              <Text style={[s.itemSub, s.flex]}>Overpaid {rupee(data.overpaid)} — credit to date</Text>
              <Text style={[s.intAmt, s.good]}>{rupee(data.overpaid_credit)}</Text>
            </View>
          )}
          <KV k="Net interest" v={data.net_interest} total />
        </View>
      </ScrollView>

      <FormSheet visible={!!form} onClose={() => !saving && setForm(null)}>
        {form && (
          <ScrollView style={s.sheetScroll} keyboardShouldPersistTaps="handled">
            <Text style={s.sheetTitle}>{form.id ? 'Edit receipt' : 'Record payment'}</Text>
            <Text style={s.sheetSub}>{data.client_name} · Plot {data.plots} · Outstanding {rupee(data.outstanding)}</Text>
            {formErr._ ? <Note tone="bad" text={formErr._} /> : null}
            <Text style={common.label}>Paid on</Text>
            <DateField value={form.paid_on} maxToday onChange={(d) => setForm({ ...form, paid_on: d })} />
            {formErr.paid_on ? <Text style={s.fieldErr}>{formErr.paid_on}</Text> : null}
            <Text style={[common.label, s.gapTop]}>Amount (₹)</Text>
            <TextInput style={common.input} value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v.replace(/[^0-9.]/g, '') })}
              keyboardType="decimal-pad" placeholder="0" placeholderTextColor={COLORS.textTertiary} />
            {form.amount ? <Text style={s.hint}>{rupee(form.amount)}</Text> : null}
            {formErr.amount ? <Text style={s.fieldErr}>{formErr.amount}</Text> : null}
            <Text style={[common.label, s.gapTop]}>Mode</Text>
            <Segmented options={MODES} value={form.mode} onChange={(m) => setForm({ ...form, mode: m })} />
            <Text style={[common.label, s.gapTop]}>Remarks</Text>
            <TextInput style={common.input} value={form.remarks} onChangeText={(v) => setForm({ ...form, remarks: v })}
              placeholder="e.g. REC IN VISTARA HDFC" placeholderTextColor={COLORS.textTertiary} />
            <View style={s.sheetFoot}>
              <Button title="Cancel" variant="secondary" onPress={() => setForm(null)} disabled={saving} style={s.flex} />
              <Button title={form.id ? 'Update' : 'Record'} variant="primary" loading={saving} style={s.flex}
                disabled={!form.paid_on || !(Number(form.amount) > 0)} onPress={saveReceipt} />
            </View>
          </ScrollView>
        )}
      </FormSheet>

      <FormSheet visible={!!audit} onClose={() => setAudit(null)} maxHeight="75%">
        {audit && (
          <ScrollView style={s.sheetScroll}>
            <Text style={s.sheetTitle}>Receipt history</Text>
            <Text style={s.sheetSub}>{rupee(audit.receipt.amount)} · {formatDMY(audit.receipt.paid_on)}</Text>
            {audit.rows === null ? <AppLoader label="Loading…" /> : audit.rows.map((a, i) => (
              <View key={i} style={s.auditItem}>
                <Text style={s.auditMeta}>{{ create: 'Created', update: 'Edited', delete: 'Deleted' }[a.action]} by {a.changed_by || '—'} · {new Date(a.changed_at).toLocaleString('en-IN')}</Text>
                {a.before ? <Text style={s.auditText}>Before: {rupee(a.before.amount)} · {formatDMY(a.before.paid_on)} · {MODE_LABEL[a.before.mode] || a.before.mode}{a.before.remarks ? ` · ${a.before.remarks}` : ''}</Text> : null}
                {a.after ? <Text style={s.auditText}>After: {rupee(a.after.amount)} · {formatDMY(a.after.paid_on)} · {MODE_LABEL[a.after.mode] || a.after.mode}{a.after.remarks ? ` · ${a.after.remarks}` : ''}</Text> : null}
              </View>
            ))}
            <Button title="Close" variant="secondary" onPress={() => setAudit(null)} full style={s.gapTop} />
          </ScrollView>
        )}
      </FormSheet>
    </SafeAreaView>
  );
}

function Header({ navigation, title, sub }) {
  return (
    <View style={common.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={common.iconBtn}>
        <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
      </TouchableOpacity>
      <View style={s.flex}>
        <Text style={common.headerTitle} numberOfLines={1}>{title}</Text>
        {sub ? <Text style={common.headerSub} numberOfLines={1}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function Note({ tone, text }) {
  const box = tone === 'bad' ? s.noteBad : tone === 'info' ? s.noteInfo : s.noteWarn;
  const ink = tone === 'bad' ? s.bad : tone === 'info' ? s.info : s.warn;
  return <View style={[s.note, box]}><Text style={[s.noteText, ink]}>{text}</Text></View>;
}

function KV({ k, v, tone, note, total, dashZero }) {
  return (
    <View style={[s.kv, total && s.kvTotal]}>
      <Text style={[s.k, total && s.kTotal]}>{k}{note ? <Text style={s.kNote}>  {note}</Text> : null}</Text>
      <Text style={[s.v, total && s.vTotal, tone === 'good' && s.good, tone === 'bad' && s.bad]}>{dashZero && !v ? '—' : rupee(v)}</Text>
    </View>
  );
}

function Num({ label, v, bad }) {
  return (
    <View style={s.flex}>
      <Text style={s.numLabel}>{label}</Text>
      <Text style={[s.numValue, bad && s.bad]} numberOfLines={1}>{rupee(v)}</Text>
    </View>
  );
}

function IconBtn({ icon, label, onPress, danger }) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityLabel={label} style={[s.iconBtn, danger && s.iconBtnDanger]} activeOpacity={0.75}>
      <Ionicons name={icon} size={16} color={danger ? COLORS.error : COLORS.textSecondary} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '800' },
  good: { color: COLORS.success },
  bad: { color: COLORS.error },
  warn: { color: COLORS.warning },
  info: { color: COLORS.link },
  gapTop: { marginTop: 14 },
  actions: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginBottom: 10 },
  asOf: { flex: 1, maxWidth: 190 },
  asOfLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  recordBtn: { marginBottom: 14 },
  note: { borderRadius: RADIUS.md, borderWidth: 1, padding: 12, marginBottom: 12 },
  noteWarn: { backgroundColor: COLORS.warningBg, borderColor: COLORS.warningBg },
  noteBad: { backgroundColor: COLORS.errorBg, borderColor: COLORS.errorBg },
  noteInfo: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accentSoft },
  noteText: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  card: { marginBottom: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  cardSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: -3, marginBottom: 8, lineHeight: 17 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  kvTotal: { borderBottomWidth: 0, paddingTop: 10 },
  k: { flexShrink: 1, fontSize: 13.5, color: COLORS.textSecondary, fontWeight: '600' },
  kTotal: { color: COLORS.textPrimary, fontWeight: '800' },
  kNote: { fontSize: 12, color: COLORS.textTertiary, fontWeight: '600' },
  v: { fontSize: 13.5, color: COLORS.textPrimary, fontWeight: '700' },
  vTotal: { fontSize: 15, fontWeight: '800', color: COLORS.link },
  item: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 6 },
  itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  itemTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  itemSub: { fontSize: 12.5, color: COLORS.textSecondary },
  itemNums: { flexDirection: 'row', gap: 8 },
  itemFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  legalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  numLabel: { fontSize: 10.5, color: COLORS.textSecondary, fontWeight: '600' },
  numValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '700', marginTop: 1 },
  receiptAmt: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  remarks: { fontSize: 12.5, color: COLORS.textPrimary },
  by: { flex: 1, fontSize: 12, color: COLORS.textTertiary },
  rowBtns: { flexDirection: 'row', gap: 6 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceAlt },
  iconBtnDanger: { backgroundColor: COLORS.errorBg },
  intRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: COLORS.border },
  intTitle: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  intAmt: { fontSize: 13.5, fontWeight: '800', color: COLORS.textPrimary },
  empty: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 14 },
  sheetScroll: { flexShrink: 1 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  sheetSub: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 3, marginBottom: 16 },
  sheetFoot: { flexDirection: 'row', gap: 10, marginTop: 20 },
  fieldErr: { fontSize: 12, color: COLORS.error, marginTop: 4 },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  auditItem: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 10, marginBottom: 8, gap: 3 },
  auditMeta: { fontSize: 11.5, color: COLORS.textSecondary },
  auditText: { fontSize: 12.5, color: COLORS.textPrimary },
});
