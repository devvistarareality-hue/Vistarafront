import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  ActivityIndicator, Alert, StatusBar, RefreshControl, Clipboard, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SALES_ENDPOINTS, RAILWAY_URL } from '../../constants/api';

const NAVY = '#182350';
const BLUE = '#3D5AFE';
const GREEN = '#2E7D32';
const BG = '#F5F6FA';
const TEXT = '#1A1A2E';
const MUTED = '#8492A6';

const PRESETS = ['Meta', 'Google', 'Referral', 'Walk-in', 'IVR', 'Portal', 'Other'];
const SOURCE_COLORS = ['#3D5AFE','#2E7D32','#E65100','#0097A7','#7B1FA2','#F9A825','#EF4444','#00796B','#1565C0'];

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    if (!text) return;
    Clipboard.setString(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <TouchableOpacity onPress={copy} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: copied ? '#A5D6A7' : '#D0D8E8', backgroundColor: copied ? '#E8F5E9' : '#fff', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={13} color={copied ? GREEN : MUTED} />
      <Text style={{ fontSize: 12, fontWeight: '700', color: copied ? GREEN : MUTED }}>{copied ? 'Copied' : label}</Text>
    </TouchableOpacity>
  );
}

function SectionLabel({ children }) {
  return <Text style={{ fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{children}</Text>;
}

function Card({ children, style }) {
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3, ...style }}>
      {children}
    </View>
  );
}

const GUIDE_STEPS = [
  { n: '1', title: 'Create a Meta App',          body: 'Go to developers.facebook.com → My Apps → Create App. Choose Business type → enter app name → Create App.' },
  { n: '2', title: 'Add Webhooks Product',       body: 'Inside your app, click Add Product → find Webhooks → Set Up. From the dropdown select Page → Subscribe to this object.' },
  { n: '3', title: 'Configure Webhook URL',      body: 'In the popup: paste the Webhook URL as Callback URL. Paste the Verify Token. Click Verify and Save.\n\n⚠ URL must be HTTPS — localhost will not work.' },
  { n: '4', title: 'Subscribe to leadgen field', body: 'After verification, find leadgen in the fields list → click Subscribe. Meta will now notify your CRM on every new lead.' },
  { n: '5', title: 'Get Page Access Token',      body: 'Meta Business Suite → Settings → Advanced → Page Access Tokens. Generate token (EAA…) → paste it → Save Configuration.\n\n💡 Use a long-lived token (60 days) to avoid reconnecting.' },
  { n: '6', title: 'Get your Form IDs',          body: 'Ads Manager → Lead Ads Forms → click a form → copy the number after form_id= in the URL.\n\nOr call Graph API Explorer: GET /me/leadgen_forms?access_token=YOUR_TOKEN' },
  { n: '7', title: 'Map Forms to Projects',      body: 'In Form → Project Routing: enter Form ID, a label, select the project → tap + Add Mapping. Repeat for each project.' },
  { n: '8', title: 'Test the Integration',       body: 'Meta for Developers → your app → Webhooks → leadgen → Test → Send. Check All Leads — the test lead should appear within 5 seconds.' },
];

function SetupGuideModal({ visible, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F3FA' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT }}>Setup Guide</Text>
            <Text style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>Follow these steps to connect Meta Lead Ads</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#F0F3FA', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={18} color={TEXT} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {GUIDE_STEPS.map(step => (
            <View key={step.n} style={{ flexDirection: 'row', gap: 12, marginBottom: 14, backgroundColor: '#FAFBFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EAEEF8' }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>{step.n}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: TEXT, marginBottom: 4 }}>{step.title}</Text>
                <Text style={{ fontSize: 12, color: MUTED, lineHeight: 18 }}>{step.body}</Text>
              </View>
            </View>
          ))}

          <View style={{ padding: 14, borderRadius: 12, backgroundColor: '#FFF8E1', borderWidth: 1.5, borderColor: '#FFE082' }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: '#7A5000', marginBottom: 4 }}>⚠ Important</Text>
            <Text style={{ fontSize: 12, color: '#7A5000', lineHeight: 18 }}>The webhook URL must be HTTPS and publicly accessible — localhost will not work. Your Railway deployment URL is used automatically.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── META INTEGRATION TAB ────────────────────────────────────────────────────
