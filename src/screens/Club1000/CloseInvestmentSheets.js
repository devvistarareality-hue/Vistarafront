// Closing an investment, step by step — the figures first, then what to save.
// Same as the website's _CloseInvestment.js:
//   RedeemSheet          before maturity: how much is coming out decides the rest.
//                        The withdrawn part earns the scheme's premature rate for the
//                        months held; anything left keeps its normal return and maturity
//                        date. Enter the full principal and the investment closes.
//                        Either way it goes for approval with a signed LOI.
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
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import FormSheet from '../../components/FormSheet';
import AppLoader from '../../components/AppLoader';
import { buildInvestorLOIHtml } from '../../lib/investorLOIHtml';
import { loiFileName, sharePdfNamed } from '../../lib/c1Files';
import { earlierTerms } from '../../lib/c1History';

const TYPE_LABELS = { interest: 'Interest', maturity: 'Principal', premature_redemption: 'Redemption' };
// An at-maturity payout is principal AND the term's interest in one payment.
const typeLabel = (p) => (p.maturity_split
  ? `Principal + interest · ${rupee(p.maturity_split.principal)} + ${rupee(p.maturity_split.interest)}`
  : (TYPE_LABELS[p.payout_type] || p.payout_type));
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

// The working for a proposed partial redemption, as of a date and an amount.
function useRedeemQuote(investorId, amount, on) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!investorId || !amount || Number(amount) <= 0) { setData(null); return undefined; }
    let alive = true;
    const t = setTimeout(() => {
      apiFetch(CLUB1000_ENDPOINTS.investorRedeemQuote(investorId, amount, on))
        .then(async (r) => {
          const d = await r.json().catch(() => ({}));
          if (!alive) return;
          if (r.ok) { setData(d); setErr(''); } else setErr(errText(d, 'Could not work out the figures.'));
        })
        .catch(() => alive && setErr('Could not reach the server.'));
    }, 300);                                  // typing an amount should not spam the API
    return () => { alive = false; clearTimeout(t); };
  }, [investorId, amount, on]);
  return [data, err];
}

