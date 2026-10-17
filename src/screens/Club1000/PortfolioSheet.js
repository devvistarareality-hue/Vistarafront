// One person's whole relationship with the club — same as the website's
// _PortfolioModal.js: every investment under their number and name (each renewal
// counted), the schemes, active and ever invested, paid out and still due, and the
// people they brought in with the reward earned for each.
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { CLUB1000_ENDPOINTS } from '../../constants/api';
import { COLORS } from '../../constants/theme';
import { formatDMY } from '../../utils/dateFormat';
import { errText } from '../../lib/apiError';
import FormSheet from '../../components/FormSheet';
import AppLoader from '../../components/AppLoader';

const rupee = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const STATUS = { active: 'Active', matured: 'Matured', redeemed: 'Redeemed', premature_redeemed: 'Redeemed early' };
const PAYOUT = { maturity: 'At maturity', monthly: 'Monthly', quarterly: 'Quarterly', half_yearly: 'Half-yearly', yearly: 'Yearly' };

export default function PortfolioSheet({ investorId, onClose }) {
  const [p, setP] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (!investorId) { setP(null); return undefined; }
    let alive = true;
    setP(null); setErr('');
    apiFetch(CLUB1000_ENDPOINTS.investorPortfolio(investorId))
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        if (r.ok) setP(d); else setErr(errText(d, 'Could not load the portfolio.'));
      })
      .catch(() => alive && setErr('Could not reach the server.'));
    return () => { alive = false; };
  }, [investorId]);
  if (!investorId) return null;
  const totalEver = p ? Number(p.total_invested) || 1 : 1;
  const due = p && Number(p.due_now) > 0;

  return (
    <FormSheet visible={!!investorId} onClose={onClose}>
      <View style={s.head}>
        <View style={s.flex}>
          <Text style={s.title}>Investor Portfolio{p?.awaiting_approval ? ` · ${p.awaiting_approval} awaiting` : ''}</Text>
          {!!p && <Text style={s.sub} numberOfLines={2}>{p.name} · {p.phone}{p.since ? ` · since ${formatDMY(p.since)}` : ''}</Text>}
        </View>
        <TouchableOpacity onPress={onClose} style={s.close}><Ionicons name="close" size={18} color={COLORS.textPrimary} /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.body}>
        {!p && !err && <AppLoader />}
        {!!err && <Text style={s.bad}>{err}</Text>}
        {p && <>
          <View style={s.stats}>
            <Stat label="TIMES INVESTED" value={String(p.times_invested)}
              note={`${p.investments} investment${p.investments === 1 ? '' : 's'}${p.renewals ? ` + ${p.renewals} renewal${p.renewals === 1 ? '' : 's'}` : ''}`} />
            <Stat label="SCHEMES" value={String(p.schemes.length)} note={p.schemes.map((x) => x.scheme).join(', ') || '—'} />
            <Stat label="ACTIVE NOW" value={rupee(p.active_amount)} note={`Ever invested ${rupee(p.total_invested)}`} />
            <Stat label="PAID OUT" value={rupee(p.paid_out)} note={`Interest ${rupee(p.interest_paid)}`} />
            <Stat label="STILL TO PAY" value={rupee(p.pending_payouts)} due={due}
              note={due ? `${rupee(p.due_now)} due now` : 'Nothing due today'} />
            <Stat label="PEOPLE REFERRED" value={String(p.referrals)} note={`Rewards ${rupee(p.rewards_earned)} · paid ${rupee(p.rewards_paid)}`} />
          </View>

          <Text style={s.section}>BY SCHEME</Text>
          {p.schemes.length === 0 && <Text style={s.help}>No approved investments yet.</Text>}
          {p.schemes.map((x) => (
            <View key={x.scheme} style={s.scheme}>
              <View style={s.rowBetween}>
                <Text style={s.strong}>{x.scheme}</Text>
                <Text style={s.muted}>{x.count}× · active {rupee(x.active)}</Text>
              </View>
              <View style={s.bar}><View style={[s.barFill, { width: `${Math.max(2, (Number(x.total) / totalEver) * 100)}%` }]} /></View>{/* inline-ok: share of everything invested */}
              <Text style={s.muted}>Ever invested {rupee(x.total)}</Text>
            </View>
          ))}

          <Text style={s.section}>INVESTMENTS ({p.history.length})</Text>
          {p.history.map((h) => {
            const wait = h.approval_status === 'pending';
            return (
              <View key={h.id} style={s.card}>
                <View style={s.rowBetween}>
                  <View style={s.flex}>
                    <Text style={s.strong}>{h.scheme}{h.renewal_count ? `  ·  Renewed ${h.renewal_count}×` : ''}</Text>
                    <Text style={s.muted}>{[h.loi_no, PAYOUT[h.interest_payout] || h.interest_payout, h.return_pct ? `${Number(h.return_pct)}%` : ''].filter(Boolean).join(' · ')}</Text>
                  </View>
                  <Text style={s.amt}>{rupee(h.amount)}</Text>
                </View>
                <Text style={s.muted}>{formatDMY(h.investment_date)} → {formatDMY(h.maturity_date)}</Text>
                <View style={[s.rowBetween, s.cardFoot]}>
                  <Text style={s.muted}>Paid <Text style={s.strongSm}>{rupee(h.paid_out)}</Text> · To pay <Text style={s.strongSm}>{rupee(h.pending)}</Text></Text>
                  <Text style={[s.badge, wait ? s.badgeWait : BADGE[h.status]]}>{wait ? 'Awaiting approval' : (STATUS[h.status] || h.status)}</Text>
                </View>
              </View>
            );
          })}

          <Text style={s.section}>PEOPLE REFERRED ({p.referred.length})</Text>
          {p.referred.length === 0 && <Text style={s.help}>Nobody has joined with {p.name} as their reference yet.</Text>}
          {p.referred.map((r) => (
            <View key={r.id} style={s.card}>
              <View style={s.rowBetween}>
                <View style={s.flex}>
                  <Text style={s.strong}>{r.name}</Text>
                  <Text style={s.muted}>{r.phone} · {r.scheme} · {formatDMY(r.investment_date)}</Text>
                </View>
                <Text style={s.amt}>{rupee(r.amount)}</Text>
              </View>
              {!!r.reward_status && (
                <View style={[s.rowBetween, s.cardFoot]}>
                  <Text style={s.muted}>Reward <Text style={s.strongSm}>{rupee(r.reward)}</Text></Text>
                  <Text style={[s.badge, r.reward_status === 'paid' ? s.badgeOk : s.badgeWait]}>{r.reward_status === 'paid' ? 'Paid' : 'Pending'}</Text>
                </View>
              )}
            </View>
          ))}
        </>}
      </ScrollView>
    </FormSheet>
  );
}

