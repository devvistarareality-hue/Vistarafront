import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../../constants/theme';
import { TASK_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import FormSheet from '../../components/FormSheet';
import { Button, Badge } from '../../components/ui';
import { TONES } from '../../components/Dash';
import { STATUSES, PRIORITIES, withCompany, DateField } from './taskShared';

function Pill({ label, tone, on, onPress }) {
  const t = TONES[tone] || TONES.info;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[s.pill, on && { backgroundColor: t.bg, borderColor: t.fg }]}>{/* inline-ok: tone colour */}
      <Text style={[s.pillText, on && { color: t.fg, fontWeight: '700' }]}>{label}</Text>{/* inline-ok: tone colour */}
    </TouchableOpacity>
  );
}

// Task detail / create sheet — shared by the Task List and (in future) Board
// screens. `taskId` null means "create a new task"; otherwise it edits that
// task in place. Assignees are picked from every active person in the
// company — no reporting-tree restriction, matching the module's whole point.
export default function TaskDetailSheet({ taskId, defaultListId, lists, visible, onClose, onChanged }) {
  const companyId = useSelector((st) => st.adminFilter?.companyId);
  const isCreate = !taskId;
  const [task, setTask] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('todo');
  const [priority, setPriority] = useState('normal');
  const [dueDate, setDueDate] = useState('');
  const [taskListId, setTaskListId] = useState('');
  const [assignees, setAssignees] = useState([]);
  const [people, setPeople] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [checklist, setChecklist] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!visible) return;
    setErr('');
    apiFetch(withCompany(TASK_ENDPOINTS.assignees, companyId)).then((r) => r.json()).then((d) => setPeople(d.results || [])).catch(() => {});
    if (isCreate) {
      setTask(null); setTitle(''); setDescription(''); setStatus('todo'); setPriority('normal');
      setDueDate(''); setTaskListId(defaultListId || lists?.[0]?.id || ''); setAssignees([]); setChecklist([]); setComments([]);
      return;
    }
    apiFetch(TASK_ENDPOINTS.task(taskId)).then((r) => r.json()).then((d) => {
      setTask(d); setTitle(d.title || ''); setDescription(d.description || '');
      setStatus(d.status || 'todo'); setPriority(d.priority || 'normal');
      setDueDate(d.due_date || ''); setTaskListId(d.task_list || '');
      setAssignees(d.assignees || []); setChecklist(d.checklist_items || []);
    }).catch(() => {});
    apiFetch(TASK_ENDPOINTS.comments(taskId)).then((r) => r.json()).then((d) => setComments(d.results || [])).catch(() => {});
  }, [visible, taskId]);

  async function patch(body) {
    if (isCreate) return;
    try { await apiFetch(TASK_ENDPOINTS.task(taskId), { method: 'PATCH', body: JSON.stringify(body) }); onChanged?.(); } catch (_) {}
  }

  async function create() {
    if (!title.trim()) { setErr('Title is required.'); return; }
    if (!taskListId) { setErr('Pick a task list.'); return; }
    setSaving(true); setErr('');
    try {
      const r = await apiFetch(TASK_ENDPOINTS.tasks, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(), description: description.trim(), status, priority,
          due_date: dueDate || null, task_list: taskListId, assignee_ids: assignees.map((a) => a.id),
        }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.detail || 'Could not create the task.'); setSaving(false); return; }
      onChanged?.();
      onClose();
    } catch (_) { setErr('Could not create the task.'); }
    setSaving(false);
  }

  function addAssignee(p) {
    if (assignees.some((a) => a.id === p.id)) return;
    const next = [...assignees, p];
    setAssignees(next);
    patch({ assignee_ids: next.map((a) => a.id) });
  }
  function removeAssignee(id) {
    const next = assignees.filter((a) => a.id !== id);
    setAssignees(next);
    patch({ assignee_ids: next.map((a) => a.id) });
  }

  async function addChecklistItem() {
    const text = newItem.trim();
    if (!text || isCreate) return;
    setNewItem('');
    try {
      const r = await apiFetch(TASK_ENDPOINTS.checklist(taskId), { method: 'POST', body: JSON.stringify({ text }) });
      const d = await r.json();
      if (r.ok) setChecklist((l) => [...l, d]);
    } catch (_) {}
  }
  async function toggleChecklistItem(item) {
    setChecklist((l) => l.map((i) => (i.id === item.id ? { ...i, is_done: !i.is_done } : i)));
    try { await apiFetch(TASK_ENDPOINTS.checklistItem(item.id), { method: 'PATCH', body: JSON.stringify({ is_done: !item.is_done }) }); } catch (_) {}
  }
  async function deleteChecklistItem(item) {
    setChecklist((l) => l.filter((i) => i.id !== item.id));
    try { await apiFetch(TASK_ENDPOINTS.checklistItem(item.id), { method: 'DELETE' }); } catch (_) {}
  }
  async function postComment() {
    const body = newComment.trim();
    if (!body || isCreate) return;
    setNewComment('');
    try {
      const r = await apiFetch(TASK_ENDPOINTS.comments(taskId), { method: 'POST', body: JSON.stringify({ body }) });
      const d = await r.json();
      if (r.ok) setComments((l) => [...l, d]);
    } catch (_) {}
  }

  const checklistDone = checklist.filter((i) => i.is_done).length;
  const unpicked = people.filter((p) => !assignees.some((a) => a.id === p.id));

  return (
    <FormSheet visible={visible} onClose={onClose}>
      <View style={s.head}>
        <TextInput style={s.titleInput} value={title} onChangeText={setTitle} placeholder="Task title…"
          placeholderTextColor={COLORS.textTertiary}
          onBlur={() => !isCreate && title.trim() && patch({ title: title.trim() })} />
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {err ? <Text style={s.err}>{err}</Text> : null}

        <Text style={s.label}>Task list</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          {(lists || []).map((l) => (
            <Pill key={l.id} label={l.name} tone="info" on={String(taskListId) === String(l.id)}
              onPress={() => { setTaskListId(l.id); if (!isCreate) patch({ task_list: l.id }); }} />
          ))}
        </ScrollView>

        <Text style={s.label}>Due date</Text>
        <DateField value={dueDate} onChange={(v) => { setDueDate(v); if (!isCreate) patch({ due_date: v || null }); }} compact />

        <Text style={s.label}>Status</Text>
        <View style={s.chips}>
          {STATUSES.map((st) => (
            <Pill key={st.value} label={st.label} tone={st.tone} on={status === st.value}
              onPress={() => { setStatus(st.value); if (!isCreate) patch({ status: st.value }); }} />
          ))}
        </View>

        <Text style={s.label}>Priority</Text>
        <View style={s.chips}>
          {PRIORITIES.map((p) => (
            <Pill key={p.value} label={p.label} tone={p.tone} on={priority === p.value}
              onPress={() => { setPriority(p.value); if (!isCreate) patch({ priority: p.value }); }} />
          ))}
        </View>

        <Text style={s.label}>Assignees — anyone in the company</Text>
        <View style={s.chips}>
          {assignees.map((a) => (
            <View key={a.id} style={s.assigneeChip}>
              <Text style={s.assigneeChipText}>{a.name}</Text>
              <TouchableOpacity onPress={() => removeAssignee(a.id)}><Ionicons name="close" size={13} color={COLORS.link} /></TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={s.addChip} onPress={() => setPickerOpen(true)}>
            <Ionicons name="add" size={14} color={COLORS.textSecondary} /><Text style={s.addChipText}>Add</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.label}>Description</Text>
        <TextInput style={[s.input, s.multi]} multiline value={description} onChangeText={setDescription}
          placeholder="What needs to happen…" placeholderTextColor={COLORS.textTertiary}
          onBlur={() => !isCreate && patch({ description })} />

        {isCreate ? (
          <Button title="Create Task" onPress={create} loading={saving} full style={s.createBtn} />
        ) : (
          <>
            <Text style={s.section}>CHECKLIST{checklist.length > 0 ? ` · ${checklistDone}/${checklist.length}` : ''}</Text>
            {checklist.map((item) => (
              <View key={item.id} style={s.checklistRow}>
                <TouchableOpacity onPress={() => toggleChecklistItem(item)}>
                  <Ionicons name={item.is_done ? 'checkbox' : 'square-outline'} size={20} color={item.is_done ? COLORS.success : COLORS.textSecondary} />
                </TouchableOpacity>
                <Text style={[s.checklistText, item.is_done && s.checklistDone]}>{item.text}</Text>
                <TouchableOpacity onPress={() => deleteChecklistItem(item)}><Ionicons name="close" size={16} color={COLORS.textTertiary} /></TouchableOpacity>
              </View>
            ))}
            <View style={s.addRow}>
              <TextInput style={[s.input, s.addInput]} value={newItem} onChangeText={setNewItem} placeholder="Add a checklist item…"
                placeholderTextColor={COLORS.textTertiary} onSubmitEditing={addChecklistItem} />
              <TouchableOpacity style={s.addBtn} onPress={addChecklistItem}><Ionicons name="add" size={18} color={COLORS.link} /></TouchableOpacity>
            </View>

            <Text style={s.section}>COMMENTS</Text>
            {comments.length === 0 ? <Text style={s.muted}>No comments yet.</Text> : comments.map((c) => (
              <View key={c.id} style={s.commentRow}>
                <Text style={s.commentAuthor}>{c.author?.name || '—'}</Text>
                <Text style={s.commentBody}>{c.body}</Text>
              </View>
            ))}
            <View style={s.addRow}>
              <TextInput style={[s.input, s.addInput]} value={newComment} onChangeText={setNewComment} placeholder="Write a comment…"
                placeholderTextColor={COLORS.textTertiary} onSubmitEditing={postComment} />
              <TouchableOpacity style={s.addBtn} onPress={postComment}><Ionicons name="send" size={16} color={COLORS.link} /></TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <FormSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} maxHeight="70%">
        <View style={s.pickerHead}>
          <Text style={s.pickerTitle}>Add assignee</Text>
          <TouchableOpacity onPress={() => setPickerOpen(false)}><Ionicons name="close" size={20} color={COLORS.textSecondary} /></TouchableOpacity>
        </View>
        <ScrollView style={s.scroll}>
          {unpicked.length === 0 ? <Text style={[s.muted, s.pickerEmpty]}>Everyone's already on this task.</Text> : unpicked.map((p) => (
            <TouchableOpacity key={p.id} style={s.pickerRow} onPress={() => addAssignee(p)}>
              <Text style={s.pickerRowText}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </FormSheet>
    </FormSheet>
  );
}

const s = StyleSheet.create({
  head: { paddingHorizontal: 20, paddingBottom: 8 },
  titleInput: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, paddingVertical: 4 },
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 28 },
  err: { color: COLORS.error, fontSize: 13, marginVertical: 8 },
  muted: { color: COLORS.textSecondary, fontSize: 13, paddingVertical: 8 },
  label: { fontSize: 11.5, fontWeight: '700', color: COLORS.textSecondary, marginTop: 14, marginBottom: 6 },
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: COLORS.textSecondary, marginTop: 18, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  pillText: { fontSize: 12.5, fontWeight: '600', color: COLORS.textSecondary },
  assigneeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.accentSoft },
  assigneeChipText: { fontSize: 12.5, fontWeight: '700', color: COLORS.link },
  addChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed' },
  addChipText: { fontSize: 12.5, fontWeight: '600', color: COLORS.textSecondary },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary, backgroundColor: COLORS.inputBg },
  multi: { minHeight: 70, textAlignVertical: 'top' },
  createBtn: { marginTop: 20 },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  checklistText: { flex: 1, fontSize: 13.5, color: COLORS.textPrimary },
  checklistDone: { textDecorationLine: 'line-through', color: COLORS.textTertiary },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 8, alignItems: 'center' },
  addInput: { flex: 1 },
  addBtn: { width: 40, height: 40, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  commentRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.screenBg },
  commentAuthor: { fontSize: 12.5, fontWeight: '700', color: COLORS.textPrimary },
  commentBody: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2, lineHeight: 18 },
  pickerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.screenBg },
  pickerTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  pickerRow: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.screenBg },
  pickerRowText: { fontSize: 15, color: COLORS.textPrimary },
  pickerEmpty: { paddingHorizontal: 20 },
});
