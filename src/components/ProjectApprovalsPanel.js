/**
 * Project Approvals — the third section of the Approvals screen.
 *
 * Mirrors web/src/app/sales/bookings/_ProjectApprovals.js. A new project is
 * invisible to everyone until someone signs it off, so this is where that
 * happens. Two halves: the approver picker, which is one list for the whole
 * company rather than one per project (a project does not exist yet when it
 * needs approving, so there is nothing to scope the choice to), and the queue.
 *
 * Rejecting asks for a reason and keeps the project, so whoever created it can
 * read why and fix it rather than starting again.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, Modal, ActivityIndicator, Alert, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { apiFetch } from '../utils/apiFetch';
import { SALES_ENDPOINTS } from '../constants/api';
import { COLORS, CARD_SHADOW } from '../constants/theme';
import AppLoader from './AppLoader';

const TABS = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All']];

export default function ProjectApprovalsPanel({ isAdmin, refreshKey }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [busy, setBusy] = useState(null);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [approvers, setApprovers] = useState([]);
  const [people, setPeople] = useState([]);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(SALES_ENDPOINTS.projects);
      if (res.ok) {
        const d = await res.json();
        setProjects(Array.isArray(d) ? d : d.results || []);
      }
    } catch (e) { /* keep what is on screen */ }
    setLoading(false);
  }, []);

  const loadApprovers = useCallback(async () => {
    try {
      const res = await apiFetch(SALES_ENDPOINTS.projectApprovers);
      if (!res.ok) return;
      const d = await res.json();
      setApprovers(d.approvers || []);
      setPeople(d.people || []);
    } catch (e) { /* the panel stays as it was */ }
  }, []);

  useEffect(() => { load(); loadApprovers(); }, [load, loadApprovers, refreshKey]);

  async function act(project, action, why = '') {
    setBusy(project.id);
    try {
      const res = await apiFetch(SALES_ENDPOINTS.projectApproval(project.id), {
        method: 'POST',
        body: JSON.stringify({ action, ...(why ? { reason: why } : {}) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { Alert.alert('Could not update the project', d.detail || 'Please try again.'); return; }
      setRejecting(null); setReason('');
      load();
    } finally {
      setBusy(null);
    }
  }

  async function toggleApprover(id) {
    const next = approvers.includes(id) ? approvers.filter((x) => x !== id) : [...approvers, id];
    setApprovers(next);                       // optimistic: the picker stays responsive
    try {
      const res = await apiFetch(SALES_ENDPOINTS.projectApprovers, {
        method: 'PATCH', body: JSON.stringify({ approvers: next }),
      });
      if (!res.ok) { loadApprovers(); return; }     // server refused — show the truth
      const d = await res.json();
      setApprovers(d.approvers || []);
    } catch (e) { loadApprovers(); }
  }

  const shown = tab === 'all' ? projects
    : projects.filter((p) => (p.approval_status || 'approved') === tab);
  const pendingCount = projects.filter((p) => p.approval_status === 'pending').length;

  return (
    <View>
      {isAdmin && (
        <View style={pa.cfg}>
          <TouchableOpacity onPress={() => setCfgOpen((o) => !o)}>
            <Text style={pa.cfgToggle}>Project Approvers {cfgOpen ? '▴' : '▾'}</Text>
          </TouchableOpacity>
          {cfgOpen && (
            <View style={pa.cfgBody}>
              <Text style={pa.cfgHint}>
                One list for the whole company, not one per project. Whoever is named here
                approves every new project and is notified when one is created.
              </Text>
              {people.length === 0
                ? <Text style={pa.empty}>No managers in this company.</Text>
                : people.map((m) => {
                  const on = approvers.includes(m.id);
                  return (
                    <TouchableOpacity key={m.id} onPress={() => toggleApprover(m.id)} style={pa.optRow}>
                      <Ionicons name={on ? 'checkbox' : 'square-outline'} size={18}
                        color={on ? COLORS.link : COLORS.textSecondary} />
                      <Text style={pa.optName}>{m.name}</Text>
                      <Text style={pa.optRole}>{m.role}</Text>
                    </TouchableOpacity>
                  );
                })}
            </View>
          )}
        </View>
      )}

      <View style={pa.tabs}>
        {TABS.map(([k, label]) => (
          <TouchableOpacity key={k} onPress={() => setTab(k)} style={[pa.tab, tab === k && pa.tabOn]}>
            <Text style={[pa.tabText, tab === k && pa.tabTextOn]}>
              {label}{k === 'pending' && pendingCount > 0 ? ` · ${pendingCount}` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <AppLoader size={0.7} style={pa.loader} /> : shown.length === 0 ? (
        <Text style={pa.empty}>
          {tab === 'pending' ? 'No projects waiting for approval.' : `No ${tab} projects.`}
        </Text>
      ) : shown.map((p) => {
        const st = p.approval_status || 'approved';
        return (
          <View key={p.id} style={pa.row}>
            <View style={pa.rowHead}>
              <Text style={pa.rowName}>{p.name}</Text>
              <View style={[pa.badge, st === 'pending' ? pa.badgePending
                : st === 'rejected' ? pa.badgeRejected : pa.badgeApproved]}>
                <Text style={[pa.badgeText, st === 'pending' ? pa.badgeTextPending
                  : st === 'rejected' ? pa.badgeTextRejected : pa.badgeTextApproved]}>
                  {st.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={pa.rowMeta}>
              {(p.location || '—')} · {p.project_type}
              {st === 'rejected' && p.rejected_reason ? ` · ${p.rejected_reason}` : ''}
            </Text>
            {st === 'pending' && (
              <View style={pa.actions}>
                <TouchableOpacity onPress={() => act(p, 'approve')} disabled={busy === p.id}
                  style={[pa.btn, pa.btnOk]}>
                  {busy === p.id ? <ActivityIndicator color={COLORS.btnTextSuccess} />
                    : <Text style={pa.btnOkText}>Approve</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setRejecting(p); setReason(''); }} disabled={busy === p.id}
                  style={[pa.btn, pa.btnBad]}>
                  <Text style={pa.btnBadText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      <Modal visible={!!rejecting} transparent animationType="fade" onRequestClose={() => setRejecting(null)}>
        <View style={pa.modalBack}>
          <View style={pa.modal}>
            <Text style={pa.modalTitle}>Reject {rejecting?.name}?</Text>
            <Text style={pa.modalHint}>
              It stays hidden from everyone and keeps this reason, so whoever created it can
              see what to fix.
            </Text>
            <TextInput style={pa.modalInput} value={reason} onChangeText={setReason} autoFocus
              placeholder="Why — e.g. RERA number missing"
              placeholderTextColor={COLORS.textTertiary} />
            <View style={pa.modalActions}>
              <TouchableOpacity onPress={() => setRejecting(null)} style={[pa.btn, pa.btnGhost]}>
                <Text style={pa.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={!reason.trim()} style={[pa.btn, pa.btnBad, !reason.trim() && pa.btnDim]}
                onPress={() => act(rejecting, 'reject', reason.trim())}>
                <Text style={pa.btnBadText}>Reject project</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const pa = StyleSheet.create({
  cfg: { backgroundColor: COLORS.surface, borderRadius: 18, padding: 14, marginBottom: 12, ...CARD_SHADOW },
  cfgToggle: { fontSize: 13, fontWeight: '700', color: COLORS.link },
  cfgBody: { marginTop: 10 },
  cfgHint: { fontSize: 11.5, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 10 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9,
            borderTopWidth: 1, borderTopColor: COLORS.border },
  optName: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  optRole: { fontSize: 11, color: COLORS.textSecondary },

  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tab: { paddingHorizontal: 13, paddingVertical: 7, borderRadius: 16, backgroundColor: COLORS.surfaceAlt },
  tabOn: { backgroundColor: COLORS.navy },
  tabText: { fontSize: 12.5, fontWeight: '700', color: COLORS.textSecondary },
  tabTextOn: { color: '#fff' },

  row: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, marginBottom: 10, ...CARD_SHADOW },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowName: { flex: 1, fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  rowMeta: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 4, lineHeight: 17 },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  badgePending: { backgroundColor: COLORS.warningBg },
  badgeTextPending: { color: COLORS.warning },
  badgeApproved: { backgroundColor: COLORS.successBg },
  badgeTextApproved: { color: COLORS.success },
  badgeRejected: { backgroundColor: COLORS.errorBg },
  badgeTextRejected: { color: COLORS.error },

  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  btn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12, alignItems: 'center' },
  btnDim: { opacity: 0.45 },
  btnOk: { backgroundColor: COLORS.btnTintSuccess, borderWidth: 1, borderColor: COLORS.btnBorderSuccess },
  btnOkText: { color: COLORS.btnTextSuccess, fontWeight: '700', fontSize: 13 },
  btnBad: { backgroundColor: COLORS.btnTintDanger, borderWidth: 1, borderColor: COLORS.btnBorderDanger },
  btnBadText: { color: COLORS.btnTextDanger, fontWeight: '700', fontSize: 13 },
  btnGhost: { backgroundColor: COLORS.surfaceAlt },
  btnGhostText: { color: COLORS.textSecondary, fontWeight: '700', fontSize: 13 },

  modalBack: { flex: 1, backgroundColor: 'rgba(4,8,16,0.55)', alignItems: 'center',
               justifyContent: 'center', padding: 16 },
  modal: { width: '100%', maxWidth: 440, backgroundColor: COLORS.surface, borderRadius: 18, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  modalHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 6, lineHeight: 17 },
  modalInput: { height: 44, marginTop: 14, paddingHorizontal: 12, borderRadius: 12,
                borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.inputBg,
                fontSize: 13.5, color: COLORS.textPrimary },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },

  loader: { paddingVertical: 28 },
  empty: { textAlign: 'center', paddingVertical: 28, fontSize: 13, color: COLORS.textSecondary },
});
