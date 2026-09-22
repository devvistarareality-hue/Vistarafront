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

const TYPE_NAME = {
  lead: 'Lead', 'follow-up': 'Follow-up', 'site-visit': 'Site visit', booking: 'Booking', closure: 'Closure',
  plot: 'Plot', project: 'Project', ar_account: 'AR account', user: 'User', 'channel-partner': 'Channel partner',
};

// One log line: what happened, to whom (named, not "#45975"), and on tap every
// field that changed, old → new. Same as the website.
const ActivityRow = React.memo(function ActivityRow({ r, last, showModule }) {
  const [open, setOpen] = useState(false);
  const changes = r.changes || [];
  const named = r.label && !(r.summary || '').includes(r.label);
  return (
    <View style={s.item}>
      <View style={s.rail}>
        <View style={[s.dot, { borderColor: toneOf(r.action) }]} />{/* inline-ok: tone by action */}
        {!last ? <View style={s.line} /> : null}
      </View>
      <View style={s.body}>
        <Text style={s.summary}>{r.summary}</Text>
        {named ? <Text style={s.target}><Text style={s.targetType}>{(TYPE_NAME[r.target_type] || 'Record').toUpperCase()}  </Text>{r.label}</Text> : null}
        <Text style={s.meta}>
          <Text style={s.who}>{r.actor?.name || 'System'}</Text>
          {showModule && r.module ? `  ·  ${r.module}` : ''}{`  ·  ${fmtWhen(r.at)}`}
          {r.legacy ? '  ·  from the record' : ''}
        </Text>
        {changes.length > 0 ? (
          <TouchableOpacity onPress={() => setOpen((v) => !v)} activeOpacity={0.7}>
            <Text style={s.moreBtn}>{open ? 'Hide changes' : `${changes.length} change${changes.length === 1 ? '' : 's'}`}</Text>
          </TouchableOpacity>
        ) : null}
        {open ? changes.map((c, i) => (
          <View key={i} style={s.change}>
            <Text style={s.changeField}>{c.field}</Text>
            <Text style={s.changeText}><Text style={s.old}>{c.from}</Text>  →  {c.to}</Text>
          </View>
        )) : null}
      </View>
    </View>
  );
});

export function ActivityRows({ rows, showModule = true }) {
  if (!rows.length) return <Text style={s.empty}>Nothing recorded yet.</Text>;
  return (
    <View style={s.list}>
      {rows.map((r, i) => <ActivityRow key={r.id} r={r} last={i === rows.length - 1} showModule={showModule} />)}
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
  target: { fontSize: 12.5, fontWeight: '600', color: COLORS.textPrimary, marginTop: 3 },
  targetType: { fontSize: 10.5, fontWeight: '800', color: COLORS.link },
  moreBtn: { fontSize: 12, fontWeight: '700', color: COLORS.link, marginTop: 5 },
  change: { marginTop: 5 },
  changeField: { fontSize: 11.5, fontWeight: '700', color: COLORS.textSecondary },
  changeText: { fontSize: 12.5, color: COLORS.textPrimary, marginTop: 1 },
  old: { color: COLORS.textTertiary, textDecorationLine: 'line-through' },
  empty: { fontSize: 13, color: COLORS.textSecondary, paddingVertical: 10 },
  err: { fontSize: 13, color: COLORS.error, paddingVertical: 10 },
});
