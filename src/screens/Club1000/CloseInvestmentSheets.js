// Closing an investment, step by step — the figures first, then what to save.
// Same as the website's _CloseInvestment.js:
//   RedeemSheet          before maturity: principal + redemption interest − interest
//                        already paid = payable; date, amount, remarks, pay now or later.
//   MaturityPayoutSheet  at maturity: every pending payout with target / actual paid /
//                        paid on / remarks; the ticked ones are paid and it is closed.
//   RenewalSummary       the term that matured, at the top of the Renew sheet.
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiFetch } from '../../utils/apiFetch';
import { CLUB1000_ENDPOINTS } from '../../constants/api';
import { COLORS } from '../../constants/theme';
import { formatDMY } from '../../utils/dateFormat';
import { errText } from '../../lib/apiError';
import FormSheet from '../../components/FormSheet';
import AppLoader from '../../components/AppLoader';

const TYPE_LABELS = { interest: 'Interest', maturity: 'Principal', premature_redemption: 'Redemption' };
const iso = (d) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const rupee = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

function useSettlement(investorId, on) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!investorId) { setData(null); return undefined; }
    let alive = true;
    setData(null);
    apiFetch(CLUB1000_ENDPOINTS.investorSettlement(investorId, on))
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        if (r.ok) { setData(d); setErr(''); } else setErr(errText(d, 'Could not work out the figures.'));
      })
      .catch(() => alive && setErr('Could not reach the server.'));
    return () => { alive = false; };
  }, [investorId, on]);
  return [data, err];
}

// A date field that opens the native picker; never later than today.
function DateField({ value, onChange, min }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} style={s.input}><Text style={s.inputText}>{formatDMY(value)}</Text></TouchableOpacity>
      {open && (
        <DateTimePicker value={new Date(`${value}T00:00:00`)} mode="date" maximumDate={new Date()}
          minimumDate={min ? new Date(`${min}T00:00:00`) : undefined}
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_, d) => { setOpen(false); if (d) onChange(iso(d)); }} />
      )}
    </>
  );
}

function Head({ title, investor, onClose }) {
  return (
    <View style={s.head}>
      <View style={s.flex}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.sub} numberOfLines={1}>{investor.name} · {investor.scheme_name || ''}{investor.loi_no ? ` · ${investor.loi_no}` : ''}</Text>
      </View>
      <TouchableOpacity onPress={onClose} style={s.close}><Ionicons name="close" size={18} color={COLORS.textPrimary} /></TouchableOpacity>
    </View>
  );
}

function Line({ label, sub, value, total }) {
  return (
    <View style={[s.line, total && s.lineTotal]}>
      <View style={s.flex}>
        <Text style={[s.lineLabel, total && s.lineLabelTotal]}>{label}</Text>
        {!!sub && <Text style={s.lineSub}>{sub}</Text>}
      </View>
      <Text style={[s.lineValue, total && s.lineValueTotal]}>{value}</Text>
    </View>
  );
}

