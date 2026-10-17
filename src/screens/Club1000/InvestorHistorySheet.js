// One investment's life from the start, newest first — same as the website's
// _HistoryModal.js: added, approved, revisions and renewals, payouts paid and undone,
// referral rewards, redemption and closing.
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

const KIND = {
  added: ['person-add-outline', 'accent'], approve: ['checkmark', 'good'], reject: ['close', 'bad'],
  revise: ['create-outline', 'accent'], 'revise-approve': ['checkmark', 'good'], 'revise-reject': ['close', 'bad'],
  renew: ['refresh', 'warn'], 'renew-approve': ['refresh', 'good'], 'renew-reject': ['close', 'bad'],
  paid: ['checkmark-done', 'good'], undo: ['arrow-undo', 'bad'], reward: ['gift-outline', 'accent'], 'reward-paid': ['gift', 'good'],
  redeem: ['exit-outline', 'warn'], closed: ['flag-outline', 'accent'],
};
const FILTERS = [['all', 'Everything'], ['terms', 'Terms'], ['money', 'Payments'], ['rewards', 'Rewards']];
const IN_FILTER = {
  terms: (k) => /^(added|approve|reject|revise|renew|redeem|closed)/.test(k),
  money: (k) => k === 'paid' || k === 'undo',
  rewards: (k) => k.startsWith('reward'),
};

export default function InvestorHistorySheet({ investor, onClose }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    if (!investor) { setData(null); return undefined; }
    let alive = true;
    setData(null); setErr(''); setFilter('all');
    apiFetch(CLUB1000_ENDPOINTS.investorHistory(investor.id))
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        if (r.ok) setData(d); else setErr(errText(d, 'Could not load the history.'));
      })
      .catch(() => alive && setErr('Could not reach the server.'));
    return () => { alive = false; };
  }, [investor]);
  if (!investor) return null;
  const events = (data?.events || []).filter((e) => filter === 'all' || IN_FILTER[filter](e.kind));

  return (
    <FormSheet visible={!!investor} onClose={onClose}>
      <View style={s.head}>
        <View style={s.flex}>
          <Text style={s.title}>History{data?.renewal_count ? ` · Renewed ${data.renewal_count}×` : ''}</Text>
          <Text style={s.sub} numberOfLines={1}>{investor.name} · {investor.scheme_name || ''}{investor.loi_no ? ` · ${investor.loi_no}` : ''}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={s.close}><Ionicons name="close" size={18} color={COLORS.textPrimary} /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.body}>
        {!data && !err && <AppLoader />}
        {!!err && <Text style={s.bad}>{err}</Text>}
        {data && <>
          <View style={s.stats}>
            <View style={s.stat}><Text style={s.statLbl}>CURRENT TERM</Text><Text style={s.statVal}>{formatDMY(data.term.from)} → {formatDMY(data.term.to)}</Text></View>
            <View style={s.stat}><Text style={s.statLbl}>RENEWALS</Text><Text style={s.statVal}>{data.renewal_count}</Text></View>
            <View style={s.stat}><Text style={s.statLbl}>REVISIONS</Text><Text style={s.statVal}>{data.revision_count}</Text></View>
            <View style={s.stat}><Text style={s.statLbl}>PAID OUT</Text><Text style={s.statVal}>{rupee(data.paid_total)}</Text></View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll} contentContainerStyle={s.chips}>
            {FILTERS.map(([k, label]) => (
              <TouchableOpacity key={k} onPress={() => setFilter(k)} style={[s.chip, filter === k && s.chipOn]}>
                <Text style={[s.chipText, filter === k && s.chipTextOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {events.length === 0 && <Text style={s.help}>Nothing here yet.</Text>}
          {events.map((e, i) => {
            const [icon, tone] = KIND[e.kind] || ['ellipse-outline', 'muted'];
            return (
              <View key={i} style={s.item}>
                <View style={[s.dot, DOT_STYLE[tone]]}><Ionicons name={icon} size={15} color={TONE_FG[tone]} /></View>
                <View style={s.flex}>
                  <Text style={s.itemTitle}>{e.title}{e.amount != null ? ` · ${rupee(e.amount)}` : ''}</Text>
                  {!!e.detail && <Text style={s.itemDetail}>{e.detail}</Text>}
                  <Text style={s.itemMeta}>{formatDMY(String(e.at).slice(0, 10))}{e.by ? ` · ${e.by}` : ''}</Text>
                </View>
              </View>
            );
          })}
        </>}
      </ScrollView>
    </FormSheet>
  );
}

const TONE_FG = { good: COLORS.success, bad: COLORS.error, warn: COLORS.warning, accent: COLORS.link, muted: COLORS.textSecondary };

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.screenBg, justifyContent: 'center', alignItems: 'center' },
  body: { paddingHorizontal: 16, paddingBottom: 30 },
  bad: { fontSize: 12.5, color: COLORS.error, marginTop: 8 },
  help: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { flexGrow: 1, flexBasis: '46%', borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 10, backgroundColor: COLORS.surface },
  statLbl: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: COLORS.textSecondary },
  statVal: { fontSize: 13.5, fontWeight: '800', color: COLORS.textPrimary, marginTop: 3 },
  chipScroll: { flexGrow: 0, flexShrink: 0, marginTop: 12, marginBottom: 6 },
  chips: { gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, minHeight: 32, justifyContent: 'center', borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipOn: { backgroundColor: COLORS.link, borderColor: COLORS.link },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  chipTextOn: { color: '#fff' },
  item: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceAlt },
  dot_good: { backgroundColor: COLORS.successBg },
  dot_bad: { backgroundColor: COLORS.errorBg },
  dot_warn: { backgroundColor: COLORS.warningBg },
  dot_accent: { backgroundColor: COLORS.linkBg },
  dot_muted: { backgroundColor: COLORS.surfaceAlt },
  itemTitle: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  itemDetail: { fontSize: 12, color: COLORS.textPrimary, marginTop: 2 },
  itemMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
});

// Dot colour per tone (a lookup, so no style is built inline).
const DOT_STYLE = { good: s.dot_good, bad: s.dot_bad, warn: s.dot_warn, accent: s.dot_accent, muted: s.dot_muted };
