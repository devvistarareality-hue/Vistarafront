import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, FlatList, TouchableOpacity, Modal, ScrollView, TextInput,
  ActivityIndicator, Alert, StatusBar, RefreshControl, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../../utils/apiFetch';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSelector } from 'react-redux';
import { SALES_ENDPOINTS } from '../../constants/api';

import { COLORS, CARD_SHADOW } from '../../constants/theme';
import FormSheet from '../../components/FormSheet';
import { Field, TextField } from '../../components/Field';
const NAVY = COLORS.navy; const BLUE = COLORS.link; const BG = COLORS.screenBg; const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, ...CARD_SHADOW };

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

const STATUSES = [
  { key: 'all',              label: 'All'             },
  { key: 'new',              label: 'New'             },
  { key: 'assigned',         label: 'Assigned'        },
  { key: 'contacted',        label: 'Contacted'       },
  { key: 'not_reachable',    label: 'Not Reachable'   },
  { key: 'warm_transferred', label: 'Warm Transferred' },
  { key: 'hot',              label: 'Hot'             },
  { key: 'warm',             label: 'Warm'            },
  { key: 'cold',             label: 'Cold'            },
  { key: 'not_interested',   label: 'Not Interested'  },
  { key: 'sv_scheduled',     label: 'SV Scheduled'    },
  { key: 'sv_done',          label: 'SV Done'         },
  { key: 'closed',           label: 'Closed'          },
  { key: 'lost',             label: 'Lost'            },
];

// Lead requirement options (mirror sales/models.py LEAD_PURPOSE_CHOICES + BUDGET_BUCKETS)
const CITY_OPTIONS = ['Ahmedabad', 'Vadodara'];
const PURPOSE_OPTIONS = [
  { value: 'investment', label: 'Investment' },
  { value: 'end_use', label: 'End Use' },
  { value: 'other', label: 'Other' },
];
const BUDGET_OPTIONS = [
  { value: 'lt_10l', label: 'Less than ₹10 Lakh' },
  { value: '10_50l', label: '₹10 – 50 Lakh' },
  { value: '50l_1cr', label: '₹50 Lakh – ₹1 Cr' },
  { value: '1_2cr', label: '₹1 – 2 Cr' },
  { value: '2_3cr', label: '₹2 – 3 Cr' },
  { value: '3_5cr', label: '₹3 – 5 Cr' },
  { value: 'gt_5cr', label: 'Above ₹5 Cr' },
];

const STATUS_COLOR = {
  new:              { bg: COLORS.linkBg, text: COLORS.link },
  assigned:         { bg: COLORS.purpleBg, text: COLORS.purple },
  contacted:        { bg: COLORS.infoBg, text: COLORS.info },
  not_reachable:    { bg: COLORS.errorBg, text: COLORS.error },
  warm_transferred: { bg: COLORS.warningBg, text: COLORS.warning },
  hot:              { bg: COLORS.errorBg, text: COLORS.error },
  warm:             { bg: COLORS.warningBg, text: COLORS.warning },
  cold:             { bg: COLORS.linkBg, text: COLORS.link },
  not_interested:   { bg: COLORS.screenBg, text: COLORS.textSecondary },
  sv_scheduled:     { bg: COLORS.warningBg, text: COLORS.warningAlt },
  sv_done:          { bg: COLORS.successBg, text: COLORS.success },
  closed:           { bg: COLORS.successBg, text: COLORS.success },
  lost:             { bg: COLORS.screenBg, text: COLORS.textSecondary },
};

function StatusBadge({ status }) {
  const c = STATUS_COLOR[status] || { bg: COLORS.screenBg, text: MUTED };
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: c.bg }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: c.text }}>{(status || '').replace(/_/g, ' ').toUpperCase()}</Text>
    </View>
  );
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

/* ── Generic bottom-sheet dropdown ── */
function PickerDropdown({ items, value, onChange, placeholder = '— Select —', title = 'Select' }) {
  // items: [{ value, label, sublabel? }]
  const [open, setOpen] = useState(false);
  const selected = items.find(i => String(i.value) === String(value));
  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)}
        style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: COLORS.white, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <View style={{ flex: 1 }}>
          {selected ? (
            <>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{selected.label}</Text>
              {!!selected.sublabel && <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 1 }}>{selected.sublabel}</Text>}
            </>
          ) : (
            <Text style={{ fontSize: 14, color: COLORS.textTertiary }}>{placeholder}</Text>
          )}
        </View>
        <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginLeft: 8 }}>▼</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '65%' }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary }}>{title}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 18, color: COLORS.textSecondary }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView bounces={false}>
              <TouchableOpacity onPress={() => { onChange(''); setOpen(false); }}
                style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, color: COLORS.textTertiary }}>— None —</Text>
                {!value && <Text style={{ color: COLORS.link, fontSize: 16 }}>✓</Text>}
              </TouchableOpacity>
              {items.map(item => (
                <TouchableOpacity key={item.value} onPress={() => { onChange(item.value); setOpen(false); }}
                  style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: String(value) === String(item.value) ? '700' : '500', color: String(value) === String(item.value) ? COLORS.link : COLORS.textPrimary }}>{item.label}</Text>
                    {!!item.sublabel && <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 1 }}>{item.sublabel}</Text>}
                  </View>
                  {String(value) === String(item.value) && <Text style={{ color: COLORS.link, fontSize: 16 }}>✓</Text>}
                </TouchableOpacity>
              ))}
              <View style={{ height: 34 }} />
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

/* UserPickerDropdown — same as PickerDropdown but takes users array */
function UserPickerDropdown({ users, value, onChange, placeholder = '— Select —', title = 'Select User' }) {
  const items = users.map(u => ({ value: u.id, label: u.name, sublabel: u.designation || u.user_code }));
  return <PickerDropdown items={items} value={value} onChange={onChange} placeholder={placeholder} title={title} />;
}

