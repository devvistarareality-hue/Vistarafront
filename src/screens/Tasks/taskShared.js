import React, { useState } from 'react';
import { Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../../constants/theme';
import { formatDMY } from '../../utils/dateFormat';

// Shared bits for the Task Allocation screens — same rules as the website's _execution.js.
export const STATUSES = [
  { value: 'todo', label: 'To Do', tone: 'muted' },
  { value: 'in_progress', label: 'In Progress', tone: 'info' },
  { value: 'in_review', label: 'In Review', tone: 'warn' },
  { value: 'done', label: 'Done', tone: 'good' },
  { value: 'blocked', label: 'Blocked', tone: 'bad' },
];
export const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.value, s.label]));

export const PRIORITIES = [
  { value: 'urgent', label: 'Urgent', tone: 'bad' },
  { value: 'high', label: 'High', tone: 'warn' },
  { value: 'normal', label: 'Normal', tone: 'info' },
  { value: 'low', label: 'Low', tone: 'muted' },
];
export const PRIORITY_LABEL = Object.fromEntries(PRIORITIES.map((p) => [p.value, p.label]));

const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toISO(new Date());

export function isOverdue(task) {
  return !!task.due_date && task.status !== 'done' && task.due_date < today();
}

export const withCompany = (url, companyId, extra = []) => {
  const p = [...extra];
  if (companyId) p.push(`company_id=${companyId}`);
  return p.length ? `${url}${url.includes('?') ? '&' : '?'}${p.join('&')}` : url;
};

// A tappable date box that opens the native picker. value is 'YYYY-MM-DD' or ''.
export function DateField({ value, onChange, placeholder = 'Select date', style, compact }) {
  const [open, setOpen] = useState(false);
  const current = value ? new Date(`${value}T00:00:00`) : new Date();
  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.75} style={[s.box, compact && s.boxCompact, style]}>
        <Text style={[s.text, !value && s.placeholder]} numberOfLines={1}>{value ? formatDMY(value) : placeholder}</Text>
        <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
      </TouchableOpacity>
      {open && (
        <DateTimePicker value={current} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(_, d) => { setOpen(false); if (d) onChange(toISO(d)); }} />
      )}
    </>
  );
}

const s = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderWidth: 1.5, borderColor: COLORS.border,
         borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: COLORS.inputBg },
  boxCompact: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1 },
  text: { flexShrink: 1, fontSize: 14.5, color: COLORS.textPrimary, fontWeight: '600' },
  placeholder: { color: COLORS.textTertiary, fontWeight: '500' },
});
