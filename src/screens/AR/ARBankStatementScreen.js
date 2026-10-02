import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { AR_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import { formatDMY } from '../../utils/dateFormat';
import common from '../../styles/common';
import AppLoader from '../../components/AppLoader';
import LoadError from '../../components/LoadError';
import { rupee, withCompany, DateField } from './arShared';

// A bank's statement, ledger style — mirrors the web page (m/[module]/banks/[id]):
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

  const bank = data?.bank;
  const ranged = !!(from || to);

  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <View style={common.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={common.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={s.flex}>
          <Text style={common.headerTitle} numberOfLines={1}>{bank?.name || route?.params?.name || 'Bank statement'}</Text>
          <Text style={common.headerSub} numberOfLines={1}>{bank?.account_no ? `A/c ${bank.account_no} · ` : ''}Loan payments, running balance</Text>
        </View>
      </View>

      <View style={s.range}>
        <View style={s.flex}><Text style={s.rangeLabel}>From</Text><DateField compact maxToday value={from} onChange={(d) => setFrom(d || '')} /></View>
        <View style={s.flex}><Text style={s.rangeLabel}>To</Text><DateField compact maxToday value={to} onChange={(d) => setTo(d || '')} /></View>
        {ranged ? (
          <TouchableOpacity onPress={() => { setFrom(''); setTo(''); }} style={s.clear}>
            <Ionicons name="close-circle" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {data === null ? <AppLoader label="Loading statement…" /> : err ? <LoadError message={err} onRetry={load} /> : (
        <ScrollView contentContainerStyle={s.body} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={s.sums}>
            <View style={[common.card, s.sum]}>
              <Text style={s.sumLabel}>{ranged && from ? `On ${formatDMY(from)}` : 'Opening'}</Text>
              <Text style={s.sumValue} numberOfLines={1}>{rupee(data.brought_forward)}</Text>
            </View>
            <View style={[common.card, s.sum]}>
              <Text style={s.sumLabel}>Received</Text>
              <Text style={[s.sumValue, s.in]} numberOfLines={1}>+{rupee(data.total_in)}</Text>
            </View>
            <View style={[common.card, s.sum]}>
              <Text style={s.sumLabel}>{ranged && to ? `On ${formatDMY(to)}` : 'Closing'}</Text>
              <Text style={[s.sumValue, s.bal]} numberOfLines={1}>{rupee(data.closing_balance)}</Text>
            </View>
          </View>

          <View style={[common.card, s.list]}>
            <View style={[s.row, s.obRow]}>
              <View style={s.flex}>
                <Text style={s.particular}>{from ? 'Balance brought forward' : 'Opening balance'}</Text>
                {from ? <Text style={s.sub}>{formatDMY(from)}</Text> : null}
              </View>
              <Text style={[s.amount, s.bal]}>{rupee(data.brought_forward)}</Text>
            </View>
            {(data.rows || []).map((r) => (
              <TouchableOpacity key={r.id} style={s.row} activeOpacity={0.7}
                onPress={() => navigation.navigate('ARLedger', { id: r.account_id })}>
                <View style={s.flex}>
                  <Text style={s.particular} numberOfLines={1}>{r.client || '—'}</Text>
                  <Text style={s.sub} numberOfLines={1}>{formatDMY(r.date)} · {r.project}{r.plots ? ` · Plot ${r.plots}` : ''}</Text>
                  {r.remarks ? <Text style={s.sub} numberOfLines={1}>{r.remarks}</Text> : null}
                </View>
                <View style={s.right}>
                  <Text style={[s.amount, s.in]}>+{rupee(r.amount)}</Text>
                  <Text style={s.runBal}>Bal {rupee(r.balance)}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {!(data.rows || []).length ? (
              <Text style={s.empty}>No Loan payments into this bank{ranged ? ' in this range' : ' yet'}.</Text>
            ) : null}
            <View style={[s.row, s.closeRow]}>
              <Text style={[s.particular, s.flex]}>Closing balance</Text>
              <Text style={[s.amount, s.bal]}>{rupee(data.closing_balance)}</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  range: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingHorizontal: 16, paddingBottom: 8 },
  rangeLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 4 },
  clear: { paddingBottom: 8 },
  body: { padding: 16, paddingTop: 8, paddingBottom: 40 },
  sums: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sum: { flex: 1, padding: 12 },
  sumLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  sumValue: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  in: { color: COLORS.success },
  bal: { color: COLORS.textPrimary },
  list: { paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12,
         borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt },
  obRow: { backgroundColor: COLORS.surfaceAlt },
  closeRow: { borderBottomWidth: 0 },
  particular: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 14, fontWeight: '800' },
  runBal: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, paddingVertical: 24, fontSize: 13 },
});