const HISTORY_LABEL = {
  created:           'Lead Created',
  status:            'Overall Status',
  telecaller_status: 'TC Status',
  stm_status:        'STM Status',
  telecaller:        'Telecaller Assigned',
  stm:               'STM Assigned',
  warm_transfer:     'Transferred to STM',
  site_visit:        'Site Visit',
  closure:           'Closure',
};
const HISTORY_COLOR = {
  created:           COLORS.textSecondary,
  status:            COLORS.link,
  telecaller_status: COLORS.info,
  stm_status:        COLORS.error,
  telecaller:        COLORS.purple,
  stm:               COLORS.success,
  warm_transfer:     COLORS.error,
  site_visit:        COLORS.warningAlt,
  closure:           COLORS.success,
};
const FU_STATUS_COLOR = { pending: COLORS.warningAlt, completed: COLORS.success, missed: COLORS.error, rescheduled: COLORS.info };

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/* ── Lead Detail Modal ── */
function LeadDetailModal({ lead, projects, sources, telecallers, stms, visible, onClose, onUpdated, navigation }) {
  const user = useSelector((s) => s.auth.user);
  // Only admins/managers may (re)assign telecaller / STM. Telecaller & Sales Executive
  // portals can update status & remarks but cannot reassign leads.
  const _desig = (user?.designation || '').toLowerCase();
  const _isTelecaller = _desig.includes('telecaller') || _desig.includes('tele caller');
  const _isStm = _desig.includes('stm') || _desig.includes('sales team') || _desig.includes('sales executive');
  const _isCp  = _desig.includes('cp executive') || _desig.includes('channel partner') || _desig.includes('cp cluster head');
  const canAssign = !(_isTelecaller || _isStm || _isCp);
  // Telecallers see only the Telecaller (TC) section; STMs / CPs (exec + cluster
  // head) see only the STM/CP section. Admins/managers see both.
  const showTC  = canAssign || _isTelecaller;
  const showStm = canAssign || _isStm || _isCp;
  const [form, setForm]   = useState({});
  const [cityOther, setCityOther] = useState(false);  // City = "Other" → free-text box
  const [saving, setSaving] = useState(false);
  const [tab, setTab]     = useState('detail');
  const [detail, setDetail] = useState(null);

  // Followup form
  const defaultPickerDate = () => { const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); return d; };
  const [fuForm,   setFuForm]   = useState({ role_context: _isStm ? 'stm' : 'telecaller', scheduled_at: defaultPickerDate(), remarks: '' });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [savingFu, setSavingFu] = useState(false);
  const [fuErr,    setFuErr]    = useState('');
  // Inline "schedule site visit" when STM sets stm_status = sv_scheduled
  const [svAt,       setSvAt]       = useState(null);   // Date | null
  const [svRemarks,  setSvRemarks]  = useState('');
  const [showSvDate, setShowSvDate] = useState(false);
  const [showSvTime, setShowSvTime] = useState(false);

  useEffect(() => {
    if (lead) {
      setSvAt(null); setSvRemarks('');
      setForm({
        name:              lead.name            || '',
        phone:             lead.phone           || '',
        alt_phone:         lead.alt_phone       || '',
        email:             lead.email           || '',
        status:            lead.status          || 'new',
        project:           lead.project         || '',
        source:            lead.source          || '',
        telecaller:        lead.telecaller      || '',
        telecaller_status: lead.telecaller_status || '',
        telecaller_remarks:lead.telecaller_remarks || '',
        stm:               lead.stm             || '',
        stm_status:        lead.stm_status      || '',
        stm_remarks:       lead.stm_remarks     || '',
        // City/Address/Purpose/Budget now ship in the list payload → prefill instantly.
        city: lead.city || '', address: lead.address || '',
        purpose: Array.isArray(lead.purpose) ? lead.purpose : [],
        budget_bucket: lead.budget_bucket || '',
      });
      setCityOther(!!lead.city && !CITY_OPTIONS.includes(lead.city));
      setTab('detail');
      setDetail(null);
      async function loadDetail() {
        try {
          const res = await apiFetch(SALES_ENDPOINTS.lead(lead.id));
          if (res.ok) setDetail(await res.json());
        } catch (_) {}
      }
      loadDetail();
    }
  }, [lead?.id, visible]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    try {
      // "closed" is NOT persisted from the dropdown — a lead only becomes CLOSED
      // when its booking is approved (backend sets stm_status='closed' on approval).
      // Picking "closed" just routes the STM into the booking flow below.
      const body = { ...form };
      if (body.stm_status === 'closed') delete body.stm_status;
      const res = await apiFetch(SALES_ENDPOINTS.lead(lead.id), { method: 'PATCH', body: JSON.stringify(body) });
      if (res.ok) {
        const updated = await res.json();

        // STM scheduled a visit → auto-create the site-visit entry
        if (form.stm_status === 'sv_scheduled' && svAt instanceof Date) {
          try {
            await apiFetch(SALES_ENDPOINTS.siteVisits, {
              method: 'POST',
              body: JSON.stringify({
                lead: lead.id, project: form.project || null,
                scheduled_at: svAt.toISOString(), status: 'scheduled',
                stm: form.stm || user?.id, referred_by_telecaller: form.telecaller || null,
                remarks: svRemarks || '',
              }),
            });
          } catch (_) {}
        }

        // STM marked sv_done → complete the latest pending visit (or create a completed one)
        if (form.stm_status === 'sv_done') {
          try {
            const svRes = await apiFetch(`${SALES_ENDPOINTS.siteVisits}?lead_id=${lead.id}`);
            const list = svRes.ok ? await svRes.json() : [];
            const pending = (Array.isArray(list) ? list : []).filter(v => v.status === 'scheduled')
              .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))[0];
            const nowIso = new Date().toISOString();
            if (pending) {
              await apiFetch(SALES_ENDPOINTS.siteVisit(pending.id), { method: 'PATCH', body: JSON.stringify({ status: 'completed', visited_at: nowIso }) });
            } else {
              await apiFetch(SALES_ENDPOINTS.siteVisits, {
                method: 'POST',
                body: JSON.stringify({
                  lead: lead.id, project: form.project || null,
                  scheduled_at: nowIso, visited_at: nowIso, status: 'completed',
                  stm: form.stm || user?.id, referred_by_telecaller: form.telecaller || null,
                }),
              });
            }
          } catch (_) {}
        }

        // STM marked closed → save the lead, then jump into the booking flow with
        // this lead prefilled (pick plot(s) on the unit map → record the booking).
        if (form.stm_status === 'closed') {
          onUpdated(updated); onClose();
          const sv = { lead: lead.id, lead_name: form.name || lead.name, lead_phone: form.phone || lead.phone };
          if (form.project) navigation?.navigate('ClosureViewer', { projectId: form.project, sv });
          else navigation?.navigate('ClosureProjects', { sv });
          setSaving(false);
          return;
        }

        onUpdated(updated); onClose();
      }
      else { Alert.alert('Error', 'Could not save lead.'); }
    } catch (e) { Alert.alert('Network error', e.message); }
    setSaving(false);
  }

  async function addFollowup() {
    if (!fuForm.scheduled_at) { setFuErr('Date & time required.'); return; }

    const assignedTo = fuForm.role_context === 'telecaller' ? form.telecaller : form.stm;
    if (!assignedTo) { setFuErr('Assign a telecaller/STM to the lead first.'); return; }
    setFuErr('');
    setSavingFu(true);
    try {
      const res = await apiFetch(SALES_ENDPOINTS.followUps, {
        method: 'POST',
        body: JSON.stringify({
          lead: lead.id,
          assigned_to: assignedTo,
          role_context: fuForm.role_context,
          scheduled_at: fuForm.scheduled_at instanceof Date ? fuForm.scheduled_at.toISOString() : fuForm.scheduled_at,
          remarks: fuForm.remarks,
          status: 'pending',
        }),
      });
      if (res.ok) {
        const newFu = await res.json();
        setDetail(d => ({ ...d, follow_ups: [newFu, ...(d?.follow_ups || [])] }));
        setFuForm({ role_context: _isStm ? 'stm' : 'telecaller', scheduled_at: defaultPickerDate(), remarks: '' });
      } else {
        setFuErr('Could not save follow-up.');
      }
    } catch (e) { setFuErr(e.message); }
    setSavingFu(false);
  }

  async function markFollowupDone(fuId) {
    try {
      const res = await apiFetch(SALES_ENDPOINTS.followUp(fuId), {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed', completed_at: new Date().toISOString() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setDetail(d => ({ ...d, follow_ups: d.follow_ups.map(f => f.id === fuId ? updated : f) }));
      }
    } catch (_) {}
  }

  async function deleteLead() {
    Alert.alert('Delete lead?', `Delete ${lead?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const res = await apiFetch(SALES_ENDPOINTS.lead(lead.id), { method: 'DELETE' });
        if (res.ok || res.status === 204) { onUpdated(null); onClose(); }
      }},
    ]);
  }

  const inpS = { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: TEXT, backgroundColor: COLORS.white, marginBottom: 8 };
  const lblS = { fontSize: 10, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase', marginBottom: 3, letterSpacing: 0.4 };
  const secH = { fontSize: 11, fontWeight: '800', color: NAVY, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 };
  const row2 = { flexDirection: 'row', gap: 10 };
  const half = { flex: 1 };
  const divider = { height: 1, backgroundColor: COLORS.surfaceAlt, marginVertical: 10 };

  if (!lead) return null;
  return (
    <FormSheet visible={visible} onClose={onClose}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt, backgroundColor: COLORS.white }}>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={MUTED} /></TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT }}>{lead.name}</Text>
              <StatusBadge status={lead.status} />
            </View>
            <TouchableOpacity onPress={save} disabled={saving}
              style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: NAVY, borderRadius: 10, opacity: saving ? 0.6 : 1 }}>
              {saving ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 13 }}>{form.stm_status === 'closed' ? 'Record Closure →' : 'Save'}</Text>}
            </TouchableOpacity>
          </View>

          {/* Tabs — 3 tabs matching web */}
          <View style={{ flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
            {[['detail','Detail'],['history','History'],['followups','Follow-ups']].map(([key, lbl]) => (
              <TouchableOpacity key={key} onPress={() => setTab(key)} style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === key ? BLUE : 'transparent' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: tab === key ? BLUE : MUTED }}>{lbl}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>

            {/* ── DETAIL TAB ── */}
            {tab === 'detail' && <>

              {/* Row 1: Name | Alt Phone */}
              <View style={row2}>
                <View style={half}>
                  <Text style={lblS}>Name</Text>
                  <TextInput value={form.name} onChangeText={v => set('name', v)} style={inpS} />
                </View>
                <View style={half}>
                  <Text style={lblS}>Alt Phone</Text>
                  <TextInput value={form.alt_phone} onChangeText={v => set('alt_phone', v)} keyboardType="phone-pad" style={inpS} placeholder="Add alternate" placeholderTextColor="#666666" />
                </View>
              </View>

              {/* Row 2: Phone | Email read-only */}
              <View style={row2}>
                <View style={half}>
                  <Text style={lblS}>Phone</Text>
                  <View style={{ ...inpS, backgroundColor: COLORS.screenBg, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 13, color: MUTED }} selectable>{lead.phone || '—'}</Text>
                  </View>
                </View>
                <View style={half}>
                  <Text style={lblS}>Email</Text>
                  <View style={{ ...inpS, backgroundColor: COLORS.screenBg, justifyContent: 'center' }}>
                    <Text style={{ fontSize: 12, color: MUTED }} selectable numberOfLines={1}>{lead.email || '—'}</Text>
                  </View>
                </View>
              </View>

              <View style={divider} />

              {/* Requirement: City | Budget, Address, Purpose */}
              <View style={row2}>
                <View style={half}>
                  <Text style={lblS}>City</Text>
                  <PickerDropdown
                    items={[{ value: '', label: '— Select —' }, ...CITY_OPTIONS.map(c => ({ value: c, label: c })), { value: 'Other', label: 'Other' }]}
                    value={cityOther ? 'Other' : (form.city || '')}
                    onChange={v => {
                      if (v === 'Other') { setCityOther(true); set('city', ''); }
                      else { setCityOther(false); set('city', v); }
                    }}
                    placeholder="City" title="City" />
                  {cityOther && (
                    <TextInput value={form.city} onChangeText={v => set('city', v)} style={{ ...inpS, marginTop: 6 }} placeholder="Enter city" placeholderTextColor="#666666" />
                  )}
                </View>
                <View style={half}>
                  <Text style={lblS}>Budget</Text>
                  <PickerDropdown
                    items={[{ value: '', label: '— Select —' }, ...BUDGET_OPTIONS]}
                    value={form.budget_bucket || ''} onChange={v => set('budget_bucket', v)}
                    placeholder="Budget" title="Budget" />
                </View>
              </View>

              <Text style={lblS}>Address</Text>
              <TextInput value={form.address} onChangeText={v => set('address', v)}
                style={{ ...inpS, height: 60, textAlignVertical: 'top', marginBottom: 8 }} multiline
                placeholder="Address" placeholderTextColor="#666666" />

              <Text style={lblS}>Purpose</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2, marginBottom: 10 }}>
                {PURPOSE_OPTIONS.map(p => {
                  const on = (form.purpose || []).includes(p.value);
                  return (
                    <TouchableOpacity key={p.value}
                      onPress={() => set('purpose', on ? (form.purpose || []).filter(x => x !== p.value) : [...(form.purpose || []), p.value])}
                      style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: on ? BLUE : COLORS.surfaceAlt, backgroundColor: on ? '#EEF1FF' : COLORS.white }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: on ? BLUE : MUTED }}>{on ? '✓ ' : ''}{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={divider} />

              {/* Row 3: Overall Status | Source */}
              <View style={row2}>
                <View style={half}>
                  <Text style={lblS}>Overall Status</Text>
                  {canAssign ? (
                    <PickerDropdown
                      items={STATUSES.filter(s => s.key !== 'all').map(s => ({ value: s.key, label: s.label }))}
                      value={form.status} onChange={v => set('status', v)}
                      placeholder="Status" title="Overall Status" />
                  ) : (
                    // Auto-derived from the workflow — read-only for telecallers / STMs.
                    <View style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: COLORS.screenBg, marginBottom: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, textTransform: 'capitalize' }}>
                        {(STATUSES.find(s => s.key === form.status)?.label) || '—'}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={half}>
                  <Text style={lblS}>Source</Text>
                  <PickerDropdown
                    items={sources.map(s => ({ value: s.id, label: s.name }))}
                    value={form.source} onChange={v => set('source', v)}
                    placeholder="Source" title="Source" />
                </View>
              </View>

              {/* Row 4: Project (full width) */}
              <Text style={lblS}>Project</Text>
              <PickerDropdown
                items={projects.map(p => ({ value: p.id, label: p.name }))}
                value={form.project} onChange={v => set('project', v)}
                placeholder="Select Project" title="Project" />

              {showTC && (<>
              <View style={divider} />

              {/* Telecaller section */}
              <Text style={secH}>Telecaller (Pre-Sales)</Text>

              {/* Row 5: Assign Telecaller | TC Status (assign hidden for telecaller/STM portals) */}
              <View style={row2}>
                {canAssign && (
                <View style={half}>
                  <Text style={lblS}>Assign</Text>
                  <UserPickerDropdown users={telecallers} value={form.telecaller} onChange={v => set('telecaller', v)} placeholder="Telecaller" title="Assign Telecaller" />
                </View>
                )}
                <View style={half}>
                  <Text style={lblS}>TC Status</Text>
                  <PickerDropdown
                    items={['warm','cold','not_interested','not_reachable','callback'].map(s => ({ value: s, label: s.replace(/_/g,' ') }))}
                    value={form.telecaller_status} onChange={v => set('telecaller_status', v)}
                    placeholder="Status" title="TC Status" />
                </View>
              </View>

              <Text style={lblS}>TC Remarks</Text>
              <TextInput value={form.telecaller_remarks} onChangeText={v => set('telecaller_remarks', v)}
                multiline placeholder="Call notes…" placeholderTextColor="#666666"
                style={[inpS, { minHeight: 60, textAlignVertical: 'top' }]} />
              </>)}

              {showStm && (<>
              <View style={divider} />

              {/* STM section (labelled CP for Channel Partners) */}
              <Text style={secH}>{_isCp ? 'CP (Channel Partner)' : 'STM (Sales)'}</Text>

              {/* Row 6: Assign STM | STM Status (assign hidden for telecaller/STM/CP portals) */}
              <View style={row2}>
                {canAssign && (
                <View style={half}>
                  <Text style={lblS}>Assign</Text>
                  <UserPickerDropdown users={stms} value={form.stm} onChange={v => set('stm', v)} placeholder="STM" title="Assign STM" />
                </View>
                )}
                <View style={half}>
                  <Text style={lblS}>{_isCp ? 'CP Status' : 'STM Status'}</Text>
                  <PickerDropdown
                    items={['hot','warm','cold','not_interested','sv_scheduled','sv_done','closed'].map(s => ({ value: s, label: s.replace(/_/g,' ') }))}
                    value={form.stm_status} onChange={v => set('stm_status', v)}
                    placeholder="Status" title={_isCp ? 'CP Status' : 'STM Status'} />
                </View>
              </View>

              <Text style={lblS}>{_isCp ? 'CP Remarks' : 'STM Remarks'}</Text>
              <TextInput value={form.stm_remarks} onChangeText={v => set('stm_remarks', v)}
                multiline placeholder="Notes…" placeholderTextColor="#666666"
                style={[inpS, { minHeight: 60, textAlignVertical: 'top' }]} />

              {/* Inline site-visit scheduling when STM picks "sv_scheduled" */}
              {form.stm_status === 'sv_scheduled' && (
                <View style={{ backgroundColor: '#ECFDF3', borderWidth: 1, borderColor: '#A6E9C5', borderRadius: 12, padding: 12, marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Ionicons name="location-outline" size={14} color="#15803D" />
                    <Text style={{ fontSize: 11, fontWeight: '800', color: '#166534', letterSpacing: 0.5 }}>SCHEDULE SITE VISIT</Text>
                  </View>
                  <Text style={[lblS, { color: '#166534' }]}>Date & Time *</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => setShowSvDate(true)} style={{ flex: 1, borderWidth: 1.5, borderColor: COLORS.link, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.white }}>
                      <Ionicons name="calendar-outline" size={16} color={BLUE} />
                      <Text style={{ fontSize: 14, color: BLUE, fontWeight: '600' }}>{svAt instanceof Date ? svAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pick Date'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setShowSvTime(true)} style={{ flex: 1, borderWidth: 1.5, borderColor: COLORS.link, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.white }}>
                      <Ionicons name="time-outline" size={16} color={BLUE} />
                      <Text style={{ fontSize: 14, color: BLUE, fontWeight: '600' }}>{svAt instanceof Date ? svAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Pick Time'}</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[lblS, { color: '#166534', marginTop: 8 }]}>Visit Remarks</Text>
                  <TextInput value={svRemarks} onChangeText={setSvRemarks} placeholder="Location, notes…" placeholderTextColor={COLORS.shadow} style={inpS} />
                  {!svAt && <Text style={{ fontSize: 11, color: '#16A34A', marginTop: 6 }}>Set a date & time to create a site visit entry automatically on save.</Text>}

                  {/* iOS pickers */}
                  {Platform.OS === 'ios' && showSvDate && (
                    <Modal transparent animationType="slide" onRequestClose={() => setShowSvDate(false)}>
                      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setShowSvDate(false)}>
                        <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
                            <TouchableOpacity onPress={() => setShowSvDate(false)}><Text style={{ color: MUTED, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
                            <Text style={{ fontWeight: '700', color: TEXT }}>Pick Date</Text>
                            <TouchableOpacity onPress={() => setShowSvDate(false)}><Text style={{ color: BLUE, fontWeight: '700' }}>Done</Text></TouchableOpacity>
                          </View>
                          <DateTimePicker value={svAt instanceof Date ? svAt : defaultPickerDate()} mode="date" display="spinner" textColor={TEXT}
                            onChange={(_, d) => { if (d) { const cur = svAt instanceof Date ? svAt : defaultPickerDate(); const m = new Date(d); m.setHours(cur.getHours(), cur.getMinutes(), 0, 0); setSvAt(m); } }} />
                        </View>
                      </TouchableOpacity>
                    </Modal>
                  )}
                  {Platform.OS === 'ios' && showSvTime && (
                    <Modal transparent animationType="slide" onRequestClose={() => setShowSvTime(false)}>
                      <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setShowSvTime(false)}>
                        <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
                            <TouchableOpacity onPress={() => setShowSvTime(false)}><Text style={{ color: MUTED, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
                            <Text style={{ fontWeight: '700', color: TEXT }}>Pick Time</Text>
                            <TouchableOpacity onPress={() => setShowSvTime(false)}><Text style={{ color: BLUE, fontWeight: '700' }}>Done</Text></TouchableOpacity>
                          </View>
                          <DateTimePicker value={svAt instanceof Date ? svAt : defaultPickerDate()} mode="time" display="spinner" textColor={TEXT}
                            onChange={(_, d) => { if (d) { const cur = svAt instanceof Date ? svAt : defaultPickerDate(); const m = new Date(cur); m.setHours(d.getHours(), d.getMinutes(), 0, 0); setSvAt(m); } }} />
                        </View>
                      </TouchableOpacity>
                    </Modal>
                  )}
                  {/* Android pickers */}
                  {Platform.OS === 'android' && showSvDate && (
                    <DateTimePicker value={svAt instanceof Date ? svAt : defaultPickerDate()} mode="date" display="default"
                      onChange={(e, d) => { setShowSvDate(false); if (e.type === 'dismissed') return; if (d) { const cur = svAt instanceof Date ? svAt : defaultPickerDate(); const m = new Date(d); m.setHours(cur.getHours(), cur.getMinutes(), 0, 0); setSvAt(m); setShowSvTime(true); } }} />
                  )}
                  {Platform.OS === 'android' && showSvTime && (
                    <DateTimePicker value={svAt instanceof Date ? svAt : defaultPickerDate()} mode="time" display="default" is24Hour={false}
                      onChange={(e, d) => { setShowSvTime(false); if (e.type === 'dismissed') return; if (d) { const cur = svAt instanceof Date ? svAt : defaultPickerDate(); const m = new Date(cur); m.setHours(d.getHours(), d.getMinutes(), 0, 0); setSvAt(m); } }} />
                  )}
                </View>
              )}

              {/* STM picked "closed" → saving routes into the booking flow with this
                  lead prefilled; the lead becomes CLOSED only when the booking is approved. */}
              {form.stm_status === 'closed' && (
                <View style={{ backgroundColor: '#ECFDF3', borderWidth: 1, borderColor: '#A6E9C5', borderRadius: 12, padding: 12, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#15803D" />
                  <Text style={{ fontSize: 12, color: '#166534', fontWeight: '600', flex: 1 }}>
                    Saving takes you to the booking flow — pick the plot(s) and record the booking for this lead.
                  </Text>
                </View>
              )}
              </>)}

              {/* Meta Ads Info */}
              {(lead.meta_campaign_name || lead.meta_adset_name || lead.meta_ad_name) && (
                <View style={{ marginTop: 8, padding: 12, backgroundColor: COLORS.screenBg, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>Meta Ads</Text>
                  {!!lead.meta_campaign_name && <View style={{ flexDirection: 'row', marginBottom: 3 }}><Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.textTertiary, width: 66 }}>CAMPAIGN</Text><Text style={{ fontSize: 12, color: TEXT, fontWeight: '600', flex: 1 }}>{lead.meta_campaign_name}</Text></View>}
                  {!!lead.meta_adset_name    && <View style={{ flexDirection: 'row', marginBottom: 3 }}><Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.textTertiary, width: 66 }}>AD SET</Text><Text style={{ fontSize: 12, color: TEXT, fontWeight: '600', flex: 1 }}>{lead.meta_adset_name}</Text></View>}
                  {!!lead.meta_ad_name       && <View style={{ flexDirection: 'row' }}><Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.textTertiary, width: 66 }}>AD</Text><Text style={{ fontSize: 12, color: TEXT, fontWeight: '600', flex: 1 }}>{lead.meta_ad_name}</Text></View>}
                </View>
              )}

              {/* Only admins/managers may delete leads — telecallers & STMs cannot. */}
              {canAssign && (
              <TouchableOpacity onPress={deleteLead} style={{ marginTop: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: COLORS.errorBg, alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.goldLight }}>
                <Text style={{ color: COLORS.error, fontWeight: '700', fontSize: 13 }}>Delete Lead</Text>
              </TouchableOpacity>
              )}
            </>}

            {/* ── HISTORY TAB ── */}
            {tab === 'history' && <>
              {/* Lead received event */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                <View style={{ alignItems: 'center' }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.link + '18', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 16 }}>📥</Text>
                  </View>
                  <View style={{ width: 2, flex: 1, backgroundColor: COLORS.surfaceAlt, marginTop: 4 }} />
                </View>
                <View style={{ flex: 1, paddingBottom: 16 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT }}>Lead Received</Text>
                  <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Source: {lead.source_name || '—'} · Project: {lead.project_name || '—'}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textTertiary, marginTop: 2 }}>{fmtDateTime(lead.created_at)}</Text>
                </View>
              </View>

              {!detail && <ActivityIndicator size="small" color={MUTED} style={{ marginTop: 20 }} />}
              {detail && (!detail.history || detail.history.length === 0) && (
                <Text style={{ fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', marginTop: 24 }}>No changes recorded yet.</Text>
              )}
              {(detail?.history || []).filter(h => h.field_changed !== 'created').map((h, idx, arr) => {
                const isLast = idx === arr.length - 1;
                const color  = HISTORY_COLOR[h.field_changed] || MUTED;
                const icon   = h.field_changed === 'created'       ? '📥'
                             : h.field_changed === 'warm_transfer' ? '🔥'
                             : h.field_changed === 'telecaller'    ? '👤'
                             : h.field_changed === 'stm'           ? '🏢'
                             : h.field_changed === 'site_visit'    ? '🏠'
                             : h.field_changed === 'closure'       ? '✅'
                             : '🔄';
                const singleValue = ['created', 'warm_transfer', 'closure'].includes(h.field_changed) || !h.old_value;
                const byLabel = h.changed_by_name
                  || (['created', 'telecaller', 'stm'].includes(h.field_changed) ? 'System (auto)' : null);
                return (
                  <View key={h.id} style={{ flexDirection: 'row', gap: 12, marginBottom: isLast ? 0 : 16 }}>
                    <View style={{ alignItems: 'center' }}>
                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 16 }}>{icon}</Text>
                      </View>
                      {!isLast && <View style={{ width: 2, flex: 1, backgroundColor: COLORS.surfaceAlt, marginTop: 4 }} />}
                    </View>
                    <View style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT }}>{HISTORY_LABEL[h.field_changed] || h.field_changed}</Text>
                      <Text style={{ fontSize: 12, color: TEXT, marginTop: 2 }}>
                        {singleValue ? (
                          <Text style={{ color, fontWeight: '700' }}>{h.new_value || '—'}</Text>
                        ) : (
                          <>
                            <Text style={{ color: MUTED }}>{h.old_value || '—'}</Text>
                            <Text> → </Text>
                            <Text style={{ color, fontWeight: '700' }}>{h.new_value || '—'}</Text>
                          </>
                        )}
                      </Text>
                      {!!byLabel && <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>by {byLabel}</Text>}
                      <Text style={{ fontSize: 11, color: COLORS.textTertiary, marginTop: 2 }}>{fmtDateTime(h.created_at)}</Text>
                    </View>
                  </View>
                );
              })}
            </>}

            {/* ── FOLLOWUPS TAB ── */}
            {tab === 'followups' && <>
              {/* Add form */}
              <View style={{ backgroundColor: COLORS.screenBg, borderRadius: 12, padding: 14, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 20 }}>
                <Text style={[lblS, { marginBottom: 10 }]}>Schedule Follow-up</Text>
                {/* Role picker only for admins/managers — telecaller/STM portals auto-set their own role */}
                {canAssign && (
                  <>
                    <Text style={lblS}>Role</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                      {['telecaller','stm'].map(r => (
                        <TouchableOpacity key={r} onPress={() => setFuForm(f => ({ ...f, role_context: r }))}
                          style={{ flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: fuForm.role_context === r ? NAVY : COLORS.surfaceAlt, borderWidth: 1.5, borderColor: fuForm.role_context === r ? NAVY : COLORS.border, alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: fuForm.role_context === r ? COLORS.white : MUTED }}>{r.toUpperCase()}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
                <Text style={lblS}>Date & Time</Text>
                {/* Date button */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)}
                    style={{ flex: 1, borderWidth: 1.5, borderColor: COLORS.link, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: COLORS.screenBg, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="calendar-outline" size={16} color={BLUE} />
                    <Text style={{ fontSize: 14, color: BLUE, fontWeight: '600' }}>
                      {fuForm.scheduled_at instanceof Date
                        ? fuForm.scheduled_at.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Pick Date'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowTimePicker(true)}
                    style={{ flex: 1, borderWidth: 1.5, borderColor: COLORS.link, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: COLORS.screenBg, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="time-outline" size={16} color={BLUE} />
                    <Text style={{ fontSize: 14, color: BLUE, fontWeight: '600' }}>
                      {fuForm.scheduled_at instanceof Date
                        ? fuForm.scheduled_at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                        : 'Pick Time'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* iOS: inline pickers inside modals */}
                {Platform.OS === 'ios' && showDatePicker && (
                  <Modal transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
                    <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
                      <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
                          <TouchableOpacity onPress={() => setShowDatePicker(false)}><Text style={{ color: MUTED, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
                          <Text style={{ fontWeight: '700', color: TEXT }}>Pick Date</Text>
                          <TouchableOpacity onPress={() => setShowDatePicker(false)}><Text style={{ color: BLUE, fontWeight: '700' }}>Done</Text></TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={fuForm.scheduled_at instanceof Date ? fuForm.scheduled_at : new Date()}
                          mode="date" display="spinner" textColor={TEXT}
                          onChange={(_, d) => d && setFuForm(f => {
                            const cur = f.scheduled_at instanceof Date ? f.scheduled_at : new Date();
                            const merged = new Date(d);
                            merged.setHours(cur.getHours(), cur.getMinutes(), 0, 0);
                            return { ...f, scheduled_at: merged };
                          })}
                        />
                      </View>
                    </TouchableOpacity>
                  </Modal>
                )}
                {Platform.OS === 'ios' && showTimePicker && (
                  <Modal transparent animationType="slide" onRequestClose={() => setShowTimePicker(false)}>
                    <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setShowTimePicker(false)}>
                      <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
                          <TouchableOpacity onPress={() => setShowTimePicker(false)}><Text style={{ color: MUTED, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
                          <Text style={{ fontWeight: '700', color: TEXT }}>Pick Time</Text>
                          <TouchableOpacity onPress={() => setShowTimePicker(false)}><Text style={{ color: BLUE, fontWeight: '700' }}>Done</Text></TouchableOpacity>
                        </View>
                        <DateTimePicker
                          value={fuForm.scheduled_at instanceof Date ? fuForm.scheduled_at : new Date()}
                          mode="time" display="spinner" textColor={TEXT}
                          onChange={(_, d) => d && setFuForm(f => {
                            const cur = f.scheduled_at instanceof Date ? f.scheduled_at : new Date();
                            const merged = new Date(cur);
                            merged.setHours(d.getHours(), d.getMinutes(), 0, 0);
                            return { ...f, scheduled_at: merged };
                          })}
                        />
                      </View>
                    </TouchableOpacity>
                  </Modal>
                )}

                {/* Android: native dialog pickers */}
                {Platform.OS === 'android' && showDatePicker && (
                  <DateTimePicker
                    value={fuForm.scheduled_at instanceof Date ? fuForm.scheduled_at : new Date()}
                    mode="date" display="default"
                    onChange={(e, d) => {
                      setShowDatePicker(false);
                      if (e.type === 'dismissed') return;
                      if (d) {
                        setFuForm(f => {
                          const cur = f.scheduled_at instanceof Date ? f.scheduled_at : new Date();
                          const merged = new Date(d);
                          merged.setHours(cur.getHours(), cur.getMinutes(), 0, 0);
                          return { ...f, scheduled_at: merged };
                        });
                        setShowTimePicker(true);
                      }
                    }}
                  />
                )}
                {Platform.OS === 'android' && showTimePicker && (
                  <DateTimePicker
                    value={fuForm.scheduled_at instanceof Date ? fuForm.scheduled_at : new Date()}
                    mode="time" display="default" is24Hour={false}
                    onChange={(e, d) => {
                      setShowTimePicker(false);
                      if (e.type === 'dismissed') return;
                      if (d) setFuForm(f => {
                        const cur = f.scheduled_at instanceof Date ? f.scheduled_at : new Date();
                        const merged = new Date(cur);
                        merged.setHours(d.getHours(), d.getMinutes(), 0, 0);
                        return { ...f, scheduled_at: merged };
                      });
                    }}
                  />
                )}
                <Text style={lblS}>Remarks</Text>
                <TextInput value={fuForm.remarks} onChangeText={v => setFuForm(f => ({ ...f, remarks: v }))}
                  placeholder="Call notes, instructions…" placeholderTextColor="#666666" multiline style={[inpS, { minHeight: 70, textAlignVertical: 'top' }]} />
                {!!fuErr && <Text style={{ color: COLORS.error, fontSize: 12, marginBottom: 8 }}>{fuErr}</Text>}
                <TouchableOpacity onPress={addFollowup} disabled={savingFu}
                  style={{ paddingVertical: 12, borderRadius: 10, backgroundColor: NAVY, alignItems: 'center', opacity: savingFu ? 0.6 : 1 }}>
                  {savingFu ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 14 }}>+ Add Follow-up</Text>}
                </TouchableOpacity>
              </View>

              {!detail && <ActivityIndicator size="small" color={MUTED} />}
              {detail && (!detail.follow_ups || detail.follow_ups.length === 0) && (
                <Text style={{ fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', marginTop: 8 }}>No follow-ups yet.</Text>
              )}
              {detail?.follow_ups?.map(fu => (
                <View key={fu.id} style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, padding: 14, marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: fu.role_context === 'stm' ? COLORS.error : COLORS.info, textTransform: 'uppercase' }}>{fu.role_context}</Text>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: (FU_STATUS_COLOR[fu.status] || MUTED) + '18' }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: FU_STATUS_COLOR[fu.status] || MUTED }}>{fu.status}</Text>
                      </View>
                    </View>
                    {fu.status === 'pending' && (
                      <TouchableOpacity onPress={() => markFollowupDone(fu.id)}
                        style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.success }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.success }}>Mark Done</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT }}>{fmtDateTime(fu.scheduled_at)}</Text>
                  {!!fu.assigned_to_name && <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Assigned to: {fu.assigned_to_name}</Text>}
                  {!!fu.remarks && <Text style={{ fontSize: 12, color: TEXT, marginTop: 6 }}>{fu.remarks}</Text>}
                  {fu.status === 'completed' && !!fu.completed_at && (
                    <Text style={{ fontSize: 11, color: COLORS.success, marginTop: 4 }}>✓ Done {fmtDateTime(fu.completed_at)}</Text>
                  )}
                </View>
              ))}
            </>}

            <View style={{ height: 20 }} />
          </ScrollView>
    </FormSheet>
  );
}

/* ── Reusable Dropdown Picker ── */
function DropdownPicker({ value, onChange, options, placeholder, triggerStyle }) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => String(o.value) === String(value));
  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)}
        style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 }, triggerStyle]}>
        <Text style={{ fontSize: 14, color: selected ? TEXT : MUTED, fontWeight: selected ? '600' : '400' }}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={MUTED} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT }}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}><Ionicons name="close" size={20} color={MUTED} /></TouchableOpacity>
            </View>
            <ScrollView>
              {options.map(o => (
                <TouchableOpacity key={o.value} onPress={() => { onChange(o.value); setOpen(false); }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.screenBg }}>
                  <Text style={{ fontSize: 14, color: TEXT, fontWeight: String(value) === String(o.value) ? '700' : '400' }}>{o.label}</Text>
                  {String(value) === String(o.value) && <Ionicons name="checkmark" size={18} color={NAVY} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

/* ── Create Lead Modal ── */
function CreateLeadModal({ projects, sources, telecallers = [], stms = [], cps = [], visible, onClose, onCreated }) {
  const user = useSelector((s) => s.auth.user);
  const _desig = (user?.designation || '').toLowerCase();
  const _isTelecaller = _desig.includes('telecaller') || _desig.includes('tele caller');
  const _isStm = _desig.includes('stm') || _desig.includes('sales team') || _desig.includes('sales executive');
  const _isCpHead = _desig.includes('cp cluster head');
  const _isCp  = _desig.includes('cp executive') || _desig.includes('channel partner') || _isCpHead;
  const _isAdminMgr = !(_isTelecaller || _isStm || _isCp);
  const showTC  = _isAdminMgr || _isTelecaller;
  const showStm = _isAdminMgr || _isStm || _isCp;
  const emptyForm = { name: '', phone: '', alt_phone: '', email: '', project: '', source: '', status: 'new', city: '', address: '', purpose: [], budget_bucket: '', telecaller: '', stm: '', telecaller_status: '', telecaller_remarks: '', stm_status: '', stm_remarks: '' };
  const [form, setForm] = useState(emptyForm);
  const [cityOther, setCityOther] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function create() {
    if (!form.name.trim() || !form.phone.trim()) { Alert.alert('Required', 'Name and phone are required.'); return; }
    setSaving(true);
    try {
      const res = await apiFetch(SALES_ENDPOINTS.leads, { method: 'POST', body: JSON.stringify(form) });
      if (res.ok) { onCreated(await res.json()); onClose(); setForm(emptyForm); setCityOther(false); }
      else { const e = await res.json(); Alert.alert('Error', JSON.stringify(e)); }
    } catch (e) { Alert.alert('Network error', e.message); }
    setSaving(false);
  }

  return (
    <FormSheet visible={visible} onClose={onClose}>
          <View style={{ backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="close" size={18} color={TEXT} />
              </TouchableOpacity>
              <TouchableOpacity onPress={create} disabled={saving}
                style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: NAVY, borderRadius: 10, opacity: saving ? 0.6 : 1 }}>
                {saving ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 13 }}>Add Lead</Text>}
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>Add Lead</Text>
            <Text style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>Fill in the contact details below</Text>
          </View>
          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 20 }}>
            <TextField label="Full Name" required value={form.name} onChangeText={v => set('name', v)} placeholder="Lead name" />
            <TextField label="Phone" required value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" placeholder="10-digit mobile" />
            <TextField label="Alt Phone" value={form.alt_phone} onChangeText={v => set('alt_phone', v)} keyboardType="phone-pad" placeholder="Optional" />
            <TextField label="Email" value={form.email} onChangeText={v => set('email', v)} keyboardType="email-address" autoCapitalize="none" placeholder="name@email.com" />
            <Field label="City">
              <DropdownPicker
                value={cityOther ? 'Other' : form.city}
                onChange={v => { if (v === 'Other') { setCityOther(true); set('city', ''); } else { setCityOther(false); set('city', v); } }}
                options={[...CITY_OPTIONS.map(c => ({ value: c, label: c })), { value: 'Other', label: 'Other' }]}
                placeholder="Select city"
                triggerStyle={{ marginBottom: 0 }}
              />
            </Field>
            {cityOther && (
              <TextField label="Enter City" value={form.city} onChangeText={v => set('city', v)} placeholder="City name" />
            )}
            <Field label="Budget">
              <DropdownPicker
                value={form.budget_bucket}
                onChange={v => set('budget_bucket', v)}
                options={BUDGET_OPTIONS}
                placeholder="Select budget"
                triggerStyle={{ marginBottom: 0 }}
              />
            </Field>
            <TextField label="Address" value={form.address} onChangeText={v => set('address', v)} placeholder="Address" multiline style={{ height: 70, textAlignVertical: 'top' }} />
            <Field label="Purpose">
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {PURPOSE_OPTIONS.map(p => {
                  const on = (form.purpose || []).includes(p.value);
                  return (
                    <TouchableOpacity key={p.value}
                      onPress={() => set('purpose', on ? (form.purpose || []).filter(x => x !== p.value) : [...(form.purpose || []), p.value])}
                      style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: on ? BLUE : COLORS.surfaceAlt, backgroundColor: on ? '#EEF1FF' : COLORS.white }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: on ? BLUE : MUTED }}>{on ? '✓ ' : ''}{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Field>
            <Field label="Project">
              <DropdownPicker
                value={form.project}
                onChange={v => set('project', v)}
                options={projects.map(p => ({ value: p.id, label: p.name }))}
                placeholder="Select project"
                triggerStyle={{ marginBottom: 0 }}
              />
            </Field>
            <Field label="Source">
              <DropdownPicker
                value={form.source}
                onChange={v => set('source', v)}
                options={sources.map(s => ({ value: s.id, label: s.name }))}
                placeholder="Select source"
                triggerStyle={{ marginBottom: 0 }}
              />
            </Field>

            {showTC && (
              <>
                {_isAdminMgr && (
                  <Field label="Assign Telecaller">
                    <UserPickerDropdown users={telecallers} value={form.telecaller} onChange={v => set('telecaller', v)} placeholder="— None —" title="Assign Telecaller" />
                  </Field>
                )}
                <Field label="TC Status">
                  <DropdownPicker
                    value={form.telecaller_status}
                    onChange={v => set('telecaller_status', v)}
                    options={[{ value: '', label: '— None —' }, ...TC_STATUSES.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))]}
                    placeholder="TC Status"
                    triggerStyle={{ marginBottom: 0 }}
                  />
                </Field>
                <TextField label="TC Remarks" value={form.telecaller_remarks} onChangeText={v => set('telecaller_remarks', v)} placeholder="Optional" multiline style={{ height: 60, textAlignVertical: 'top' }} />
              </>
            )}

            {showStm && (
              <>
                {_isAdminMgr && (
                  <Field label="Assign STM">
                    <UserPickerDropdown users={stms} value={form.stm} onChange={v => set('stm', v)} placeholder="— None —" title="Assign STM" />
                  </Field>
                )}
                {_isCpHead && (
                  <Field label="Assign CP">
                    <UserPickerDropdown users={cps} value={form.stm} onChange={v => set('stm', v)} placeholder="— None —" title="Assign CP" />
                  </Field>
                )}
                <Field label={_isCp ? 'CP Status' : 'STM Status'}>
                  <DropdownPicker
                    value={form.stm_status}
                    onChange={v => set('stm_status', v)}
                    options={[{ value: '', label: '— None —' }, ...STM_STATUSES.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))]}
                    placeholder={_isCp ? 'CP Status' : 'STM Status'}
                    triggerStyle={{ marginBottom: 0 }}
                  />
                </Field>
                <TextField label={_isCp ? 'CP Remarks' : 'STM Remarks'} value={form.stm_remarks} onChangeText={v => set('stm_remarks', v)} placeholder="Optional" multiline style={{ height: 60, textAlignVertical: 'top' }} />
              </>
            )}
          </ScrollView>
    </FormSheet>
  );
}

const EMPTY_FILTERS = { status: '', project_id: '', source_id: '', telecaller_id: '', stm_id: '', tc_status: '', stm_status: '', date_from: '', date_to: '', is_duplicate: false };
const TC_STATUSES  = ['warm','cold','not_interested','not_reachable','callback'];
const STM_STATUSES = ['hot','warm','cold','not_interested','sv_scheduled','sv_done','closed'];

/* ── Filter Bottom Sheet ── */
function FilterSheet({ visible, onClose, filters, setFilters, projects, sources, telecallers, stms, showTcStatus = true, showStmStatus = true, showAssignees = true, isCp = false }) {
  const [local, setLocal] = useState(filters);
  useEffect(() => { if (visible) setLocal(filters); }, [visible]);
  const set = (k, v) => setLocal(f => ({ ...f, [k]: v }));
  const localDate = (d) => d.toISOString().slice(0, 10);
  const today = localDate(new Date());
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return localDate(d); };
  const activeCount = Object.entries(filters).filter(([k, v]) => v && v !== false && v !== '').length;

  return (
    <FormSheet visible={visible} onClose={onClose}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt, backgroundColor: COLORS.white }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT }}>Filters</Text>
          <TouchableOpacity onPress={() => { setLocal(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); onClose(); }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.error }}>Clear All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>

          {/* Quick date */}
          <View>
            <Text style={fsLbl}>DATE RANGE</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              {[['Today', today, today], ['Week', daysAgo(6), today], ['Month', daysAgo(29), today]].map(([label, from, to]) => {
                const active = local.date_from === from && local.date_to === to;
                return (
                  <TouchableOpacity key={label} onPress={() => { set('date_from', active ? '' : from); set('date_to', active ? '' : to); }}
                    style={{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center', backgroundColor: active ? NAVY : COLORS.surfaceAlt, borderWidth: 1.5, borderColor: active ? NAVY : COLORS.border }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: active ? COLORS.white : MUTED }}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Project */}
          <View>
            <Text style={fsLbl}>PROJECT</Text>
            <DropdownPicker value={local.project_id} onChange={v => set('project_id', v)}
              options={[{ value: '', label: 'All Projects' }, { value: 'none', label: '— No Project —' }, ...projects.map(p => ({ value: String(p.id), label: p.name }))]}
              placeholder="All Projects" />
          </View>

          {/* Source */}
          <View>
            <Text style={fsLbl}>SOURCE</Text>
            <DropdownPicker value={local.source_id} onChange={v => set('source_id', v)}
              options={[{ value: '', label: 'All Sources' }, ...sources.map(s => ({ value: String(s.id), label: s.name }))]}
              placeholder="All Sources" />
          </View>

          {/* Telecaller / STM assignee filters — admins/managers only */}
          {showAssignees && (
          <View>
            <Text style={fsLbl}>TELECALLER</Text>
            <DropdownPicker value={local.telecaller_id} onChange={v => set('telecaller_id', v)}
              options={[{ value: '', label: 'All Telecallers' }, ...telecallers.map(u => ({ value: String(u.id), label: u.name }))]}
              placeholder="All Telecallers" />
          </View>
          )}

          {showAssignees && (
          <View>
            <Text style={fsLbl}>STM</Text>
            <DropdownPicker value={local.stm_id} onChange={v => set('stm_id', v)}
              options={[{ value: '', label: 'All STMs' }, ...stms.map(u => ({ value: String(u.id), label: u.name }))]}
              placeholder="All STMs" />
          </View>
          )}

          {/* Overall Status — admins/managers only */}
          {showAssignees && (
          <View>
            <Text style={fsLbl}>OVERALL STATUS</Text>
            <DropdownPicker value={local.status || ''} onChange={v => set('status', v)}
              options={[{ value: '', label: 'All Statuses' }, ...STATUSES.filter(s => s.key !== 'all').map(s => ({ value: s.key, label: s.label }))]}
              placeholder="All Statuses" />
          </View>
          )}

          {/* TC Status — telecaller / admin only */}
          {showTcStatus && (
          <View>
            <Text style={fsLbl}>TC STATUS</Text>
            <DropdownPicker value={local.tc_status} onChange={v => set('tc_status', v)}
              options={[{ value: '', label: 'All TC Statuses' }, ...TC_STATUSES.map(s => ({ value: s, label: s.replace(/_/g,' ') }))]}
              placeholder="All TC Statuses" />
          </View>
          )}

          {/* STM Status (labelled CP Status for CPs) — STM / CP / admin only */}
          {showStmStatus && (
          <View>
            <Text style={fsLbl}>{isCp ? 'CP STATUS' : 'STM STATUS'}</Text>
            <DropdownPicker value={local.stm_status} onChange={v => set('stm_status', v)}
              options={[{ value: '', label: isCp ? 'All CP Statuses' : 'All STM Statuses' }, ...STM_STATUSES.map(s => ({ value: s, label: s.replace(/_/g,' ') }))]}
              placeholder={isCp ? 'All CP Statuses' : 'All STM Statuses'} />
          </View>
          )}

          {/* Duplicates toggle */}
          <TouchableOpacity onPress={() => set('is_duplicate', !local.is_duplicate)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: local.is_duplicate ? COLORS.errorStrong : COLORS.border, backgroundColor: local.is_duplicate ? COLORS.screenBg : COLORS.white }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: local.is_duplicate ? COLORS.errorStrong : TEXT }}>Duplicates Only</Text>
            <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: local.is_duplicate ? COLORS.errorStrong : COLORS.border, alignItems: 'center', justifyContent: 'center' }}>
              {local.is_duplicate && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
            </View>
          </TouchableOpacity>
        </ScrollView>

        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: COLORS.surfaceAlt }}>
          <TouchableOpacity onPress={() => { setFilters(local); onClose(); }}
            style={{ backgroundColor: NAVY, paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
            <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 15 }}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
    </FormSheet>
  );
}
const fsLbl = { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.8, marginBottom: 8 };

/* ── Main Leads Screen ── */
export default function SalesLeadsScreen({ navigation, route }) {
  // Dashboard stat cards deep-link here with an initialFilter (e.g. {status:'new'}
  // or {date_from:'today'}) — seed the filter state from it.
  const seedFilters = () => {
    const f = route?.params?.initialFilter;
    if (!f) return EMPTY_FILTERS;
    const today = new Date().toISOString().slice(0, 10);
    const df = f.date_from === 'today' ? today : (f.date_from || '');
    return { ...EMPTY_FILTERS, ...f, date_from: df, date_to: f.date_from === 'today' ? today : (f.date_to || '') };
  };
  const [leads,       setLeads]       = useState([]);
  const [projects,    setProjects]    = useState([]);
  const [sources,     setSources]     = useState([]);
  const [telecallers, setTelecallers] = useState([]);
  const [stms,        setStms]        = useState([]);
  const [cps,         setCps]         = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [search,      setSearch]      = useState('');
  const [searchText,  setSearchText]  = useState(''); // instant input value; debounced into `search`
  const [statusFilter,setStatusFilter]= useState('all');
  const [filters,     setFilters]     = useState(seedFilters);
  const [filterSheet, setFilterSheet] = useState(false);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedLead,setSelectedLead]= useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);

  const companyId = useSelector((s) => s.adminFilter?.companyId);
  const user      = useSelector((s) => s.auth.user);

  // Telecaller / STM portals get a "To Call" vs "Called" split so they can tell
  // which of their assigned leads are still pending vs already actioned.
  const _desig = (user?.designation || '').toLowerCase();
  const isTelecaller = _desig.includes('telecaller') || _desig.includes('tele caller');
  const isStm        = _desig.includes('stm') || _desig.includes('sales team') || _desig.includes('sales executive');
  const isCp         = _desig.includes('cp executive') || _desig.includes('channel partner');
  const isCpHead     = _desig.includes('cp cluster head');
  const isCpAny      = isCp || isCpHead;
  const isCaller     = isTelecaller || isStm || isCp;       // CP Head sees the full team list (no work split)
  // Each scoped role sees only its own status filter; admins/managers see all.
  // CP Cluster Heads use the CP view (no telecaller/STM filters), like CP Execs.
  const isAdminMgr   = !isTelecaller && !isStm && !isCpAny;
  const showTcStatus = isAdminMgr || isTelecaller;
  const showStmStatus= isAdminMgr || isStm || isCpAny;
  const showAssignees= isAdminMgr;
  const [workTab, setWorkTab] = useState(route?.params?.initialWorkTab === 'called' ? 'called' : 'pending'); // 'pending' | 'called' (callers only)
  const [total,   setTotal]   = useState(0); // backend count for the current filter

  const activeFilterCount = Object.entries(filters).filter(([, v]) => v && v !== false && v !== '').length;

  const lastLeadIdRef    = useRef(null);
  const loadingMoreRef   = useRef(false);
  const pageRef          = useRef(1);
  const hasMoreRef       = useRef(true);
  const leadsLengthRef   = useRef(0);
  const loadDataRef      = useRef(null);
  const viewabilityConfig   = useRef({ itemVisiblePercentThreshold: 10 });
  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (!viewableItems.length || !hasMoreRef.current || loadingMoreRef.current) return;
    const lastVisibleIndex = viewableItems[viewableItems.length - 1].index;
    if (lastVisibleIndex >= leadsLengthRef.current - 10) {
      loadDataRef.current?.(false);
    }
  });
  const [newLeadCount, setNewLeadCount] = useState(0);

  // On screen focus: silently check if new leads arrived since last load
  useFocusEffect(useCallback(() => {
    if (lastLeadIdRef.current === null) return;
    (async () => {
      try {
        const res  = await apiFetch(`${SALES_ENDPOINTS.leads}?page=1&page_size=5`);
        if (!res.ok) return;
        const d       = await res.json();
        const results = Array.isArray(d) ? d : (d.results || []);
        if (!results.length) return;
        const latestId = results[0].id;
        if (latestId !== lastLeadIdRef.current) {
          const count = results.filter(r => r.id > lastLeadIdRef.current).length;
          setNewLeadCount(count || 1);
        }
      } catch (_) {}
    })();
  }, []));

  function buildLeadsUrl(p) {
    let url = `${SALES_ENDPOINTS.leads}?page=${p}&page_size=25`;
    if (isCaller) {
      url += `&work=${workTab}`;
      // Pending = oldest-first (FIFO) so new leads queue at the bottom and never
      // bury the lead being worked; Called = most recently actioned first.
      url += `&ordering=${workTab === 'pending' ? 'created_at' : '-updated_at'}`;
    }
    if (companyId)             url += `&company_id=${companyId}`;
    if (search)                url += `&search=${encodeURIComponent(search)}`;
    if (filters.status)        url += `&status=${filters.status}`;
    if (filters.project_id)    url += `&project_id=${filters.project_id}`;
    if (filters.source_id)     url += `&source_id=${filters.source_id}`;
    if (filters.telecaller_id) url += `&telecaller_id=${filters.telecaller_id}`;
    if (filters.stm_id)        url += `&stm_id=${filters.stm_id}`;
    if (filters.tc_status)     url += `&telecaller_status=${filters.tc_status}`;
    if (filters.stm_status)    url += `&stm_status=${filters.stm_status}`;
    if (filters.date_from)     url += `&date_from=${filters.date_from}`;
    if (filters.date_to)       url += `&date_to=${filters.date_to}`;
    if (filters.is_duplicate)  url += `&is_duplicate=true`;
    return url;
  }

  // Records the newest assigned lead id as the baseline for the new-leads banner.
  // Used in caller mode where the visible list is ordered oldest-first (FIFO).
  async function syncNewestBaseline() {
    try {
      const res = await apiFetch(`${SALES_ENDPOINTS.leads}?page=1&page_size=1&ordering=-created_at`);
      if (!res.ok) return;
      const d = await res.json();
      const results = Array.isArray(d) ? d : (d.results || []);
      lastLeadIdRef.current = results.length ? results[0].id : 0;
      setNewLeadCount(0);
    } catch (_) {}
  }

  async function loadData(reset = false) {
    if (!reset && (!hasMore || loadingMoreRef.current)) return;

    const p = reset ? 1 : pageRef.current;

    if (reset) {
      setLoading(true);
      setLeads([]);
      setHasMore(true);
      pageRef.current = 1;
      setPage(1);
    } else {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    }

    try {
      const [leadsRes, projRes, srcRes, tcRes, stmRes, cpRes] = await Promise.all([
        apiFetch(buildLeadsUrl(p)),
        projects.length    ? Promise.resolve(null) : apiFetch(SALES_ENDPOINTS.projects),
        sources.length     ? Promise.resolve(null) : apiFetch(SALES_ENDPOINTS.sources),
        // Refetch the assign lists on every reset (incl. company switch), not just
        // once — and scope them to the selected company. The endpoints already
        // carry `?crm_role=…`, so company_id MUST be appended with `&` (a `?` here
        // makes a malformed double-`?` URL that drops crm_role AND company_id, so
        // the backend returns every company's users mixed across both roles).
        (isCaller || !reset) ? Promise.resolve(null) : apiFetch(SALES_ENDPOINTS.telecallers + (companyId ? `&company_id=${companyId}` : '')),
        (isCaller || !reset) ? Promise.resolve(null) : apiFetch(SALES_ENDPOINTS.stms        + (companyId ? `&company_id=${companyId}` : '')),
        // CP managers (cluster heads) assign leads to their CP executives.
        (!isCpHead || !reset) ? Promise.resolve(null) : apiFetch(SALES_ENDPOINTS.cps        + (companyId ? `&company_id=${companyId}` : '')),
      ]);
      if (leadsRes.ok) {
        const d = await leadsRes.json();
        const results = Array.isArray(d) ? d : (d.results || []);
        setLeads(prev => reset ? results : [...prev, ...results]);
        setTotal(Array.isArray(d) ? results.length : (d.count ?? results.length));
        setHasMore(results.length === 25 && (p * 25) < (d.count ?? Infinity));
        pageRef.current = p + 1;
        setPage(p + 1);
        if (reset) {
          // Baseline for the "new leads arrived" banner = newest assigned lead id.
          // The pending tab is ordered oldest-first, so results[0] is NOT the newest
          // there — derive the newest separately in caller mode.
          if (isCaller) {
            syncNewestBaseline();
          } else if (results.length) {
            lastLeadIdRef.current = results[0].id;
            setNewLeadCount(0);
          }
        }
      }
      if (projRes?.ok)  setProjects(await projRes.json().then(d => Array.isArray(d) ? d : (d.results || [])));
      if (srcRes?.ok)   setSources(await srcRes.json().then(d => Array.isArray(d) ? d : (d.results || [])));
      if (tcRes?.ok)    setTelecallers(await tcRes.json().then(d => Array.isArray(d) ? d : (d.results || [])));
      if (stmRes?.ok)   setStms(await stmRes.json().then(d => Array.isArray(d) ? d : (d.results || [])));
      if (cpRes?.ok)    setCps(await cpRes.json().then(d => Array.isArray(d) ? d : (d.results || [])));
    } catch (_) {}

    setLoading(false);
    setLoadingMore(false);
    setRefreshing(false);
    loadingMoreRef.current = false;
  }

  loadDataRef.current = loadData;
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { leadsLengthRef.current = leads.length; }, [leads.length]);
  // Debounce: typing only triggers a reload (the effect below) 400ms after the user
  // stops, instead of firing a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchText), 400);
    return () => clearTimeout(t);
  }, [searchText]);
  useEffect(() => { loadData(true); }, [search, filters, companyId, workTab]);

  // Client-side company filter (mirrors user management pattern).
  // Only filters if leads actually carry company_id (requires updated backend).
  const leadsHaveCompany = leads.length > 0 && leads[0].company_id != null;
  const visibleLeads = (companyId && leadsHaveCompany) ? leads.filter(l => l.company_id === companyId) : leads;

  function onLeadUpdated(updated) {
    if (!updated) { setLeads(prev => prev.filter(l => l.id !== selectedLead?.id)); return; }
    // In the "To Call" list, once the caller has set their status the lead has been
    // actioned — drop it from the pending list (it now lives under "Called").
    const actioned = isTelecaller ? !!updated.telecaller_status : isStm ? !!updated.stm_status : false;
    if (isCaller && workTab === 'pending' && actioned) {
      setLeads(prev => prev.filter(l => l.id !== updated.id));
    } else {
      setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
    }
  }

  const LeadCard = useCallback(({ item }) => {
    const metaLine = [item.meta_campaign_name, item.meta_adset_name, item.meta_ad_name].filter(Boolean).join(' · ');
    const dateObj  = item.created_at ? new Date(item.created_at) : null;
    const dateStr  = dateObj ? dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '';
    const timeStr  = dateObj ? dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';
    return (
      <TouchableOpacity
        style={[CARD, { marginHorizontal: 16, marginBottom: 10, padding: 14, borderLeftWidth: item.is_duplicate ? 3 : 0, borderLeftColor: COLORS.errorStrong, backgroundColor: item.is_duplicate ? COLORS.white : COLORS.white }]}
        onPress={() => { setSelectedLead(item); setDetailModal(true); }} activeOpacity={0.8}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: item.is_duplicate ? COLORS.errorStrong : NAVY, justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 }}>
            <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 14 }}>{initials(item.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT, flexShrink: 1 }} numberOfLines={1}>{item.name}</Text>
                {item.is_duplicate && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: COLORS.screenBg, borderWidth: 1, borderColor: COLORS.errorBg, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: COLORS.errorStrong }}>⚠ DUP</Text>
                  </View>
                )}
              </View>
              <StatusBadge status={item.status} />
            </View>
            {!!item.phone && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 8 }}>
                <TouchableOpacity
                  onPress={e => { e.stopPropagation?.(); Linking.openURL(`tel:${item.phone}`); }}
                  style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.successBg, justifyContent: 'center', alignItems: 'center' }}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="call" size={14} color={COLORS.success} />
                </TouchableOpacity>
              </View>
            )}
            {!!metaLine && (
              <Text style={{ fontSize: 10, color: COLORS.textSecondary, marginTop: 2 }} numberOfLines={1}>{metaLine}</Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 }}>
                {item.project_name    ? <Text style={{ fontSize: 11, color: MUTED }}>📂 {item.project_name}</Text>    : null}
                {item.source_name     ? <Text style={{ fontSize: 11, color: MUTED }}>• {item.source_name}</Text>      : null}
                {item.telecaller_name ? <Text style={{ fontSize: 11, color: MUTED }}>👤 {item.telecaller_name}</Text> : null}
              </View>
              {!!dateStr && (
                <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                  <Text style={{ fontSize: 11, color: MUTED }}>{dateStr}</Text>
                  <Text style={{ fontSize: 10, color: COLORS.textTertiary }}>{timeStr}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT }}>All Leads</Text>
          <Text style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>
            {total.toLocaleString()} {isCaller ? (workTab === 'pending' ? 'to call' : 'called') : (activeFilterCount > 0 ? 'matching' : 'total')} lead{total === 1 ? '' : 's'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setCreateModal(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: NAVY, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
          <Ionicons name="add" size={16} color={COLORS.white} />
          <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* To Call / Called split — telecaller & STM portals only */}
      {isCaller && (
        <View style={{ flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
          {[['pending', 'To Call'], ['called', 'Called']].map(([key, label]) => {
            const active = workTab === key;
            return (
              <TouchableOpacity key={key} onPress={() => setWorkTab(key)}
                style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: active ? BLUE : 'transparent' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: active ? BLUE : MUTED }}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* New leads notification banner */}
      {newLeadCount > 0 && (
        <TouchableOpacity
          onPress={() => loadData(true)}
          style={{ backgroundColor: COLORS.navy, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="notifications" size={16} color={COLORS.warningAlt} />
            <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 13 }}>
              {newLeadCount} new lead{newLeadCount > 1 ? 's' : ''} arrived
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>Tap to refresh</Text>
            <Ionicons name="refresh" size={13} color="rgba(255,255,255,0.75)" />
          </View>
        </TouchableOpacity>
      )}

      {/* Search + Filter button */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt, flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
          <Ionicons name="search-outline" size={16} color={MUTED} />
          <TextInput value={searchText} onChangeText={setSearchText} placeholder="Search name, phone, email…" placeholderTextColor="#666666" style={{ flex: 1, fontSize: 14, color: TEXT }} returnKeyType="search" />
          {searchText ? <TouchableOpacity onPress={() => { setSearchText(''); setSearch(''); }}><Ionicons name="close-circle" size={16} color={MUTED} /></TouchableOpacity> : null}
        </View>
        <TouchableOpacity onPress={() => setFilterSheet(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: activeFilterCount > 0 ? NAVY : COLORS.surfaceAlt, borderWidth: 1.5, borderColor: activeFilterCount > 0 ? NAVY : COLORS.border }}>
          <Ionicons name="options-outline" size={16} color={activeFilterCount > 0 ? COLORS.white : MUTED} />
          {activeFilterCount > 0 && (
            <View style={{ backgroundColor: COLORS.error, borderRadius: 10, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
              <Text style={{ color: COLORS.white, fontSize: 10, fontWeight: '800' }}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>


      <FilterSheet visible={filterSheet} onClose={() => setFilterSheet(false)}
        filters={filters} setFilters={setFilters}
        projects={projects} sources={sources} telecallers={telecallers} stms={stms}
        showTcStatus={showTcStatus} showStmStatus={showStmStatus} showAssignees={showAssignees} isCp={isCpAny} />

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={NAVY} />
        </View>
      ) : (
        <FlatList
          data={visibleLeads}
          keyExtractor={l => String(l.id)}
          renderItem={LeadCard}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(true); }} colors={[NAVY]} tintColor={NAVY} />}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={viewabilityConfig.current}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={NAVY} style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Ionicons name="people-outline" size={48} color={COLORS.divider} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: MUTED, marginTop: 12 }}>No leads found</Text>
            </View>
          }
        />
      )}

      <LeadDetailModal lead={selectedLead} projects={projects} sources={sources} telecallers={telecallers} stms={stms}
        visible={detailModal} onClose={() => setDetailModal(false)} onUpdated={onLeadUpdated} navigation={navigation} />
      <CreateLeadModal projects={projects} sources={sources} telecallers={telecallers} stms={stms} cps={cps}
        visible={createModal} onClose={() => setCreateModal(false)} onCreated={l => setLeads(prev => [l, ...prev])} />
    </SafeAreaView>
  );
}