export function RedeemSheet({ investor, scheme, onClose, onDone }) {
  const today = iso(new Date());
  const [on, setOn] = useState(today);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  // Redeemed means handed over — when the money went to him (the redemption date
  // unless changed) and the UTR / cheque, so it is recorded as paid on approval.
  const [paidOn, setPaidOn] = useState('');
  const [paidNotes, setPaidNotes] = useState('');
  const paidDate = paidOn || on;
  const [loiDone, setLoiDone] = useState(false);
  const [loiBusy, setLoiBusy] = useState(false);
  const [loiFile, setLoiFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [seededFor, setSeededFor] = useState(null);
  const [q, loadErr] = useRedeemQuote(investor?.id, amount, on);
  if (investor && seededFor !== investor.id) {
    setSeededFor(investor.id);
    setOn(today); setNotes(''); setLoiDone(false); setLoiFile(null); setPaidOn(''); setPaidNotes('');
    setAmount(String(Number(investor.amount_invested) || ''));
  }
  if (!investor) return null;

  async function getLoi() {
    setLoiBusy(true);
    try {
      // Built against what STAYS invested: the schedule, maturity value and
      // per-day basis all read amount_invested, so handing it the investor
      // unchanged printed the pre-redemption principal and a schedule for
      // money that is being taken out. Earlier terms come along too, the way
      // the renewal LOI shows them.
      const continuing = { ...investor, amount_invested: q.remaining_principal };
      // Always fetched now: a first-term investment can still have earlier
      // redemptions to list.
      const past = await earlierTerms(investor.id);
      const opts = {
        redemption: q,
        ...(past.history?.length ? { history: past.history } : {}),
        ...(past.redemptions?.length ? { pastRedemptions: past.redemptions } : {}),
      };
      const html = buildInvestorLOIHtml(continuing, scheme, opts);
      const { uri } = await Print.printToFileAsync({ html });
      await sharePdfNamed(uri, loiFileName(investor, opts));
      setLoiDone(true);
    } catch (e) {
      Alert.alert('Could not generate the LOI', e.message);
    } finally {
      setLoiBusy(false);
    }
  }

  async function pickSignedLoi() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      const data = await FileSystem.readAsStringAsync(a.uri, { encoding: FileSystem.EncodingType.Base64 });
      setLoiFile({ name: a.name || 'signed_loi', type: a.mimeType || 'application/pdf', data });
    } catch (e) {
      Alert.alert('Attach failed', e.message);
    }
  }

  async function submit() {
    if (!q || !q.can_redeem) return;
    if (!loiFile) { Alert.alert('Signed LOI', 'Download the redemption LOI, get it signed, and attach it.'); return; }
    setBusy(true);
    const res = await apiFetch(CLUB1000_ENDPOINTS.investorRedeemRequest(investor.id), {
      method: 'POST',
      body: JSON.stringify({ amount, redemption_date: on, notes, loi_file: loiFile, paid_date: paidDate, paid_notes: paidNotes }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const d = res ? await res.json().catch(() => ({})) : {};
      Alert.alert('Could not submit', errText(d, 'Please try again.'));
      return;
    }
    setSeededFor(null);
    Alert.alert('Sent for approval', `Redemption of ${rupee(amount)} is awaiting approval.`);
    onDone();
  }

  const blocked = q && !q.can_redeem;
  return (
    <FormSheet visible={!!investor} onClose={onClose}>
      <Head title="Redeem part of this investment" investor={investor} onClose={onClose} />
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <Text style={s.section}>1 · HOW MUCH IS COMING OUT</Text>
        <View style={s.card}>
          <Line label="Currently invested" value={rupee(investor.amount_invested)} />
        </View>
        <Text style={s.lbl}>AMOUNT TO REDEEM (₹)</Text>
        <TextInput style={s.input} value={amount} onChangeText={setAmount} keyboardType="decimal-pad"
          placeholder="The principal being taken out" placeholderTextColor={COLORS.text3} />
        <Text style={s.lbl}>REDEMPTION DATE</Text>
        <DateField value={on} min={investor.investment_date} onChange={setOn} />

        {!q && !loadErr && !!amount && <AppLoader />}
        {!!loadErr && <Text style={s.bad}>{loadErr}</Text>}
        {blocked && <Text style={s.bad}>{q.blocked_reason}</Text>}

        {q && !blocked && <>
          <Text style={s.section}>2 · THE WORKING</Text>
          <View style={s.card}>
            <Line label="Principal redeemed" value={rupee(q.redeem_amount)} />
            <Line label="+ Premature interest" value={rupee(q.premature_interest)}
              sub={`${q.days_held} days × ${rupee(q.daily_interest)} a day — ${Number(q.rate_per_month)}% a month, by the day`} />
            <Line label="Payable" value={rupee(q.payable)} />
            {Number(q.interest_paid_share) > 0 && (
              <Line label="Already paid on this share" value={rupee(q.interest_paid_share)}
                sub="Shown for reference — not deducted from the payable" />
            )}
          </View>

          <Text style={s.section}>{q.is_full ? '3 · NOTHING STAYS INVESTED' : '3 · WHAT STAYS INVESTED'}</Text>
          <View style={s.card}>
            {q.is_full ? (
              <Line label="Remaining" value="Nil" sub="The investment closes once approved" />
            ) : <>
              <Line label="Remaining principal" value={rupee(q.remaining_principal)} />
              <Line label="Carries on at" value={`${Number(q.normal_return_pct)}%`}
                sub={`Matures ${formatDMY(q.maturity_date)} — unchanged, and not penalised`} />
            </>}
          </View>

          <Text style={s.section}>4 · PAID TO THE INVESTOR</Text>
          <Text style={s.lbl}>PAID ON</Text>
          <DateField value={paidDate} min={on} onChange={setPaidOn} />
          <Text style={s.lbl}>UTR / CHEQUE NO. (OPTIONAL)</Text>
          <TextInput style={s.input} value={paidNotes} onChangeText={setPaidNotes}
            placeholder="e.g. UTR 4521…" placeholderTextColor={COLORS.text3} />
          <Text style={s.help}>Once approved, {rupee(q.payable)} is recorded as paid to him on {formatDMY(paidDate)} — it does not show as owed in Payouts.</Text>

          <Text style={s.section}>5 · SIGN OFF</Text>
          <Text style={s.lbl}>REASON / REMARKS</Text>
          <TextInput style={s.input} value={notes} onChangeText={setNotes}
            placeholder="Why the investor is taking money out early" placeholderTextColor={COLORS.text3} />
          <TouchableOpacity onPress={getLoi} disabled={loiBusy} style={s.loiBtn}>
            <Text style={s.loiBtnText}>{loiBusy ? 'Generating…' : 'Download redemption LOI'}</Text>
          </TouchableOpacity>
          {loiDone && <Text style={s.ok}>LOI generated — get it signed, then attach it.</Text>}
          <TouchableOpacity onPress={pickSignedLoi} style={s.loiBtn}>
            <Text style={s.loiBtnText}>{loiFile ? `Attached: ${loiFile.name}` : 'Attach signed LOI'}</Text>
          </TouchableOpacity>
          <Text style={s.help}>
            A redemption changes what is owed, so it goes to an approver. Nothing moves until it is approved.
          </Text>
        </>}

        <TouchableOpacity onPress={submit} disabled={busy || !q || blocked || !loiFile}
          style={[s.submit, (busy || !q || blocked || !loiFile) && s.submitOff]}>
          {busy ? <ActivityIndicator color={COLORS.white} /> : <Text style={s.submitText}>Submit for approval</Text>}
        </TouchableOpacity>
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
    if (st && !lines) setLines(Object.fromEntries(st.pending.map((p) => [p.id, { on: true, amount: String(Number(p.amount_due) || 0),
      // A redemption is handed over on its redemption date, not the day it is recorded.
      date: p.payout_type === 'premature_redemption' && p.due_date && p.due_date <= today ? p.due_date : today, notes: '' }])));
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
                    <Text style={s.payWhat}>{typeLabel(p)}{p.period ? ` · ${p.period.label}` : ''}</Text>
                {!!p.period && <Text style={s.payWhy}>{formatDMY(p.period.from)} – {formatDMY(p.period.to)} · {p.period.days} days × ₹{Number(p.period.per_day).toLocaleString('en-IN')}/day</Text>}
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

// The term that ended, and how he is renewing it — same as the website: four plain
// choices that fill in the new amount and say where every rupee goes.
export function RenewalSummary({ investorId, newAmount, onRenewal, payNow, onPayNow }) {
  const [st] = useSettlement(investorId);
  const [how, setHow] = useState('');
  const [take, setTake] = useState('');
  const [extra, setExtra] = useState('');
  // Hold its place while the figures load — appearing late it pushed the form down.
  if (!st) return <View style={[s.summary, s.wait]}><ActivityIndicator color={COLORS.link} /></View>;
  const principal = Number(st.principal) || 0;
  const atMaturity = st.pending.filter((p) => p.payout_type === 'maturity').reduce((t, p) => t + (Number(p.amount_due) || 0), 0);
  const unpaid = Math.round((st.pending.filter((p) => p.payout_type === 'interest').reduce((t, p) => t + (Number(p.amount_due) || 0), 0)
    + Math.max(atMaturity - principal, 0)) * 100) / 100;
  const plan = (mode, t = take, e = extra) => {
    const tk = mode === 'interest_out' ? unpaid : mode === 'take' ? Math.max(Number(t) || 0, 0) : 0;
    const ex = mode === 'more' ? Math.max(Number(e) || 0, 0) : 0;
    return { amount: Math.max(Math.round((principal + unpaid + ex - tk) * 100) / 100, 0), added: Math.max(unpaid - tk, 0) };
  };
  const choose = (mode, t = take, e = extra) => {
    setHow(mode);
    const p = plan(mode, t, e);
    onRenewal && onRenewal({ amount: p.amount, interest_added: p.added, interest_choice: p.added > 0 ? 'reinvest' : 'pay' });
  };
  const next = Number(newAmount) || 0;
  const custom = !how || Math.abs(plan(how).amount - next) > 0.5;
  const added = custom ? Math.min(unpaid, Math.max(next - principal, 0)) : plan(how).added;
  const toHim = Math.max(unpaid - added, 0);
  const back = Math.max(principal - next, 0);
  const fresh = Math.max(next - principal - added, 0);
  const OPTS = [
    ['all', 'Renew everything', `principal + interest → ${rupee(principal + unpaid)}`],
    ['interest_out', 'He takes the interest, principal renewed', `${rupee(unpaid)} paid to him → ${rupee(principal)}`],
    ['take', 'He takes some money out', 'enter how much he takes'],
    ['more', 'Renew everything and he adds more', 'enter the extra he adds'],
  ];
  return (
    <View style={s.summary}>
      <Text style={s.section}>THE TERM THAT ENDED</Text>
      <View style={s.card}>
        <Line label="Principal of the term" value={rupee(principal)} />
        <Line label="Interest paid so far" value={rupee(st.interest_paid)} />
        <Line label="Interest still unpaid" value={rupee(unpaid)} />
        <Line label="Principal + unpaid interest" value={rupee(principal + unpaid)} total />
      </View>
      {!!onRenewal && (
        <View style={s.choice}>
          <Text style={s.choiceHead}>HOW IS HE RENEWING?</Text>
          {OPTS.map(([k, label, hint]) => {
            const on = !custom && how === k;
            return (
              <View key={k} style={[s.choiceRow, s.choiceCol, on && s.choiceRowOn]}>
                <TouchableOpacity style={s.choiceTop} onPress={() => choose(k)}>
                  <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={18} color={on ? COLORS.link : COLORS.textSecondary} />
                  <Text style={s.choiceText}>{label}{'\n'}<Text style={s.choiceHint}>{hint}</Text></Text>
                </TouchableOpacity>
                {how === 'take' && k === 'take' && (
                  <TextInput style={s.choiceInput} keyboardType="decimal-pad" placeholder="Amount he takes (₹)" placeholderTextColor={COLORS.textTertiary}
                    value={take} onChangeText={(v) => { setTake(v); choose('take', v); }} />
                )}
                {how === 'more' && k === 'more' && (
                  <TextInput style={s.choiceInput} keyboardType="decimal-pad" placeholder="Extra he adds (₹)" placeholderTextColor={COLORS.textTertiary}
                    value={extra} onChangeText={(v) => { setExtra(v); choose('more', take, v); }} />
                )}
              </View>
            );
          })}
        </View>
      )}
      {next > 0 && (
        <View style={[s.card, s.outCard]}>
          <Line label="New amount invested" value={rupee(next)} total />
          <Line label="Principal renewed" value={rupee(Math.min(next, principal))} />
          {added > 0 && <Line label="Interest added into the renewal" value={rupee(added)} />}
          {fresh > 0 && <Line label="Fresh money he adds" value={rupee(fresh)} />}
          {toHim > 0 && <Line label="Interest paid to him" value={rupee(toHim)} />}
          {back > 0 && <Line label="Principal paid back to him" value={rupee(back)} />}
        </View>
      )}
      {next > 0 && (toHim + back) > 0 && !!onPayNow && (
        <View style={s.settle}>
          <Text style={s.settleText}>The {rupee(toHim + back)} he takes is paid to him at the renewal — this term is settled and nothing from it stays due.</Text>
          <TextInput style={s.choiceInput} placeholder="UTR / cheque no. (optional)" placeholderTextColor={COLORS.textTertiary}
            value={payNow?.notes || ''} onChangeText={(v) => onPayNow({ notes: v })} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  settle: { marginTop: 10, padding: 10, borderRadius: 10, backgroundColor: COLORS.successBg },
  settleText: { fontSize: 12.5, color: COLORS.textPrimary },
  wait: { minHeight: 380, alignItems: 'center', justifyContent: 'center' },
  choice: { marginTop: 10, gap: 6 },
  choiceHead: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, color: COLORS.textSecondary },
  choiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  choiceCol: { flexDirection: 'column', alignItems: 'stretch' },
  choiceTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  choiceInput: { marginTop: 8, marginLeft: 26, height: 40, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, fontSize: 14, color: COLORS.textPrimary, backgroundColor: COLORS.surface },
  choiceRowOn: { borderColor: COLORS.link, backgroundColor: COLORS.linkBg },
  choiceText: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  choiceHint: { fontWeight: '500', color: COLORS.textSecondary },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  quickBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  quickText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  outCard: { marginTop: 10 },
  payWhy: { fontSize: 10.5, color: COLORS.textSecondary, marginTop: 1 },
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

  // Partial redemption sheet: the LOI buttons and the submit bar.
  ok: { fontSize: 12, fontWeight: '700', color: COLORS.success, marginTop: 6 },
  loiBtn: { marginTop: 10, paddingVertical: 12, borderRadius: 14, alignItems: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.link },
  loiBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.link },
  submit: { marginTop: 18, height: 48, borderRadius: 16, alignItems: 'center',
    justifyContent: 'center', backgroundColor: COLORS.warning },
  submitOff: { opacity: 0.5 },
  submitText: { fontSize: 14, fontWeight: '800', color: COLORS.white },
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