export function RedeemSheet({ investor, onClose, onDone }) {
  const today = iso(new Date());
  const [on, setOn] = useState(today);
  const [st, loadErr] = useSettlement(investor?.id, on);
  const [amount, setAmount] = useState('');
  const [touched, setTouched] = useState(false);
  const [notes, setNotes] = useState('');
  const [payNow, setPayNow] = useState(false);
  const [paidOn, setPaidOn] = useState(today);
  const [payRemarks, setPayRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [seededFor, setSeededFor] = useState(null);
  if (investor && seededFor !== investor.id) {
    setSeededFor(investor.id);
    setOn(today); setTouched(false); setNotes(''); setPayNow(false); setPaidOn(today); setPayRemarks('');
  }
  useEffect(() => { if (st && !touched) setAmount(String(Number(st.payable) || 0)); }, [st, touched]);
  if (!investor) return null;

  async function submit() {
    if (amount === '' || Number.isNaN(Number(amount)) || Number(amount) < 0) { Alert.alert('Amount', 'Enter the amount payable.'); return; }
    setBusy(true);
    const body = { redemption_date: on, amount, notes };
    if (payNow) body.pay_now = { paid_date: paidOn, amount, notes: payRemarks };
    const res = await apiFetch(CLUB1000_ENDPOINTS.investorRedeem(investor.id), { method: 'POST', body: JSON.stringify(body) }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => ({})) : {};
      Alert.alert('Could not redeem', errText(d, 'Please try again.'));
      return;
    }
    setSeededFor(null);
    Alert.alert('Redeemed', payNow ? `Redeemed and paid · ${rupee(amount)}` : `Redeemed · ${rupee(amount)} is now due on Payouts`);
    onDone();
  }

  const blocked = st && !st.can_redeem;
  return (
    <FormSheet visible={!!investor} onClose={onClose}>
      <Head title="Redeem before maturity" investor={investor} onClose={onClose} />
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {!st && !loadErr && <AppLoader />}
        {!!loadErr && <Text style={s.bad}>{loadErr}</Text>}
        {st && <>
          <Text style={s.section}>1 · THE INVESTMENT</Text>
          <View style={s.card}>
            <Line label="Principal" value={rupee(st.principal)} />
            <Line label="Invested on" value={formatDMY(st.investment_date)} sub={`Matures ${formatDMY(st.maturity_date)}`} />
            <Line label="Held for" value={`${st.months_elapsed} mo`} sub={`Lock-in ${st.lock_months} mo${st.lock_until ? ` · free from ${formatDMY(st.lock_until)}` : ''}`} />
          </View>
          <Text style={s.lbl}>REDEMPTION DATE</Text>
          <DateField value={on} min={st.investment_date} onChange={(d) => { setOn(d); setTouched(false); }} />

          {blocked ? <Text style={s.warn}>{st.redeem_blocked_reason}</Text> : <>
            <Text style={s.section}>2 · THE WORKING</Text>
            <View style={s.card}>
              <Line label="Principal" value={rupee(st.principal)} />
              <Line label="+ Redemption interest" sub={`${st.months_elapsed} mo × ${Number(st.rate_per_month)}% a month`} value={rupee(st.redemption_interest)} />
              <Line label="− Interest already paid" value={rupee(st.interest_paid)} />
              <Line label="Payable" value={rupee(st.payable)} total />
            </View>
            {st.pending.length > 0 && (
              <Text style={s.help}>The {st.pending.length} payout{st.pending.length === 1 ? '' : 's'} still scheduled ({rupee(st.pending_total)}) are replaced by this one redemption, so nothing is paid twice.</Text>
            )}

            <Text style={s.section}>3 · SETTLE</Text>
            <Text style={s.lbl}>AMOUNT PAYABLE (₹)</Text>
            <TextInput value={amount} onChangeText={(t) => { setAmount(t); setTouched(true); }} keyboardType="decimal-pad" style={s.input} />
            {touched && Number(amount) !== Number(st.payable) && <Text style={s.diff}>Working says {rupee(st.payable)}</Text>}
            <Text style={s.lbl}>REASON / REMARKS</Text>
            <TextInput value={notes} onChangeText={setNotes} placeholder="Why the investor is leaving early" placeholderTextColor={COLORS.text3} style={s.input} />
            <TouchableOpacity onPress={() => setPayNow((v) => !v)} style={s.check}>
              <Ionicons name={payNow ? 'checkbox' : 'square-outline'} size={20} color={payNow ? COLORS.link : COLORS.textSecondary} />
              <Text style={s.checkText}>Paid now — otherwise it waits on Payouts</Text>
            </TouchableOpacity>
            {payNow && <>
              <Text style={s.lbl}>PAID ON</Text>
              <DateField value={paidOn} onChange={setPaidOn} />
              <Text style={s.lbl}>PAYMENT REMARKS</Text>
              <TextInput value={payRemarks} onChangeText={setPayRemarks} placeholder="UTR / cheque no." placeholderTextColor={COLORS.text3} style={s.input} />
            </>}
            <TouchableOpacity onPress={submit} disabled={busy} style={[s.btn, s.btnWarn, busy && s.dim]}>
              {busy ? <ActivityIndicator color={COLORS.warning} /> : <Text style={s.btnWarnText}>{payNow ? 'Redeem and pay' : 'Redeem'} · {rupee(amount)}</Text>}
            </TouchableOpacity>
          </>}
        </>}
      </ScrollView>
    </FormSheet>
  );
}

