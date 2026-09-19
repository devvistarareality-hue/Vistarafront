import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StatusBar,
         ActivityIndicator, RefreshControl, Modal, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import FilterSelect from '../../components/FilterSelect';
import AppLoader from '../../components/AppLoader';

const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary; const BLUE = COLORS.link;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 22, padding: 14, ...CARD_SHADOW , borderWidth: 1, borderColor: COLORS.cardBorder };

// Same three lists the web directory uses — kept identical so a partner added on
// either side reads the same on the other.
const CATEGORY_OPTIONS = [
  { value: 'premium',  label: 'Premium' },
  { value: 'normal',   label: 'Normal' },
  { value: 'referral', label: 'Referral' },
];
const CATEGORY_COLOR = {
  premium:  { bg: COLORS.warningBg, color: COLORS.warning },
  normal:   { bg: COLORS.accentSoft, color: BLUE },
  referral: { bg: COLORS.successBg, color: COLORS.success },
};
const SEGMENT_OPTIONS = [
  { value: '',            label: '— Select —' },
  { value: 'residential', label: 'Residential' },
  { value: 'industrial',  label: 'Industrial' },
  { value: 'both',        label: 'Both' },
];
// City is a broad dropdown (state-wide); Area stays free text for the locality within
// it — every CP is Gujarat-based for now, so this is a flat list, not a cascade.
const GUJARAT_CITIES = [
  'Ahmedabad', 'Amreli', 'Anand', 'Ankleshwar', 'Bardoli', 'Bharuch', 'Bhavnagar', 'Bhuj',
  'Botad', 'Chhota Udepur', 'Dahod', 'Deesa', 'Dhoraji', 'Dholka', 'Gandhidham', 'Gandhinagar',
  'Godhra', 'Gondal', 'Halol', 'Himatnagar', 'Idar', 'Jamnagar', 'Jetpur', 'Junagadh', 'Kalol',
  'Keshod', 'Khambhat', 'Kheda', 'Mahuva', 'Mehsana', 'Modasa', 'Morbi', 'Nadiad', 'Navsari',
  'Palanpur', 'Patan', 'Porbandar', 'Rajkot', 'Rajpipla', 'Sanand', 'Sidhpur', 'Surat',
  'Surendranagar', 'Talaja', 'Umreth', 'Una', 'Unjha', 'Upleta', 'Vadnagar', 'Vadodara',
  'Valsad', 'Vapi', 'Veraval', 'Vijapur', 'Viramgam', 'Visnagar', 'Vyara', 'Wankaner',
];

const EMPTY = { name: '', contact_no: '', firm_name: '', category: 'normal',
                segment: '', city: '', area: '', is_active: true };

function Badge({ category }) {
  const c = CATEGORY_COLOR[category] || { bg: COLORS.surfaceAlt, color: MUTED };
  const label = CATEGORY_OPTIONS.find((o) => o.value === category)?.label || category || '—';
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, backgroundColor: c.bg }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: c.color }}>{label}</Text>
    </View>
  );
}

function Fld({ label, value, onChange, placeholder, keyboardType }) {
  return (
    <>
      <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, marginBottom: 5 }}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary || MUTED} keyboardType={keyboardType}
        style={{ height: 42, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1.5,
                 borderColor: COLORS.border, backgroundColor: COLORS.surface, color: TEXT,
                 fontSize: 14, marginBottom: 14 }} />
    </>
  );
}

