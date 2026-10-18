// Investor Portfolios — one ranked line per mobile number: everything invested under
// it (each renewal counted), its schemes, what is active and due, and the people
// it brought in; tap for the full portfolio. Same as the website's portfolios page.
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, StatusBar, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { CLUB1000_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { errText } from '../../lib/apiError';
import AppLoader from '../../components/AppLoader';
import FilterSelect from '../../components/FilterSelect';
import PortfolioSheet, { Avatar } from './PortfolioSheet';
import { AddInvestorSheet, morePrefill } from './Club1000InvestorsScreen';
import { useSelector } from 'react-redux';
import { can } from '../../lib/roles';

const rupee = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const SORTS = [
  ['active', 'Biggest active holding', (r) => -Number(r.active_amount)],
  ['times', 'Most times invested', (r) => -r.times_invested],
  ['referrals', 'Most people referred', (r) => -r.referrals],
  ['due', 'Most due now', (r) => -Number(r.due_now)],
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
  const [addMore, setAddMore] = useState(null);
  const [schemeList, setSchemeList] = useState([]);
  const user = useSelector((st) => st.auth.user);
  const canAdd = can(user, 'club.investor.manage');

  const load = useCallback(async () => {
    try {
      const r = await apiFetch(CLUB1000_ENDPOINTS.portfolios);
      const d = await r.json().catch(() => ({}));
      if (r.ok) { setRows(d); setErr(''); } else { setErr(errText(d, 'Could not load portfolios.')); setRows([]); }
    } catch { setErr('Could not reach the server.'); setRows((x) => x || []); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useFocusEffect(useCallback(() => {
    if (!canAdd) return;
    apiFetch(CLUB1000_ENDPOINTS.schemes).then((r) => (r.ok ? r.json() : [])).then((d) => setSchemeList(Array.isArray(d) ? d : [])).catch(() => {});
  }, [canAdd]));

  const schemes = useMemo(() => [...new Set((rows || []).flatMap((r) => r.schemes.map((x) => x.scheme)))].sort(), [rows]);
  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    const by = SORTS.find((x) => x[0] === sort)[2];
    return (rows || [])
      .filter((r) => !q || (r.names || [r.name]).some((n) => (n || '').toLowerCase().includes(q))
        || (digits && String(r.phone || '').replace(/\D/g, '').includes(digits)))
      .filter((r) => !scheme || r.schemes.some((x) => x.scheme === scheme))
      .sort((a, b) => (by(a) < by(b) ? -1 : by(a) > by(b) ? 1 : 0));
  }, [rows, search, scheme, sort]);
  const top = Math.max(1, ...(rows || []).map((r) => Number(r.active_amount)));
  const t = (rows || []).reduce((a, r) => ({
    active: a.active + Number(r.active_amount), due: a.due + Number(r.due_now), referred: a.referred + r.referrals,
  }), { active: 0, due: 0, referred: 0 });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.screenBg} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={s.flex}>
          <Text style={s.title}>Investor Portfolios</Text>
          {!!rows && <Text style={s.sub}>{rows.length} mobile number{rows.length === 1 ? '' : 's'}</Text>}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        {!!rows && rows.length > 0 && (
          <View style={s.band}>
            <View style={s.bandHero}>
              <Text style={s.lbl}>ACTIVE WITH THE CLUB</Text>
              <Text style={s.bandBig}>{rupee(t.active)}</Text>
            </View>
            <View style={s.bandRow}>
              <View style={s.bandCell}><Text style={s.lbl}>DUE NOW</Text><Text style={[s.bandVal, t.due > 0 && s.dueText]}>{rupee(t.due)}</Text></View>
              <View style={s.bandCell}><Text style={s.lbl}>PEOPLE REFERRED</Text><Text style={s.bandVal}>{t.referred}</Text></View>
            </View>
          </View>
        )}

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

        {!!err && <Text style={s.bad}>{err}</Text>}
        {!rows ? <AppLoader /> : shown.length === 0 ? (
          <Text style={s.empty}>{rows.length ? 'No one matches these filters.' : 'No investors yet.'}</Text>
        ) : (
          <View style={s.card}>
            {shown.map((r, i) => (
              <TouchableOpacity key={r.id} activeOpacity={0.8} onPress={() => setOpen(r.id)} style={[s.row, i === shown.length - 1 && s.rowLast]}>
                <View style={s.rowTop}>
                  <Text style={s.rank}>{i + 1}</Text>
                  <Avatar name={r.name} seed={r.phone} />
                  <View style={s.flex}>
                    <Text style={s.name} numberOfLines={1}>{r.name}{r.names?.length > 1 ? `  +${r.names.length - 1}` : ''}</Text>
                    <Text style={s.phone}>{r.phone}{r.since ? ` · since ${String(r.since).slice(0, 4)}` : ''}</Text>
                  </View>
                  <View style={s.holdWrap}>
                    <Text style={s.hold}>{rupee(r.active_amount)}</Text>
                    <View style={s.meter}><View style={[s.meterFill, { width: `${(Number(r.active_amount) / top) * 100}%` }]} /></View>{/* inline-ok: share of the biggest holding */}
                  </View>
                </View>
                <View style={s.chips}>
                  <Text style={s.chipStrong}>{r.times_invested}× invested</Text>
                  {r.schemes.map((x) => <Text key={x.scheme} style={s.chip}>{x.scheme}{x.count > 1 ? ` ×${x.count}` : ''}</Text>)}
                  {r.referrals > 0 && <Text style={[s.chip, s.chipRef]}>{r.referrals} referred</Text>}
                  {Number(r.due_now) > 0 && <Text style={[s.chip, s.chipDue]}>{rupee(r.due_now)} due</Text>}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <PortfolioSheet investorId={open} onClose={() => setOpen(null)}
        onAddMore={canAdd && schemeList.length ? (pf) => { setOpen(null); setAddMore(pf); } : null} />
      <AddInvestorSheet visible={!!addMore} prefillLead={morePrefill(addMore)} schemes={schemeList}
        onClose={() => setAddMore(null)} onSaved={() => { setAddMore(null); load(); }} />
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
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  band: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: COLORS.cardBg, ...CARD_SHADOW },
  bandHero: { padding: 14, backgroundColor: COLORS.linkBg },
  bandBig: { fontSize: 24, fontWeight: '800', color: COLORS.link, marginTop: 3 },
  bandRow: { flexDirection: 'row' },
  bandCell: { flex: 1, padding: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  bandVal: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginTop: 3 },
  dueText: { color: COLORS.warning },
  lbl: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: COLORS.textSecondary },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 12, height: 42, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  searchInput: { flex: 1, fontSize: 13.5, color: COLORS.textPrimary },
  filters: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 12 },
  bad: { fontSize: 12.5, color: COLORS.error, marginBottom: 8 },
  empty: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 30 },
  card: { backgroundColor: COLORS.cardBg, borderRadius: 18, ...CARD_SHADOW, borderWidth: 1, borderColor: COLORS.cardBorder, overflow: 'hidden' },
  row: { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLast: { borderBottomWidth: 0 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  rank: { width: 18, fontSize: 11, fontWeight: '800', color: COLORS.text3, textAlign: 'right' },
  name: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  phone: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 1 },
  holdWrap: { alignItems: 'flex-end', width: 104, gap: 4 },
  hold: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  meter: { width: 90, height: 4, borderRadius: 2, backgroundColor: COLORS.surfaceAlt, overflow: 'hidden' },
  meterFill: { height: 4, borderRadius: 2, backgroundColor: COLORS.link },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8, marginLeft: 72 },
  chip: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden', backgroundColor: COLORS.surfaceAlt, color: COLORS.textPrimary },
  chipStrong: { fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, overflow: 'hidden', backgroundColor: COLORS.textPrimary, color: COLORS.surface },
  chipRef: { backgroundColor: COLORS.linkBg, color: COLORS.link },
  chipDue: { backgroundColor: COLORS.warningBg, color: COLORS.warning },
});
