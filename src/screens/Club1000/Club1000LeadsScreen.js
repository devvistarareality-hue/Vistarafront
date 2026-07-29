import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, StatusBar, RefreshControl, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiFetch } from '../../utils/apiFetch';
import { CLUB1000_ENDPOINTS, SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { isClub1000Manager } from '../../utils/club1000Access';
import FormSheet from '../../components/FormSheet';
import { TextField, Field, inputStyle } from '../../components/Field';

const NAVY = COLORS.navy; const TEAL = '#00838F'; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, ...CARD_SHADOW };

const STATUS_COLOR = {
  new: { bg: COLORS.linkBg, fg: COLORS.link },
  contacted: { bg: COLORS.warningBg, fg: COLORS.warning },
  interested: { bg: COLORS.successBg, fg: COLORS.success },
  not_interested: { bg: COLORS.surfaceAlt, fg: MUTED },
  converted: { bg: COLORS.purpleBg, fg: COLORS.purple },
  lost: { bg: COLORS.errorBg, fg: COLORS.error },
};
const SOURCE_LABELS = { referral: 'Referral', walk_in: 'Walk-in', website: 'Website', other: 'Other' };
const STATUS_OPTIONS = ['new', 'contacted', 'interested', 'not_interested', 'converted', 'lost'];
// A lead in one of these has nothing left to follow up on — matches the backend's
// terminal-status handling in LeadDetailView.patch (clears next_follow_up_date).
const TERMINAL_STATUSES = ['not_interested', 'lost', 'converted'];
const EMPTY_FILTERS = { status: '', source: '', scheme_interest: '', assigned_to: '', date_from: '', date_to: '' };

function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/* ── Dropdown Picker (mirrors SalesLeadsScreen's) ── */
function DropdownPicker({ value, onChange, options, placeholder, triggerStyle }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => String(o.value) === String(value));
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
              {options.map((o) => (
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
const fsLbl = { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.8, marginBottom: 8 };

/* ── Filter Bottom Sheet ── */
function FilterSheet({ visible, onClose, filters, setFilters, schemes, assignees, showAssignees }) {
  const [local, setLocal] = useState(filters);
  useEffect(() => { if (visible) setLocal(filters); }, [visible]);
  const set = (k, v) => setLocal((f) => ({ ...f, [k]: v }));
  const localDate = (d) => d.toISOString().slice(0, 10);
  const today = localDate(new Date());
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return localDate(d); };

  return (
    <FormSheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt, backgroundColor: COLORS.white }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT }}>Filters</Text>
        <TouchableOpacity onPress={() => { setLocal(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); onClose(); }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.error }}>Clear All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 16, gap: 16 }}>
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

        <View>
          <Text style={fsLbl}>STATUS</Text>
          <DropdownPicker value={local.status} onChange={(v) => set('status', v)}
            options={[{ value: '', label: 'All Statuses' }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: s.replace(/_/g, ' ') }))]}
            placeholder="All Statuses" />
        </View>

        <View>
          <Text style={fsLbl}>SOURCE</Text>
          <DropdownPicker value={local.source} onChange={(v) => set('source', v)}
            options={[{ value: '', label: 'All Sources' }, ...Object.entries(SOURCE_LABELS).map(([v, l]) => ({ value: v, label: l }))]}
            placeholder="All Sources" />
        </View>

        <View>
          <Text style={fsLbl}>SCHEME</Text>
          <DropdownPicker value={local.scheme_interest} onChange={(v) => set('scheme_interest', v)}
            options={[{ value: '', label: 'All Schemes' }, ...schemes.map((s) => ({ value: String(s.id), label: s.name }))]}
            placeholder="All Schemes" />
        </View>

        {showAssignees && (
          <View>
            <Text style={fsLbl}>ASSIGNED TO</Text>
            <DropdownPicker value={local.assigned_to} onChange={(v) => set('assigned_to', v)}
              options={[{ value: '', label: 'All Assignees' }, ...assignees.map((u) => ({ value: String(u.id), label: u.name }))]}
              placeholder="All Assignees" />
          </View>
        )}
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

