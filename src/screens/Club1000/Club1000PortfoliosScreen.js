// Investor Portfolios — one card per person (same number and name), however many
// investments, renewals and schemes they hold; tap a card for the full portfolio.
// Same as the website's club1000/portfolios page.
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StatusBar, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { CLUB1000_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { formatDMY } from '../../utils/dateFormat';
import { errText } from '../../lib/apiError';
import AppLoader from '../../components/AppLoader';
import FilterSelect from '../../components/FilterSelect';
import PortfolioSheet from './PortfolioSheet';

const rupee = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const SORTS = [
  ['active', 'Biggest active holding', (r) => -Number(r.active_amount)],
  ['times', 'Most times invested', (r) => -r.times_invested],
  ['referrals', 'Most people referred', (r) => -r.referrals],
  ['since', 'Longest with us', (r) => String(r.since || '9999')],
];

export default function Club1000PortfoliosScreen({ navigation }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [scheme, setScheme] = useState('');
  const [sort, setSort] = useState('active');
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await apiFetch(CLUB1000_ENDPOINTS.portfolios);
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setRows(d); setErr(''); } else { setErr(errText(d, 'Could not load portfolios.')); setRows([]); }
    } catch { setErr('Could not reach the server.'); setRows((x) => x || []); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const schemes = useMemo(() => [...new Set((rows || []).flatMap((r) => r.schemes.map((x) => x.scheme)))].sort(), [rows]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    const by = SORTS.find((x) => x[0] === sort)[2];
    return (rows || [])
      .filter((r) => !q || (r.name || '').toLowerCase().includes(q) || (digits && String(r.phone || '').replace(/\D/g, '').includes(digits)))
      .filter((r) => !scheme || r.schemes.some((x) => x.scheme === scheme))
      .sort((a, b) => (by(a) < by(b) ? -1 : by(a) > by(b) ? 1 : 0));
  }, [rows, search, scheme, sort]);
  const active = (rows || []).reduce((t, r) => t + Number(r.active_amount), 0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.screenBg} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={s.flex}>
          <Text style={s.title}>Investor Portfolios</Text>
          {!!rows && <Text style={s.sub}>{rows.length} investor{rows.length === 1 ? '' : 's'} · {rupee(active)} active</Text>}
        </View>
      </View>

      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Search by name or mobile"
          placeholderTextColor={COLORS.text3} style={s.searchInput} returnKeyType="search" />
        {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={COLORS.textSecondary} /></TouchableOpacity> : null}
      </View>
      <View style={s.filters}>
        <FilterSelect label="Scheme" value={scheme} onChange={setScheme}
          options={[{ value: '', label: 'All schemes' }, ...schemes.map((x) => ({ value: x, label: x }))]} />
        <FilterSelect label="Sort" value={sort === 'active' ? '' : sort} onChange={(v) => setSort(v || 'active')}
          options={SORTS.map(([k, label]) => ({ value: k === 'active' ? '' : k, label }))} />
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        {!!err && <Text style={s.bad}>{err}</Text>}
        {!rows ? <AppLoader /> : shown.length === 0 ? (
          <Text style={s.empty}>{rows.length ? 'No one matches these filters.' : 'No investors yet.'}</Text>
        ) : shown.map((r) => (
          <TouchableOpacity key={r.id} activeOpacity={0.85} onPress={() => setOpen(r.id)} style={s.card}>
            <View style={s.cardHead}>
              <View style={s.flex}>
                <Text style={s.name}>{r.name}</Text>
                <Text style={s.phone}>{r.phone}{r.since ? ` · since ${formatDMY(r.since)}` : ''}</Text>
              </View>
              <View style={s.amtWrap}>
                <Text style={s.amt}>{rupee(r.active_amount)}</Text>
                <Text style={s.amtLbl}>ACTIVE</Text>
              </View>
            </View>
            <View style={s.chips}>
              <Text style={s.chip}>↻ {r.times_invested}× invested</Text>
              <Text style={s.chip}>{r.schemes.length} scheme{r.schemes.length === 1 ? '' : 's'}</Text>
              <Text style={[s.chip, r.referrals > 0 && s.chipRef]}>{r.referrals} referred</Text>
              {Number(r.due_now) > 0 && <Text style={[s.chip, s.chipDue]}>{rupee(r.due_now)} due</Text>}
            </View>
            <View style={s.foot}>
              <Text style={s.footTxt}>Ever <Text style={s.footB}>{rupee(r.total_invested)}</Text>  ·  Paid out <Text style={s.footB}>{rupee(r.paid_out)}</Text></Text>
              <Text style={s.footTxt} numberOfLines={1}>{r.schemes.map((x) => x.scheme).join(' · ')}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <PortfolioSheet investorId={open} onClose={() => setOpen(null)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.screenBg, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, paddingHorizontal: 12, height: 42, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  searchInput: { flex: 1, fontSize: 13.5, color: COLORS.textPrimary },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 10 },
  list: { padding: 16, paddingBottom: 40 },
  bad: { fontSize: 12.5, color: COLORS.error, marginBottom: 8 },
  empty: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 30 },
  card: { backgroundColor: COLORS.cardBg, borderRadius: 18, ...CARD_SHADOW, borderWidth: 1, borderColor: COLORS.cardBorder, padding: 14, marginBottom: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  phone: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  amtWrap: { alignItems: 'flex-end' },
  amt: { fontSize: 15.5, fontWeight: '800', color: COLORS.textPrimary },
  amtLbl: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.5, color: COLORS.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { fontSize: 11.5, fontWeight: '700', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12, overflow: 'hidden', backgroundColor: COLORS.surfaceAlt, color: COLORS.textPrimary },
  chipRef: { backgroundColor: COLORS.linkBg, color: COLORS.link },
  chipDue: { backgroundColor: COLORS.warningBg, color: COLORS.warning },
  foot: { marginTop: 10, paddingTop: 9, borderTopWidth: 1, borderTopColor: COLORS.border, gap: 3 },
  footTxt: { fontSize: 12, color: COLORS.textSecondary },
  footB: { fontWeight: '800', color: COLORS.textPrimary },
});