export function MaturityPayoutSheet({ investor, onClose, onDone }) {
  const today = iso(new Date());
  const [st, loadErr] = useSettlement(investor?.id);
  const [lines, setLines] = useState(null);
  const [busy, setBusy] = useState(false);
  const [seededFor, setSeededFor] = useState(null);
  if (investor && seededFor !== investor.id) { setSeededFor(investor.id); setLines(null); }
  useEffect(() => {
    if (st && !lines) setLines(Object.fromEntries(st.pending.map((p) => [p.id, { on: true, amount: String(Number(p.amount_due) || 0), date: today, notes: '' }])));
  }, [st, lines, today]);
  if (!investor) return null;
  const setLine = (id, patch) => setLines((l) => ({ ...l, [id]: { ...l[id], ...patch } }));
  const pending = st?.pending || [];
  const picked = lines ? pending.filter((p) => lines[p.id]?.on) : [];
  const total = picked.reduce((t, p) => t + (Number(lines[p.id].amount) || 0), 0);
  const left = pending.length - picked.length;

  async function submit() {
    setBusy(true);
    const payments = picked.map((p) => ({ id: p.id, amount: lines[p.id].amount, paid_date: lines[p.id].date, notes: lines[p.id].notes }));
    const res = await apiFetch(CLUB1000_ENDPOINTS.investorMaturePayout(investor.id), { method: 'POST', body: JSON.stringify({ payments }) }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => ({})) : {};
      Alert.alert('Could not close', errText(d, 'Please try again.'));
      return;
    }
    setSeededFor(null);
    Alert.alert('Closed', picked.length ? `Paid ${rupee(total)} and closed` : 'Closed — the payouts wait on Payouts');
    onDone();
  }

  return (
    <FormSheet visible={!!investor} onClose={onClose}>
      <Head title="Payout at maturity" investor={investor} onClose={onClose} />
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        {!st && !loadErr && <AppLoader />}
        {!!loadErr && <Text style={s.bad}>{loadErr}</Text>}
        {st && lines && <>
          <Text style={s.section}>1 · THE INVESTMENT</Text>
          <View style={s.card}>
            <Line label="Principal" value={rupee(st.principal)} />
            <Line label="Term" value={`→ ${formatDMY(st.maturity_date)}`} sub={`From ${formatDMY(st.investment_date)}`} />
            <Line label="Interest paid so far" value={rupee(st.interest_paid)} />
            <Line label="Still owed" value={rupee(st.pending_total)} sub={`${pending.length} payout${pending.length === 1 ? '' : 's'}`} total />
          </View>

          <Text style={s.section}>2 · PAY OUT</Text>
          {pending.length === 0 && <Text style={s.help}>Nothing is pending — closing just marks the investment redeemed.</Text>}
          {pending.map((p) => {
            const l = lines[p.id];
            const late = p.due_date < today;
            return (
              <View key={p.id} style={[s.payCard, !l.on && s.dim]}>
                <TouchableOpacity onPress={() => setLine(p.id, { on: !l.on })} style={s.payTop}>
                  <Ionicons name={l.on ? 'checkbox' : 'square-outline'} size={20} color={l.on ? COLORS.link : COLORS.textSecondary} />
                  <View style={s.flex}>
                    <Text style={s.payWhat}>{TYPE_LABELS[p.payout_type] || p.payout_type}</Text>
                    <Text style={[s.lineSub, late && s.late]}>Due {formatDMY(p.due_date)}{late ? ' · late' : ''}</Text>
                  </View>
                  <Text style={s.lineValue}>{rupee(p.amount_due)}</Text>
                </TouchableOpacity>
                {l.on && <>
                  <Text style={s.lbl}>ACTUAL PAID (₹)</Text>
                  <TextInput value={l.amount} onChangeText={(t) => setLine(p.id, { amount: t })} keyboardType="decimal-pad" style={s.input} />
                  <Text style={s.lbl}>PAID ON</Text>
                  <DateField value={l.date} onChange={(d) => setLine(p.id, { date: d })} />
                  <Text style={s.lbl}>REMARKS</Text>
                  <TextInput value={l.notes} onChangeText={(t) => setLine(p.id, { notes: t })} placeholder="UTR / cheque no." placeholderTextColor={COLORS.text3} style={s.input} />
                </>}
              </View>
            );
          })}
          {left > 0 && <Text style={s.help}>{left} unticked payout{left === 1 ? '' : 's'} stay pending on Payouts after closing.</Text>}
          <TouchableOpacity onPress={submit} disabled={busy} style={[s.btn, s.btnGo, busy && s.dim]}>
            {busy ? <ActivityIndicator color={COLORS.btnTextSuccess} /> : <Text style={s.btnGoText}>{picked.length ? `Pay ${rupee(total)} and close` : 'Close without paying now'}</Text>}
          </TouchableOpacity>
        </>}
      </ScrollView>
    </FormSheet>
  );
}

