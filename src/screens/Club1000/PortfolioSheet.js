// One mobile number's whole relationship with the club — same as the website's
// _PortfolioModal.js side panel: every investment under it (each renewal
// counted), the names it was entered under, active and ever invested, paid out and
// still due, and the people it brought in, in Investments / Referred / Schemes tabs.
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
const AV_TONES = [COLORS.linkBg, COLORS.warningBg, COLORS.successBg, COLORS.purpleBg, COLORS.errorBg, COLORS.surfaceAlt];

// Initials on a tone picked from the number, so a person keeps their colour.
export function Avatar({ name, seed, big = false }) {
  const words = String(name || '?').replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter(Boolean);
  const ini = ((words[0] || '?')[0] + (words[1] ? words[1][0] : '')).toUpperCase();
  const n = String(seed || name || '').split('').reduce((t, c) => t + c.charCodeAt(0), 0) % AV_TONES.length;
  return (
    <View style={[big ? s.avBig : s.av, AV_STYLE[n]]}>
      <Text style={big ? s.avTextBig : s.avText}>{ini}</Text>
    </View>
  );
}

const yearsSince = (d) => {
  if (!d) return '';
  const y = (Date.now() - new Date(d).getTime()) / (365.25 * 864e5);
  return y >= 1 ? `${Math.floor(y)} yr${Math.floor(y) === 1 ? '' : 's'}` : `${Math.max(1, Math.floor(y * 12))} mo`;
};

