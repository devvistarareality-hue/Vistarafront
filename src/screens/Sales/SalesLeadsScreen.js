import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, ScrollView, TextInput,
  ActivityIndicator, Alert, StatusBar, RefreshControl, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SALES_ENDPOINTS } from '../../constants/api';

const NAVY = '#182350'; const BLUE = '#3D5AFE'; const BG = '#F5F6FA'; const TEXT = '#1A1A2E'; const MUTED = '#8492A6';
const CARD = { backgroundColor: '#fff', borderRadius: 14, shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 3 };

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
  { key: 'sv_scheduled',     label: 'SV Scheduled'    },
  { key: 'sv_done',          label: 'SV Done'         },
  { key: 'closed',           label: 'Closed'          },
  { key: 'lost',             label: 'Lost'            },
];

const STATUS_COLOR = {
  new:              { bg: '#EEF0FF', text: '#3D5AFE' },
  assigned:         { bg: '#F3E5F5', text: '#7B1FA2' },
  contacted:        { bg: '#E0F7FA', text: '#0097A7' },
  not_reachable:    { bg: '#FEE2E2', text: '#EF4444' },
  warm_transferred: { bg: '#FFF3E0', text: '#E65100' },
  sv_scheduled:     { bg: '#FFF8E1', text: '#F9A825' },
  sv_done:          { bg: '#E8F5E9', text: '#2E7D32' },
  closed:           { bg: '#E8F5E9', text: '#1B5E20' },
  lost:             { bg: '#F5F5F5', text: '#9E9E9E' },
};

function StatusBadge({ status }) {
  const c = STATUS_COLOR[status] || { bg: '#F5F5F5', text: MUTED };
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: c.bg }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: c.text }}>{(status || '').replace(/_/g, ' ').toUpperCase()}</Text>
    </View>
  );
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

