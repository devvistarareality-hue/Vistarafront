import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { TASK_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import common from '../../styles/common';
import AppLoader from '../../components/AppLoader';
import LoadError from '../../components/LoadError';
import { DashHero, DashKpi, DashKpiGrid, DashAlerts, DashCard, DashBars } from '../../components/Dash';
import { STATUSES, PRIORITIES, withCompany } from './taskShared';

// Task Allocation landing — open work at a glance, same shared-widget layout
// the Sales and Club 1000 dashboards use.
export default function TaskDashboardScreen({ navigation }) {
  const companyId = useSelector((st) => st.adminFilter?.companyId);
  const me = useSelector((st) => st.auth.user);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setErr('');
    try {
      const r = await apiFetch(withCompany(TASK_ENDPOINTS.stats, companyId));
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.detail || 'Could not load the dashboard.'); return; }
      setData(d);
    } catch (e) { setErr('Check your connection and try again.'); }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };
  const isLogAdmin = me?.role === 'Admin' || me?.is_staff;
  const go = (params) => navigation.navigate('TaskList', params);

  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      <View style={common.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={common.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={s.flex}>
          <Text style={common.headerTitle}>Task Allocation</Text>
          <Text style={common.headerSub}>Assign, track and close out tasks</Text>
        </View>
        {isLogAdmin ? (
          <TouchableOpacity onPress={() => navigation.navigate('ActivityLog', { modules: ['Task Allocation'], title: 'Task Allocation Log' })} style={common.iconBtn} accessibilityLabel="Log">
            <Ionicons name="time-outline" size={19} color={COLORS.textPrimary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={common.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.link} />}>
        <View style={s.quick}>
          <Quick icon="list-outline" label="My Tasks" onPress={() => go({ tab: 'my_tasks' })} />
          <Quick icon="people-outline" label="Assigned by Me" onPress={() => go({ tab: 'assigned_by_me' })} />
          <Quick icon="albums-outline" label="All Tasks" onPress={() => go({ tab: 'all' })} />
        </View>

        {data === null && !err ? <AppLoader label="Loading your tasks…" /> : err && !data ? <LoadError message={err} onRetry={load} /> : (
          <>
            <DashHero eyebrow="Open right now" value={String(data.total_open ?? 0)}
              splits={[
                { label: 'My open tasks', value: String(data.my_open_tasks ?? 0) },
                { label: 'Assigned by me', value: String(data.assigned_by_me ?? 0) },
              ]} />

            <DashKpiGrid>
              <DashKpi icon="list-outline" tone="info" label="My Open Tasks" value={String(data.my_open_tasks ?? 0)}
                sub="Assigned to you" onPress={() => go({ tab: 'my_tasks' })} />
              <DashKpi icon="alarm-outline" tone="bad" label="Overdue" value={String(data.overdue ?? 0)}
                sub="Past due date" onPress={() => go({ tab: 'all', overdue: true })} />
              <DashKpi icon="hourglass-outline" tone="warn" label="Due Today" value={String(data.due_today ?? 0)}
                sub="Close these out" onPress={() => go({ tab: 'all' })} />
              <DashKpi icon="checkmark-done-outline" tone="good" label="Completed This Week" value={String(data.completed_this_week ?? 0)}
                sub="Marked done" />
            </DashKpiGrid>

            <DashAlerts items={[
              { label: 'overdue tasks', count: data.overdue ?? 0, tone: 'bad', icon: 'warning-outline',
                text: 'Past their due date and still open', onPress: () => go({ tab: 'all', overdue: true }) },
            ]} />

            <DashCard title="By status" sub="Every open + closed task">
              <DashBars empty="No tasks yet." rows={STATUSES.map((st) => ({ label: st.label, tone: st.tone, value: data.by_status?.[st.value] ?? 0 }))} />
            </DashCard>
            <DashCard title="By priority" sub="Every open + closed task">
              <DashBars empty="No tasks yet." rows={PRIORITIES.map((p) => ({ label: p.label, tone: p.tone, value: data.by_priority?.[p.value] ?? 0 }))} />
            </DashCard>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Quick({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={s.quickBtn} activeOpacity={0.8} onPress={onPress}>
      <Ionicons name={icon} size={18} color={COLORS.link} />
      <Text style={s.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  quick: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  quickBtn: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 12, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  quickLabel: { fontSize: 11.5, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
});
