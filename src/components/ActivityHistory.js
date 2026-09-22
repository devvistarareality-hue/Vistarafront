import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { ACTIVITY_ENDPOINTS } from '../constants/api';
import { apiFetch } from '../utils/apiFetch';

// Who did what to one record (a booking, an AR account…), newest first — same
// as components/ActivityHistory.js on the website. Collapsed until opened.
export function fmtWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toneOf(action) {
  if (/approv|done|recorded|imported/.test(action)) return COLORS.success;
  if (/reject|cancel|delet/.test(action)) return COLORS.error;
  if (/submit|creat/.test(action)) return COLORS.link;
  return COLORS.textTertiary;
}

export function ActivityRows({ rows, showModule = true }) {
  if (!rows.length) return <Text style={s.empty}>Nothing recorded yet.</Text>;
  return (
    <View style={s.list}>
      {rows.map((r, i) => (
        <View key={r.id} style={s.item}>
          <View style={s.rail}>
            <View style={[s.dot, { borderColor: toneOf(r.action) }]} />{/* inline-ok: tone by action */}
            {i < rows.length - 1 ? <View style={s.line} /> : null}
          </View>
          <View style={s.body}>
            <Text style={s.summary}>{r.summary}</Text>
            <Text style={s.meta}>
              <Text style={s.who}>{r.actor?.name || 'System'}</Text>
              {showModule && r.module ? `  ·  ${r.module}` : ''}{`  ·  ${fmtWhen(r.at)}`}
              {r.legacy ? '  ·  from the record' : ''}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function ActivityHistory({ targetType, targetId, title = 'History — who did what', defaultOpen = false }) {
  const companyId = useSelector((st) => st.adminFilter?.companyId);
  const [open, setOpen] = useState(defaultOpen);
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open || !targetId) return undefined;
    let alive = true;
    const q = [`target_type=${targetType}`, `target_id=${targetId}`];
    if (companyId) q.push(`company_id=${companyId}`);
    setErr('');
    apiFetch(`${ACTIVITY_ENDPOINTS.log}?${q.join('&')}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!alive) return;
        if (!r.ok) { setErr(d.detail || 'Could not load the history.'); setRows([]); return; }
        setRows(d.results || []);
      })
      .catch(() => { if (alive) { setErr('Could not load the history.'); setRows([]); } });
    return () => { alive = false; };
  }, [open, targetType, targetId, companyId]);

  return (
    <View style={s.box}>
      <TouchableOpacity style={s.toggle} onPress={() => setOpen((v) => !v)} activeOpacity={0.7}>
        <Ionicons name="time-outline" size={15} color={COLORS.link} />
        <Text style={s.toggleText}>{title}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={COLORS.link} />
      </TouchableOpacity>
      {open ? (err ? <Text style={s.err}>{err}</Text> : rows === null ? <Text style={s.empty}>Loading…</Text> : <ActivityRows rows={rows} />) : null}
    </View>
  );
}

const s = StyleSheet.create({
  box: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  toggleText: { fontSize: 13, fontWeight: '800', color: COLORS.link },
  list: { marginTop: 8 },
  item: { flexDirection: 'row', gap: 12 },
  rail: { width: 12, alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, backgroundColor: COLORS.surface, marginTop: 3 },
  line: { flex: 1, width: 2, backgroundColor: COLORS.border, marginVertical: 2 },
  body: { flex: 1, paddingBottom: 14 },
  summary: { fontSize: 13.5, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 19 },
  meta: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 3 },
  who: { fontWeight: '800', color: COLORS.textPrimary },
  empty: { fontSize: 13, color: COLORS.textSecondary, paddingVertical: 10 },
  err: { fontSize: 13, color: COLORS.error, paddingVertical: 10 },
});