function AddLeadSheet({ visible, onClose, onSaved, schemes }) {
  const [form, setForm] = useState({
    name: '', phone: '', alt_phone: '', email: '', reference_name: '', reference_phone: '',
    source: 'referral', scheme_interest: '', amount_interested: '', remarks: '',
  });
  const [sourceOpen, setSourceOpen] = useState(false);
  const [schemeOpen, setSchemeOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.name.trim()) { Alert.alert('Missing name', 'Name is required.'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.scheme_interest) delete payload.scheme_interest;
      if (!payload.amount_interested) delete payload.amount_interested;
      const res = await apiFetch(CLUB1000_ENDPOINTS.leads, { method: 'POST', body: JSON.stringify(payload) });
      const d = await res.json();
      if (!res.ok) { Alert.alert('Could not add lead', d?.detail || 'Please check the fields.'); return; }
      onSaved(d);
      onClose();
      setForm({ name: '', phone: '', alt_phone: '', email: '', reference_name: '', reference_phone: '', source: 'referral', scheme_interest: '', amount_interested: '', remarks: '' });
    } finally {
      setSaving(false);
    }
  }

  const scheme = schemes.find((s) => String(s.id) === String(form.scheme_interest));

  return (
    <FormSheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: TEXT }}>Add Lead</Text>
        <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={18} color={TEXT} />
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <TextField label="Name" required value={form.name} onChangeText={(v) => set('name', v)} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><TextField label="Phone" value={form.phone} onChangeText={(v) => set('phone', v)} keyboardType="phone-pad" /></View>
          <View style={{ flex: 1 }}><TextField label="Alt Phone" value={form.alt_phone} onChangeText={(v) => set('alt_phone', v)} keyboardType="phone-pad" /></View>
        </View>
        <TextField label="Email" value={form.email} onChangeText={(v) => set('email', v)} keyboardType="email-address" autoCapitalize="none" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><TextField label="Reference Name" value={form.reference_name} onChangeText={(v) => set('reference_name', v)} /></View>
          <View style={{ flex: 1 }}><TextField label="Reference Phone" value={form.reference_phone} onChangeText={(v) => set('reference_phone', v)} keyboardType="phone-pad" /></View>
        </View>

        <Field label="Source">
          <TouchableOpacity onPress={() => setSourceOpen((v) => !v)} style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <Text style={{ fontSize: 15, color: TEXT }}>{SOURCE_LABELS[form.source]}</Text>
            <Ionicons name={sourceOpen ? 'chevron-up' : 'chevron-down'} size={16} color={MUTED} />
          </TouchableOpacity>
          {sourceOpen && (
            <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, marginTop: 6, overflow: 'hidden' }}>
              {Object.entries(SOURCE_LABELS).map(([v, label], i) => (
                <TouchableOpacity key={v} onPress={() => { set('source', v); setSourceOpen(false); }}
                  style={{ padding: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: COLORS.surfaceAlt }}>
                  <Text style={{ fontSize: 14, color: TEXT }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Field>

        <Field label="Scheme Interest">
          <TouchableOpacity onPress={() => setSchemeOpen((v) => !v)} style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <Text style={{ fontSize: 15, color: scheme ? TEXT : MUTED }}>{scheme ? scheme.name : 'None'}</Text>
            <Ionicons name={schemeOpen ? 'chevron-up' : 'chevron-down'} size={16} color={MUTED} />
          </TouchableOpacity>
          {schemeOpen && (
            <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, marginTop: 6, overflow: 'hidden' }}>
              <TouchableOpacity onPress={() => { set('scheme_interest', ''); setSchemeOpen(false); }} style={{ padding: 12 }}>
                <Text style={{ fontSize: 14, color: TEXT }}>None</Text>
              </TouchableOpacity>
              {schemes.map((s) => (
                <TouchableOpacity key={s.id} onPress={() => { set('scheme_interest', s.id); setSchemeOpen(false); }}
                  style={{ padding: 12, borderTopWidth: 1, borderTopColor: COLORS.surfaceAlt }}>
                  <Text style={{ fontSize: 14, color: TEXT }}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Field>

        <TextField label="Amount Interested (₹)" value={form.amount_interested} onChangeText={(v) => set('amount_interested', v)} keyboardType="number-pad" />
        <TextField label="Remarks" value={form.remarks} onChangeText={(v) => set('remarks', v)} />

        <TouchableOpacity onPress={submit} disabled={saving}
          style={{ backgroundColor: TEAL, borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: saving ? 0.7 : 1, marginTop: 8 }}>
          {saving ? <ActivityIndicator color={COLORS.white} /> : <Ionicons name="save-outline" size={17} color={COLORS.white} />}
          <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: '800' }}>Add Lead</Text>
        </TouchableOpacity>
      </ScrollView>
    </FormSheet>
  );
}

function LeadDetailSheet({ lead, onClose, onStatusChange, onConvert, onScheduleFollowUp }) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [schedOpen, setSchedOpen] = useState(false);
  const [schedAt, setSchedAt] = useState(() => { const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); return d; });
  const [showPicker, setShowPicker] = useState(false);
  const [schedRemarks, setSchedRemarks] = useState('');
  const [schedBusy, setSchedBusy] = useState(false);
  if (!lead) return null;
  const isTerminal = TERMINAL_STATUSES.includes(lead.status);

  async function submitSchedule() {
    setSchedBusy(true);
    try {
      await onScheduleFollowUp(lead.id, schedAt, schedRemarks);
      setSchedOpen(false);
      setSchedRemarks('');
    } finally {
      setSchedBusy(false);
    }
  }
  return (
    <FormSheet visible={!!lead} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT }}>{lead.name}</Text>
          <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{lead.phone}{lead.email ? ` · ${lead.email}` : ''}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={18} color={TEXT} />
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <View style={{ minWidth: '45%' }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: MUTED }}>Source</Text>
            <Text style={{ fontSize: 14, color: TEXT, marginTop: 2 }}>{SOURCE_LABELS[lead.source] || lead.source}</Text>
          </View>
          <View style={{ minWidth: '45%' }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: MUTED }}>Scheme Interest</Text>
            <Text style={{ fontSize: 14, color: TEXT, marginTop: 2 }}>{lead.scheme_interest_name || '—'}</Text>
          </View>
          <View style={{ minWidth: '45%' }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: MUTED }}>Amount Interested</Text>
            <Text style={{ fontSize: 14, color: TEXT, marginTop: 2 }}>{lead.amount_interested ? `₹${Number(lead.amount_interested).toLocaleString('en-IN')}` : '—'}</Text>
          </View>
          <View style={{ minWidth: '45%' }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: MUTED }}>Assigned To</Text>
            <Text style={{ fontSize: 14, color: TEXT, marginTop: 2 }}>{lead.assigned_to_name || '—'}</Text>
          </View>
        </View>
        {!!lead.remarks && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: MUTED }}>Remarks</Text>
            <Text style={{ fontSize: 13, color: TEXT, marginTop: 2 }}>{lead.remarks}</Text>
          </View>
        )}

        <Field label="Status">
          <TouchableOpacity onPress={() => setStatusOpen((v) => !v)} style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <Text style={{ fontSize: 15, color: TEXT, textTransform: 'capitalize' }}>{lead.status.replace(/_/g, ' ')}</Text>
            <Ionicons name={statusOpen ? 'chevron-up' : 'chevron-down'} size={16} color={MUTED} />
          </TouchableOpacity>
          {statusOpen && (
            <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, marginTop: 6, overflow: 'hidden' }}>
              {STATUS_OPTIONS.map((s, i) => (
                <TouchableOpacity key={s} onPress={() => { onStatusChange(lead.id, s); setStatusOpen(false); }}
                  style={{ padding: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: COLORS.surfaceAlt }}>
                  <Text style={{ fontSize: 14, color: TEXT, textTransform: 'capitalize' }}>{s.replace(/_/g, ' ')}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Field>

        {/* Next follow-up — hidden once the lead is in a terminal status (nothing
            left to follow up on), matching the backend's auto-clear behaviour. */}
        {!isTerminal && (
          <View style={{ marginBottom: 16, backgroundColor: COLORS.surfaceAlt, borderRadius: 10, padding: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: MUTED }}>Next Follow-up</Text>
                <Text style={{ fontSize: 13, color: lead.next_follow_up_date ? TEXT : MUTED, fontWeight: lead.next_follow_up_date ? '700' : '400', marginTop: 2 }}>
                  {lead.next_follow_up_date ? fmtDateTime(lead.next_follow_up_date) : 'Not scheduled'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSchedOpen((v) => !v)}
                style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: TEAL }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: TEAL }}>{lead.next_follow_up_date ? 'Reschedule' : 'Schedule'}</Text>
              </TouchableOpacity>
            </View>
            {schedOpen && (
              <View style={{ marginTop: 12 }}>
                <TouchableOpacity onPress={() => setShowPicker(true)} style={[inputStyle, { marginBottom: 10 }]}>
                  <Text style={{ fontSize: 14, color: TEXT }}>{fmtDateTime(schedAt.toISOString())}</Text>
                </TouchableOpacity>
                {showPicker && (
                  <DateTimePicker value={schedAt} mode="datetime" display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={(_, d) => { setShowPicker(false); if (d) setSchedAt(d); }} />
                )}
                <TextField label="Remarks" value={schedRemarks} onChangeText={setSchedRemarks} placeholder="Optional" />
                <TouchableOpacity onPress={submitSchedule} disabled={schedBusy}
                  style={{ backgroundColor: TEAL, borderRadius: 10, height: 42, alignItems: 'center', justifyContent: 'center', opacity: schedBusy ? 0.7 : 1 }}>
                  {schedBusy ? <ActivityIndicator color={COLORS.white} /> : <Text style={{ color: COLORS.white, fontSize: 14, fontWeight: '700' }}>Save Follow-up</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {lead.status !== 'converted' && (
          <TouchableOpacity onPress={() => onConvert(lead)}
            style={{ backgroundColor: TEAL, borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Ionicons name="swap-horizontal-outline" size={17} color={COLORS.white} />
            <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: '800' }}>Convert to Investor</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </FormSheet>
  );
}

export default function Club1000LeadsScreen({ navigation }) {
  const user = useSelector((s) => s.auth.user);
  const manager = isClub1000Manager(user);

  const [leads,     setLeads]     = useState([]);
  const [schemes,   setSchemes]   = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [searchText, setSearchText] = useState('');
  const [filters,     setFilters]     = useState(EMPTY_FILTERS);
  const [filterSheet, setFilterSheet] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);

  const activeFilterCount = Object.entries(filters).filter(([, v]) => v && v !== '').length;

  // Search box is debounced: typing updates instantly (responsive UI) but only
  // commits to `search` (which triggers the fetch) after a pause.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchText), 400);
    return () => clearTimeout(t);
  }, [searchText]);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filters.status) params.set('status', filters.status);
      if (filters.source) params.set('source', filters.source);
      if (filters.scheme_interest) params.set('scheme_interest', filters.scheme_interest);
      if (filters.assigned_to) params.set('assigned_to', filters.assigned_to);
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);
      const qs = params.toString() ? `?${params}` : '';
      const [leadsRes, schemesRes, usersRes] = await Promise.all([
        apiFetch(`${CLUB1000_ENDPOINTS.leads}${qs}`),
        apiFetch(CLUB1000_ENDPOINTS.schemes),
        manager ? apiFetch(SALES_ENDPOINTS.usersSlim) : Promise.resolve(null),
      ]);
      if (leadsRes.ok) setLeads(await leadsRes.json());
      if (schemesRes.ok) setSchemes(await schemesRes.json());
      if (usersRes && usersRes.ok) {
        const d = await usersRes.json();
        setAssignees(Array.isArray(d) ? d : []);
      }
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }

  useFocusEffect(useCallback(() => { load(); }, [search, filters]));

  async function changeStatus(id, status) {
    const res = await apiFetch(CLUB1000_ENDPOINTS.lead(id), { method: 'PATCH', body: JSON.stringify({ status }) });
    if (res.ok) {
      const updated = await res.json();
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
      setSelected(updated);
    }
  }

  function convert(lead) {
    setSelected(null);
    navigation.navigate('Club1000Investors', { prefillLead: lead });
  }

  async function scheduleFollowUp(leadId, scheduledAtDate, remarks) {
    const scheduled_at = scheduledAtDate.toISOString();
    const res = await apiFetch(CLUB1000_ENDPOINTS.followUps, {
      method: 'POST',
      body: JSON.stringify({ lead: leadId, scheduled_at, remarks }),
    });
    if (res.ok) {
      // The backend sets lead.next_follow_up_date = scheduled_at as a side effect —
      // mirror that locally rather than re-fetching the lead.
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, next_follow_up_date: scheduled_at } : l)));
      setSelected((prev) => (prev && prev.id === leadId ? { ...prev, next_follow_up_date: scheduled_at } : prev));
    } else {
      Alert.alert('Could not schedule', 'Please try again.');
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <AddLeadSheet visible={showAdd} onClose={() => setShowAdd(false)} onSaved={() => load()} schemes={schemes} />
      <LeadDetailSheet lead={selected} onClose={() => setSelected(null)} onStatusChange={changeStatus} onConvert={convert} onScheduleFollowUp={scheduleFollowUp} />
      <FilterSheet visible={filterSheet} onClose={() => setFilterSheet(false)}
        filters={filters} setFilters={setFilters} schemes={schemes} assignees={assignees} showAssignees={manager} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT }}>Leads</Text>
          <Text style={{ fontSize: 12, color: MUTED }}>{manager ? 'All Club 1000 leads' : 'Assigned to you and your team'}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAdd(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: TEAL, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
          <Ionicons name="add" size={16} color={COLORS.white} />
          <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: '700' }}>Add</Text>
        </TouchableOpacity>
      </View>

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

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}>
        {loading ? <ActivityIndicator color={NAVY} style={{ marginTop: 30 }} /> : leads.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Ionicons name="people-outline" size={48} color={COLORS.divider} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: MUTED, marginTop: 12 }}>No leads found</Text>
          </View>
        ) : leads.map((l) => {
          const sc = STATUS_COLOR[l.status] || { bg: COLORS.surfaceAlt, fg: MUTED };
          const overdue = l.next_follow_up_date && new Date(l.next_follow_up_date) < new Date();
          return (
            <TouchableOpacity key={l.id} onPress={() => setSelected(l)} style={[CARD, { padding: 14, marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT }}>{l.name}</Text>
                  <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{l.scheme_interest_name || SOURCE_LABELS[l.source] || l.source}</Text>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: sc.bg }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: sc.fg, textTransform: 'capitalize' }}>{l.status.replace(/_/g, ' ')}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: MUTED, marginTop: 8 }}>
                Assigned to {l.assigned_to_name || '—'} · {new Date(l.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </Text>
              {!!l.next_follow_up_date && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Ionicons name="calendar-outline" size={12} color={overdue ? COLORS.error : TEAL} />
                  <Text style={{ fontSize: 11, fontWeight: '700', color: overdue ? COLORS.error : TEAL }}>
                    Next follow-up: {fmtDateTime(l.next_follow_up_date)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
