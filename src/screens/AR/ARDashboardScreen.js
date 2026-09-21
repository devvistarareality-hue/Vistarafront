import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '../../constants/theme';
import { AR_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import common from '../../styles/common';
import AppLoader from '../../components/AppLoader';
import LoadError from '../../components/LoadError';
import FilterSelect from '../../components/FilterSelect';
import { Badge, Button } from '../../components/ui';
import { rupee, AGE_LABELS, ISSUES, today, withCompany } from './arShared';

// AR landing: the whole receivables book — what is owed, how late, what falls due
// month by month, who owes the most, and which accounts need their data fixed.
export default function ARDashboardScreen({ navigation }) {
  const companyId = useSelector((st) => st.adminFilter?.companyId);
  const [project, setProject] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setErr('');
    try {
      const extra = [`as_of=${today()}`];
      if (project) extra.push(`project=${project}`);
      const r = await apiFetch(withCompany(AR_ENDPOINTS.dashboard, companyId, extra));
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.detail || 'Could not load the dashboard.'); return; }
      setData(d);
    } catch (e) { setErr('Check your connection and try again.'); }
  }, [project, companyId]);

  useEffect(() => { setData(null); load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const t = data?.totals;
  const ageMax = Math.max(1, ...AGE_LABELS.map((a) => data?.ageing?.[a] || 0));
  const fcMax = Math.max(1, ...(data?.month_forecast || []).map((m) => m.amount));
  const issues = data?.issues ? ISSUES.filter((i) => data.issues[i.value]) : [];
  const openRegister = (params) => navigation.navigate('ARRegister', params);

  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      <View style={common.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={common.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={s.flex}>
          <Text style={common.headerTitle}>Accounts Receivable</Text>
          <Text style={common.headerSub}>{data?.accounts != null ? `${data.accounts} active accounts` : 'Dashboard'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={common.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.link} />}>
        <View style={s.toolbar}>
          <FilterSelect label="Project" value={project} onChange={setProject}
            options={[{ value: '', label: 'All projects' }, ...(data?.projects || []).map((p) => ({ value: String(p.id), label: p.name }))]} />
          <Button title="All accounts" icon="book" size="sm" variant="primary" onPress={() => openRegister({ project })} />
        </View>

        {data === null && !err ? <AppLoader label="Calculating the receivables book…" /> : err && !data ? <LoadError message={err} onRetry={load} /> : (
          <>
            <View style={s.stats}>
              <Stat label="Collectable" value={rupee(t.collectable)} />
              <Stat label="Received" value={rupee(t.received)} sub={`${data.pct_realised}% realised`} tone="good" />
              <Stat label="Outstanding" value={rupee(t.outstanding)} sub={`${rupee(t.not_due)} not yet due`} />
              <Stat label="Overdue" value={rupee(t.overdue)} sub={`${data.overdue_accounts} account${data.overdue_accounts === 1 ? '' : 's'}`} tone="bad"
                onPress={() => openRegister({ project, overdue: true })} />
              <Stat label="Net interest" value={rupee(t.net_interest)} />
              <Stat label="O/s with interest" value={rupee(t.os_with_interest)} tone="bad" />
            </View>

            {issues.length > 0 && (
              <View style={[common.card, s.card]}>
                <Text style={s.cardTitle}>Needs attention</Text>
                <Text style={s.cardSub}>These accounts can’t show correct dues until their data is fixed</Text>
                {issues.map((i) => (
                  <TouchableOpacity key={i.value} style={s.issue} activeOpacity={0.75} onPress={() => openRegister({ project, issue: i.value })}>
                    <Badge label={i.label} tone={i.tone} />
                    <Text style={s.issueN}>{data.issues[i.value]}</Text>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={[common.card, s.card]}>
              <Text style={s.cardTitle}>Overdue by age</Text>
              <Text style={s.cardSub}>Days past the due date</Text>
              {AGE_LABELS.map((a) => (
                <Bar key={a} label={a} value={data.ageing[a]} max={ageMax} tone={a === '>180' || a === '121-180' ? 'bad' : 'warn'} />
              ))}
            </View>

            <View style={[common.card, s.card]}>
              <Text style={s.cardTitle}>Falling due</Text>
              <Text style={s.cardSub}>Installments not yet due, by month</Text>
              {data.month_forecast.map((m) => <Bar key={m.label} label={m.label} value={m.amount} max={fcMax} tone="good" />)}
            </View>

            <TopList title="Most overdue" rows={data.top_overdue} empty="Nothing is overdue." navigation={navigation} />
            <TopList title="Overdue over 180 days" rows={data.top_over_180} empty="Nothing is more than 180 days overdue." navigation={navigation} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, sub, tone, onPress }) {
  return (
    <TouchableOpacity style={[common.card, s.stat]} activeOpacity={onPress ? 0.8 : 1} disabled={!onPress} onPress={onPress}>
      <Text style={s.statLabel} numberOfLines={1}>{label}</Text>
      <Text style={[s.statValue, tone === 'good' && s.good, tone === 'bad' && s.bad]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      {sub ? <Text style={s.statSub} numberOfLines={1}>{sub}</Text> : null}
    </TouchableOpacity>
  );
}

function Bar({ label, value, max, tone }) {
  const fill = tone === 'bad' ? s.fillBad : tone === 'good' ? s.fillGood : s.fillWarn;
  return (
    <View style={s.barRow}>
      <Text style={s.barLabel} numberOfLines={1}>{label}</Text>
      <View style={s.barTrack}>
        {value > 0 && <View style={[s.barFill, fill, { width: `${(value / max) * 100}%` }]} />}{/* inline-ok: bar length from data */}
      </View>
      <Text style={s.barValue} numberOfLines={1}>{value ? rupee(value) : '—'}</Text>
    </View>
  );
}

function TopList({ title, rows, empty, navigation }) {
  return (
    <View style={[common.card, s.card]}>
      <Text style={s.cardTitle}>{title}</Text>
      {rows.length === 0 ? <Text style={s.empty}>{empty}</Text> : rows.map((r) => (
        <TouchableOpacity key={r.id} style={s.topRow} activeOpacity={0.75} onPress={() => navigation.navigate('ARLedger', { id: r.id })}>
          <View style={s.flex}>
            <Text style={s.topName} numberOfLines={1}>{r.client}</Text>
            <Text style={s.topSub} numberOfLines={1}>{r.project} · Plot {r.plots}</Text>
          </View>
          <Text style={s.topAmt}>{rupee(r.amount)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  stat: { width: '48%', flexGrow: 1, padding: 14, gap: 4 },
  statLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: COLORS.textSecondary },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  statSub: { fontSize: 11.5, color: COLORS.textSecondary },
  good: { color: COLORS.success },
  bad: { color: COLORS.error },
  card: { marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  cardSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, marginBottom: 12 },
  issue: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderTopWidth: 1, borderTopColor: COLORS.border },
  issueN: { flex: 1, textAlign: 'right', fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  barLabel: { width: 78, fontSize: 12.5, fontWeight: '600', color: COLORS.textSecondary },
  barTrack: { flex: 1, height: 9, borderRadius: 999, backgroundColor: COLORS.surfaceAlt, overflow: 'hidden' },
  barFill: { height: '100%', minWidth: 3, borderRadius: 999 },
  fillWarn: { backgroundColor: COLORS.warningSolid },
  fillBad: { backgroundColor: COLORS.error },
  fillGood: { backgroundColor: COLORS.link },
  barValue: { width: 96, textAlign: 'right', fontSize: 12.5, fontWeight: '700', color: COLORS.textPrimary },
  empty: { fontSize: 13, color: COLORS.textSecondary, paddingVertical: 14, textAlign: 'center' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderTopWidth: 1, borderTopColor: COLORS.border },
  topName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  topSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  topAmt: { fontSize: 14, fontWeight: '800', color: COLORS.error },
});
