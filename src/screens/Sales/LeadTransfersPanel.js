import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '../../constants/theme';
import { SALES_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import AppLoader from '../../components/AppLoader';
import { Badge, Button } from '../../components/ui';

// Lead transfer approvals with a status filter — the app side of the website's
// sales/_LeadTransfers.js. Pending ones can be approved or rejected; decided ones
// say who approved / rejected / withdrew them, when, and the note.
const TABS = [
  ['pending', 'Pending'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['cancelled', 'Withdrawn'],
  ['', 'All'],
];
const STATUS = {
  pending:   { tone: 'warning', label: 'Pending',   edge: COLORS.warningSolid },
  approved:  { tone: 'success', label: 'Approved',  edge: COLORS.success },
  rejected:  { tone: 'danger',  label: 'Rejected',  edge: COLORS.error },
  cancelled: { tone: 'neutral', label: 'Withdrawn', edge: COLORS.borderStrong },
};
const VERB = { approved: 'Approved by', rejected: 'Rejected by', cancelled: 'Withdrawn by' };

function when(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
    + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
}

export default function LeadTransfersPanel({ companyId, cpOnly, pendingCount, onChanged, refreshKey }) {
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    setRows(null);
    const q = [status ? `status=${status}` : '', companyId ? `company_id=${companyId}` : '', cpOnly ? 'cp_only=true' : ''].filter(Boolean).join('&');
    apiFetch(`${SALES_ENDPOINTS.leadTransfers}${q ? `?${q}` : ''}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]));
  }, [status, companyId, cpOnly]);
  useEffect(() => { load(); }, [load, refreshKey]);

  function act(x, action) {
    const approve = action === 'approve';
    Alert.alert(approve ? 'Approve transfer?' : 'Reject transfer?',
      `${approve ? 'Approve' : 'Reject'} moving ${x.lead_name || 'this lead'} from ${x.from_stm_name || 'unassigned'} to ${x.to_stm_name}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: approve ? 'Approve' : 'Reject', style: approve ? 'default' : 'destructive', onPress: async () => {
          setBusy(x.id);
          const r = await apiFetch(SALES_ENDPOINTS.leadTransferAction(x.id), { method: 'POST', body: JSON.stringify({ action }) }).catch(() => null);
          setBusy(null);
          if (!r?.ok) Alert.alert('Error', (await r?.json().catch(() => ({})))?.detail || 'Could not update the transfer.');
          load(); onChanged?.();
        } },
      ]);
  }

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabs}>
        {TABS.map(([k, label]) => (
          <TouchableOpacity key={k || 'all'} onPress={() => setStatus(k)} activeOpacity={0.8} style={[s.tab, status === k && s.tabOn]}>
            <Text style={[s.tabText, status === k && s.tabTextOn]}>{label}{k === 'pending' && pendingCount > 0 ? ` · ${pendingCount}` : ''}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {status === 'pending' && <Text style={s.hint}>The lead stays with the current STM until you approve.</Text>}

      {rows === null ? <AppLoader size={0.7} label="Loading transfers…" /> : rows.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>{status === 'pending' ? 'No lead transfers are waiting for your approval.'
            : status ? `No ${STATUS[status].label.toLowerCase()} lead transfers.` : 'No lead transfers yet.'}</Text>
        </View>
      ) : rows.map((x) => {
        const st = STATUS[x.status] || STATUS.pending;
        return (
          <View key={x.id} style={[s.card, { borderLeftColor: st.edge }]}>{/* inline-ok: status colour edge */}
            <View style={s.titleRow}>
              <Text style={s.lead} numberOfLines={1}>{x.lead_name || 'Lead'}</Text>
              <Badge label={st.label} tone={st.tone} />
            </View>
            {x.project_name ? <Text style={s.project}>{x.project_name}</Text> : null}
            <View style={s.moveRow}>
              <Text style={s.from} numberOfLines={1}>{x.from_stm_name || 'Unassigned'}</Text>
              <Ionicons name="arrow-forward" size={14} color={COLORS.warning} />
              <Text style={s.to} numberOfLines={1}>{x.to_stm_name}</Text>
            </View>
            <Text style={s.meta}>Requested by {x.requested_by_name || '—'} · {when(x.created_at)}</Text>
            {x.reason ? <Text style={s.reason}>“{x.reason}”</Text> : null}
            {x.status !== 'pending' ? (
              <Text style={[s.decision, x.status === 'approved' ? s.good : x.status === 'rejected' ? s.bad : s.muted]}>
                {VERB[x.status]} <Text style={s.bold}>{x.decided_by_name || '—'}</Text>{x.decided_at ? ` · ${when(x.decided_at)}` : ''}
                {x.decision_note ? ` · “${x.decision_note}”` : ''}
              </Text>
            ) : (
              <View style={s.actions}>
                <Button title="Reject" icon="x" variant="dangerSoft" size="sm" onPress={() => act(x, 'reject')} disabled={busy === x.id} style={s.flex} />
                <Button title="Approve" icon="check" variant="success" size="sm" onPress={() => act(x, 'approve')} loading={busy === x.id} style={s.flex} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  bold: { fontWeight: '800' },
  good: { color: COLORS.success },
  bad: { color: COLORS.error },
  muted: { color: COLORS.textSecondary },
  tabs: { gap: 8, paddingBottom: 10 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  tabOn: { borderColor: COLORS.link, backgroundColor: COLORS.surface2 },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tabTextOn: { color: COLORS.link, fontWeight: '800' },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 10 },
  empty: { padding: 24, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.cardBorder, alignItems: 'center' },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
  card: { padding: 14, marginBottom: 10, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.cardBorder, borderLeftWidth: 4, gap: 4, ...SHADOWS.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lead: { flex: 1, fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  project: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  moveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  from: { flexShrink: 1, fontSize: 13, color: COLORS.textSecondary },
  to: { flexShrink: 1, fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  meta: { fontSize: 11.5, color: COLORS.textTertiary },
  reason: { fontSize: 12, fontStyle: 'italic', color: COLORS.textSecondary },
  decision: { fontSize: 12.5, fontWeight: '600', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
});