export function RenewalSummary({ investorId, newAmount }) {
  const [st] = useSettlement(investorId);
  if (!st) return null;
  const principal = Number(st.principal) || 0;
  const next = Number(newAmount) || 0;
  const unpaid = st.pending.filter((p) => p.payout_type === 'interest');
  const unpaidTotal = unpaid.reduce((t, p) => t + (Number(p.amount_due) || 0), 0);
  return (
    <View style={s.summary}>
      <Text style={s.section}>THE TERM THAT MATURED</Text>
      <View style={s.card}>
        <Line label="Principal" value={rupee(principal)} />
        <Line label="Interest paid so far" value={rupee(st.interest_paid)} />
        {next > 0 && next <= principal && <Line label="Rolls over" value={rupee(next)} />}
        {next > 0 && next < principal && <Line label="Paid out on renewal" value={rupee(principal - next)} total />}
        {next > principal && <Line label="Rolls over" value={rupee(principal)} />}
        {next > principal && <Line label="Fresh money added" value={rupee(next - principal)} total />}
      </View>
      {unpaid.length > 0 && (
        <Text style={s.warn}>
          {unpaid.length} interest payout{unpaid.length === 1 ? '' : 's'} from this term ({rupee(unpaidTotal)}) {unpaid.length === 1 ? 'is' : 'are'} still unpaid — {unpaid.length === 1 ? 'it stays' : 'they stay'} owed on Payouts after renewing.
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.screenBg, justifyContent: 'center', alignItems: 'center' },
  body: { paddingHorizontal: 16, paddingBottom: 30 },
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: COLORS.link, marginTop: 14, marginBottom: 8 },
  card: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.surface },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  lineTotal: { backgroundColor: COLORS.surfaceAlt, borderBottomWidth: 0 },
  lineLabel: { fontSize: 13, color: COLORS.textSecondary },
  lineLabelTotal: { fontWeight: '800', color: COLORS.textPrimary },
  lineSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  lineValue: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  lineValueTotal: { fontSize: 16, fontWeight: '800' },
  lbl: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: COLORS.textSecondary, marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary, backgroundColor: COLORS.surface, minHeight: 44, justifyContent: 'center' },
  inputText: { fontSize: 14, color: COLORS.textPrimary },
  help: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
  warn: { fontSize: 12.5, color: COLORS.warning, backgroundColor: COLORS.warningBg, borderRadius: 10, padding: 10, marginTop: 10 },
  bad: { fontSize: 12.5, color: COLORS.error, marginTop: 8 },
  diff: { fontSize: 11, fontWeight: '700', color: COLORS.warning, marginTop: 4 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  checkText: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  payCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 10, marginBottom: 10, backgroundColor: COLORS.surface },
  payTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  payWhat: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  late: { color: COLORS.error },
  btn: { marginTop: 18, borderRadius: 16, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  btnWarn: { backgroundColor: COLORS.warningBg, borderColor: COLORS.warning },
  btnWarnText: { color: COLORS.warning, fontSize: 15, fontWeight: '800' },
  btnGo: { backgroundColor: COLORS.btnTintSuccess, borderColor: COLORS.btnBorderSuccess },
  btnGoText: { color: COLORS.btnTextSuccess, fontSize: 15, fontWeight: '800' },
  dim: { opacity: 0.55 },
  summary: { marginBottom: 6 },
});
