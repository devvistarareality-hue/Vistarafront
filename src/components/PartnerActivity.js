/**
 * Follow-ups and site visits with a channel partner themselves — the mobile
 * half of web/src/app/m/[module]/_PartnerActivity.js.
 *
 * The CP module already tracks both of these against a partner's *leads*. This
 * is the partner side of the relationship: ringing them to stay in touch, and
 * driving them out to a project. Any number of each, over and over — which is
 * also why there is deliberately no hot/warm/cold here. That judgement belongs
 * to a lead being qualified, not to someone you sell through for years.
 *
 * Two exports, rendering the same rows:
 *   PartnerActivitySheet — one partner's history, opened from the directory.
 *   PartnerActivityPanel — the whole company's, as the CP Details tab panel.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal,
         StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { apiFetch } from '../utils/apiFetch';
import { SALES_ENDPOINTS } from '../constants/api';
import { COLORS } from '../constants/theme';
import common from '../styles/common';
import AppLoader from './AppLoader';
import FilterSelect from './FilterSelect';

// Each status names a StyleSheet pair rather than carrying raw colours, so the
// pill stays a shared style instead of an object literal built per render.
// These are the model's own choice lists (FOLLOWUP_STATUS and SV_STATUS in
// backend/sales/models.py), not a parallel set — the two lists genuinely differ,
// and a status that is not in them comes back as a 400.
const FU_STATUS = {
  pending:     { label: 'Pending',     tone: 'warn' },
  completed:   { label: 'Completed',   tone: 'ok' },
  missed:      { label: 'Missed',      tone: 'bad' },
  rescheduled: { label: 'Rescheduled', tone: 'mute' },
};
const SV_STATUS = {
  scheduled: { label: 'Scheduled', tone: 'info' },
  completed: { label: 'Completed', tone: 'ok' },
  cancelled: { label: 'Cancelled', tone: 'mute' },
  no_show:   { label: 'No Show',   tone: 'bad' },
};
// What counts as "still owed" differs between the two, so the open state is
// named once rather than hard-coded as 'pending' at each use. The second action
// on an open row follows: a call that did not happen was missed, a visit that
// will not happen is cancelled.
const OPEN_STATUS = { fu: 'pending', sv: 'scheduled' };
const DROP_STATUS = { fu: ['missed', 'Missed'], sv: ['cancelled', 'Cancel'] };

const tones = StyleSheet.create({
  badBg:  { backgroundColor: COLORS.errorBg },
  badFg:  { color: COLORS.error },
  okBg:   { backgroundColor: COLORS.successBg },
  okFg:   { color: COLORS.success },
  warnBg: { backgroundColor: COLORS.warningBg },
  warnFg: { color: COLORS.warning },
  infoBg: { backgroundColor: COLORS.linkBg },
  infoFg: { color: COLORS.link },
  muteBg: { backgroundColor: COLORS.surfaceAlt },
  muteFg: { color: COLORS.textSecondary },
});
function fmt(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const TONE_BG   = { ok: tones.okBg, warn: tones.warnBg, info: tones.infoBg, mute: tones.muteBg, bad: tones.badBg };
const TONE_TEXT = { ok: tones.okFg, warn: tones.warnFg, info: tones.infoFg, mute: tones.muteFg, bad: tones.badFg };

function StatusPill({ map, value }) {
  const s = map[value] || { label: value || '—', tone: 'mute' };
  return (
    <View style={[st.pill, TONE_BG[s.tone] || TONE_BG.mute]}>
      <Text style={[st.pillText, TONE_TEXT[s.tone] || TONE_TEXT.mute]}>{s.label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------- data */

function useActivity({ kind, partnerId, companyId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const q = [partnerId ? `channel_partner_id=${partnerId}` : '',
               companyId ? `company_id=${companyId}` : ''].filter(Boolean).join('&');
    const url = kind === 'fu'
      ? SALES_ENDPOINTS.partnerFollowUps(q ? `?${q}` : '')
      : SALES_ENDPOINTS.partnerSiteVisits(q ? `?${q}` : '');
    try {
      const res = await apiFetch(url);
      if (res.ok) {
        const d = await res.json();
        setRows(Array.isArray(d) ? d : []);
      }
    } catch (_) {}
    setLoading(false);
  }, [kind, partnerId, companyId]);

  useEffect(() => { load(); }, [load]);
  return { rows, loading, reload: load };
}