// Add / edit one partner. The same required fields the web form enforces (name and
// contact number), so a record created here is valid on both sides.
function PartnerForm({ visible, initial, companyId, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const isEdit = !!initial;

  // Reseed whenever the sheet opens, so editing one partner then another does not
  // carry the first one's values across.
  React.useEffect(() => {
    if (!visible) return;
    setErr('');
    setForm(initial ? {
      name: initial.name || '', contact_no: initial.contact_no || '',
      firm_name: initial.firm_name || '', category: initial.category || 'normal',
      segment: initial.segment || '', city: initial.city || '', area: initial.area || '',
      is_active: initial.is_active !== false,
    } : EMPTY);
  }, [visible, initial]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    if (!form.name.trim())       { setErr('CP Name is required.');    return; }
    if (!form.contact_no.trim()) { setErr('Contact No is required.'); return; }
    setSaving(true); setErr('');
    try {
      const cq = companyId ? `?company_id=${companyId}` : '';
      const url = isEdit ? SALES_ENDPOINTS.channelPartner(initial.id) + cq
                         : SALES_ENDPOINTS.channelPartners + cq;
      const res = await apiFetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...form, name: form.name.trim(), contact_no: form.contact_no.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.detail || JSON.stringify(data)); setSaving(false); return; }
      setSaving(false);
      onSaved(data);
    } catch (e) { setErr(e.message); setSaving(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: `rgba(${COLORS.inkRgb},0.45)`, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '800', color: TEXT }}>
              {isEdit ? 'Edit Channel Partner' : 'Add Channel Partner'}
            </Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={TEXT} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">
            <Fld label="CP NAME *" value={form.name} onChange={(v) => set('name', v)} placeholder="e.g. Ramesh Shah" />
            <Fld label="CONTACT NO *" value={form.contact_no} onChange={(v) => set('contact_no', v)}
              placeholder="e.g. 98765 43210" keyboardType="phone-pad" />
            <Fld label="FIRM NAME" value={form.firm_name} onChange={(v) => set('firm_name', v)} placeholder="e.g. Shah Realty" />

            <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, marginBottom: 5 }}>CATEGORY</Text>
            <FilterSelect label="Category" value={form.category} onChange={(v) => set('category', v)}
              options={CATEGORY_OPTIONS} style={{ marginBottom: 14, alignSelf: 'flex-start' }} />

            <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, marginBottom: 5 }}>SEGMENT</Text>
            <FilterSelect label="Segment" value={form.segment} onChange={(v) => set('segment', v)}
              options={SEGMENT_OPTIONS} style={{ marginBottom: 14, alignSelf: 'flex-start' }} />

            <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, marginBottom: 5 }}>CITY</Text>
            <FilterSelect label="City" value={form.city} onChange={(v) => set('city', v)}
              options={[{ value: '', label: '— Select —' }, ...GUJARAT_CITIES.map((c) => ({ value: c, label: c }))]}
              style={{ marginBottom: 14, alignSelf: 'flex-start' }} />

            <Fld label="AREA" value={form.area} onChange={(v) => set('area', v)} placeholder="e.g. Vastrapur, Ahmedabad" />

            <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, marginBottom: 5 }}>STATUS</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {[['Active', true], ['Inactive', false]].map(([label, val]) => (
                <TouchableOpacity key={label} onPress={() => set('is_active', val)}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
                           backgroundColor: form.is_active === val ? BLUE : COLORS.surfaceAlt }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: form.is_active === val ? '#fff' : MUTED }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {err ? <Text style={{ color: COLORS.error, fontSize: 13, fontWeight: '600', marginBottom: 12 }}>{err}</Text> : null}

            <TouchableOpacity onPress={save} disabled={saving}
              style={[ChannelPartnersScreenS.btn, (saving) && ChannelPartnersScreenS.btnDim]}>
              <Text style={ChannelPartnersScreenS.box}>
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Channel Partner'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// The Channel Partner directory — the partner firms themselves, not their leads.
// Mirrors the web module's "All Leads" page, which is this same directory.
export default function ChannelPartnersScreen({ navigation }) {
  const companyId = useSelector((s) => s.adminFilter?.companyId);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState(null);   // partner being edited
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(SALES_ENDPOINTS.channelPartners + (companyId ? `?company_id=${companyId}` : ''));
      if (res.ok) { const d = await res.json(); setRows(Array.isArray(d) ? d : []); }
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }, [companyId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  function remove(cp) {
    Alert.alert('Remove this partner?',
      `${cp.name} will be removed. Leads already linked to them keep their history.`,
      [{ text: 'Keep', style: 'cancel' },
       { text: 'Remove', style: 'destructive', onPress: async () => {
           const res = await apiFetch(SALES_ENDPOINTS.channelPartner(cp.id)
             + (companyId ? `?company_id=${companyId}` : ''), { method: 'DELETE' }).catch(() => null);
           if (!res || !res.ok) Alert.alert('Could not remove', 'Try again.');
           load();
         } }]);
  }

  const needle = q.trim().toLowerCase();
  const visible = rows.filter((cp) =>
    (!category || cp.category === category)
    && (!needle || [cp.name, cp.contact_no, cp.firm_name]
        .some((v) => String(v || '').toLowerCase().includes(needle))));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12,
                     backgroundColor: 'transparent', borderBottomWidth: 0, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT }}>Channel Partners</Text>
          <Text style={{ fontSize: 12, color: MUTED }}>{rows.length} in the directory</Text>
        </View>
        <TouchableOpacity onPress={() => { setEditing(null); setFormOpen(true); }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: BLUE }}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        <TextInput value={q} onChangeText={setQ} placeholder="Search name, contact no or firm name…"
          placeholderTextColor={MUTED}
          style={{ height: 40, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border,
                   backgroundColor: COLORS.surface, color: TEXT, fontSize: 14, marginBottom: 10 }} />
        <FilterSelect label="All categories" value={category} onChange={setCategory}
          options={[{ value: '', label: 'All categories' }, ...CATEGORY_OPTIONS]}
          style={{ alignSelf: 'flex-start', marginBottom: 12 }} />

        {loading ? <AppLoader style={{ marginTop: 24 }} />
          : !visible.length ? (
            <Text style={{ textAlign: 'center', color: MUTED, marginTop: 40 }}>
              {rows.length ? 'No partner matches that search.' : 'No channel partners yet. Add the first one.'}
            </Text>
          ) : visible.map((cp) => (
            <View key={cp.id} style={[CARD, { marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '800', color: TEXT }}>{cp.name}</Text>
                <Badge category={cp.category} />
                {cp.is_active === false && (
                  <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: COLORS.surfaceAlt }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED }}>Inactive</Text>
                  </View>
                )}
              </View>
              <Text style={{ fontSize: 13, color: MUTED, marginTop: 3 }}>
                {[cp.contact_no, cp.firm_name].filter(Boolean).join(' · ') || '—'}
              </Text>
              <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                {[SEGMENT_OPTIONS.find((o) => o.value === cp.segment)?.label, cp.city, cp.area]
                  .filter((v) => v && v !== '— Select —').join(' · ') || '—'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                <TouchableOpacity onPress={() => { setEditing(cp); setFormOpen(true); }}
                  style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => remove(cp)}
                  style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.error2, backgroundColor: COLORS.errorBg }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.error }}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
      </ScrollView>

      <PartnerForm visible={formOpen} initial={editing} companyId={companyId}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); setEditing(null); load(); }} />
    </SafeAreaView>
  );
}

// Styles moved out of JSX (see AGENTS.md: no inline styles).
const ChannelPartnersScreenS = StyleSheet.create({
  btn: { backgroundColor: COLORS.btnTint, borderWidth: 1, borderColor: COLORS.btnBorder, borderRadius: 14, paddingVertical: 13, alignItems: 'center', opacity: 1 },
  btnDim: { opacity: 0.7 },
  box: { color: COLORS.btnText, fontSize: 14, fontWeight: '800' },
});
