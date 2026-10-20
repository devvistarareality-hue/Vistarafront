// Club 1000 Payouts — AR Collections turned around: the company owes interest and
// principal TO investors. One card per investor (not one row per payout): what is
// overdue to them, what falls due next, what they have been paid, and a Pay sheet
// that settles any of their pending payouts at once. Same as the website.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, StatusBar, RefreshControl, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { can } from '../../lib/roles';
import { apiFetch } from '../../utils/apiFetch';
import { settledTo, settledRemark } from '../../lib/c1Settled';
import { CLUB1000_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { formatDMY } from '../../utils/dateFormat';
import { inrShort } from '../../lib/inr';
import AppLoader from '../../components/AppLoader';
import FormSheet from '../../components/FormSheet';
import MultiFilterSelect from '../../components/MultiFilterSelect';
import { errText } from '../../lib/apiError';
import { LedgerModal } from './Club1000InvestorsScreen';
import { isClub1000Manager } from '../../utils/club1000Access';
import { confirmAsk } from '../../lib/confirmAsk';
import PeriodFilter from '../../components/PeriodFilter';

const TYPE_LABELS = { interest: 'Interest', maturity: 'Principal', premature_redemption: 'Premature redemption' };
// An at-maturity payout is principal AND the term's interest in one payment.
const typeLabel = (p) => (p.maturity_split
  ? `Principal + interest · ${rupee(p.maturity_split.principal)} + ${rupee(p.maturity_split.interest)}`
  : (TYPE_LABELS[p.payout_type] || p.payout_type));
const DUE_SOON_DAYS = 30;
const rupee = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const iso = (d) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

// One row per investor, built from their payouts.
function byInvestor(payouts, today, soon) {
  const map = new Map();
  for (const p of payouts) {
    let r = map.get(p.investor);
    if (!r) {
      r = { id: p.investor, name: p.investor_name, phone: p.investor_phone, loi_no: p.investor_loi_no, scheme: p.scheme_name, pending: [], paid: [] };
      map.set(p.investor, r);
    }
    (p.status === 'paid' ? r.paid : r.pending).push(p);
  }
  for (const r of map.values()) {
    // By due date; on the same day interest comes before the principal it is paid with.
    const order = (a, b) => String(a.due_date).localeCompare(String(b.due_date))
      || (a.payout_type === 'maturity') - (b.payout_type === 'maturity');
    r.pending.sort(order);
    r.schedulePaid = [...r.paid].sort(order);
    r.paid.sort((a, b) => String(b.paid_date || '').localeCompare(String(a.paid_date || '')));
    r.overdue = r.pending.filter((p) => p.due_date < today);
    r.overdueAmt = r.overdue.reduce((t, p) => t + (Number(p.amount_due) || 0), 0);
    r.next = r.pending.find((p) => p.due_date >= today) || null;
    r.dueSoon = r.pending.filter((p) => p.due_date >= today && p.due_date <= soon);
    r.dueSoonAmt = r.dueSoon.reduce((t, p) => t + (Number(p.amount_due) || 0), 0);
    r.pendingAmt = r.pending.reduce((t, p) => t + (Number(p.amount_due) || 0), 0);
    r.paidAmt = r.paid.reduce((t, p) => t + (Number(p.paid_amount ?? p.amount_due) || 0), 0);
    r.daysLate = r.overdue.length ? Math.round((new Date(`${today}T00:00:00`) - new Date(`${r.overdue[0].due_date}T00:00:00`)) / 86400000) : 0;
  }
  return [...map.values()];
}

export default function Club1000PayoutsScreen({ navigation, route }) {
  const user = useSelector((s) => s.auth.user);
  const canPay = can(user, 'club.payout.mark_paid');
  const canUndo = canPay && isClub1000Manager(user);
  const initial = route?.params?.initialFilter;
  const [tab, setTab] = useState(initial === 'paid' ? 'paid' : initial === 'pending' || route?.params?.investorId ? 'pending' : 'overdue');
  // The Payout button on an investor's card opens here on just that investment.
  const [onlyInv, setOnlyInv] = useState(route?.params?.investorId || null);
  useEffect(() => {
    if (route?.params?.investorId) { setOnlyInv(route.params.investorId); setTab('pending'); }
  }, [route?.params?.investorId]);
  const [payouts, setPayouts] = useState(null);
  const [schemes, setSchemes] = useState([]);
  const [schemeSel, setSchemeSel] = useState([]);
  const [q, setQ] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });   // Year / Month / Quarter / dates
  const [kind, setKind] = useState('both');   // interest / principal / both
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState(null);
  const [ledgerFor, setLedgerFor] = useState(null);
  const [paidFor, setPaidFor] = useState(null);   // the investor whose paid payouts are listed

  const reqRef = useRef(0);
  const load = useCallback(async () => {
    const ticket = ++reqRef.current;
    try {
      const [res, sc] = await Promise.all([apiFetch(CLUB1000_ENDPOINTS.payouts), apiFetch(CLUB1000_ENDPOINTS.schemes)]);
      const rows = res.ok ? await res.json() : [];
      if (sc.ok) { const d = await sc.json(); setSchemes(Array.isArray(d) ? d : []); }
      if (ticket === reqRef.current) setPayouts(Array.isArray(rows) ? rows : []);
    } catch (_) {
      if (ticket === reqRef.current) setPayouts((p) => p || []);
    } finally {
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const today = iso(new Date());
  const soon = iso(new Date(Date.now() + DUE_SOON_DAYS * 86400000));
  // The period picked: unpaid payouts by due date, paid ones by paid date (same as the website).
  const inPeriod = (p) => {
    const d = String((p.status === 'paid' ? p.paid_date : p.due_date) || '').slice(0, 10);
    return (!range.from || d >= range.from) && (!range.to || d <= range.to)
      && (kind === 'both' || (kind === 'interest' ? p.payout_type === 'interest' : p.payout_type !== 'interest'));
  };
  const investors = useMemo(() => byInvestor((payouts || []).filter(inPeriod), today, soon),
    [payouts, today, soon, range.from, range.to, kind]);
  const scoped = investors.filter((r) => (!onlyInv || r.id === onlyInv) && (!schemeSel.length || schemeSel.includes(r.scheme))
    && (!q.trim() || `${r.name} ${r.phone} ${r.loi_no}`.toLowerCase().includes(q.trim().toLowerCase())));
  const lists = {
    overdue: scoped.filter((r) => r.overdue.length).sort((a, b) => b.daysLate - a.daysLate || b.overdueAmt - a.overdueAmt),
    upcoming: scoped.filter((r) => r.dueSoon.length).sort((a, b) => String(a.dueSoon[0].due_date).localeCompare(String(b.dueSoon[0].due_date))),
    pending: scoped.filter((r) => r.pending.length).sort((a, b) => b.pendingAmt - a.pendingAmt),
    paid: scoped.filter((r) => r.paid.length).sort((a, b) => String(b.paid[0].paid_date || '').localeCompare(String(a.paid[0].paid_date || ''))),
  };
  const rows = lists[tab];
  const sum = (list, k) => list.reduce((t, r) => t + r[k], 0);
  const TABS = [['overdue', `Overdue · ${lists.overdue.length}`], ['upcoming', `Due ${DUE_SOON_DAYS}d · ${lists.upcoming.length}`],
    ['pending', `Pending · ${lists.pending.length}`], ['paid', `Paid · ${lists.paid.length}`]];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}><Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} /></TouchableOpacity>
        <View style={s.flex}>
          <Text style={s.title}>Payouts</Text>
          <Text style={s.subtitle}>Owed to investors · as of {formatDMY(today)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {payouts === null ? <AppLoader style={s.loader} /> : <>
          <View style={s.kpis}>
            <Kpi tone="bad" label="Overdue to pay" value={inrShort(sum(lists.overdue, 'overdueAmt'))} sub={`${lists.overdue.length} investors`} />
            <Kpi tone="warn" label={`Due in ${DUE_SOON_DAYS} days`} value={inrShort(sum(lists.upcoming, 'dueSoonAmt'))} sub={`${lists.upcoming.length} investors`} />
            <Kpi tone="info" label="All pending" value={inrShort(sum(lists.pending, 'pendingAmt'))} sub={`${lists.pending.length} investors`} />
            <Kpi tone="good" label="Paid out" value={inrShort(sum(lists.paid, 'paidAmt'))} sub={`${lists.paid.length} investors`} />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
            {TABS.map(([k, label]) => (
              <TouchableOpacity key={k} onPress={() => setTab(k)} style={[s.tab, tab === k && s.tabOn]}>
                <Text style={[s.tabText, tab === k && s.tabTextOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.searchRow}>
            <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} />
            <TextInput value={q} onChangeText={setQ} placeholder="Search investor, phone or LOI no…" placeholderTextColor={COLORS.text3} style={s.search} />
          </View>
          {!!onlyInv && (
            <TouchableOpacity style={s.onlyChip} onPress={() => { setOnlyInv(null); navigation.setParams({ investorId: undefined }); }}>
              <Text style={s.onlyChipText} numberOfLines={1}>Only {investors.find((r) => r.id === onlyInv)?.name || 'this investor'}{investors.find((r) => r.id === onlyInv)?.loi_no ? ` · ${investors.find((r) => r.id === onlyInv).loi_no}` : ''}</Text>
              <Ionicons name="close" size={14} color={COLORS.warning} />
            </TouchableOpacity>
          )}
          <View style={s.filterRow}>
            <PeriodFilter value={range} onChange={setRange} anyLabel="Any date" />
          </View>
          <View style={s.kindRow}>
            {[['both', 'Int + Principal'], ['interest', 'Interest'], ['principal', 'Principal']].map(([k, label]) => (
              <TouchableOpacity key={k} onPress={() => setKind(k)} style={[s.kindBtn, kind === k && s.kindOn]}>
                <Text style={[s.kindText, kind === k && s.kindTextOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {schemes.length > 1 && (
            <View style={s.filterRow}>
              <MultiFilterSelect label="All Schemes" noun="schemes" value={schemeSel} onChange={setSchemeSel}
                options={schemes.map((sc) => ({ value: sc.name, label: sc.name }))} />
            </View>
          )}

          {rows.length === 0 ? (
            <View style={[s.card, s.empty]}><Text style={s.emptyText}>
              {tab === 'overdue' ? 'Nobody is waiting on a late payout.' : tab === 'upcoming' ? `Nothing falls due in the next ${DUE_SOON_DAYS} days.`
                : tab === 'paid' ? 'No payouts have been made yet.' : 'No payouts pending.'}
            </Text></View>
          ) : rows.map((r) => (
            <View key={r.id} style={[s.card, tab === 'overdue' && r.daysLate > 90 && s.cardLate]}>
              <View style={s.cardHead}>
                <View style={s.flex}>
                  <Text style={s.name} numberOfLines={2}>{r.name || '—'}</Text>
                  <View style={s.chips}>
                    <Text style={s.chip}>{r.scheme}</Text>
                    {!!r.loi_no && <Text style={s.chip}>{r.loi_no}</Text>}
                    {!!r.phone && <Text style={s.chip}>{r.phone}</Text>}
                  </View>
                </View>
                <View style={[s.age, r.overdue.length ? (r.daysLate > 90 ? s.ageBad : s.ageWarn) : s.ageInfo]}>
                  <Text style={[s.ageNum, r.overdue.length ? (r.daysLate > 90 ? s.ageNumBad : s.ageNumWarn) : s.ageNumInfo]}>
                    {r.overdue.length ? r.daysLate : r.pending.length || r.paid.length}
                  </Text>
                  <Text style={s.ageLabel}>{r.overdue.length ? 'DAYS LATE' : r.pending.length ? 'PENDING' : 'PAID'}</Text>
                </View>
              </View>

              <View style={s.figs}>
                <Fig label="OVERDUE" value={r.overdueAmt ? rupee(r.overdueAmt) : '—'} bad={!!r.overdueAmt}
                  sub={r.overdue.length ? `${r.overdue.length} since ${formatDMY(r.overdue[0].due_date)}` : 'Nothing late'} />
                <Fig label="NEXT PAYOUT" value={r.next ? rupee(r.next.amount_due) : '—'}
                  sub={r.next ? `${formatDMY(r.next.due_date)} · ${typeLabel(r.next)}` : 'None scheduled'} />
                <Fig label="PAID SO FAR" value={r.paidAmt ? rupee(r.paidAmt) : '—'}
                  sub={r.paid.length ? `Last ${formatDMY(r.paid[0].paid_date)}` : 'Nothing yet'} />
              </View>

              <View style={s.foot}>
                <Text style={[s.status, r.overdue.length ? s.statusBad : null]} numberOfLines={1}>
                  {r.pending.length ? `${rupee(r.pendingAmt)} still to pay` : 'All paid'}
                </Text>
                <TouchableOpacity onPress={() => setLedgerFor(r.id)} style={s.btn}><Text style={s.btnText}>Ledger</Text></TouchableOpacity>
                {r.paid.length > 0 && (
                  <TouchableOpacity onPress={() => setPaidFor(r.id)} style={s.btn}><Text style={s.btnText}>Paid ({r.paid.length})</Text></TouchableOpacity>
                )}
                {canPay && r.pending.length > 0 && (
                  <TouchableOpacity onPress={() => setPaying(r)} style={[s.btn, s.btnPrimary]}><Text style={s.btnPrimaryText}>Pay</Text></TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </>}
      </ScrollView>

      <PaySheet row={paying} today={today} onClose={() => setPaying(null)} onDone={() => { setPaying(null); load(); }} />
      <PaidSheet row={paidFor ? investors.find((x) => x.id === paidFor) || null : null} canUndo={canUndo}
        onClose={() => setPaidFor(null)} onChanged={load} />
      {!!ledgerFor && <LedgerModal investorId={ledgerFor} onClose={() => setLedgerFor(null)} />}
    </SafeAreaView>
  );
}

const TONE_STYLE = { bad: 'tone_bad', warn: 'tone_warn', info: 'tone_info', good: 'tone_good' };
function Kpi({ tone, label, value, sub }) {
  const toneStyle = s[TONE_STYLE[tone]];
  return (
    <View style={s.kpi}>
      <Text style={s.kpiLabel}>{label.toUpperCase()}</Text>
      <Text style={[s.kpiValue, toneStyle]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={s.kpiSub}>{sub}</Text>
    </View>
  );
}

function Fig({ label, value, sub, bad }) {
  return (
    <View style={s.fig}>
      <Text style={s.figLabel}>{label}</Text>
      <Text style={[s.figValue, bad && s.figBad]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={s.figSub} numberOfLines={2}>{sub}</Text>
    </View>
  );
}

// Settle any of one investor's pending payouts. Each payout carries its own target
// (what was due), the amount actually paid (the target unless changed), the date it
// was paid (today unless changed) and its own remarks. Late ones start ticked.
function PaySheet({ row, today, onClose, onDone }) {
  const [lines, setLines] = useState({});
  const [picking, setPicking] = useState(null);   // payout id whose date picker is open
  const [busy, setBusy] = useState(false);
  const [seededFor, setSeededFor] = useState(null);
  if (row && seededFor !== row.id) {
    setSeededFor(row.id);
    setLines(Object.fromEntries(row.pending.map((p) => [p.id, {
      on: p.due_date < today, amount: String(Number(p.amount_due) || 0),
      // A redemption is handed over on its redemption date, not the day it is recorded.
      date: p.payout_type === 'premature_redemption' && p.due_date && p.due_date <= today ? p.due_date : today, notes: '',
    }])));
  }
  if (!row) return null;
  const setLine = (id, patch) => setLines((l) => ({ ...l, [id]: { ...l[id], ...patch } }));
  const picked = row.pending.filter((p) => lines[p.id]?.on);
  const total = picked.reduce((t, p) => t + (Number(lines[p.id].amount) || 0), 0);
  const target = picked.reduce((t, p) => t + (Number(p.amount_due) || 0), 0);

  async function pay() {
    if (!picked.length) { Alert.alert('Nothing ticked', 'Tick at least one payout.'); return; }
    setBusy(true);
    let done = 0;
    for (const p of picked) {
      const l = lines[p.id];
      const res = await apiFetch(CLUB1000_ENDPOINTS.payoutMarkPaid(p.id), {
        method: 'POST', body: JSON.stringify({ amount: l.amount, paid_date: l.date, notes: l.notes }),
      }).catch(() => null);
      if (!res || !res.ok) {
        const d = res ? await res.json().catch(() => ({})) : {};
        Alert.alert('Could not finish', `${done} of ${picked.length} paid — ${errText(d, 'the next one could not be saved.')}`);
        setBusy(false);
        if (done) onDone();
        return;
      }
      done += 1;
    }
    setBusy(false);
    setSeededFor(null);
    Alert.alert('Paid', `${done} payout${done === 1 ? '' : 's'} marked paid · ${rupee(total)}`);
    onDone();
  }

  return (
    <FormSheet visible={!!row} onClose={onClose}>
      <View style={s.sheetHead}>
        <View style={s.flex}>
          <Text style={s.sheetTitle}>Pay investor</Text>
          <Text style={s.sheetSub} numberOfLines={1}>{row.name} · {row.scheme}{row.loi_no ? ` · ${row.loi_no}` : ''}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={s.back}><Ionicons name="close" size={18} color={COLORS.textPrimary} /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.sheetBody} keyboardShouldPersistTaps="handled">
        <Text style={s.section}>PENDING PAYOUTS</Text>
        {row.pending.map((p, i) => {
          const l = lines[p.id] || {};
          const head = p.term_label && (i === 0 || row.pending[i - 1].term_label !== p.term_label);
          const inTerm = head ? row.pending.filter((x) => x.term_label === p.term_label) : [];
          const on = !!l.on;
          const late = p.due_date < today;
          const gap = Number(l.amount) - Number(p.amount_due);
          return (
            <View key={p.id}>
            {!!head && (
              <TouchableOpacity style={s.termHead} onPress={() => { const all = inTerm.every((x) => lines[x.id]?.on); inTerm.forEach((x) => setLine(x.id, { on: !all })); }}>
                <Ionicons name={inTerm.every((x) => lines[x.id]?.on) ? 'checkbox' : 'square-outline'} size={18} color={COLORS.link} />
                <Text style={s.termHeadText}>{p.term_label}</Text>
                <Text style={s.termHeadSum}>{inTerm.length} · {rupee(inTerm.reduce((t, x) => t + (Number(x.amount_due) || 0), 0))}</Text>
              </TouchableOpacity>
            )}
            <View style={[s.payCard, !on && s.payCardOff]}>
              <TouchableOpacity onPress={() => setLine(p.id, { on: !on })} style={s.payTop}>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={20} color={on ? COLORS.link : COLORS.textSecondary} />
                <View style={s.flex}>
                  <Text style={s.payWhat}>{typeLabel(p)}{p.period ? ` · ${p.period.label}` : ''}</Text>
                {!!p.period && <Text style={s.payWhy}>{formatDMY(p.period.from)} – {formatDMY(p.period.to)} · {p.period.days} days × ₹{Number(p.period.per_day).toLocaleString('en-IN')}/day</Text>}
                  <Text style={[s.payWhen, late && s.payLate]}>Due {formatDMY(p.due_date)}{late ? ' · late' : ''}</Text>
                </View>
                <View style={s.payTarget}>
                  <Text style={s.payLbl}>TARGET</Text>
                  <Text style={s.payTargetAmt}>{rupee(p.amount_due)}</Text>
                </View>
              </TouchableOpacity>
              {on && (
                <View style={s.payFields}>
                  <View style={s.payPair}>
                    <View style={s.flex}>
                      <Text style={s.payLbl}>ACTUAL PAID (₹)</Text>
                      <TextInput value={l.amount} keyboardType="decimal-pad" onChangeText={(t) => setLine(p.id, { amount: t })} style={s.payInput} />
                    </View>
                    <View style={s.flex}>
                      <Text style={s.payLbl}>PAID ON</Text>
                      <TouchableOpacity onPress={() => setPicking(p.id)} style={s.payInput}>
                        <Text style={s.payDateText}>{formatDMY(l.date)}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {gap !== 0 && !Number.isNaN(gap) && <Text style={s.payDiff}>{gap < 0 ? `${rupee(Math.abs(gap))} stays due as a balance` : `More by ${rupee(gap)}`}</Text>}
                  <Text style={s.payLbl}>REMARKS</Text>
                  <TextInput value={l.notes} onChangeText={(t) => setLine(p.id, { notes: t })} placeholder="UTR / cheque no." placeholderTextColor={COLORS.text3} style={s.payInput} />
                </View>
              )}
            </View>
            </View>
          );
        })}
        {picking != null && lines[picking] && (
          <DateTimePicker value={new Date(`${lines[picking].date}T00:00:00`)} mode="date" maximumDate={new Date()}
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_, d) => { const id = picking; setPicking(null); if (d) setLine(id, { date: iso(d) }); }} />
        )}
        <View style={s.payTotal}>
          <Text style={s.payTotalText}>To pay now{picked.length ? ` · ${picked.length}` : ''}</Text>
          <View style={s.payTotalRight}>
            <Text style={s.payTotalText}>{rupee(total)}</Text>
            {picked.length > 0 && total !== target && <Text style={s.payDiff}>of {rupee(target)} due</Text>}
          </View>
        </View>
        <TouchableOpacity onPress={pay} disabled={busy || !picked.length} style={[s.payBtn, (busy || !picked.length) && s.dim]}>
          {busy ? <ActivityIndicator color={COLORS.btnText} /> : <Text style={s.payBtnText}>Mark {picked.length || ''} paid · {rupee(total)}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </FormSheet>
  );
}

// What has been paid to one investor, newest first. A payment marked by mistake can
// be undone (back to pending). Same as the website.
function PaidSheet({ row, canUndo, onClose, onChanged }) {
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null);   // { id, amount, date, notes }
  const [picking, setPicking] = useState(false);
  if (!row) return null;
  const today = iso(new Date());

  async function save() {
    const e = editing;
    if (e.amount === '' || Number.isNaN(Number(e.amount)) || Number(e.amount) < 0) { Alert.alert('Amount', 'Enter the amount paid.'); return; }
    setBusyId(e.id);
    const res = await apiFetch(CLUB1000_ENDPOINTS.payoutPayment(e.id), { method: 'PATCH', body: JSON.stringify({ amount: e.amount, paid_date: e.date, notes: e.notes }) }).catch(() => null);
    setBusyId(null);
    if (!res || !res.ok) { Alert.alert('Not saved', errText(res ? await res.json().catch(() => ({})) : {}, 'Please try again.')); return; }
    setEditing(null); onChanged();
  }

  async function remove(p) {
    const ok = await confirmAsk('Delete payment?',
      `Delete the ${rupee(p.paid_amount ?? p.amount_due)} payment of ${formatDMY(p.paid_date)}? ${typeLabel(p)}${p.period ? ` · ${p.period.label}` : ''} goes back to pending.`,
      'Delete', true);
    if (!ok) return;
    setBusyId(p.id);
    const res = await apiFetch(CLUB1000_ENDPOINTS.payoutPayment(p.id), { method: 'DELETE' }).catch(() => null);
    setBusyId(null);
    if (!res || !res.ok) { Alert.alert('Not deleted', errText(res ? await res.json().catch(() => ({})) : {}, 'Please try again.')); return; }
    onChanged();
  }

  const list = row.schedulePaid || row.paid;
  return (
    <FormSheet visible={!!row} onClose={onClose}>
      <View style={s.sheetHead}>
        <View style={s.flex}>
          <Text style={s.sheetTitle}>Paid payouts</Text>
          <Text style={s.sheetSub} numberOfLines={1}>{row.name} · {row.scheme}{row.loi_no ? ` · ${row.loi_no}` : ''}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={s.back}><Ionicons name="close" size={18} color={COLORS.textPrimary} /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.sheetBody} keyboardShouldPersistTaps="handled">
        <Text style={s.section}>PAID · {rupee(row.paidAmt)}</Text>
        {list.length === 0 && <Text style={s.payWhen}>Nothing paid.</Text>}
        {list.map((p, i) => {
          const ed = editing && editing.id === p.id ? editing : null;
          const head = p.term_label && (i === 0 || list[i - 1].term_label !== p.term_label);
          const inTerm = head ? list.filter((x) => x.term_label === p.term_label) : [];
          return (
          <View key={p.id}>
            {!!head && (
              <View style={s.termHead}>
                <Text style={s.termHeadText}>{p.term_label}</Text>
                <Text style={s.termHeadSum}>{inTerm.length} paid · {rupee(inTerm.reduce((t, x) => t + (Number(x.paid_amount ?? x.amount_due) || 0), 0))}</Text>
              </View>
            )}
            <View style={s.payCard}>
            <View style={s.payTop}>
              <View style={s.flex}>
                <Text style={s.payWhat}>{typeLabel(p)}{p.period ? ` · ${p.period.label}` : ''}</Text>
                {!!p.period && <Text style={s.payWhy}>{formatDMY(p.period.from)} – {formatDMY(p.period.to)} · {p.period.days} days × ₹{Number(p.period.per_day).toLocaleString('en-IN')}/day</Text>}
                <Text style={s.payWhen}>Due {formatDMY(p.due_date)} · target {rupee(p.amount_due)}</Text>
              </View>
              {!ed && (
                <View style={s.payTarget}>
                  <Text style={s.payTargetAmt}>{rupee(p.paid_amount ?? p.amount_due)}</Text>
                  <Text style={s.payWhen}>{p.paid_date ? formatDMY(p.paid_date) : '—'}</Text>
                  {!!settledTo(p.notes) && <Text style={s.settledTag}>{settledTo(p.notes)}</Text>}
                </View>
              )}
            </View>
            {!ed && !!(settledTo(p.notes) ? settledRemark(p.notes) : p.notes) && <Text style={s.paidNotes}>{settledTo(p.notes) ? settledRemark(p.notes) : p.notes}</Text>}
            {ed ? (
              <View style={s.payFields}>
                <Text style={s.payLbl}>ACTUAL PAID (₹)</Text>
                <TextInput value={ed.amount} keyboardType="decimal-pad" onChangeText={(t) => setEditing({ ...ed, amount: t })} style={s.payInput} />
                <Text style={s.payLbl}>PAID ON</Text>
                <TouchableOpacity onPress={() => setPicking(true)} style={s.payInput}><Text style={s.payDateText}>{formatDMY(ed.date)}</Text></TouchableOpacity>
                {picking && (
                  <DateTimePicker value={new Date(`${ed.date}T00:00:00`)} mode="date" maximumDate={new Date()}
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={(_, d) => { setPicking(false); if (d) setEditing({ ...ed, date: iso(d) }); }} />
                )}
                <Text style={s.payLbl}>REMARKS</Text>
                <TextInput value={ed.notes} onChangeText={(t) => setEditing({ ...ed, notes: t })} placeholder="UTR / cheque no." placeholderTextColor={COLORS.text3} style={s.payInput} />
                <View style={s.rowActs}>
                  <TouchableOpacity onPress={() => setEditing(null)} disabled={busyId === p.id} style={s.ghostBtn}><Text style={s.ghostText}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity onPress={save} disabled={busyId === p.id} style={s.saveBtn}>
                    {busyId === p.id ? <ActivityIndicator size="small" color={COLORS.btnTextSuccess} /> : <Text style={s.saveText}>Save</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            ) : canUndo && (
              <View style={s.rowActs}>
                <TouchableOpacity disabled={busyId === p.id || !!editing} style={s.ghostBtn}
                  onPress={() => setEditing({ id: p.id, amount: String(Number(p.paid_amount ?? p.amount_due) || 0), date: p.paid_date || today, notes: p.notes || '' })}>
                  <Text style={s.ghostText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(p)} disabled={busyId === p.id || !!editing} style={s.undoBtn}>
                  {busyId === p.id ? <ActivityIndicator size="small" color={COLORS.error} /> : <Text style={s.undoText}>Delete</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
            </View>
          );
        })}
      </ScrollView>
    </FormSheet>
  );
}

const s = StyleSheet.create({
  settledTag: { fontSize: 10.5, fontWeight: '800', color: COLORS.link, marginTop: 2 },
  termHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.linkBg },
  termHeadText: { flex: 1, fontSize: 12.5, fontWeight: '800', color: COLORS.link },
  termHeadSum: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  termTag: { alignSelf: 'flex-start', marginTop: 2, fontSize: 10.5, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, overflow: 'hidden', backgroundColor: COLORS.linkBg, color: COLORS.link },
  onlyChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.warningBg },
  onlyChipText: { fontSize: 12, fontWeight: '700', color: COLORS.warning, maxWidth: 260 },
  kindRow: { flexDirection: 'row', alignSelf: 'flex-start', padding: 3, borderRadius: 10, backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  kindBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  kindOn: { backgroundColor: COLORS.surface },
  kindText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  kindTextOn: { color: COLORS.link },
  payWhy: { fontSize: 10.5, color: COLORS.textSecondary, marginTop: 1 },
  paidNotes: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6 },
  rowActs: { flexDirection: 'row', gap: 8, marginTop: 10, justifyContent: 'flex-end' },
  ghostBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  ghostText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8, backgroundColor: COLORS.btnTintSuccess, borderWidth: 1, borderColor: COLORS.btnBorderSuccess, minWidth: 64, alignItems: 'center' },
  saveText: { fontSize: 12, fontWeight: '800', color: COLORS.btnTextSuccess },
  undoBtn: { minWidth: 64, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.errorBg, borderWidth: 1, borderColor: COLORS.error },
  undoText: { fontSize: 12, fontWeight: '700', color: COLORS.error },
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.screenBg, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  loader: { marginTop: 24 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  kpi: { flexGrow: 1, flexBasis: '46%', backgroundColor: COLORS.cardBg, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: COLORS.cardBorder, ...CARD_SHADOW },
  kpiLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4, color: COLORS.textSecondary },
  kpiValue: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  kpiSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  tone_bad: { color: COLORS.error }, tone_warn: { color: COLORS.warning }, tone_info: { color: COLORS.link }, tone_good: { color: COLORS.success },
  tabs: { gap: 8, paddingBottom: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.surfaceAlt },
  tabOn: { backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: COLORS.blue2 },
  tabText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  tabTextOn: { color: COLORS.link },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceAlt, borderRadius: 14, paddingHorizontal: 12, height: 40, marginBottom: 10 },
  search: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  filterRow: { flexDirection: 'row', marginBottom: 12 },
  card: { backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.cardBorder, ...CARD_SHADOW },
  cardLate: { borderColor: COLORS.error },
  empty: { alignItems: 'center', padding: 28 },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center' },
  cardHead: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  name: { fontSize: 15.5, fontWeight: '800', color: COLORS.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, backgroundColor: COLORS.surfaceAlt, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden' },
  age: { minWidth: 62, borderRadius: 14, paddingVertical: 6, paddingHorizontal: 8, alignItems: 'center' },
  ageBad: { backgroundColor: COLORS.errorBg }, ageWarn: { backgroundColor: COLORS.warningBg }, ageInfo: { backgroundColor: COLORS.accentSoft },
  ageNum: { fontSize: 17, fontWeight: '800' },
  ageNumBad: { color: COLORS.error }, ageNumWarn: { color: COLORS.warning }, ageNumInfo: { color: COLORS.link },
  ageLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 0.3 },
  figs: { flexDirection: 'row', gap: 8, marginTop: 12, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border },
  fig: { flex: 1, minWidth: 0 },
  figLabel: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.3, color: COLORS.textSecondary },
  figValue: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  figBad: { color: COLORS.error },
  figSub: { fontSize: 10.5, color: COLORS.textTertiary, marginTop: 1 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  status: { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  statusBad: { color: COLORS.error },
  btn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  btnText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  btnPrimary: { backgroundColor: COLORS.btnTint, borderColor: COLORS.btnBorder },
  btnPrimaryText: { fontSize: 13, fontWeight: '800', color: COLORS.btnText },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  sheetSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  sheetBody: { padding: 16, paddingBottom: 40 },
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: COLORS.link, marginBottom: 8, marginTop: 4 },
  payWhat: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  payWhen: { fontSize: 11.5, color: COLORS.textSecondary },
  payLate: { color: COLORS.error },
  payCard: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 10, marginBottom: 10, backgroundColor: COLORS.surface },
  payCardOff: { opacity: 0.6 },
  payTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  payTarget: { alignItems: 'flex-end' },
  payTargetAmt: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  payFields: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 4 },
  payPair: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  payLbl: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: COLORS.textSecondary, marginBottom: 3 },
  payInput: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, color: COLORS.textPrimary, backgroundColor: COLORS.cardBg, minHeight: 38, justifyContent: 'center' },
  payDateText: { fontSize: 13, color: COLORS.textPrimary },
  payDiff: { fontSize: 11, fontWeight: '700', color: COLORS.warning },
  payTotalRight: { alignItems: 'flex-end' },
  payTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border, marginBottom: 12 },
  payTotalText: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  payBtn: { backgroundColor: COLORS.btnTint, borderWidth: 1, borderColor: COLORS.btnBorder, borderRadius: 16, height: 48, alignItems: 'center', justifyContent: 'center' },
  payBtnText: { color: COLORS.btnText, fontSize: 15, fontWeight: '800' },
  dim: { opacity: 0.5 },
});
