import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StatusBar, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { AR_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import common from '../../styles/common';
import AppLoader from '../../components/AppLoader';
import LoadError from '../../components/LoadError';
import FilterSelect from '../../components/FilterSelect';
import { Badge, Button } from '../../components/ui';
import { DashKpi, DashKpiGrid } from '../../components/Dash';
import { fmtWhen } from '../../components/ActivityHistory';
import { rupee, inrShort, today, withCompany } from './arShared';
import FollowUpSheet from './FollowUpSheet';

const dmy = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
const WINDOWS = [7, 30, 60, 90];
const WHEN = [['open', 'All open'], ['overdue', 'Overdue'], ['today', 'Today'], ['upcoming', 'Later'], ['done', 'Done']];

// Collections — same as /m/ar/collections on the website: who has not paid,
// what falls due next, and the follow-ups chasing both.
export default function ARCollectionsScreen({ navigation, route }) {
  const companyId = useSelector((st) => st.adminFilter?.companyId);
  const [tab, setTab] = useState(route?.params?.tab || 'overdue');
  const [days, setDays] = useState(30);
  const [project, setProject] = useState(route?.params?.project || '');
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(null);
  const [fuScope, setFuScope] = useState('mine');
  const [fuWhen, setFuWhen] = useState('open');
  const [fus, setFus] = useState(null);

  const view = tab === 'followups' ? 'all' : tab;
  const load = useCallback(async () => {
    setErr('');
    try {
      const extra = [`view=${view}`, `days=${days}`, `as_of=${today()}`];
      if (project) extra.push(`project=${project}`);
      const r = await apiFetch(withCompany(AR_ENDPOINTS.collections, companyId, extra));
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.detail || 'Could not load collections.'); return; }
      setData(d);
    } catch (e) { setErr('Check your connection and try again.'); }
  }, [view, days, project, companyId]);

  const loadFus = useCallback(async () => {
    if (tab !== 'followups') return;
    setFus(null);
    try {
      const r = await apiFetch(withCompany(AR_ENDPOINTS.myFollowUps, companyId, [`scope=${fuScope}`, `when=${fuWhen}`]));
      const d = await r.json().catch(() => ({}));
      setFus(r.ok ? d.results || [] : []);
    } catch (e) { setFus([]); }
  }, [tab, fuScope, fuWhen, companyId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadFus(); }, [loadFus]);
  const onRefresh = async () => { setRefreshing(true); await Promise.all([load(), loadFus()]); setRefreshing(false); };
  const changed = () => { load(); loadFus(); };

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.results || []).filter((r) => !needle || r.client_name.toLowerCase().includes(needle)
      || (r.phone || '').includes(needle) || String(r.plots).toLowerCase().includes(needle));
  }, [data, q]);
  const byId = useMemo(() => Object.fromEntries((data?.results || []).map((r) => [r.id, r])), [data]);
  const c = data?.counts || {};

  const header = (
    <View>
      <DashKpiGrid>
        <DashKpi icon="alarm-outline" tone="bad" label="Overdue" value={inrShort(c.overdue_amount)} sub={`${c.overdue_accounts || 0} not paid`} onPress={() => setTab('overdue')} />
        <DashKpi icon="calendar-outline" tone="warn" label={`Due in ${days} days`} value={inrShort(c.upcoming_amount)} sub={`${c.upcoming_accounts || 0} accounts`} onPress={() => setTab('upcoming')} />
        <DashKpi icon="call-outline" tone="info" label="Follow-ups today" value={String(c.followups_today || 0)} sub={`${c.followups_overdue || 0} overdue`} onPress={() => setTab('followups')} />
        <DashKpi icon="person-remove-outline" tone="muted" label="Not followed up" value={String(c.no_followup || 0)} sub="Overdue, nothing scheduled" />
      </DashKpiGrid>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={common.tabBarScroll} contentContainerStyle={s.tabs}>
        {[['overdue', `Overdue · ${c.overdue_accounts || 0}`], ['upcoming', `Upcoming · ${c.upcoming_accounts || 0}`], ['followups', 'Follow-ups']].map(([k, label]) => (
          <TouchableOpacity key={k} onPress={() => setTab(k)} style={[s.tab, tab === k && s.tabOn]}>
            <Text style={[s.tabText, tab === k && s.tabTextOn]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {tab !== 'followups' ? (
        <>
          <View style={s.filters}>
            <View style={[common.searchBox, s.flex]}>
              <Ionicons name="search" size={16} color={COLORS.textSecondary} />
              <TextInput style={s.searchInput} value={q} onChangeText={setQ} placeholder="Client, phone or plot"
                placeholderTextColor={COLORS.textTertiary} autoCorrect={false} />
            </View>
          </View>
          <View style={s.filters}>
            <FilterSelect label="Project" value={project} onChange={setProject}
              options={[{ value: '', label: 'All projects' }, ...(data?.projects || []).map((p) => ({ value: String(p.id), label: p.name }))]} />
            {tab === 'upcoming' ? WINDOWS.map((w) => (
              <TouchableOpacity key={w} onPress={() => setDays(w)} style={[s.chip, days === w && s.chipOn]}>
                <Text style={[s.chipText, days === w && s.chipTextOn]}>{w} days</Text>
              </TouchableOpacity>
            )) : null}
          </View>
          <Text style={common.sectionLabel}>{rows.length} account{rows.length === 1 ? '' : 's'}</Text>
        </>
      ) : (
        <>
          <View style={s.filters}>
            {[['mine', 'Mine'], ['all', 'Everyone']].map(([k, l]) => (
              <TouchableOpacity key={k} onPress={() => setFuScope(k)} style={[s.chip, fuScope === k && s.chipOn]}>
                <Text style={[s.chipText, fuScope === k && s.chipTextOn]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={s.filters}>
            {WHEN.map(([k, l]) => (
              <TouchableOpacity key={k} onPress={() => setFuWhen(k)} style={[s.chip, fuWhen === k && s.chipOn]}>
                <Text style={[s.chipText, fuWhen === k && s.chipTextOn]}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );

  const list = tab === 'followups' ? (fus || []) : rows;
  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      <View style={common.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={common.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={s.flex}>
          <Text style={common.headerTitle}>Collections</Text>
          <Text style={common.headerSub}>Overdue, upcoming and follow-ups</Text>
        </View>
      </View>

      {data === null && !err ? <AppLoader label="Working out who owes what…" /> : err && !data ? <LoadError message={err} onRetry={load} /> : (
        <FlatList
          data={list}
          keyExtractor={(r) => `${tab}-${r.id}`}
          contentContainerStyle={common.scroll}
          ListHeaderComponent={header}
          initialNumToRender={10}
          windowSize={7}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.link} />}
          ListEmptyComponent={tab === 'followups' && fus === null ? <AppLoader label="Loading…" size={0.5} /> : (
            <Text style={s.empty}>{tab === 'overdue' ? 'Nobody is overdue. Every due installment is paid.'
              : tab === 'upcoming' ? `Nothing falls due in the next ${days} days.` : 'No follow-ups here.'}</Text>
          )}
          renderItem={({ item }) => (tab === 'followups'
            ? <FollowUpCard f={item} onPress={() => setOpen(byId[item.account_id] || { ...item.account, overdue: 0 })} />
            : <AccountCard r={item} tab={tab} onFollowUp={() => setOpen(item)} onLedger={() => navigation.navigate('ARLedger', { id: item.id })} />)}
        />
      )}
      <FollowUpSheet row={open} visible={!!open} onClose={() => setOpen(null)} onChanged={changed} />
    </SafeAreaView>
  );
}

function AccountCard({ r, tab, onFollowUp, onLedger }) {
  return (
    <View style={[common.card, s.card]}>
      <TouchableOpacity activeOpacity={0.8} onPress={onLedger} style={s.cardTop}>
        <View style={s.flex}>
          <Text style={s.name} numberOfLines={1}>{r.client_name || '—'}</Text>
          <Text style={s.sub} numberOfLines={1}>{r.project} · Plot {r.plots}{r.phone ? ` · ${r.phone}` : ''}</Text>
        </View>
        <View style={s.right}>
          <Text style={[s.amount, tab === 'overdue' && s.bad]}>{inrShort(tab === 'overdue' ? r.overdue : r.upcoming_amount)}</Text>
          <Text style={s.amountLabel}>{tab === 'overdue' ? `${r.days_overdue} days late` : `${r.upcoming_installments} inst due`}</Text>
        </View>
      </TouchableOpacity>
      <View style={s.metrics}>
        {tab === 'overdue' ? (
          <>
            <Metric label="Since" value={dmy(r.overdue_since)} />
            <Metric label="O/s + interest" value={inrShort(r.os_with_interest)} />
          </>
        ) : (
          <>
            <Metric label="Next due" value={r.next_due ? `${dmy(r.next_due.date)} · ${inrShort(r.next_due.amount)}` : '—'} />
            <Metric label="Also overdue" value={r.overdue > 0 ? inrShort(r.overdue) : '—'} bad={r.overdue > 0} />
          </>
        )}
        <Metric label="Last paid" value={r.last_paid_on ? dmy(r.last_paid_on) : 'Never'} />
      </View>
      <View style={s.fuRow}>
        {r.followup
          ? <Badge label={`${r.followup.channel_label} · ${fmtWhen(r.followup.scheduled_at)}`} tone={r.followup.is_overdue ? 'danger' : 'success'} />
          : <Badge label="No follow-up scheduled" tone="neutral" />}
      </View>
      {r.last_outcome?.text ? <Text style={s.outcome} numberOfLines={2}>“{r.last_outcome.text}”</Text> : null}
      <View style={s.actions}>
        <Button title="Ledger" variant="secondary" size="sm" onPress={onLedger} />
        <Button title="Follow up" icon="notifications-outline" size="sm" onPress={onFollowUp} />
      </View>
    </View>
  );
}

function FollowUpCard({ f, onPress }) {
  return (
    <TouchableOpacity style={[common.card, s.card, f.is_overdue && s.late]} activeOpacity={0.8} onPress={onPress}>
      <View style={s.cardTop}>
        <View style={s.flex}>
          <Text style={s.name} numberOfLines={1}>{f.account.client_name || '—'}</Text>
          <Text style={s.sub} numberOfLines={1}>{f.account.project} · Plot {f.account.plots}</Text>
        </View>
        {f.is_overdue ? <Badge label="Overdue" tone="danger" /> : f.status === 'done' ? <Badge label="Done" tone="success" /> : null}
      </View>
      <Text style={s.when}>{f.channel_label} · {fmtWhen(f.status === 'done' ? f.done_at : f.scheduled_at)}</Text>
      {(f.outcome || f.note) ? <Text style={s.outcome} numberOfLines={3}>{f.outcome || f.note}</Text> : null}
      {f.promised_amount != null ? <Text style={s.promise}>Promised {rupee(f.promised_amount)}{f.promised_on ? ` by ${dmy(f.promised_on)}` : ''}</Text> : null}
      <Text style={s.meta}>Assigned to {f.assigned_to?.name || '—'}</Text>
    </TouchableOpacity>
  );
}

function Metric({ label, value, bad }) {
  return (
    <View style={s.metric}>
      <Text style={s.metricLabel}>{label}</Text>
      <Text style={[s.metricValue, bad && s.bad]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { gap: 4, paddingRight: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: COLORS.link },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextOn: { color: COLORS.link, fontWeight: '800' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, paddingVertical: 0 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipOn: { borderColor: COLORS.link, backgroundColor: COLORS.accentSoft },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  chipTextOn: { color: COLORS.link, fontWeight: '700' },
  card: { marginBottom: 10, padding: 14 },
  late: { borderColor: COLORS.error2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  amountLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  bad: { color: COLORS.error },
  metrics: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  metric: { flex: 1 },
  metricLabel: { fontSize: 10.5, color: COLORS.textSecondary, fontWeight: '600' },
  metricValue: { fontSize: 12.5, color: COLORS.textPrimary, fontWeight: '700', marginTop: 2 },
  fuRow: { flexDirection: 'row', marginTop: 10 },
  outcome: { fontSize: 12.5, fontStyle: 'italic', color: COLORS.textSecondary, marginTop: 6, lineHeight: 17 },
  when: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginTop: 8 },
  promise: { fontSize: 12.5, fontWeight: '700', color: COLORS.success, marginTop: 4 },
  meta: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 4 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 13.5, paddingVertical: 36, paddingHorizontal: 20, lineHeight: 20 },
});