function MetaTab() {
  const [cfg,          setCfg]         = useState(null);
  const [loading,      setLoading]     = useState(true);
  const [refreshing,   setRefreshing]  = useState(false);
  const [pat,          setPat]         = useState('');
  const [saving,       setSaving]      = useState(false);
  const [msg,          setMsg]         = useState('');
  const [regen,        setRegen]       = useState(false);
  const [mappings,     setMappings]    = useState([]);
  const [mapFormId,    setMapFormId]   = useState('');
  const [mapFormName,  setMapFormName] = useState('');
  const [mapProject,   setMapProject]  = useState('');
  const [mapSaving,    setMapSaving]   = useState(false);
  const [projOpen,     setProjOpen]    = useState(false);
  const [expandedPages,setExpandedPages] = useState({});

  const webhookUrl = `${RAILWAY_URL}/api/sales/webhooks/meta/`;

  async function load(refresh = false) {
    if (refresh) setRefreshing(true);
    try {
      const h = await authHeaders();
      const [cfgRes, mapRes] = await Promise.all([
        fetch(SALES_ENDPOINTS.metaWebhookConfig, { headers: h }),
        fetch(SALES_ENDPOINTS.metaMappings,      { headers: h }),
      ]);
      if (cfgRes.ok) { const d = await cfgRes.json(); setCfg(d); setPat(d.page_access_token || ''); }
      if (mapRes.ok) { const d = await mapRes.json(); setMappings(Array.isArray(d) ? d : []); }
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  async function saveConfig() {
    setSaving(true); setMsg('');
    try {
      const h = await authHeaders();
      const res = await fetch(SALES_ENDPOINTS.metaWebhookConfig, {
        method: 'POST', headers: h,
        body: JSON.stringify({ action: 'save', page_access_token: pat }),
      });
      const d = await res.json();
      if (res.ok) { setCfg(prev => ({ ...prev, is_active: d.is_active, page_access_token: pat })); setMsg('Saved!'); }
      else setMsg('Error saving.');
    } catch (_) { setMsg('Network error.'); }
    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  }

  async function regenToken() {
    setRegen(true);
    try {
      const h = await authHeaders();
      const res = await fetch(SALES_ENDPOINTS.metaWebhookConfig, {
        method: 'POST', headers: h,
        body: JSON.stringify({ action: 'regenerate_token' }),
      });
      const d = await res.json();
      if (res.ok) setCfg(prev => ({ ...prev, verify_token: d.verify_token }));
    } catch (_) {}
    setRegen(false);
  }

  async function addMapping() {
    if (!mapFormId.trim() || !mapProject) {
      Alert.alert('Missing fields', 'Form ID and project are required.'); return;
    }
    setMapSaving(true);
    try {
      const h = await authHeaders();
      const res = await fetch(SALES_ENDPOINTS.metaMappings, {
        method: 'POST', headers: h,
        body: JSON.stringify({ form_id: mapFormId.trim(), form_name: mapFormName.trim(), project_id: mapProject }),
      });
      const d = await res.json();
      if (res.ok) {
        setMappings(prev => { const idx = prev.findIndex(m => m.form_id === d.form_id); return idx >= 0 ? prev.map((m, i) => i === idx ? d : m) : [...prev, d]; });
        setMapFormId(''); setMapFormName(''); setMapProject(''); setProjOpen(false);
      }
    } catch (_) {}
    setMapSaving(false);
  }

  async function deleteMapping(id) {
    Alert.alert('Remove mapping?', 'This form will no longer auto-route leads.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const h = await authHeaders();
        await fetch(SALES_ENDPOINTS.metaMappings, { method: 'DELETE', headers: h, body: JSON.stringify({ id }) });
        setMappings(prev => prev.filter(m => m.id !== id));
      }},
    ]);
  }

  if (loading) return <ActivityIndicator color={NAVY} style={{ marginTop: 40 }} />;

  const projects = cfg?.projects || [];
  const selectedProj = projects.find(p => String(p.id) === String(mapProject));

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}
    >
      {/* Status */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT, marginBottom: 2 }}>Meta Lead Ads</Text>
            <Text style={{ fontSize: 12, color: MUTED }}>Auto-capture leads from Facebook & Instagram ads</Text>
          </View>
          <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: cfg?.is_active ? '#E8F5E9' : '#FFF3E0', borderWidth: 1.5, borderColor: cfg?.is_active ? '#A5D6A7' : '#FFB74D' }}>
            <Text style={{ fontSize: 11, fontWeight: '800', color: cfg?.is_active ? GREEN : '#E65100' }}>
              {cfg?.is_active ? '● Connected' : '○ Not Active'}
            </Text>
          </View>
        </View>
        {cfg?.total_leads_received > 0 && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 11, color: MUTED }}>Total Leads Received</Text>
            <Text style={{ fontSize: 22, fontWeight: '800', color: NAVY }}>{cfg.total_leads_received}</Text>
          </View>
        )}
      </Card>

      {/* Webhook URL */}
      <Card>
        <SectionLabel>Webhook URL</SectionLabel>
        <Text style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>Paste this as Callback URL in Meta Developer Console</Text>
        <View style={{ backgroundColor: BG, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E0E6F0', marginBottom: 8 }}>
          <Text style={{ fontSize: 11, color: BLUE, flexWrap: 'wrap' }} selectable>{webhookUrl}</Text>
        </View>
        <CopyButton text={webhookUrl} label="Copy Webhook URL" />
      </Card>

      {/* Verify Token */}
      <Card>
        <SectionLabel>Verify Token</SectionLabel>
        <Text style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>Paste this in Meta Developer Console → Webhooks → Verify Token</Text>
        <View style={{ backgroundColor: BG, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E0E6F0', marginBottom: 8 }}>
          <Text style={{ fontSize: 12, color: TEXT }} selectable>{cfg?.verify_token || '—'}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <CopyButton text={cfg?.verify_token} label="Copy Token" />
          <TouchableOpacity onPress={regenToken} disabled={regen} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: '#FFE082', backgroundColor: '#FFF8E1', flexDirection: 'row', alignItems: 'center', gap: 4, opacity: regen ? 0.6 : 1 }}>
            {regen ? <ActivityIndicator size={12} color="#F9A825" /> : <Ionicons name="refresh-outline" size={13} color="#F9A825" />}
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#7A5000' }}>Regenerate</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Page Access Token */}
      <Card>
        <SectionLabel>Page Access Token</SectionLabel>
        <Text style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>Meta Business Suite → Settings → Advanced → Page Access Tokens</Text>
        <TextInput
          value={pat}
          onChangeText={setPat}
          placeholder="EAA…your token here…"
          multiline
          numberOfLines={3}
          style={{ borderWidth: 1.5, borderColor: '#E0E6F0', borderRadius: 10, padding: 12, fontSize: 12, color: TEXT, backgroundColor: BG, minHeight: 70, textAlignVertical: 'top' }}
        />
        <TouchableOpacity onPress={saveConfig} disabled={saving} style={{ marginTop: 12, backgroundColor: NAVY, borderRadius: 10, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: saving ? 0.7 : 1 }}>
          {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="save-outline" size={16} color="#fff" />}
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>Save Configuration</Text>
        </TouchableOpacity>
        {!!msg && (
          <Text style={{ marginTop: 8, textAlign: 'center', fontSize: 12, fontWeight: '700', color: msg.includes('Error') || msg.includes('Network') ? '#D32F2F' : GREEN }}>{msg}</Text>
        )}
      </Card>

      {/* Connected Pages & Forms */}
      {(cfg?.pages_data || []).length > 0 && (
        <Card>
          <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT, marginBottom: 12 }}>Connected Pages & Forms</Text>
          {(cfg.pages_data).map(pg => {
            const mappingMap = {};
            mappings.forEach(m => { mappingMap[m.form_id] = m; });
            const isOpen = !!expandedPages[pg.page_id];
            return (
              <View key={pg.page_id} style={{ borderRadius: 10, borderWidth: 1.5, borderColor: '#E4E8F0', overflow: 'hidden', marginBottom: 8 }}>
                <TouchableOpacity
                  onPress={() => setExpandedPages(prev => ({ ...prev, [pg.page_id]: !prev[pg.page_id] }))}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: '#F5F7FC' }}
                  activeOpacity={0.7}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: GREEN }} />
                  <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: NAVY }}>{pg.page_name}</Text>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: '#E8EEFF' }}>
                    <Text style={{ fontSize: 11, color: MUTED }}>{pg.forms.length} forms</Text>
                  </View>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={MUTED} />
                </TouchableOpacity>
                {isOpen && pg.forms.length > 0 && (
                  <View style={{ padding: 8, gap: 4 }}>
                    {pg.forms.map(f => {
                      const mapped = mappingMap[f.id];
                      return (
                        <View key={f.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: 8, backgroundColor: mapped ? '#F0FFF4' : '#FAFAFA' }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, fontWeight: '600', color: TEXT }} numberOfLines={1}>{f.name || 'Unnamed'}</Text>
                            <Text style={{ fontSize: 10, color: '#B0BAC9', fontFamily: 'monospace' }}>{f.id}</Text>
                          </View>
                          <CopyButton text={f.id} label="ID" />
                          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: mapped ? '#D1FAE5' : '#F3F4F6' }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: mapped ? '#065F46' : '#9CA3AF' }}>
                              {mapped ? mapped.project_name : 'No project'}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
                {isOpen && pg.forms.length === 0 && (
                  <View style={{ padding: 12 }}>
                    <Text style={{ fontSize: 12, color: MUTED, textAlign: 'center' }}>No forms found for this page</Text>
                  </View>
                )}
              </View>
            );
          })}
        </Card>
      )}

      {/* Form → Project Routing (single card) */}
      <Card>
        <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT, marginBottom: 2 }}>Form → Project Routing</Text>
        <Text style={{ fontSize: 12, color: MUTED, marginBottom: 14 }}>Map each Meta Lead Ads form to a project so leads auto-classify on arrival.</Text>

        {/* Existing mappings */}
        {mappings.length > 0 && (
          <View style={{ borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E0E6F0', marginBottom: 14 }}>
            {mappings.map((m, i) => (
              <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: i < mappings.length - 1 ? 1 : 0, borderBottomColor: '#F0F3FA', backgroundColor: '#FAFBFF' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT }}>{m.form_name || m.form_id}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Text style={{ fontSize: 11, color: MUTED, fontFamily: 'monospace' }}>{m.form_id}</Text>
                    <CopyButton text={m.form_id} label="Copy" />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: BLUE }} />
                    <Text style={{ fontSize: 11, color: BLUE, fontWeight: '600' }}>{m.project_name}</Text>
                    {m.total_leads > 0 && <Text style={{ fontSize: 11, color: MUTED }}>· {m.total_leads} leads</Text>}
                  </View>
                </View>
                <TouchableOpacity onPress={() => deleteMapping(m.id)} style={{ padding: 8 }}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 12 }}>Add Mapping</Text>
        <TextInput
          value={mapFormId}
          onChangeText={setMapFormId}
          placeholder="Form ID (e.g. 1234567890)"
          keyboardType="numeric"
          style={{ borderWidth: 1.5, borderColor: '#E0E6F0', borderRadius: 10, padding: 11, fontSize: 13, color: TEXT, backgroundColor: BG, marginBottom: 10 }}
        />
        <TextInput
          value={mapFormName}
          onChangeText={setMapFormName}
          placeholder="Form label (e.g. Kalrav Form)"
          style={{ borderWidth: 1.5, borderColor: '#E0E6F0', borderRadius: 10, padding: 11, fontSize: 13, color: TEXT, backgroundColor: BG, marginBottom: 10 }}
        />

        {/* Project picker */}
        <TouchableOpacity onPress={() => setProjOpen(v => !v)} style={{ borderWidth: 1.5, borderColor: projOpen ? NAVY : '#E0E6F0', borderRadius: 10, padding: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: BG, marginBottom: projOpen ? 0 : 10 }}>
          <Text style={{ fontSize: 13, color: selectedProj ? TEXT : MUTED }}>{selectedProj ? selectedProj.name : '— Select Project —'}</Text>
          <Ionicons name={projOpen ? 'chevron-up' : 'chevron-down'} size={16} color={MUTED} />
        </TouchableOpacity>
        {projOpen && (
          <View style={{ borderWidth: 1.5, borderTopWidth: 0, borderColor: NAVY, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: '#fff', marginBottom: 10, overflow: 'hidden' }}>
            {projects.map((p, i) => (
              <TouchableOpacity key={p.id} onPress={() => { setMapProject(String(p.id)); setProjOpen(false); }}
                style={{ padding: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: '#F0F3FA', backgroundColor: String(mapProject) === String(p.id) ? '#EEF0FF' : '#fff' }}>
                <Text style={{ fontSize: 13, color: String(mapProject) === String(p.id) ? BLUE : TEXT, fontWeight: String(mapProject) === String(p.id) ? '700' : '400' }}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity onPress={addMapping} disabled={mapSaving || !mapFormId.trim() || !mapProject}
          style={{ backgroundColor: NAVY, borderRadius: 10, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, opacity: (!mapFormId.trim() || !mapProject) ? 0.5 : 1 }}>
          {mapSaving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="add-circle-outline" size={16} color="#fff" />}
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>+ Add Mapping</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 12, padding: 12, borderRadius: 10, backgroundColor: '#F0F7FF', borderWidth: 1, borderColor: '#C7DAFF' }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: BLUE, marginBottom: 4 }}>How to find your Form ID</Text>
          <Text style={{ fontSize: 11, color: '#2A4A8A', lineHeight: 17 }}>
            Go to <Text style={{ fontWeight: '700' }}>Meta Ads Manager → Lead Ads Forms → your form → Preview</Text>. The ID appears in the URL after <Text style={{ fontWeight: '700' }}>form_id=</Text>
          </Text>
        </View>
      </Card>

    </ScrollView>
  );
}

// ─── LEAD SOURCES TAB ────────────────────────────────────────────────────────
function SourcesTab() {
  const [sources,    setSources]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newName,    setNewName]    = useState('');
  const [adding,     setAdding]     = useState(false);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const h = await authHeaders();
      const res = await fetch(SALES_ENDPOINTS.sources, { headers: h });
      if (res.ok) { const d = await res.json(); setSources(Array.isArray(d) ? d : (d.results || [])); }
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  async function addSource(name) {
    const n = name.trim();
    if (!n) return;
    if (sources.find(s => s.name.toLowerCase() === n.toLowerCase())) {
      Alert.alert('Already exists', `"${n}" source already added.`); return;
    }
    setAdding(true);
    try {
      const h = await authHeaders();
      const res = await fetch(SALES_ENDPOINTS.sources, { method: 'POST', headers: h, body: JSON.stringify({ name: n }) });
      if (res.ok) { const d = await res.json(); setSources(prev => [...prev, d]); setNewName(''); }
    } catch (_) {}
    setAdding(false);
  }

  async function deleteSource(id) {
    Alert.alert('Delete source?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const h = await authHeaders();
        const res = await fetch(SALES_ENDPOINTS.source(id), { method: 'DELETE', headers: h });
        if (res.ok || res.status === 204) setSources(prev => prev.filter(s => s.id !== id));
      }},
    ]);
  }

  const existingNames = new Set(sources.map(s => s.name.toLowerCase()));

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}
    >
      <Card>
        <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 12 }}>Add Custom Source</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput value={newName} onChangeText={setNewName} placeholder="e.g. Newspaper, Events…"
            style={{ flex: 1, borderWidth: 1.5, borderColor: '#E0E6F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: TEXT, backgroundColor: BG }}
            onSubmitEditing={() => addSource(newName)} returnKeyType="done" />
          <TouchableOpacity onPress={() => addSource(newName)} disabled={adding || !newName.trim()}
            style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: NAVY, borderRadius: 10, justifyContent: 'center', opacity: !newName.trim() ? 0.5 : 1 }}>
            {adding ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="add" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </Card>

      <Card>
        <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 12 }}>Quick Add Presets</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {PRESETS.map(name => {
            const exists = existingNames.has(name.toLowerCase());
            return (
              <TouchableOpacity key={name} onPress={() => !exists && addSource(name)} disabled={exists}
                style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: exists ? '#F0F3FA' : NAVY, borderWidth: 1.5, borderColor: exists ? '#E0E6F0' : NAVY, opacity: exists ? 0.5 : 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: exists ? MUTED : '#fff' }}>{exists ? '✓ ' : '+ '}{name}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      <SectionLabel>Active Sources ({sources.length})</SectionLabel>
      {loading ? <ActivityIndicator color={NAVY} /> : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {sources.map((s, i) => (
            <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingLeft: 14, paddingRight: 10, borderRadius: 30,
              backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] + '18', borderWidth: 1.5, borderColor: SOURCE_COLORS[i % SOURCE_COLORS.length] + '55' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: SOURCE_COLORS[i % SOURCE_COLORS.length] }}>{s.name}</Text>
              <TouchableOpacity onPress={() => deleteSource(s.id)} style={{ padding: 2 }}>
                <Ionicons name="close" size={14} color={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
              </TouchableOpacity>
            </View>
          ))}
          {sources.length === 0 && <Text style={{ color: MUTED, fontSize: 14 }}>No sources yet. Add one above.</Text>}
        </View>
      )}
    </ScrollView>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function SalesSourcesScreen({ navigation }) {
  const [tab,          setTab]          = useState('meta');
  const [guideVisible, setGuideVisible] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#182350" />

      <SetupGuideModal visible={guideVisible} onClose={() => setGuideVisible(false)} />

      <View style={{ backgroundColor: '#182350', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' }}>Lead Setup</Text>
          <TouchableOpacity onPress={() => setGuideVisible(true)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' }}>
            <Ionicons name="help-circle-outline" size={16} color="#fff" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Guide</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row' }}>
          {[{ key: 'meta', label: '🔗 Meta Integration' }, { key: 'sources', label: '📋 Lead Sources' }].map(t => (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
              style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: tab === t.key ? '#fff' : 'transparent' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: tab === t.key ? '#fff' : 'rgba(255,255,255,0.5)' }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {tab === 'meta' ? <MetaTab /> : <SourcesTab />}
    </SafeAreaView>
  );
}
