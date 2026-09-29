import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { COLORS, withAlpha } from '../constants/theme';
import { SALES_ENDPOINTS } from '../constants/api';
import { apiFetch } from '../utils/apiFetch';
import AppIcon from './AppIcon';
import AppLoader from './AppLoader';

// A lead's timeline — status changes, assignments, visits, closures and its
// follow-ups (scheduled / done / missed), newest first — for screens that are not
// the lead sheet itself, e.g. Follow-ups → Complete. Mirrors
// vistaraweb/src/components/LeadHistory.js.
const LABEL = {
  created: 'Lead Created', status: 'Overall Status', telecaller_status: 'TC Status', stm_status: 'STM Status',
  telecaller_remarks: 'TC Remarks', stm_remarks: 'STM Remarks', telecaller: 'Telecaller Assigned',
  stm: 'STM Assigned', warm_transfer: 'Transferred to STM', site_visit: 'Site Visit', closure: 'Closure',
  follow_up: 'Follow-up Scheduled', follow_up_done: 'Follow-up Done', follow_up_missed: 'Follow-up Missed',
  re_enquiry: 'Enquired Again',
};
const TONE = {
  status: COLORS.link, telecaller_status: COLORS.success, stm_status: COLORS.warningAlt,
  telecaller_remarks: COLORS.success, stm_remarks: COLORS.warningAlt, telecaller: COLORS.link, stm: COLORS.success,
  warm_transfer: COLORS.error, site_visit: COLORS.warningAlt, closure: COLORS.success,
  follow_up: COLORS.link, follow_up_done: COLORS.success, follow_up_missed: COLORS.error, re_enquiry: COLORS.warningAlt,
};
const icon = (f) => (f === 'warm_transfer' ? 'flame' : f === 'telecaller' ? 'user' : f === 'stm' ? 'building'
  : f === 'site_visit' ? 'home' : f === 'closure' ? 'check-circle' : f.startsWith('follow_up') ? 'calendar'
    : f.includes('remarks') ? 'note' : 'refresh');
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '');

export default function LeadHistory({ leadId, style }) {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    setRows(null); setErr('');
    apiFetch(SALES_ENDPOINTS.lead(leadId))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Could not load the history.'))))
      .then((d) => { if (alive) setRows((d.history || []).filter((h) => h.field_changed !== 'created').reverse()); })
      .catch((e) => { if (alive) setErr(e.message); });
    return () => { alive = false; };
  }, [leadId]);

  if (err) return <Text style={st.empty}>{err}</Text>;
  if (!rows) return <AppLoader size={0.5} style={st.loader} />;
  if (!rows.length) return <Text style={st.empty}>No history yet.</Text>;
  return (
    <ScrollView style={[st.list, style]} nestedScrollEnabled>
      {rows.map((h) => {
        const f = h.field_changed;
        const tone = TONE[f] || COLORS.textSecondary;
        const single = ['warm_transfer', 'closure', 'telecaller_remarks', 'stm_remarks'].includes(f) || !h.old_value;
        const text = (f.includes('remarks') ? h.remarks : null) || h.new_value || '—';
        const by = h.changed_by_name || (['telecaller', 'stm'].includes(f) ? 'System (auto)' : null);
        const dotTone = { backgroundColor: withAlpha(tone, '1A') }; // inline-ok: each entry's own colour
        const textTone = { color: tone }; // inline-ok: each entry's own colour
        return (
          <View key={String(h.id)} style={st.row}>
            <View style={[st.dot, dotTone]}>
              <AppIcon name={icon(f)} size={14} color={tone} />
            </View>
            <View style={st.body}>
              <Text style={st.title}>{LABEL[f] || f}</Text>
              {single
                ? <Text style={[st.value, textTone]}>{text}</Text>
                : <Text style={st.value}><Text style={st.old}>{h.old_value}</Text> → <Text style={[st.strong, textTone]}>{h.new_value || '—'}</Text></Text>}
              <Text style={st.meta}>{by ? `by ${by} · ` : ''}{fmt(h.created_at)}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  list: { maxHeight: 420 },
  loader: { marginVertical: 20 },
  empty: { fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', marginVertical: 20 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  dot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  title: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  value: { fontSize: 12, color: COLORS.textPrimary, marginTop: 2, fontWeight: '600' },
  old: { color: COLORS.textSecondary, fontWeight: '400' },
  strong: { fontWeight: '700' },
  meta: { fontSize: 11, color: COLORS.textTertiary, marginTop: 2 },
});