function Stat({ label, value, note, due }) {
  return (
    <View style={[s.stat, due && s.statDue]}>
      <Text style={s.statLbl}>{label}</Text>
      <Text style={s.statVal}>{value}</Text>
      {!!note && <Text style={[s.statNote, due && s.statNoteDue]} numberOfLines={2}>{note}</Text>}
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
  bad: { fontSize: 12.5, color: COLORS.error, marginTop: 8 },
  help: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { flexGrow: 1, flexBasis: '46%', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 10, backgroundColor: COLORS.surface },
  statDue: { borderColor: COLORS.warning, backgroundColor: COLORS.warningBg },
  statLbl: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: COLORS.textSecondary },
  statVal: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginTop: 3 },
  statNote: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  statNoteDue: { color: COLORS.warning, fontWeight: '700' },
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: COLORS.textSecondary, marginTop: 18, marginBottom: 8 },
  scheme: { marginBottom: 12, gap: 5 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  strong: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  strongSm: { fontWeight: '800', color: COLORS.textPrimary },
  muted: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  amt: { fontSize: 14.5, fontWeight: '800', color: COLORS.textPrimary },
  bar: { height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceAlt, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: COLORS.link },
  card: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, marginBottom: 8, backgroundColor: COLORS.surface },
  cardFoot: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  badge: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', backgroundColor: COLORS.surfaceAlt, color: COLORS.textSecondary },
  badgeOk: { backgroundColor: COLORS.successBg, color: COLORS.success },
  badgeWait: { backgroundColor: COLORS.warningBg, color: COLORS.warning },
  badgeDone: { backgroundColor: COLORS.linkBg, color: COLORS.link },
});

const BADGE = { active: s.badgeOk, redeemed: s.badgeDone, premature_redeemed: s.badgeDone };
