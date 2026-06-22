import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl, Modal, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSelector } from 'react-redux';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const NAVY = COLORS.navy; const BLUE = COLORS.link; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, ...CARD_SHADOW };

const SV_COLOR = { scheduled: COLORS.warning, completed: COLORS.success, no_show: COLORS.error, cancelled: COLORS.textSecondary };
const TABS = [
  { key: 'today',     label: "Today's" },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'completed', label: 'Completed' },
  { key: 'no_show',   label: 'No Show' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all',       label: 'All' },
];

function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const endOfToday   = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; };
const defaultDate  = () => { const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); return d; };

const lblS = { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 6, marginTop: 4 };
const inpS = { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: TEXT, backgroundColor: COLORS.white };
const pickBtn = { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: COLORS.white };

export default function SalesSiteVisitsScreen({ navigation }) {
  const user      = useSelector((s) => s.auth.user);
  const companyId = useSelector((s) => s.adminFilter?.companyId);

  const [visits,     setVisits]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState('today');

  // schedule modal
  const [schedOpen, setSchedOpen] = useState(false);
  const [leads,     setLeads]     = useState([]);
  const [projects,  setProjects]  = useState([]);
  const [sForm,     setSForm]     = useState({ lead: null, project: null, scheduled_at: defaultDate(), remarks: '' });
  const [picker,    setPicker]    = useState(null); // 'lead' | 'project'
  const [showDate,  setShowDate]  = useState(false);
  const [showTime,  setShowTime]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState('');

  // closure modal
  const [closureSv,  setClosureSv]  = useState(null);
  const [cForm,      setCForm]      = useState({ closure_date: new Date(), unit_no: '', unit_type: '', booking_amount: '', total_amount: '', remarks: '' });
  const [showCDate,  setShowCDate]  = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const url = companyId ? `${SALES_ENDPOINTS.siteVisits}?company_id=${companyId}` : SALES_ENDPOINTS.siteVisits;
      const res = await apiFetch(url);
      if (res.ok) setVisits(await res.json());
    } catch (e) {}
    setLoading(false); setRefreshing(false);
  }, [companyId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function openSchedule() {
    setErr('');
    setSForm({ lead: null, project: null, scheduled_at: defaultDate(), remarks: '' });
    setSchedOpen(true);
    try {
      const [lRes, pRes] = await Promise.all([
        apiFetch(`${SALES_ENDPOINTS.leads}?page=1`),
        apiFetch(SALES_ENDPOINTS.projects),
      ]);
      if (lRes.ok) { const d = await lRes.json(); setLeads(Array.isArray(d) ? d : (d.results || [])); }
      if (pRes.ok) { const d = await pRes.json(); setProjects(Array.isArray(d) ? d : (d.results || [])); }
    } catch (e) {}
  }

  async function scheduleVisit() {
    if (!sForm.lead || !(sForm.scheduled_at instanceof Date)) { setErr('Lead and date & time are required.'); return; }
    setSaving(true); setErr('');
    const lead = leads.find((l) => String(l.id) === String(sForm.lead));
    try {
      const res = await apiFetch(SALES_ENDPOINTS.siteVisits, {
        method: 'POST',
        body: JSON.stringify({
          lead: sForm.lead, project: sForm.project || null,
          scheduled_at: sForm.scheduled_at.toISOString(),
          status: 'scheduled', stm: user?.id,
          referred_by_telecaller: lead?.telecaller || null,
          remarks: sForm.remarks || '',
        }),
      });
      if (res.ok) {
        await apiFetch(SALES_ENDPOINTS.lead(sForm.lead), { method: 'PATCH', body: JSON.stringify({ stm_status: 'sv_scheduled' }) }).catch(() => {});
        setSchedOpen(false);
        load();
      } else {
        setErr(JSON.stringify(await res.json().catch(() => ({}))));
      }
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  async function updateStatus(sv, status) {
    const body = { status };
    if (status === 'completed') body.visited_at = new Date().toISOString();
    try {
      const res = await apiFetch(SALES_ENDPOINTS.siteVisit(sv.id), { method: 'PATCH', body: JSON.stringify(body) });
      if (res.ok) {
        if (status === 'completed') {
          await apiFetch(SALES_ENDPOINTS.lead(sv.lead), { method: 'PATCH', body: JSON.stringify({ stm_status: 'sv_done' }) }).catch(() => {});
        }
        const updated = await res.json();
        setVisits((list) => list.map((v) => (v.id === sv.id ? updated : v)));
      }
    } catch (e) {}
  }

  async function recordClosure() {
    if (!cForm.booking_amount) { setErr('Booking amount is required.'); return; }
    setSaving(true); setErr('');
    const sv = closureSv;
    try {
      const res = await apiFetch(SALES_ENDPOINTS.closures, {
        method: 'POST',
        body: JSON.stringify({
          lead: sv.lead, site_visit: sv.id, project: sv.project || null,
          stm: sv.stm || user?.id, referred_by_telecaller: sv.referred_by_telecaller || null,
          status: 'booked',
          closure_date: cForm.closure_date.toISOString().slice(0, 10),
          unit_no: cForm.unit_no, unit_type: cForm.unit_type,
          booking_amount: cForm.booking_amount,
          total_amount: cForm.total_amount || null,
          remarks: cForm.remarks,
        }),
      });
      if (res.ok) {
        await apiFetch(SALES_ENDPOINTS.lead(sv.lead), { method: 'PATCH', body: JSON.stringify({ stm_status: 'closed' }) }).catch(() => {});
        setClosureSv(null);
        setCForm({ closure_date: new Date(), unit_no: '', unit_type: '', booking_amount: '', total_amount: '', remarks: '' });
        load();
      } else {
        setErr(JSON.stringify(await res.json().catch(() => ({}))));
      }
    } catch (e) { setErr(e.message); }
    setSaving(false);
  }

  const now = new Date();
  const visible = visits.filter((v) => {
    if (filter === 'all') return true;
    if (filter === 'today') {
      const at = new Date(v.scheduled_at);
      return v.status === 'scheduled' && at >= startOfToday() && at <= endOfToday();
    }
    return v.status === filter;
  });

  const selLead = leads.find((l) => String(l.id) === String(sForm.lead));
  const selProject = projects.find((p) => String(p.id) === String(sForm.project));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        {navigation.canGoBack() && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={20} color={NAVY} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>Site Visits</Text>
          <Text style={{ fontSize: 13, color: MUTED }}>{visible.length} visit{visible.length === 1 ? '' : 's'} · {user?.name || ''}</Text>
        </View>
        <TouchableOpacity onPress={openSchedule} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: NAVY, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 }}>
          <Ionicons name="add" size={16} color={COLORS.white} />
          <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>Schedule</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={{ backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8 }}>
          {TABS.map((t) => {
            const active = filter === t.key;
            return (
              <TouchableOpacity key={t.key} onPress={() => setFilter(t.key)}
                style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: active ? BLUE : 'transparent' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: active ? BLUE : MUTED }}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator color={NAVY} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 36 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}>
          {visible.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="location-outline" size={40} color={COLORS.border} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: MUTED, marginTop: 12 }}>No site visits</Text>
              <Text style={{ fontSize: 13, color: COLORS.textTertiary || MUTED, marginTop: 4 }}>Schedule one from your pipeline</Text>
            </View>
          ) : visible.map((sv) => (
            <View key={sv.id} style={[CARD, { padding: 14, marginBottom: 12, borderWidth: 1, borderColor: COLORS.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>{sv.lead_name || 'Lead'}</Text>
                <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: (SV_COLOR[sv.status] || MUTED) + '22' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: SV_COLOR[sv.status] || MUTED, textTransform: 'capitalize' }}>{(sv.status || '').replace('_', ' ')}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>{sv.lead_phone || ''}{sv.project_name ? ` · ${sv.project_name}` : ''}</Text>
              {!!sv.referred_by_telecaller_name && <Text style={{ fontSize: 11, color: COLORS.textTertiary || MUTED, marginTop: 2 }}>via TC: {sv.referred_by_telecaller_name}</Text>}
              <Text style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>Scheduled: {fmtDateTime(sv.scheduled_at)}</Text>
              {!!sv.visited_at && <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Visited: {fmtDateTime(sv.visited_at)}</Text>}

              {sv.status === 'scheduled' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                  <TouchableOpacity onPress={() => updateStatus(sv, 'completed')} style={{ borderWidth: 1.5, borderColor: COLORS.success, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.success }}>✓ Done</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => updateStatus(sv, 'no_show')} style={{ borderWidth: 1.5, borderColor: COLORS.warning, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.warning }}>No Show</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => updateStatus(sv, 'cancelled')} style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
              {sv.status === 'completed' && (
                <TouchableOpacity onPress={() => navigation.navigate('ClosureProjects', { sv })}
                  style={{ marginTop: 12, backgroundColor: NAVY, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9, alignSelf: 'flex-start' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.white }}>Record Closure</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── Schedule Modal ── */}
      <Modal visible={schedOpen} transparent animationType="slide" onRequestClose={() => setSchedOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT }}>Schedule Site Visit</Text>
              <TouchableOpacity onPress={() => setSchedOpen(false)}><Ionicons name="close" size={22} color={MUTED} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={lblS}>Lead *</Text>
              <TouchableOpacity onPress={() => setPicker('lead')} style={pickBtn}>
                <Text style={{ fontSize: 14, color: selLead ? TEXT : MUTED }}>{selLead ? `${selLead.name} — ${selLead.phone}` : 'Select lead'}</Text>
                <Ionicons name="chevron-down" size={16} color={MUTED} />
              </TouchableOpacity>

              <Text style={lblS}>Project</Text>
              <TouchableOpacity onPress={() => setPicker('project')} style={pickBtn}>
                <Text style={{ fontSize: 14, color: selProject ? TEXT : MUTED }}>{selProject ? selProject.name : 'Select project'}</Text>
                <Ionicons name="chevron-down" size={16} color={MUTED} />
              </TouchableOpacity>

              <Text style={lblS}>Date & Time *</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setShowDate(true)} style={[pickBtn, { flex: 1, borderColor: COLORS.link }]}>
                  <Ionicons name="calendar-outline" size={16} color={BLUE} />
                  <Text style={{ fontSize: 14, color: BLUE, fontWeight: '600' }}>{sForm.scheduled_at.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowTime(true)} style={[pickBtn, { flex: 1, borderColor: COLORS.link }]}>
                  <Ionicons name="time-outline" size={16} color={BLUE} />
                  <Text style={{ fontSize: 14, color: BLUE, fontWeight: '600' }}>{sForm.scheduled_at.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
                </TouchableOpacity>
              </View>

              <Text style={lblS}>Visit Remarks</Text>
              <TextInput value={sForm.remarks} onChangeText={(v) => setSForm((f) => ({ ...f, remarks: v }))} placeholder="Location, notes…" placeholderTextColor={MUTED} style={inpS} />

              {!!err && <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 10 }}>{err}</Text>}
              <TouchableOpacity onPress={scheduleVisit} disabled={saving} style={{ marginTop: 16, backgroundColor: NAVY, borderRadius: 12, paddingVertical: 13, alignItems: 'center', opacity: saving ? 0.6 : 1 }}>
                <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 15 }}>{saving ? 'Saving…' : 'Schedule Visit'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Closure Modal ── */}
      <Modal visible={!!closureSv} transparent animationType="slide" onRequestClose={() => setClosureSv(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT }}>Record Closure</Text>
              <TouchableOpacity onPress={() => setClosureSv(null)}><Ionicons name="close" size={22} color={MUTED} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {!!closureSv && <Text style={{ fontSize: 13, color: MUTED, marginBottom: 8 }}>{closureSv.lead_name} · {closureSv.lead_phone}</Text>}
              <Text style={lblS}>Closure Date *</Text>
              <TouchableOpacity onPress={() => setShowCDate(true)} style={[pickBtn, { borderColor: COLORS.link }]}>
                <Ionicons name="calendar-outline" size={16} color={BLUE} />
                <Text style={{ fontSize: 14, color: BLUE, fontWeight: '600' }}>{cForm.closure_date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={lblS}>Unit No.</Text>
                  <TextInput value={cForm.unit_no} onChangeText={(v) => setCForm((f) => ({ ...f, unit_no: v }))} placeholder="A-101" placeholderTextColor={MUTED} style={inpS} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={lblS}>Unit Type</Text>
                  <TextInput value={cForm.unit_type} onChangeText={(v) => setCForm((f) => ({ ...f, unit_type: v }))} placeholder="2BHK" placeholderTextColor={MUTED} style={inpS} />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={lblS}>Booking Amount *</Text>
                  <TextInput value={cForm.booking_amount} onChangeText={(v) => setCForm((f) => ({ ...f, booking_amount: v }))} keyboardType="numeric" placeholder="₹" placeholderTextColor={MUTED} style={inpS} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={lblS}>Total Amount</Text>
                  <TextInput value={cForm.total_amount} onChangeText={(v) => setCForm((f) => ({ ...f, total_amount: v }))} keyboardType="numeric" placeholder="₹" placeholderTextColor={MUTED} style={inpS} />
                </View>
              </View>
              <Text style={lblS}>Remarks</Text>
              <TextInput value={cForm.remarks} onChangeText={(v) => setCForm((f) => ({ ...f, remarks: v }))} placeholder="Notes…" placeholderTextColor={MUTED} multiline style={[inpS, { minHeight: 60, textAlignVertical: 'top' }]} />

              {!!err && <Text style={{ color: COLORS.error, fontSize: 12, marginTop: 10 }}>{err}</Text>}
              <TouchableOpacity onPress={recordClosure} disabled={saving} style={{ marginTop: 16, backgroundColor: COLORS.success, borderRadius: 12, paddingVertical: 13, alignItems: 'center', opacity: saving ? 0.6 : 1 }}>
                <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 15 }}>{saving ? 'Saving…' : 'Record Closure'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Lead / Project picker ── */}
      <Modal visible={!!picker} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setPicker(null)}>
          <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' }}>
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT }}>{picker === 'lead' ? 'Select Lead' : 'Select Project'}</Text>
            </View>
            <ScrollView>
              {(picker === 'lead' ? leads : projects).map((o) => (
                <TouchableOpacity key={o.id} onPress={() => { setSForm((f) => ({ ...f, [picker]: o.id })); setPicker(null); }}
                  style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.screenBg }}>
                  <Text style={{ fontSize: 14, color: TEXT }}>{picker === 'lead' ? `${o.name} — ${o.phone}` : o.name}</Text>
                </TouchableOpacity>
              ))}
              {(picker === 'lead' ? leads : projects).length === 0 && (
                <Text style={{ fontSize: 13, color: MUTED, textAlign: 'center', padding: 24 }}>None available</Text>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Date/Time pickers (scheduled_at) ── */}
      {Platform.OS === 'ios' && showDate && (
        <Modal transparent animationType="slide" onRequestClose={() => setShowDate(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setShowDate(false)}>
            <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
                <TouchableOpacity onPress={() => setShowDate(false)}><Text style={{ color: MUTED, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
                <Text style={{ fontWeight: '700', color: TEXT }}>Pick Date</Text>
                <TouchableOpacity onPress={() => setShowDate(false)}><Text style={{ color: BLUE, fontWeight: '700' }}>Done</Text></TouchableOpacity>
              </View>
              <DateTimePicker value={sForm.scheduled_at} mode="date" display="spinner" textColor={TEXT}
                onChange={(_, d) => d && setSForm((f) => { const m = new Date(d); m.setHours(f.scheduled_at.getHours(), f.scheduled_at.getMinutes(), 0, 0); return { ...f, scheduled_at: m }; })} />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      {Platform.OS === 'ios' && showTime && (
        <Modal transparent animationType="slide" onRequestClose={() => setShowTime(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setShowTime(false)}>
            <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
                <TouchableOpacity onPress={() => setShowTime(false)}><Text style={{ color: MUTED, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
                <Text style={{ fontWeight: '700', color: TEXT }}>Pick Time</Text>
                <TouchableOpacity onPress={() => setShowTime(false)}><Text style={{ color: BLUE, fontWeight: '700' }}>Done</Text></TouchableOpacity>
              </View>
              <DateTimePicker value={sForm.scheduled_at} mode="time" display="spinner" textColor={TEXT}
                onChange={(_, d) => d && setSForm((f) => { const m = new Date(f.scheduled_at); m.setHours(d.getHours(), d.getMinutes(), 0, 0); return { ...f, scheduled_at: m }; })} />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      {Platform.OS === 'android' && showDate && (
        <DateTimePicker value={sForm.scheduled_at} mode="date" display="default"
          onChange={(e, d) => { setShowDate(false); if (e.type === 'dismissed') return; if (d) { setSForm((f) => { const m = new Date(d); m.setHours(f.scheduled_at.getHours(), f.scheduled_at.getMinutes(), 0, 0); return { ...f, scheduled_at: m }; }); setShowTime(true); } }} />
      )}
      {Platform.OS === 'android' && showTime && (
        <DateTimePicker value={sForm.scheduled_at} mode="time" display="default" is24Hour={false}
          onChange={(e, d) => { setShowTime(false); if (e.type === 'dismissed') return; if (d) setSForm((f) => { const m = new Date(f.scheduled_at); m.setHours(d.getHours(), d.getMinutes(), 0, 0); return { ...f, scheduled_at: m }; }); }} />
      )}

      {/* ── Closure date picker ── */}
      {Platform.OS === 'ios' && showCDate && (
        <Modal transparent animationType="slide" onRequestClose={() => setShowCDate(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setShowCDate(false)}>
            <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
                <TouchableOpacity onPress={() => setShowCDate(false)}><Text style={{ color: MUTED, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
                <Text style={{ fontWeight: '700', color: TEXT }}>Closure Date</Text>
                <TouchableOpacity onPress={() => setShowCDate(false)}><Text style={{ color: BLUE, fontWeight: '700' }}>Done</Text></TouchableOpacity>
              </View>
              <DateTimePicker value={cForm.closure_date} mode="date" display="spinner" textColor={TEXT}
                onChange={(_, d) => d && setCForm((f) => ({ ...f, closure_date: d }))} />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
      {Platform.OS === 'android' && showCDate && (
        <DateTimePicker value={cForm.closure_date} mode="date" display="default"
          onChange={(e, d) => { setShowCDate(false); if (e.type === 'dismissed') return; if (d) setCForm((f) => ({ ...f, closure_date: d })); }} />
      )}
    </SafeAreaView>
  );
}
