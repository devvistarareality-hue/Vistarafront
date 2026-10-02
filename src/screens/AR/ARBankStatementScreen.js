import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../../constants/theme';
import { AR_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import { formatDMY } from '../../utils/dateFormat';
import common from '../../styles/common';
import AppLoader from '../../components/AppLoader';
import LoadError from '../../components/LoadError';
import { rupee, withCompany, DateField, toISO, shareBankStatement } from './arShared';

// Quick ranges — the Indian financial year runs April to March. Same as the web.
function presetRange(key) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();
  if (key === 'month') return [toISO(new Date(y, m, 1)), toISO(now)];
  if (key === 'last') return [toISO(new Date(y, m - 1, 1)), toISO(new Date(y, m, 0))];
  if (key === 'fy') return [toISO(new Date(m >= 3 ? y : y - 1, 3, 1)), toISO(now)];
  return ['', ''];
}
const PRESETS = [['all', 'All time'], ['month', 'This month'], ['last', 'Last month'], ['fy', 'This FY']];

const initials = (name) => {
  const p = String(name || '').trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '—';
};

// A bank's statement, passbook style — mirrors the web page (m/[module]/banks/[id]):
// opening (or brought-forward) balance, then every Loan payment into the bank in date
// order with a running balance. The closing figure equals the Bank Master balance.
export default function ARBankStatementScreen({ navigation, route }) {
  const id = route?.params?.id;
  const companyId = useSelector((st) => st.adminFilter?.companyId);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setErr('');
    const extra = [from && `from=${from}`, to && `to=${to}`].filter(Boolean);
    try {
      const r = await apiFetch(withCompany(AR_ENDPOINTS.bankStatement(id), companyId, extra));
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.detail || 'Could not load the statement.'); setData({}); return; }
      setData(d);
    } catch (e) { setErr('Check your connection and try again.'); setData({}); }
  }, [id, from, to, companyId]);
  useEffect(() => { setData(null); load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const preset = useMemo(() => {
    const hit = PRESETS.find(([k]) => { const [f, t] = presetRange(k); return f === from && t === to; });
    return hit ? hit[0] : 'custom';
  }, [from, to]);
  const pick = (k) => { const [f, t] = presetRange(k); setFrom(f); setTo(t); };

  const bank = data?.bank;
  const rows = data?.rows || [];
  const ranged = !!(from || to);

  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <View style={common.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={common.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={s.flex}>
          <Text style={common.headerTitle} numberOfLines={1}>Bank statement</Text>
          <Text style={common.headerSub} numberOfLines={1}>Loan payments, running balance</Text>
        </View>
        {data && !err ? (
          <TouchableOpacity style={common.iconBtn} accessibilityLabel="Share statement as PDF"
            onPress={async () => {
              const period = ranged ? `${from ? formatDMY(from) : 'Start'} – ${to ? formatDMY(to) : 'Today'}` : 'All time';
              const msg = await shareBankStatement(data, period);
              if (msg) Alert.alert('Statement', msg);
            }}>
            <Ionicons name="share-outline" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={s.body} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <LinearGradient colors={COLORS.heroScene} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
          <View style={s.heroGlow} />
          <View style={s.bankRow}>
            <View style={s.bankIcon}><Ionicons name="business" size={18} color={COLORS.white} /></View>
            <View style={s.flex}>
              <Text style={s.bankName} numberOfLines={1}>{bank?.name || route?.params?.name || 'Bank'}</Text>
              <Text style={s.bankSub} numberOfLines={1}>
                {bank?.account_no ? `A/c ${bank.account_no} · ` : ''}{ranged ? `${from ? formatDMY(from) : 'Start'} – ${to ? formatDMY(to) : 'Today'}` : 'All time'}
              </Text>
            </View>
          </View>
          <Text style={s.heroLabel}>{ranged && to ? `BALANCE ON ${formatDMY(to)}` : 'CLOSING BALANCE'}</Text>
          <Text style={s.heroValue} numberOfLines={1} adjustsFontSizeToFit>{data && !err ? rupee(data.closing_balance) : '—'}</Text>
          <View style={s.heroSplit}>
            <View><Text style={s.heroK}>{ranged && from ? 'Brought fwd' : 'Opening'}</Text><Text style={s.heroV}>{data && !err ? rupee(data.brought_forward) : '—'}</Text></View>
            <View><Text style={s.heroK}>Received</Text><Text style={[s.heroV, s.heroIn]}>+{data && !err ? rupee(data.total_in) : '—'}</Text></View>
            {data?.total_out > 0
              ? <View><Text style={s.heroK}>Refunds</Text><Text style={[s.heroV, s.heroOut]}>−{rupee(data.total_out)}</Text></View>
              : <View><Text style={s.heroK}>Entries</Text><Text style={s.heroV}>{rows.length}</Text></View>}
          </View>
        </LinearGradient>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {PRESETS.map(([k, label]) => (
            <TouchableOpacity key={k} onPress={() => pick(k)} style={[s.chip, preset === k && s.chipOn]} activeOpacity={0.8}>
              <Text style={[s.chipText, preset === k && s.chipTextOn]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={s.range}>
          <View style={s.flex}><Text style={s.rangeLabel}>FROM</Text><DateField compact maxToday value={from} onChange={(d) => setFrom(d || '')} /></View>
          <View style={s.flex}><Text style={s.rangeLabel}>TO</Text><DateField compact maxToday value={to} onChange={(d) => setTo(d || '')} /></View>
        </View>

        {data === null ? <AppLoader label="Loading statement…" /> : err ? <LoadError message={err} onRetry={load} /> : (
          <View style={[common.card, s.list]}>
            <View style={[s.row, s.edgeRow]}>
              <View style={s.dblock}><Text style={s.dDay}>{from ? new Date(`${from}T00:00:00`).getDate() : '—'}</Text>
                {from ? <Text style={s.dMon}>{new Date(`${from}T00:00:00`).toLocaleDateString('en-IN', { month: 'short' })}</Text> : null}</View>
              <Text style={[s.edgeText, s.flex]}>{from ? 'Balance brought forward' : 'Opening balance'}</Text>
              <Text style={s.balStrong}>{rupee(data.brought_forward)}</Text>
            </View>

            {rows.length === 0 ? (
              <View style={s.empty}>
                <Ionicons name="file-tray-outline" size={34} color={COLORS.textTertiary} />
                <Text style={s.emptyTitle}>No entries{ranged ? ' in this period' : ' yet'}</Text>
                <Text style={s.emptySub}>Record a payment with mode Loan and pick this bank — it shows up here.</Text>
              </View>
            ) : rows.map((r) => {
              const d = new Date(`${r.date}T00:00:00`);
              return (
                <TouchableOpacity key={r.id} style={s.row} activeOpacity={0.7} onPress={() => navigation.navigate('ARLedger', { id: r.account_id })}>
                  <View style={s.dblock}>
                    <Text style={s.dDay}>{d.getDate()}</Text>
                    <Text style={s.dMon}>{d.toLocaleDateString('en-IN', { month: 'short' })} {String(d.getFullYear()).slice(2)}</Text>
                  </View>
                  <View style={s.flex}>
                    <View style={s.whoRow}>
                      <View style={s.avatar}><Text style={s.avatarText}>{initials(r.client)}</Text></View>
                      <Text style={[s.client, s.flex]} numberOfLines={1}>{r.client || '—'}</Text>
                    </View>
                    <Text style={s.meta} numberOfLines={1}>{r.project}{r.plots ? ` · Plot ${r.plots}` : ''}</Text>
                    {r.remarks ? <Text style={s.remarks} numberOfLines={1}>{r.remarks}</Text> : null}
                  </View>
                  <View style={s.right}>
                    <View style={[s.amtPill, r.kind === 'out' && s.amtPillOut]}>
                      <Text style={[s.amtText, r.kind === 'out' && s.amtTextOut]}>{r.kind === 'out' ? '−' : '+'}{rupee(r.amount)}</Text>
                    </View>
                    <Text style={s.runBal}>{rupee(r.balance)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            <View style={[s.row, s.edgeRow, s.closeRow]}>
              <Text style={[s.edgeText, s.flex]}>Closing balance</Text>
              <Text style={s.balStrong}>{rupee(data.closing_balance)}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: 16, paddingBottom: 40 },
  hero: { borderRadius: 24, padding: 20, marginBottom: 12, overflow: 'hidden', ...SHADOWS.md },
  heroGlow: { position: 'absolute', right: -60, bottom: -90, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.05)' },
  bankRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bankIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  bankName: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  bankSub: { fontSize: 12, color: 'rgba(255,255,255,0.72)', marginTop: 1 },
  heroLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: 'rgba(255,255,255,0.75)', marginTop: 18 },
  heroValue: { fontSize: 32, fontWeight: '800', color: COLORS.white, marginTop: 4, letterSpacing: -0.8 },
  heroSplit: { flexDirection: 'row', gap: 22, marginTop: 14 },
  heroK: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  heroV: { fontSize: 15, fontWeight: '800', color: COLORS.white, marginTop: 2 },
  heroIn: { color: '#9BE8BC' },
  heroOut: { color: '#FFB4AE' },
  amtPillOut: { backgroundColor: COLORS.errorBg },
  amtTextOut: { color: COLORS.error },
  chips: { gap: 8, paddingBottom: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipOn: { borderColor: COLORS.link, backgroundColor: COLORS.accentSoft },
  chipText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  chipTextOn: { color: COLORS.link },
  range: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  rangeLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: COLORS.textSecondary, marginBottom: 4 },
  list: { paddingVertical: 0, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12,
         borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt },
  edgeRow: { backgroundColor: COLORS.surfaceAlt },
  closeRow: { borderBottomWidth: 0 },
  edgeText: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  balStrong: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  dblock: { width: 50, alignItems: 'center', paddingVertical: 6, borderRadius: 12, backgroundColor: COLORS.surfaceAlt },
  dDay: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  dMon: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' },
  whoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accentSoft },
  avatarText: { fontSize: 10, fontWeight: '800', color: COLORS.link },
  client: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  remarks: { fontSize: 11.5, color: COLORS.textTertiary, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  amtPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: COLORS.successBg },
  amtText: { fontSize: 13, fontWeight: '800', color: COLORS.success },
  runBal: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  empty: { alignItems: 'center', gap: 6, paddingVertical: 36, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  emptySub: { fontSize: 12.5, color: COLORS.textSecondary, textAlign: 'center' },
});
