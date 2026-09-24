import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StatusBar, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { TASK_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import common from '../../styles/common';
import AppLoader from '../../components/AppLoader';
import FilterSelect from '../../components/FilterSelect';
import { Badge } from '../../components/ui';
import { STATUS_LABEL, PRIORITIES, PRIORITY_LABEL, withCompany, isOverdue } from './taskShared';
import TaskDetailSheet from './TaskDetailSheet';

// Dash's tone vocabulary (info/good/warn/bad/muted) → Badge's (info/success/warning/danger/neutral).
const BADGE_TONE = { info: 'info', good: 'success', warn: 'warning', bad: 'danger', muted: 'neutral' };
const TABS = [['my_tasks', 'My Tasks'], ['assigned_by_me', 'Assigned by Me'], ['all', 'All']];
const dmy = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

// Task list — same shape as the AR Collections screen: tab bar, search,
// filter chips, a FlatList of cards, and a bottom sheet for detail/edit.
export default function TaskListScreen({ route }) {
  const companyId = useSelector((st) => st.adminFilter?.companyId);
  const [tab, setTab] = useState(route?.params?.tab || 'my_tasks');
  const [q, setQ] = useState('');
  const [lists, setLists] = useState([]);
  const [listFilter, setListFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(!!route?.params?.overdue);
  const [tasks, setTasks] = useState(null);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [openTaskId, setOpenTaskId] = useState(undefined);

  useEffect(() => {
    apiFetch(withCompany(TASK_ENDPOINTS.lists, companyId)).then((r) => r.json()).then((d) => setLists(d.results || [])).catch(() => {});
  }, [companyId]);

  const load = useCallback(async () => {
    setErr('');
    try {
      const extra = [];
      if (tab === 'my_tasks') extra.push('my_tasks=true');
      if (tab === 'assigned_by_me') extra.push('assigned_by_me=true');
      if (listFilter) extra.push(`task_list_id=${listFilter}`);
      if (statusFilter) extra.push(`status=${statusFilter}`);
      if (priorityFilter) extra.push(`priority=${priorityFilter}`);
      if (overdueOnly) extra.push('overdue=true');
      if (q.trim()) extra.push(`search=${encodeURIComponent(q.trim())}`);
      const r = await apiFetch(withCompany(TASK_ENDPOINTS.tasks, companyId, extra));
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.detail || 'Could not load tasks.'); return; }
      setTasks(d.results || []);
    } catch (e) { setErr('Check your connection and try again.'); }
  }, [tab, listFilter, statusFilter, priorityFilter, overdueOnly, q, companyId]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const header = (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={common.tabBarScroll} contentContainerStyle={s.tabs}>
        {TABS.map(([k, label]) => (
          <TouchableOpacity key={k} onPress={() => setTab(k)} style={[s.tab, tab === k && s.tabOn]}>
            <Text style={[s.tabText, tab === k && s.tabTextOn]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={s.filters}>
        <View style={[common.searchBox, s.flex]}>
          <Ionicons name="search" size={16} color={COLORS.textSecondary} />
          <TextInput style={s.searchInput} value={q} onChangeText={setQ} placeholder="Search task title"
            placeholderTextColor={COLORS.textTertiary} autoCorrect={false} onSubmitEditing={load} />
        </View>
      </View>
      <View style={s.filters}>
        <FilterSelect label="Task List" value={listFilter} onChange={setListFilter}
          options={[{ value: '', label: 'All Task Lists' }, ...lists.map((l) => ({ value: String(l.id), label: l.name }))]} />
        <FilterSelect label="Status" value={statusFilter} onChange={setStatusFilter}
          options={[{ value: '', label: 'All Statuses' }, { value: 'todo', label: 'To Do' }, { value: 'in_progress', label: 'In Progress' },
            { value: 'in_review', label: 'In Review' }, { value: 'done', label: 'Done' }, { value: 'blocked', label: 'Blocked' }]} />
        <FilterSelect label="Priority" value={priorityFilter} onChange={setPriorityFilter}
          options={[{ value: '', label: 'All Priorities' }, ...PRIORITIES.map((p) => ({ value: p.value, label: p.label }))]} />
        <TouchableOpacity onPress={() => setOverdueOnly((v) => !v)} style={[s.overdueChip, overdueOnly && s.overdueChipOn]}>
          <Text style={[s.overdueChipText, overdueOnly && s.overdueChipTextOn]}>Overdue only</Text>
        </TouchableOpacity>
      </View>
      <Text style={common.sectionLabel}>{(tasks || []).length} task{(tasks || []).length === 1 ? '' : 's'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      <View style={common.header}>
        <View style={s.flex}>
          <Text style={common.headerTitle}>Tasks</Text>
          <Text style={common.headerSub}>Assign, track and close out work</Text>
        </View>
        <TouchableOpacity onPress={() => setOpenTaskId(null)} style={s.addBtn}>
          <Ionicons name="add" size={22} color={COLORS.link} />
        </TouchableOpacity>
      </View>

      {tasks === null && !err ? <AppLoader label="Loading tasks…" /> : (
        <FlatList
          data={tasks || []}
          keyExtractor={(t) => String(t.id)}
          contentContainerStyle={common.scroll}
          ListHeaderComponent={header}
          initialNumToRender={10}
          windowSize={7}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.link} />}
          ListEmptyComponent={<Text style={s.empty}>{err || 'No tasks match here yet.'}</Text>}
          renderItem={({ item }) => <TaskCard t={item} onPress={() => setOpenTaskId(item.id)} />}
        />
      )}

      <TaskDetailSheet taskId={openTaskId} visible={openTaskId !== undefined} lists={lists}
        defaultListId={listFilter || lists[0]?.id}
        onClose={() => setOpenTaskId(undefined)} onChanged={load} />
    </SafeAreaView>
  );
}

function TaskCard({ t, onPress }) {
  const priorityTone = PRIORITIES.find((p) => p.value === t.priority)?.tone || 'info';
  const overdue = isOverdue(t);
  return (
    <TouchableOpacity style={[common.card, s.card, overdue && s.late]} activeOpacity={0.8} onPress={onPress}>
      <View style={s.cardTop}>
        <Text style={s.title} numberOfLines={2}>{t.title}</Text>
        <Badge label={PRIORITY_LABEL[t.priority]} tone={BADGE_TONE[priorityTone] || 'info'} />
      </View>
      <View style={s.metaRow}>
        <Badge label={STATUS_LABEL[t.status]} tone={t.status === 'done' ? 'success' : t.status === 'blocked' ? 'danger' : 'info'} />
        <Text style={s.sub}>{t.task_list_name}</Text>
        {t.due_date ? <Text style={[s.due, overdue && s.dueLate]}>Due {dmy(t.due_date)}</Text> : null}
      </View>
      {t.checklist_total > 0 ? <Text style={s.sub}>✓ {t.checklist_done}/{t.checklist_total} checklist</Text> : null}
      {t.assignees.length > 0 ? (
        <Text style={s.assignees} numberOfLines={1}>{t.assignees.map((a) => a.name).join(', ')}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accentSoft },
  tabs: { gap: 4, paddingRight: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: COLORS.link },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  tabTextOn: { color: COLORS.link, fontWeight: '800' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, paddingVertical: 0 },
  overdueChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  overdueChipOn: { borderColor: COLORS.error, backgroundColor: COLORS.errorBg },
  overdueChipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  overdueChipTextOn: { color: COLORS.error, fontWeight: '700' },
  card: { marginBottom: 10, padding: 14, gap: 6 },
  late: { borderColor: COLORS.error2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  sub: { fontSize: 12, color: COLORS.textSecondary },
  due: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  dueLate: { color: COLORS.error },
  assignees: { fontSize: 12, color: COLORS.textSecondary },
  empty: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 13.5, paddingVertical: 36, paddingHorizontal: 20, lineHeight: 20 },
});