/* ------------------------------------------------------------- scheduling */

// Both forms share the when-picker and the remarks box; only site visits add a
// project, so one component covers both rather than near-duplicate siblings.
function ScheduleForm({ kind, partnerId, partners, companyId, onDone, onCancel }) {
  // On a partner's own sheet the partner is known; on the module screen it has
  // to be chosen out of a directory running to hundreds, so the picker filters.
  const [who, setWho] = useState('');
  const [partnerQ, setPartnerQ] = useState('');
  const target = partnerId || who;
  const [when, setWhen] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [projects, setProjects] = useState([]);
  const [project, setProject] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (kind !== 'sv') return;
    (async () => {
      try {
        const res = await apiFetch(SALES_ENDPOINTS.projects + (companyId ? `?company_id=${companyId}` : ''));
        if (res.ok) {
          const d = await res.json();
          setProjects(Array.isArray(d) ? d.filter((p) => p.is_active !== false) : []);
        }
      } catch (_) {}
    })();
  }, [kind, companyId]);

  async function save() {
    if (!target) { setErr('Pick the partner first.'); return; }
    if (kind === 'sv' && !project) { setErr('Pick the project they are visiting.'); return; }
    setSaving(true); setErr('');
    const url = kind === 'fu' ? SALES_ENDPOINTS.partnerFollowUps() : SALES_ENDPOINTS.partnerSiteVisits();
    const body = { channel_partner: target, scheduled_at: when.toISOString(), remarks };
    if (kind === 'sv') body.project = project;
    try {
      const res = await apiFetch(url, { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.detail || 'Could not schedule that.'); setSaving(false); return; }
      onDone();
    } catch (e) { setErr(e.message); setSaving(false); }
  }

  // Only the partners whose name, firm or number matches, capped so a 588-row
  // directory does not mount as 588 rows in a dropdown.
  const partnerOptions = (() => {
    const needle = partnerQ.trim().toLowerCase();
    const hits = (partners || []).filter((cp) => !needle
      || [cp.name, cp.firm_name, cp.contact_no]
        .some((v) => String(v || '').toLowerCase().includes(needle)));
    return hits.slice(0, 50).map((cp) => ({
      value: String(cp.id),
      label: cp.firm_name ? `${cp.name} · ${cp.firm_name}` : cp.name,
    }));
  })();

  return (
    <View style={st.form}>
      {!partnerId && (
        <>
          <Text style={st.lbl}>Partner</Text>
          <TextInput value={partnerQ} onChangeText={setPartnerQ}
            placeholder="Search name, firm or number…"
            placeholderTextColor={COLORS.textSecondary}
            style={[common.input, st.partnerSearch]} />
          <FilterSelect label="— Select partner —" value={who} onChange={setWho}
            options={[{ value: '', label: '— Select partner —' }, ...partnerOptions]}
            style={st.select} />
        </>
      )}

      {kind === 'sv' && (
        <>
          <Text style={st.lbl}>Project</Text>
          <FilterSelect label="— Select —" value={project} onChange={setProject}
            options={[{ value: '', label: '— Select —' },
                      ...projects.map((p) => ({ value: String(p.id), label: p.name }))]}
            style={st.select} />
        </>
      )}

      <Text style={st.lbl}>When</Text>
      <View style={st.whenRow}>
        <TouchableOpacity onPress={() => setShowDate(true)} style={st.whenBtn}>
          <Ionicons name="calendar-outline" size={15} color={COLORS.textSecondary} />
          <Text style={st.whenText}>{when.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowTime(true)} style={st.whenBtn}>
          <Ionicons name="time-outline" size={15} color={COLORS.textSecondary} />
          <Text style={st.whenText}>{when.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
        </TouchableOpacity>
      </View>
      {showDate && (
        <DateTimePicker value={when} mode="date" display="default"
          onChange={(e, d) => {
            setShowDate(false);
            if (e.type === 'dismissed' || !d) return;
            // Keep the time the user already set — a date picker returns midnight.
            const next = new Date(when);
            next.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
            setWhen(next);
          }} />
      )}
      {showTime && (
        <DateTimePicker value={when} mode="time" display="default"
          onChange={(e, d) => {
            setShowTime(false);
            if (e.type === 'dismissed' || !d) return;
            const next = new Date(when);
            next.setHours(d.getHours(), d.getMinutes(), 0, 0);
            setWhen(next);
          }} />
      )}

      <Text style={st.lbl}>Remarks</Text>
      <TextInput value={remarks} onChangeText={setRemarks} multiline
        placeholder={kind === 'fu' ? 'What is this call about?' : 'Who is hosting, what are they being shown?'}
        placeholderTextColor={COLORS.textSecondary}
        style={[common.input, st.textarea]} />

      {!!err && <Text style={st.err}>{err}</Text>}

      <View style={st.formActions}>
        <TouchableOpacity onPress={save} disabled={saving}
          style={[common.btn, common.btnPrimary, st.flex1, saving && st.dim]}>
          <Text style={common.btnPrimaryText}>
            {saving ? 'Scheduling…' : kind === 'fu' ? 'Schedule Follow-Up' : 'Schedule Site Visit'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onCancel} style={[common.btn, common.btnSecondary]}>
          <Text style={common.btnSecondaryText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------- rows */

function ActivityCard({ kind, row, showPartner, onChanged }) {
  const endpoint = kind === 'fu' ? SALES_ENDPOINTS.partnerFollowUp : SALES_ENDPOINTS.partnerSiteVisit;
  const map = kind === 'fu' ? FU_STATUS : SV_STATUS;
  const [busy, setBusy] = useState(false);
  const open = row.status === OPEN_STATUS[kind];
  const overdue = open && row.scheduled_at && new Date(row.scheduled_at) < new Date();

  async function setStatus(status) {
    setBusy(true);
    const res = await apiFetch(endpoint(row.id), {
      method: 'PATCH', body: JSON.stringify({ status }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) { Alert.alert('Could not update', 'Try again.'); return; }
    onChanged();
  }

  function remove() {
    const what = kind === 'fu' ? 'follow-up' : 'site visit';
    Alert.alert(`Remove this ${what}?`, 'It will not be recoverable.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
          setBusy(true);
          const res = await apiFetch(endpoint(row.id), { method: 'DELETE' }).catch(() => null);
          setBusy(false);
          if (res && (res.ok || res.status === 204)) onChanged();
          else Alert.alert('Could not remove', 'Try again.');
        } },
    ]);
  }

  return (
    <View style={[common.cardFlat, st.card, overdue && st.cardOverdue]}>
      <View style={st.cardHead}>
        <Text style={st.cardTitle} numberOfLines={1}>
          {showPartner ? (row.partner_name || '—') : (kind === 'sv' ? (row.project_name || '—') : fmt(row.scheduled_at))}
        </Text>
        <StatusPill map={map} value={row.status} />
      </View>

      {showPartner && !!row.partner_firm && <Text style={st.cardSub}>{row.partner_firm}</Text>}
      {kind === 'sv' && showPartner && <Text style={st.cardSub}>{row.project_name || '—'}</Text>}

      <Text style={[st.cardLine, overdue && st.overdueText]}>
        {kind === 'fu' ? 'Call' : 'Visit'} {fmt(row.scheduled_at)}
        {overdue ? ' · overdue' : ''}
      </Text>
      {!!(kind === 'fu' ? row.completed_at : row.visited_at) && (
        <Text style={st.cardLine}>
          {kind === 'fu' ? 'Completed ' : 'Visited '}{fmt(kind === 'fu' ? row.completed_at : row.visited_at)}
        </Text>
      )}
      <Text style={st.cardLine}>
        {kind === 'fu' ? 'Assigned to ' : 'Host '}{(kind === 'fu' ? row.assigned_to_name : row.host_name) || '—'}
      </Text>
      {!!(row.remarks || row.outcome) && <Text style={st.remarks}>{row.remarks || row.outcome}</Text>}

      <View style={st.cardActions}>
        {row.status !== 'completed' && (
          <TouchableOpacity onPress={() => setStatus('completed')} disabled={busy}
            style={[st.smallBtn, st.doneBtn, busy && st.dim]}>
            <Text style={st.doneText}>Done</Text>
          </TouchableOpacity>
        )}
        {open && (
          <TouchableOpacity onPress={() => setStatus(DROP_STATUS[kind][0])} disabled={busy}
            style={[st.smallBtn, busy && st.dim]}>
            <Text style={st.smallText}>{DROP_STATUS[kind][1]}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={remove} disabled={busy} style={[st.smallBtn, st.removeBtn, busy && st.dim]}>
          <Text style={st.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* --------------------------------------------------- one partner: a sheet */

export function PartnerActivitySheet({ visible, partner, companyId, onClose }) {
  const [tab, setTab] = useState('fu');
  const [adding, setAdding] = useState(false);

  const fu = useActivity({ kind: 'fu', partnerId: partner?.id, companyId });
  const sv = useActivity({ kind: 'sv', partnerId: partner?.id, companyId });
  const active = tab === 'fu' ? fu : sv;

  if (!partner) return null;

  const done = () => { setAdding(false); active.reload(); };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={st.backdrop}>
        <View style={[common.sheet, st.sheet]}>
          <View style={st.sheetHead}>
            <View style={st.flex1}>
              <Text style={st.sheetTitle} numberOfLines={1}>{partner.name}</Text>
              <Text style={st.sheetSub} numberOfLines={1}>
                {[partner.firm_name, partner.contact_no, partner.city].filter(Boolean).join(' · ') || 'Channel partner'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={st.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={common.tabBar}>
            {[['fu', 'Follow-Ups', fu.rows.length], ['sv', 'Site Visits', sv.rows.length]].map(([key, label, count]) => {
              const on = tab === key;
              return (
                <TouchableOpacity key={key} onPress={() => { setTab(key); setAdding(false); }}
                  style={[st.tab, on && st.tabOn]}>
                  <Text style={[st.tabText, on && st.tabTextOn]}>{label} ({count})</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView contentContainerStyle={st.sheetBody} keyboardShouldPersistTaps="handled">
            {adding ? (
              <ScheduleForm kind={tab} partnerId={partner.id} companyId={companyId}
                onDone={done} onCancel={() => setAdding(false)} />
            ) : (
              <TouchableOpacity onPress={() => setAdding(true)} style={[common.btn, common.btnPrimary, st.addBtn]}>
                <Ionicons name="add" size={16} color={COLORS.btnText} />
                <Text style={common.btnPrimaryText}>
                  Schedule {tab === 'fu' ? 'Follow-Up' : 'Site Visit'}
                </Text>
              </TouchableOpacity>
            )}

            {active.loading ? (
              <AppLoader style={st.loader} />
            ) : active.rows.length === 0 ? (
              <Text style={st.empty}>
                {tab === 'fu'
                  ? 'No follow-ups with this partner yet. Schedule the first one above.'
                  : 'No site visits with this partner yet. Schedule the first one above.'}
              </Text>
            ) : active.rows.map((row) => (
              <ActivityCard key={row.id} kind={tab} row={row} onChanged={active.reload} />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* --------------------------------------------- whole company: a tab panel */

/**
 * `kind` is 'fu' or 'sv'. This is the CP Details half of the Follow-Ups and Site
 * Visits screens — the partners themselves, where the CP Leads half shows the
 * work against their leads.
 */
export function PartnerActivityPanel({ kind, companyId }) {
  const { rows, loading, reload } = useActivity({ kind, companyId });
  const [partners, setPartners] = useState([]);
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState('');

  // Needed to schedule from here, where no partner is preselected.
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(SALES_ENDPOINTS.channelPartners
          + (companyId ? `?company_id=${companyId}` : ''));
        if (res.ok) {
          const d = await res.json();
          setPartners(Array.isArray(d) ? d : []);
        }
      } catch (_) {}
    })();
  }, [companyId]);

  const statuses = kind === 'fu' ? FU_STATUS : SV_STATUS;
  const due = rows.filter((r) => r.status === OPEN_STATUS[kind]).length;
  const shown = useMemo(
    () => (status ? rows.filter((r) => r.status === status) : rows),
    [rows, status],
  );
  const done = () => { setAdding(false); reload(); };

  return (
    <ScrollView contentContainerStyle={st.panel} keyboardShouldPersistTaps="handled">
      <View style={st.panelHead}>
        <View style={st.flex1}>
          <Text style={st.panelTitle}>
            {kind === 'fu' ? 'Partner Follow-Ups' : 'Partner Site Visits'}
          </Text>
          <Text style={st.panelSub}>
            {rows.length} with the partners themselves{due ? ` · ${due} still open` : ''}
          </Text>
        </View>
        {!adding && (
          <TouchableOpacity onPress={() => setAdding(true)} style={st.scheduleBtn}>
            <Ionicons name="add" size={15} color={COLORS.btnText} />
            <Text style={st.scheduleText}>Schedule</Text>
          </TouchableOpacity>
        )}
      </View>

      {adding && (
        <ScheduleForm kind={kind} partners={partners} companyId={companyId}
          onDone={done} onCancel={() => setAdding(false)} />
      )}

      <FilterSelect label="All statuses" value={status} onChange={setStatus}
        options={[{ value: '', label: 'All statuses' },
                  ...Object.entries(statuses).map(([v, s]) => ({ value: v, label: s.label }))]}
        style={st.select} />

      {loading ? (
        <AppLoader style={st.loader} />
      ) : rows.length === 0 ? (
        <Text style={st.empty}>
          Nothing scheduled with any partner yet. Use Schedule above, or open a
          partner under CP Details on All Leads.
        </Text>
      ) : shown.length === 0 ? (
        <Text style={st.empty}>Nothing matches that filter.</Text>
      ) : shown.map((row) => (
        <ActivityCard key={row.id} kind={kind} row={row} showPartner onChanged={reload} />
      ))}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  flex1: { flex: 1 },
  dim: { opacity: 0.6 },

  pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  pillText: { fontSize: 11, fontWeight: '700' },

  form: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 14,
          backgroundColor: COLORS.surface2, marginBottom: 14 },
  lbl: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase',
         letterSpacing: 0.6, marginBottom: 6 },
  select: { alignSelf: 'stretch', marginBottom: 14 },
  whenRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  whenBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, height: 42, paddingHorizontal: 12,
             borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.inputBg },
  whenText: { fontSize: 13.5, color: COLORS.textPrimary, fontWeight: '600' },
  textarea: { minHeight: 70, textAlignVertical: 'top', marginBottom: 14 },
  err: { color: COLORS.error, fontSize: 12.5, marginBottom: 10 },
  formActions: { flexDirection: 'row', gap: 10 },
  addBtn: { marginBottom: 14 },

  card: { marginBottom: 10 },
  cardOverdue: { borderLeftWidth: 3, borderLeftColor: COLORS.error },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontSize: 14.5, fontWeight: '800', color: COLORS.textPrimary },
  cardSub: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 2 },
  cardLine: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 4 },
  overdueText: { color: COLORS.error, fontWeight: '700' },
  remarks: { fontSize: 13, color: COLORS.textPrimary, marginTop: 8, lineHeight: 18 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  smallBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5,
              borderColor: COLORS.border },
  smallText: { fontSize: 12.5, fontWeight: '700', color: COLORS.textPrimary },
  doneBtn: { borderColor: COLORS.btnBorderSuccess, backgroundColor: COLORS.btnTintSuccess },
  doneText: { fontSize: 12.5, fontWeight: '700', color: COLORS.btnTextSuccess },
  removeBtn: { borderColor: COLORS.error2, backgroundColor: COLORS.errorBg },
  removeText: { fontSize: 12.5, fontWeight: '700', color: COLORS.error },

  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  sheet: { maxHeight: '90%', paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 },
  sheetHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 18,
               paddingTop: 18, paddingBottom: 12 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  sheetSub: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 3 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
              backgroundColor: COLORS.surfaceAlt },
  sheetBody: { padding: 18, paddingBottom: 40 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: COLORS.link },
  tabText: { fontSize: 12.5, fontWeight: '700', color: COLORS.textSecondary },
  tabTextOn: { color: COLORS.link },

  panel: { padding: 16, paddingBottom: 40 },
  panelHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  panelTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  panelSub: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 3 },
  scheduleBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14,
                 paddingVertical: 9, borderRadius: 10, backgroundColor: COLORS.btnTint,
                 borderWidth: 1, borderColor: COLORS.btnBorder },
  scheduleText: { color: COLORS.btnText, fontWeight: '700', fontSize: 13 },
  partnerSearch: { marginBottom: 10 },

  loader: { marginTop: 20 },
  empty: { fontSize: 13, color: COLORS.textSecondary, marginTop: 16, marginBottom: 6 },
});
