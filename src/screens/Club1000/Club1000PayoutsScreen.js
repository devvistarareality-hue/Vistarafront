// Club 1000 Payouts — AR Collections turned around: the company owes interest and
// principal TO investors. One card per investor (not one row per payout): what is
// overdue to them, what falls due next, what they have been paid, and a Pay sheet
// that settles any of their pending payouts at once. Same as the website.
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, StatusBar, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { can } from '../../lib/roles';
import { apiFetch } from '../../utils/apiFetch';
import { CLUB1000_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { formatDMY } from '../../utils/dateFormat';
import { inrShort } from '../../lib/inr';
import AppLoader from '../../components/AppLoader';
import FormSheet from '../../components/FormSheet';
import MultiFilterSelect from '../../components/MultiFilterSelect';
import { errText } from '../../lib/apiError';
import { LedgerModal } from './Club1000InvestorsScreen';

const TYPE_LABELS = { interest: 'Interest', maturity: 'Principal', premature_redemption: 'Premature redemption' };
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
    r.pending.sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
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
  const initial = route?.params?.initialFilter;
  const [tab, setTab] = useState(initial === 'paid' ? 'paid' : initial === 'pending' ? 'pending' : 'overdue');
  const [payouts, setPayouts] = useState(null);
  const [schemes, setSchemes] = useState([]);
  const [schemeSel, setSchemeSel] = useState([]);
  const [q, setQ] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState(null);
  const [ledgerFor, setLedgerFor] = useState(null);

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
  const investors = useMemo(() => byInvestor(payouts || [], today, soon), [payouts, today, soon]);
  const scoped = investors.filter((r) => (!schemeSel.length || schemeSel.includes(r.scheme))
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
                  sub={r.next ? `${formatDMY(r.next.due_date)} · ${TYPE_LABELS[r.next.payout_type] || r.next.payout_type}` : 'None scheduled'} />
                <Fig label="PAID SO FAR" value={r.paidAmt ? rupee(r.paidAmt) : '—'}
                  sub={r.paid.length ? `Last ${formatDMY(r.paid[0].paid_date)}` : 'Nothing yet'} />
              </View>

              <View style={s.foot}>
                <Text style={[s.status, r.overdue.length ? s.statusBad : null]} numberOfLines={1}>
                  {r.pending.length ? `${rupee(r.pendingAmt)} still to pay` : 'All paid'}
                </Text>
                <TouchableOpacity onPress={() => setLedgerFor(r.id)} style={s.btn}><Text style={s.btnText}>Ledger</Text></TouchableOpacity>
                {canPay && r.pending.length > 0 && (
                  <TouchableOpacity onPress={() => setPaying(r)} style={[s.btn, s.btnPrimary]}><Text style={s.btnPrimaryText}>Pay</Text></TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </>}
      </ScrollView>

      <PaySheet row={paying} today={today} onClose={() => setPaying(null)} onDone={() => { setPaying(null); load(); }} />
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

// Settle any of one investor's pending payouts: late ones ticked to start with, each
// amount adjustable, one note for all.
function PaySheet({ row, today, onClose, onDone }) {
  const [sel, setSel] = useState({});
  const [amounts, setAmounts] = useState({});
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [seededFor, setSeededFor] = useState(null);
  if (row && seededFor !== row.id) {
    setSeededFor(row.id);
    setSel(Object.fromEntries(row.pending.map((p) => [p.id, p.due_date < today])));
    setAmounts(Object.fromEntries(row.pending.map((p) => [p.id, String(Number(p.amount_due) || 0)])));
    setNotes('');
  }
  if (!row) return null;
  const picked = row.pending.filter((p) => sel[p.id]);
  const total = picked.reduce((t, p) => t + (Number(amounts[p.id]) || 0), 0);

  async function pay() {
    if (!picked.length) { Alert.alert('Nothing ticked', 'Tick at least one payout.'); return; }
    setBusy(true);
    let done = 0;
    for (const p of picked) {
      const res = await apiFetch(CLUB1000_ENDPOINTS.payoutMarkPaid(p.id), { method: 'POST', body: JSON.stringify({ amount: amounts[p.id], notes }) }).catch(() => null);
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
      <ScrollView contentContainerStyle={s.sheetBody}>
        <Text style={s.section}>PENDING PAYOUTS</Text>
        {row.pending.map((p) => {
          const on = !!sel[p.id];
          return (
            <View key={p.id} style={s.payRow}>
              <TouchableOpacity onPress={() => setSel((x) => ({ ...x, [p.id]: !on }))} style={s.payTick}>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={20} color={on ? COLORS.link : COLORS.textSecondary} />
              </TouchableOpacity>
              <View style={s.flex}>
                <Text style={s.payWhat}>{TYPE_LABELS[p.payout_type] || p.payout_type}</Text>
                <Text style={[s.payWhen, p.due_date < today && s.payLate]}>Due {formatDMY(p.due_date)}{p.due_date < today ? ' · late' : ''}</Text>
              </View>
              <TextInput value={amounts[p.id]} editable={on} keyboardType="decimal-pad"
                onChangeText={(t) => setAmounts((a) => ({ ...a, [p.id]: t }))} style={[s.payAmt, !on && s.payAmtOff]} />
            </View>
          );
        })}
        <View style={s.payTotal}><Text style={s.payTotalText}>To pay now</Text><Text style={s.payTotalText}>{rupee(total)}</Text></View>
        <Text style={s.section}>NOTES</Text>
        <TextInput value={notes} onChangeText={setNotes} placeholder="Cheque / UTR no., bank…" placeholderTextColor={COLORS.text3} style={s.notes} />
        <TouchableOpacity onPress={pay} disabled={busy || !picked.length} style={[s.payBtn, (busy || !picked.length) && s.dim]}>
          {busy ? <ActivityIndicator color={COLORS.btnText} /> : <Text style={s.payBtnText}>Mark {picked.length || ''} paid · {rupee(total)}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </FormSheet>
  );
}

const s = StyleSheet.create({
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
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: COLORS.border },
  payTick: { padding: 2 },
  payWhat: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  payWhen: { fontSize: 11.5, color: COLORS.textSecondary },
  payLate: { color: COLORS.error },
  payAmt: { width: 110, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: COLORS.textPrimary, textAlign: 'right', backgroundColor: COLORS.surface },
  payAmtOff: { opacity: 0.5 },
  payTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border, marginBottom: 12 },
  payTotalText: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  notes: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary, backgroundColor: COLORS.surface, marginBottom: 16 },
  payBtn: { backgroundColor: COLORS.btnTint, borderWidth: 1, borderColor: COLORS.btnBorder, borderRadius: 16, height: 48, alignItems: 'center', justifyContent: 'center' },
  payBtnText: { color: COLORS.btnText, fontSize: 15, fontWeight: '800' },
  dim: { opacity: 0.5 },
});