export default function PortfolioSheet({ investorId, onClose }) {
  const [p, setP] = useState(null);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('investments');
  const [allNames, setAllNames] = useState(false);
  useEffect(() => {
    if (!investorId) { setP(null); return undefined; }
    let alive = true;
    setP(null); setErr(''); setTab('investments');
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
  const paid = p ? Number(p.paid_out) : 0;
  const toPay = p ? Number(p.pending_payouts) : 0;
  const paidPct = paid + toPay > 0 ? (paid / (paid + toPay)) * 100 : 0;
  const ever = p ? Number(p.total_invested) || 1 : 1;
  const due = p && Number(p.due_now) > 0;
  const TABS = p ? [['investments', `Investments · ${p.history.length}`], ['referrals', `Referred · ${p.referred.length}`], ['schemes', `Schemes · ${p.schemes.length}`]] : [];

  return (
    <FormSheet visible={!!investorId} onClose={onClose}>
      <View style={s.closeRow}>
        <TouchableOpacity onPress={onClose} style={s.close}><Ionicons name="close" size={18} color={COLORS.textPrimary} /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.body}>
        {!p && !err ? <AppLoader /> : <View />}
        {err ? <Text style={s.bad}>{err}</Text> : <View />}
        {p ? (
          <View>
            <View style={s.hero}>
              <Avatar name={p.name} seed={p.phone} big />
              <View style={s.flex}>
                <Text style={s.name}>{p.name}</Text>
                <Text style={s.muted}>{p.phone}{p.email ? ` · ${p.email}` : ''}</Text>
                {!!p.since && <Text style={s.muted}>Investing since {formatDMY(p.since)} · {yearsSince(p.since)}</Text>}
              </View>
            </View>
            {p.names?.length > 1 && (
              <View style={s.names}>
                <Text style={s.muted}>Also under this number:</Text>
                {p.names.slice(1, allNames ? undefined : 5).map((n) => <Text key={n} style={s.nameChip}>{n}</Text>)}
                {p.names.length > 5 && (
                  <TouchableOpacity onPress={() => setAllNames((v) => !v)}>
                    <Text style={s.moreBtn}>{allNames ? 'Show less' : `+${p.names.length - 5} more`}</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {p.awaiting_approval > 0 && <Text style={s.await}>{p.awaiting_approval} awaiting approval</Text>}

            <View style={[s.bigBox, s.bigHero]}>
              <Text style={s.lbl}>ACTIVE NOW</Text>
              <Text style={s.bigVal}>{rupee(p.active_amount)}</Text>
            </View>
            <View style={s.twoUp}>
              <View style={s.bigBox}><Text style={s.lbl}>EVER INVESTED</Text><Text style={s.val}>{rupee(p.total_invested)}</Text></View>
              <View style={s.bigBox}>
                <Text style={s.lbl}>TIMES INVESTED</Text><Text style={s.val}>{p.times_invested}×</Text>
                <Text style={s.small}>{p.investments} investment{p.investments === 1 ? '' : 's'}{p.renewals ? ` + ${p.renewals} renewed` : ''}</Text>
              </View>
            </View>

            <View style={s.money}>
              <View style={s.piRow}>
                <Text style={s.piLbl} />
                <Text style={s.piHead}>PRINCIPAL</Text><Text style={s.piHead}>INTEREST</Text><Text style={s.piHead}>TOTAL</Text>
              </View>
              {[
                ['Amount', p.principal_total, p.interest_total, Number(p.principal_total) + Number(p.interest_total), false],
                ['Paid out', p.principal_paid, p.interest_paid, paid, true],
                ['To pay', p.principal_pending, p.interest_pending, toPay, false],
              ].map(([label, a, b, c, ok]) => (
                <View key={label} style={s.piRow}>
                  <Text style={s.piLbl}>{label}</Text>
                  <Text style={[s.piVal, ok && s.piOk]}>{rupee(a)}</Text>
                  <Text style={[s.piVal, ok && s.piOk]}>{rupee(b)}</Text>
                  <Text style={[s.piVal, s.piTotal, ok && s.piOk]}>{rupee(c)}</Text>
                </View>
              ))}
              <View style={s.split}><View style={[s.splitFill, { width: `${paidPct}%` }]} /></View>{/* inline-ok: paid share of all payouts */}
              <Text style={due ? s.dueNote : s.okNote}>{due ? `⏱ ${rupee(p.due_now)} is due now — date passed, not yet paid` : '✓ Nothing due today'}</Text>
              <View style={s.refLine}>
                <Ionicons name="people-outline" size={14} color={COLORS.link} />
                <Text style={s.muted}>Brought in <Text style={s.strong}>{p.referrals}</Text> · rewards {rupee(p.rewards_earned)} (paid {rupee(p.rewards_paid)})</Text>
              </View>
            </View>
          </View>
        ) : <View />}

        {p ? (
          <View style={s.tabs}>
            {TABS.map(([k, label]) => (
              <TouchableOpacity key={k} onPress={() => setTab(k)} style={[s.tab, tab === k && s.tabOn]}>
                <Text style={[s.tabText, tab === k && s.tabTextOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : <View />}

        {p && tab === 'investments' && p.history.map((h) => {
          const wait = h.approval_status === 'pending';
          return (
            <View key={h.id} style={s.inv}>
              <View style={s.invDate}>
                <Text style={s.invDateTop}>{formatDMY(h.investment_date).slice(0, 5)}</Text>
                <Text style={s.small}>{String(h.investment_date).slice(0, 4)}</Text>
              </View>
              <View style={s.flex}>
                <View style={s.invTop}>
                  <Text style={s.strong}>{h.scheme}</Text>
                  {h.renewal_count > 0 && <Text style={s.tag}>Renewed {h.renewal_count}×</Text>}
                  <View style={s.flex} />
                  <Text style={[s.badge, wait ? s.badgeWait : BADGE[h.status]]}>{wait ? 'Awaiting' : (STATUS[h.status] || h.status)}</Text>
                </View>
                <Text style={s.small}>
                  {[p.names?.length > 1 ? h.name : '', h.loi_no, PAYOUT[h.interest_payout] || h.interest_payout, h.return_pct ? `${Number(h.return_pct)}%` : '', `matures ${formatDMY(h.maturity_date)}`].filter(Boolean).join(' · ')}
                  {h.renewal_count > 0 && h.first_invested_on && h.first_invested_on !== h.investment_date ? ` · first in ${formatDMY(h.first_invested_on)}` : ''}
                </Text>
                <Text style={s.small}>Principal <Text style={s.strongSm}>{rupee(h.principal)}</Text> · Interest <Text style={s.strongSm}>{rupee(h.interest)}</Text></Text>
                <Text style={s.small}>Paid · P <Text style={s.strongSm}>{rupee(h.principal_paid)}</Text> · I <Text style={s.strongSm}>{rupee(h.interest_paid)}</Text>   To pay · P <Text style={s.strongSm}>{rupee(h.principal_pending)}</Text> · I <Text style={s.strongSm}>{rupee(h.interest_pending)}</Text></Text>
              </View>
            </View>
          );
        })}

        {p && tab === 'referrals' && (p.referred.length === 0
          ? <Text style={s.help}>Nobody has joined with this number as their reference yet.</Text>
          : p.referred.map((r) => (
            <View key={r.id} style={s.refRow}>
              <Avatar name={r.name} seed={r.phone} />
              <View style={s.flex}>
                <Text style={s.strong} numberOfLines={1}>{r.name}</Text>
                <Text style={s.small}>{r.phone} · {r.scheme} · joined {formatDMY(r.investment_date)}</Text>
              </View>
              <View style={s.refAmt}>
                <Text style={s.strong}>{rupee(r.amount)}</Text>
                {r.reward_status
                  ? <Text style={[s.badge, r.reward_status === 'paid' ? s.badgeOk : s.badgeWait]}>{rupee(r.reward)} · {r.reward_status === 'paid' ? 'Paid' : 'Pending'}</Text>
                  : <Text style={s.small}>no reward</Text>}
              </View>
            </View>
          )))}

        {p && tab === 'schemes' && p.schemes.map((x) => (
          <View key={x.scheme} style={s.scheme}>
            <View style={s.rowBetween}>
              <Text style={s.strong}>{x.scheme}</Text>
              <Text style={s.small}>{x.count}× · active {rupee(x.active)}</Text>
            </View>
            <View style={s.bar}><View style={[s.barFill, { width: `${Math.max(2, (Number(x.total) / ever) * 100)}%` }]} /></View>{/* inline-ok: share of everything invested */}
            <Text style={s.small}>Ever invested {rupee(x.total)}</Text>
          </View>
        ))}
      </ScrollView>
    </FormSheet>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  closeRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingTop: 4 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.screenBg, justifyContent: 'center', alignItems: 'center' },
  body: { paddingHorizontal: 16, paddingBottom: 30 },
  bad: { fontSize: 12.5, color: COLORS.error, marginTop: 8 },
  help: { fontSize: 12, color: COLORS.textSecondary, marginTop: 10 },
  hero: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  name: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  muted: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  small: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 2 },
  strong: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  strongSm: { fontWeight: '800', color: COLORS.textPrimary },
  names: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 5, marginTop: 10 },
  nameChip: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, overflow: 'hidden', backgroundColor: COLORS.surfaceAlt, color: COLORS.textPrimary },
  moreBtn: { fontSize: 11.5, fontWeight: '800', color: COLORS.link, paddingHorizontal: 4 },
  await: { alignSelf: 'flex-start', marginTop: 8, fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', backgroundColor: COLORS.warningBg, color: COLORS.warning },
  bigBox: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12, backgroundColor: COLORS.surface },
  bigHero: { marginTop: 14, backgroundColor: COLORS.linkBg, borderColor: COLORS.linkBg },
  twoUp: { flexDirection: 'row', gap: 8, marginTop: 8 },
  lbl: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: COLORS.textSecondary },
  bigVal: { fontSize: 24, fontWeight: '800', color: COLORS.link, marginTop: 3 },
  val: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginTop: 3 },
  money: { marginTop: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12, backgroundColor: COLORS.surface, gap: 6 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  piRow: { flexDirection: 'row', alignItems: 'center' },
  piLbl: { width: 62, fontSize: 11.5, color: COLORS.textSecondary },
  piHead: { flex: 1, textAlign: 'right', fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4, color: COLORS.textSecondary },
  piVal: { flex: 1, textAlign: 'right', fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  piTotal: { fontWeight: '800' },
  piOk: { color: COLORS.success },
  split: { height: 8, borderRadius: 4, backgroundColor: COLORS.warningBg, overflow: 'hidden' },
  splitFill: { height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  dueNote: { fontSize: 12, fontWeight: '700', color: COLORS.warning },
  okNote: { fontSize: 12, fontWeight: '700', color: COLORS.success },
  refLine: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  tabs: { flexDirection: 'row', gap: 6, paddingVertical: 10, marginTop: 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9 },
  tabOn: { backgroundColor: COLORS.linkBg },
  tabText: { fontSize: 12.5, fontWeight: '700', color: COLORS.textSecondary },
  tabTextOn: { color: COLORS.link },
  inv: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  invDate: { width: 50, alignItems: 'center', paddingVertical: 6, borderRadius: 10, backgroundColor: COLORS.surfaceAlt, alignSelf: 'flex-start' },
  invDateTop: { fontSize: 12.5, fontWeight: '800', color: COLORS.textPrimary },
  invTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tag: { fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden', backgroundColor: COLORS.warningBg, color: COLORS.warning },
  badge: { fontSize: 10.5, fontWeight: '700', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', backgroundColor: COLORS.surfaceAlt, color: COLORS.textSecondary },
  badgeOk: { backgroundColor: COLORS.successBg, color: COLORS.success },
  badgeWait: { backgroundColor: COLORS.warningBg, color: COLORS.warning },
  badgeDone: { backgroundColor: COLORS.linkBg, color: COLORS.link },
  refRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  refAmt: { alignItems: 'flex-end', gap: 4 },
  scheme: { paddingVertical: 10, gap: 5 },
  bar: { height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceAlt, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, backgroundColor: COLORS.link },
  av: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avBig: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avText: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  avTextBig: { fontSize: 19, fontWeight: '800', color: COLORS.textPrimary },
  av0: { backgroundColor: AV_TONES[0] }, av1: { backgroundColor: AV_TONES[1] }, av2: { backgroundColor: AV_TONES[2] },
  av3: { backgroundColor: AV_TONES[3] }, av4: { backgroundColor: AV_TONES[4] }, av5: { backgroundColor: AV_TONES[5] },
});

const BADGE = { active: s.badgeOk, redeemed: s.badgeDone, premature_redeemed: s.badgeDone };
const AV_STYLE = [s.av0, s.av1, s.av2, s.av3, s.av4, s.av5];