/* ── Lead Detail Modal ── */
function LeadDetailModal({ lead, projects, sources, telecallers, visible, onClose, onUpdated }) {
  const [form, setForm]   = useState({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab]     = useState('details');

  useEffect(() => {
    if (lead) setForm({
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
    });
    setTab('details');
  }, [lead, visible]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(SALES_ENDPOINTS.lead(lead.id), { method: 'PATCH', headers, body: JSON.stringify(form) });
      if (res.ok) { onUpdated(await res.json()); onClose(); }
      else { Alert.alert('Error', 'Could not save lead.'); }
    } catch (e) { Alert.alert('Network error', e.message); }
    setSaving(false);
  }

  async function deleteLead() {
    Alert.alert('Delete lead?', `Delete ${lead?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const headers = await authHeaders();
        const res = await fetch(SALES_ENDPOINTS.lead(lead.id), { method: 'DELETE', headers });
        if (res.ok || res.status === 204) { onUpdated(null); onClose(); }
      }},
    ]);
  }

  const inpS = { borderWidth: 1.5, borderColor: '#E0E6F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: TEXT, backgroundColor: '#fff', marginBottom: 10 };
  const lblS = { fontSize: 10, fontWeight: '700', color: '#B0BAC9', textTransform: 'uppercase', marginBottom: 4 };

  if (!lead) return null;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F0F3FA', backgroundColor: '#fff' }}>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={MUTED} /></TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT }}>{lead.name}</Text>
              <StatusBadge status={lead.status} />
            </View>
            <TouchableOpacity onPress={save} disabled={saving}
              style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: NAVY, borderRadius: 10, opacity: saving ? 0.6 : 1 }}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Save</Text>}
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F3FA' }}>
            {[['details','Info'], ['telecaller','Telecaller'], ['stm','STM']].map(([key, lbl]) => (
              <TouchableOpacity key={key} onPress={() => setTab(key)} style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === key ? BLUE : 'transparent' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: tab === key ? BLUE : MUTED }}>{lbl}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
            {tab === 'details' && <>
              <Text style={lblS}>Name</Text>
              <TextInput value={form.name} onChangeText={v => set('name', v)} style={inpS} />
              <Text style={lblS}>Phone</Text>
              <TextInput value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" style={inpS} />
              <Text style={lblS}>Alternate Phone</Text>
              <TextInput value={form.alt_phone} onChangeText={v => set('alt_phone', v)} keyboardType="phone-pad" style={inpS} />
              <Text style={lblS}>Email</Text>
              <TextInput value={form.email} onChangeText={v => set('email', v)} keyboardType="email-address" style={inpS} />
              <Text style={lblS}>Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {STATUSES.filter(s => s.key !== 'all').map(s => (
                    <TouchableOpacity key={s.key} onPress={() => set('status', s.key)}
                      style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: form.status === s.key ? NAVY : '#F0F3FA', borderWidth: 1.5, borderColor: form.status === s.key ? NAVY : '#E0E6F0' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: form.status === s.key ? '#fff' : MUTED }}>{s.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text style={lblS}>Project</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {projects.map(p => (
                    <TouchableOpacity key={p.id} onPress={() => set('project', p.id)}
                      style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: String(form.project) === String(p.id) ? NAVY : '#F0F3FA', borderWidth: 1.5, borderColor: String(form.project) === String(p.id) ? NAVY : '#E0E6F0' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: String(form.project) === String(p.id) ? '#fff' : MUTED }}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text style={lblS}>Source</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {sources.map(s => (
                    <TouchableOpacity key={s.id} onPress={() => set('source', s.id)}
                      style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: String(form.source) === String(s.id) ? NAVY : '#F0F3FA', borderWidth: 1.5, borderColor: String(form.source) === String(s.id) ? NAVY : '#E0E6F0' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: String(form.source) === String(s.id) ? '#fff' : MUTED }}>{s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <TouchableOpacity onPress={deleteLead} style={{ marginTop: 12, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FEE2E2', alignItems: 'center', borderWidth: 1.5, borderColor: '#FCA5A5' }}>
                <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 14 }}>Delete Lead</Text>
              </TouchableOpacity>
            </>}

            {tab === 'telecaller' && <>
              <Text style={lblS}>Assign Telecaller</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {telecallers.map(u => (
                    <TouchableOpacity key={u.id} onPress={() => set('telecaller', u.id)}
                      style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: String(form.telecaller) === String(u.id) ? NAVY : '#F0F3FA', borderWidth: 1.5, borderColor: String(form.telecaller) === String(u.id) ? NAVY : '#E0E6F0' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: String(form.telecaller) === String(u.id) ? '#fff' : MUTED }}>{u.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text style={lblS}>Telecaller Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {['pending','called','warm','not_reachable','transferred'].map(s => (
                    <TouchableOpacity key={s} onPress={() => set('telecaller_status', s)}
                      style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: form.telecaller_status === s ? NAVY : '#F0F3FA', borderWidth: 1.5, borderColor: form.telecaller_status === s ? NAVY : '#E0E6F0' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: form.telecaller_status === s ? '#fff' : MUTED }}>{s.replace(/_/g,' ')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text style={lblS}>Remarks</Text>
              <TextInput value={form.telecaller_remarks} onChangeText={v => set('telecaller_remarks', v)}
                multiline style={[inpS, { minHeight: 80, textAlignVertical: 'top' }]} />
            </>}

            {tab === 'stm' && <>
              <Text style={lblS}>STM Status</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {['pending','contacted','hot','sv_scheduled','sv_done','closed','lost'].map(s => (
                    <TouchableOpacity key={s} onPress={() => set('stm_status', s)}
                      style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: form.stm_status === s ? NAVY : '#F0F3FA', borderWidth: 1.5, borderColor: form.stm_status === s ? NAVY : '#E0E6F0' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: form.stm_status === s ? '#fff' : MUTED }}>{s.replace(/_/g,' ')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <Text style={lblS}>STM Remarks</Text>
              <TextInput value={form.stm_remarks} onChangeText={v => set('stm_remarks', v)}
                multiline style={[inpS, { minHeight: 80, textAlignVertical: 'top' }]} />
            </>}
            <View style={{ height: 20 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

/* ── Create Lead Modal ── */
function CreateLeadModal({ projects, sources, visible, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', phone: '', alt_phone: '', email: '', project: '', source: '', status: 'new' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function create() {
    if (!form.name.trim() || !form.phone.trim()) { Alert.alert('Required', 'Name and phone are required.'); return; }
    setSaving(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(SALES_ENDPOINTS.leads, { method: 'POST', headers, body: JSON.stringify(form) });
      if (res.ok) { onCreated(await res.json()); onClose(); setForm({ name: '', phone: '', alt_phone: '', email: '', project: '', source: '', status: 'new' }); }
      else { const e = await res.json(); Alert.alert('Error', JSON.stringify(e)); }
    } catch (e) { Alert.alert('Network error', e.message); }
    setSaving(false);
  }

  const inpS = { borderWidth: 1.5, borderColor: '#E0E6F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: TEXT, backgroundColor: '#fff', marginBottom: 10 };
  const lblS = { fontSize: 10, fontWeight: '700', color: '#B0BAC9', textTransform: 'uppercase', marginBottom: 4 };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#F0F3FA', backgroundColor: '#fff' }}>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={MUTED} /></TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT }}>Add Lead</Text>
            <TouchableOpacity onPress={create} disabled={saving}
              style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: NAVY, borderRadius: 10, opacity: saving ? 0.6 : 1 }}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Add</Text>}
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={lblS}>Full Name *</Text>
            <TextInput value={form.name} onChangeText={v => set('name', v)} placeholder="Lead name" style={inpS} />
            <Text style={lblS}>Phone *</Text>
            <TextInput value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" placeholder="10-digit mobile" style={inpS} />
            <Text style={lblS}>Alt Phone</Text>
            <TextInput value={form.alt_phone} onChangeText={v => set('alt_phone', v)} keyboardType="phone-pad" style={inpS} />
            <Text style={lblS}>Email</Text>
            <TextInput value={form.email} onChangeText={v => set('email', v)} keyboardType="email-address" style={inpS} />
            <Text style={lblS}>Project</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {projects.map(p => (
                  <TouchableOpacity key={p.id} onPress={() => set('project', p.id)}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: String(form.project) === String(p.id) ? NAVY : '#F0F3FA', borderWidth: 1.5, borderColor: String(form.project) === String(p.id) ? NAVY : '#E0E6F0' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: String(form.project) === String(p.id) ? '#fff' : MUTED }}>{p.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={lblS}>Source</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {sources.map(s => (
                  <TouchableOpacity key={s.id} onPress={() => set('source', s.id)}
                    style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: String(form.source) === String(s.id) ? NAVY : '#F0F3FA', borderWidth: 1.5, borderColor: String(form.source) === String(s.id) ? NAVY : '#E0E6F0' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: String(form.source) === String(s.id) ? '#fff' : MUTED }}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

/* ── Main Leads Screen ── */
export default function SalesLeadsScreen({ navigation }) {
  const [leads,       setLeads]       = useState([]);
  const [projects,    setProjects]    = useState([]);
  const [sources,     setSources]     = useState([]);
  const [telecallers, setTelecallers] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [search,      setSearch]      = useState('');
  const [statusFilter,setStatusFilter]= useState('all');
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedLead,setSelectedLead]= useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [createModal, setCreateModal] = useState(false);

  async function loadData(reset = false) {
    const p = reset ? 1 : page;
    if (!reset && !hasMore) return;
    if (reset) { setLoading(true); setPage(1); } else setLoadingMore(true);
    try {
      const headers = await authHeaders();
      let url = `${SALES_ENDPOINTS.leads}?page=${p}&page_size=25`;
      if (search)                        url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter && statusFilter !== 'all') url += `&status=${statusFilter}`;
      const [leadsRes, projRes, srcRes, tcRes] = await Promise.all([
        fetch(url, { headers }),
        projects.length ? Promise.resolve(null) : fetch(SALES_ENDPOINTS.projects, { headers }),
        sources.length  ? Promise.resolve(null) : fetch(SALES_ENDPOINTS.sources,  { headers }),
        telecallers.length ? Promise.resolve(null) : fetch(SALES_ENDPOINTS.telecallers, { headers }),
      ]);
      if (leadsRes.ok) {
        const d = await leadsRes.json();
        const results = Array.isArray(d) ? d : (d.results || []);
        setLeads(prev => reset ? results : [...prev, ...results]);
        setHasMore(!!d.next);
        setPage(p + 1);
      }
      if (projRes?.ok)  setProjects(await projRes.json().then(d => Array.isArray(d) ? d : (d.results || [])));
      if (srcRes?.ok)   setSources(await srcRes.json().then(d => Array.isArray(d) ? d : (d.results || [])));
      if (tcRes?.ok)    setTelecallers(await tcRes.json().then(d => Array.isArray(d) ? d : (d.results || [])));
    } catch (_) {}
    setLoading(false); setLoadingMore(false); setRefreshing(false);
  }

  useEffect(() => { loadData(true); }, [search, statusFilter]);

  function onLeadUpdated(updated) {
    if (!updated) setLeads(prev => prev.filter(l => l.id !== selectedLead?.id));
    else setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
  }

  const LeadCard = useCallback(({ item }) => {
    const sc = STATUS_COLOR[item.status] || { bg: '#F5F5F5', text: MUTED };
    return (
      <TouchableOpacity style={[CARD, { marginHorizontal: 16, marginBottom: 10, padding: 14 }]}
        onPress={() => { setSelectedLead(item); setDetailModal(true); }} activeOpacity={0.8}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center', marginRight: 12, flexShrink: 0 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{initials(item.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT }} numberOfLines={1}>{item.name}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{item.phone}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {item.project_name ? <Text style={{ fontSize: 11, color: MUTED }}>📂 {item.project_name}</Text> : null}
              {item.source_name  ? <Text style={{ fontSize: 11, color: MUTED }}>• {item.source_name}</Text>  : null}
              {item.telecaller_name ? <Text style={{ fontSize: 11, color: MUTED }}>👤 {item.telecaller_name}</Text> : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F3FA' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: TEXT }}>All Leads</Text>
        <TouchableOpacity onPress={() => setCreateModal(true)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: NAVY, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F3FA' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
          <Ionicons name="search-outline" size={16} color={MUTED} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search name, phone, email…" style={{ flex: 1, fontSize: 14, color: TEXT }} returnKeyType="search" />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={MUTED} /></TouchableOpacity> : null}
        </View>
      </View>

      {/* Status filter */}
      <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F3FA', backgroundColor: '#fff' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}>
          {STATUSES.map(s => (
            <TouchableOpacity key={s.key} onPress={() => setStatusFilter(s.key)}
              style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: statusFilter === s.key ? NAVY : '#F0F3FA', borderWidth: 1.5, borderColor: statusFilter === s.key ? NAVY : '#E0E6F0' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: statusFilter === s.key ? '#fff' : MUTED }}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={NAVY} />
        </View>
      ) : (
        <FlatList
          data={leads}
          keyExtractor={l => String(l.id)}
          renderItem={({ item }) => <LeadCard item={item} />}
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(true); }} colors={[NAVY]} tintColor={NAVY} />}
          onEndReached={() => loadData(false)}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={NAVY} style={{ marginVertical: 16 }} /> : null}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Ionicons name="people-outline" size={48} color="#DDE3F0" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: MUTED, marginTop: 12 }}>No leads found</Text>
            </View>
          }
        />
      )}

      <LeadDetailModal lead={selectedLead} projects={projects} sources={sources} telecallers={telecallers}
        visible={detailModal} onClose={() => setDetailModal(false)} onUpdated={onLeadUpdated} />
      <CreateLeadModal projects={projects} sources={sources}
        visible={createModal} onClose={() => setCreateModal(false)} onCreated={l => setLeads(prev => [l, ...prev])} />
    </SafeAreaView>
  );
}
