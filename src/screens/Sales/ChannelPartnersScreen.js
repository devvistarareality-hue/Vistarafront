import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, FlatList, TouchableOpacity, TextInput, StatusBar,
         ActivityIndicator, RefreshControl, Modal, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS, ACTIVITY_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import FilterSelect from '../../components/FilterSelect';
import AppLoader from '../../components/AppLoader';
import { PartnerActivitySheet } from '../../components/PartnerActivity';
import { errText } from '../../lib/apiError';
import { onlyPresent } from '../../lib/presentOptions';

const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary; const BLUE = COLORS.link;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 22, padding: 14, ...CARD_SHADOW , borderWidth: 1, borderColor: COLORS.cardBorder };

// The same lists the web directory uses — kept identical so a partner added on
// either side reads the same on the other.
//
// The tiers a partner is graded into — Platinum / Gold / Diamond, which replaced
// Premium / Normal / Referral. Blank is a real state: a partner nobody has graded.
const CATEGORY_OPTIONS = [
  { value: '',         label: '— Select —' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'gold',     label: 'Gold' },
  { value: 'diamond',  label: 'Diamond' },
];
// Points at the StyleSheet at the bottom rather than holding raw colours, so the
// chip carries no inline style.
const CATEGORY_COLOR = {
  platinum: { chip: 'catPlatinum', text: 'catPlatinumText' },
  gold:     { chip: 'catGold',     text: 'catGoldText' },
  diamond:  { chip: 'catDiamond',  text: 'catDiamondText' },
};
const SEGMENT_OPTIONS = [
  { value: '',            label: '— Select —' },
  { value: 'residential', label: 'Residential' },
  { value: 'industrial',  label: 'Industrial' },
  { value: 'both',        label: 'Both' },
];
// The band a partner is dealt with on — a third axis, not a rename of the two
// above: Category is how much they are worth to us, Segment is what they sell,
// Type is the footing the relationship sits on. Mirrors CP_TYPE in sales/models.py.
const CP_TYPE_OPTIONS = [
  { value: '',  label: '— Select —' },
  { value: 'A', label: 'A (Wholesale)' },
  { value: 'B', label: 'B (Retail)' },
  { value: 'C', label: 'C (Non CP)' },
];
// How warm the CP desk reads this partner. About the PARTNER, not about any lead
// they brought — a lead's hot/warm/cold is its telecaller / STM status.
// New is where a partner added from here on starts, without anyone choosing it.
// The blank entry is only for the partners that predate the field.
const STAGE_OPTIONS = [
  { value: '',     label: '— Not set —' },
  { value: 'new',  label: 'New' },
  { value: 'hot',  label: 'Hot' },
  { value: 'warm', label: 'Warm' },
  { value: 'cold', label: 'Cold' },
];
// Points at the StyleSheet at the bottom, so the chip carries no inline style.
const STAGE_COLOR = {
  new:  { chip: 'stageNew',  text: 'stageNewText' },
  hot:  { chip: 'stageHot',  text: 'stageHotText' },
  warm: { chip: 'stageWarm', text: 'stageWarmText' },
  cold: { chip: 'stageCold', text: 'stageColdText' },
};
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

const EMPTY = { name: '', contact_no: '', firm_name: '', category: '',
                segment: '', cp_type: '', stage: 'new', city: '', area: '', is_active: true };

// Date only: the time a partner was keyed in is noise, the day is the fact.
function fmtAdded(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Not read yet means no chip, like an ungraded Category.
function StageChip({ stage }) {
  if (!stage) return null;
  const tone = STAGE_COLOR[stage] || STAGE_COLOR.warm;
  const label = STAGE_OPTIONS.find((o) => o.value === stage)?.label || stage;
  return (
    <View style={[st.catChip, st[tone.chip]]}>
      <Text style={[st.catChipText, st[tone.text]]}>{label}</Text>
    </View>
  );
}

// An ungraded partner gets no pill at all — most of the directory is ungraded
// since the tiers changed, and a row of grey "— Select —" chips says nothing.
function Badge({ category }) {
  if (!category) return null;
  const tone = CATEGORY_COLOR[category] || CATEGORY_COLOR.platinum;
  const label = CATEGORY_OPTIONS.find((o) => o.value === category)?.label || category;
  return (
    <View style={[st.catChip, st[tone.chip]]}>
      <Text style={[st.catChipText, st[tone.text]]}>{label}</Text>
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
// A partner's History tab: their own entries in the activity log, newest first —
// like a lead's History. Mirrors the web's PartnerHistory.
function PartnerHistory({ partnerId, companyId }) {
  const [rows, setRows] = useState(null);
  React.useEffect(() => {
    let dead = false;
    const q = `?target_type=channel-partner&target_id=${partnerId}${companyId ? `&company_id=${companyId}` : ''}`;
    apiFetch(ACTIVITY_ENDPOINTS.log + q).then((r) => (r.ok ? r.json() : { results: [] }))
      .then((d) => { if (!dead) setRows(d.results || []); }).catch(() => { if (!dead) setRows([]); });
    return () => { dead = true; };
  }, [partnerId, companyId]);
  if (!rows) return <AppLoader />;
  if (!rows.length) return <Text style={st.histEmpty}>No changes recorded yet.</Text>;
  return rows.map((r) => (
    <View key={r.id} style={st.histRow}>
      <View style={st.histDot}><Ionicons name={r.action === 'created' ? 'add' : r.action === 'deleted' ? 'trash-outline' : /follow|visit/i.test(r.summary || '') ? 'calendar-outline' : 'create-outline'} size={14} color={BLUE} /></View>
      <View style={st.histBody}>
        <Text style={st.histTitle}>{r.summary}</Text>
        {(r.changes || []).map((c, i) => (
          <Text key={i} style={st.histChange}>{c.field}: {c.from || '—'} → {c.to || '—'}</Text>
        ))}
        <Text style={st.histMeta}>{r.actor?.name || 'System'} · {new Date(r.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
    </View>
  ));
}

function PartnerForm({ visible, initial, companyId, onClose, onSaved, onRemove }) {
  const [tab, setTab] = useState('detail');
  React.useEffect(() => { if (visible) setTab('detail'); }, [visible, initial?.id]);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  // One partner per contact number. Checked while the number is typed rather than
  // on submit, so nobody fills in the whole form only to be told the broker is
  // already there. The server enforces it regardless (409) — this is the courtesy.
  const [dupe, setDupe] = useState(null);
  const [checking, setChecking] = useState(false);
  const isEdit = !!initial;

  // Reseed whenever the sheet opens, so editing one partner then another does not
  // carry the first one's values across.
  React.useEffect(() => {
    if (!visible) return;
    setErr(''); setDupe(null); setChecking(false);
    setForm(initial ? {
      name: initial.name || '', contact_no: initial.contact_no || '',
      firm_name: initial.firm_name || '', category: initial.category || '',
      segment: initial.segment || '', cp_type: initial.cp_type || '',
      stage: initial.stage || '', city: initial.city || '', area: initial.area || '',
      is_active: initial.is_active !== false,
    } : EMPTY);
  }, [visible, initial]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Ten digits is the whole of an Indian mobile and also what the server matches
  // on, so there is nothing to ask about before then.
  const digits = (form.contact_no || '').replace(/\D/g, '');
  React.useEffect(() => {
    if (!visible) return undefined;
    if (digits.length < 10) { setDupe(null); setChecking(false); return undefined; }
    let dead = false;
    setChecking(true);
    // Debounced: typing a number fires this on nearly every keystroke otherwise.
    const t = setTimeout(async () => {
      try {
        const qs = `?contact_no=${encodeURIComponent(form.contact_no)}`
          + (initial?.id ? `&exclude=${initial.id}` : '');
        const res = await apiFetch(SALES_ENDPOINTS.partnerLookup(qs));
        const d = res.ok ? await res.json() : null;
        if (!dead) setDupe(d && d.exists ? d : null);
      } catch (_) {}
      if (!dead) setChecking(false);
    }, 350);
    return () => { dead = true; clearTimeout(t); };
  }, [visible, digits, form.contact_no, initial?.id]);

  async function save() {
    if (!form.name.trim())       { setErr('CP Name is required.');    return; }
    if (!form.contact_no.trim()) { setErr('Contact No is required.'); return; }
    if (dupe) { setErr(`${dupe.name || 'Another partner'} already has this contact number.`); return; }
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
      if (!res.ok) {
        // 409 is the duplicate rule — it names who holds the number, so show that
        // under the field as well, not only as an error line.
        if (res.status === 409 && data.existing) setDupe({ ...data.existing, exists: true });
        setErr(errText(data, 'Something went wrong — please try again.'));
        setSaving(false);
        return;
      }
      setSaving(false);
      onSaved(data);
    } catch (e) { setErr(e.message); setSaving(false); }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: `rgba(${COLORS.inkRgb},0.45)`, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
            {/* As on the web: the partner's name and number head their details. */}
            <View style={st.headText}>
              <Text style={st.headTitle}>{isEdit ? (initial.name || 'Channel Partner') : 'Add Channel Partner'}</Text>
              {isEdit && !!initial.contact_no && <Text style={st.headSub}>{initial.contact_no}</Text>}
            </View>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={TEXT} /></TouchableOpacity>
          </View>
          {isEdit && (
            <View style={st.tabs}>
              {[['detail', 'Detail'], ['history', 'History']].map(([k, label]) => (
                <TouchableOpacity key={k} onPress={() => setTab(k)} style={StyleSheet.compose(st.tab, tab === k && st.tabOn)}>
                  <Text style={StyleSheet.compose(st.tabText, tab === k && st.tabTextOn)}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {tab === 'history' && isEdit ? (
            <ScrollView contentContainerStyle={st.histWrap}><PartnerHistory partnerId={initial.id} companyId={companyId} /></ScrollView>
          ) : (
          <ScrollView contentContainerStyle={{ padding: 18 }} keyboardShouldPersistTaps="handled">
            <Fld label="CP NAME *" value={form.name} onChange={(v) => set('name', v)} placeholder="e.g. Ramesh Shah" />
            <Fld label="CONTACT NO *" value={form.contact_no} onChange={(v) => set('contact_no', v)}
              placeholder="e.g. 98765 43210" keyboardType="phone-pad" />
            {(checking || dupe) && (
              <View style={st.dupeWrap}>
                {checking && !dupe && <Text style={st.dupeChecking}>Checking…</Text>}
                {dupe && (
                  <Text style={st.dupeText}>
                    Already a channel partner: <Text style={st.dupeName}>{dupe.name || 'Unnamed'}</Text>
                    {dupe.firm_name ? ` · ${dupe.firm_name}` : ''}
                    {dupe.is_active === false ? ' (inactive)' : ''}
                  </Text>
                )}
              </View>
            )}
            <Fld label="FIRM NAME" value={form.firm_name} onChange={(v) => set('firm_name', v)} placeholder="e.g. Shah Realty" />

            <Text style={st.fldLabel}>TYPE</Text>
            <FilterSelect label="Type" value={form.cp_type} onChange={(v) => set('cp_type', v)}
              options={CP_TYPE_OPTIONS} style={st.fldSelect} />

            <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, marginBottom: 5 }}>CATEGORY</Text>
            <FilterSelect label="Category" value={form.category} onChange={(v) => set('category', v)}
              options={CATEGORY_OPTIONS} style={{ marginBottom: 14, alignSelf: 'flex-start' }} />

            <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, marginBottom: 5 }}>SEGMENT</Text>
            <FilterSelect label="Segment" value={form.segment} onChange={(v) => set('segment', v)}
              options={SEGMENT_OPTIONS} style={{ marginBottom: 14, alignSelf: 'flex-start' }} />

            <Text style={st.fldLabel}>STAGE</Text>
            <FilterSelect label="Stage" value={form.stage} onChange={(v) => set('stage', v)}
              options={STAGE_OPTIONS} style={st.fldSelect} />

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

            <TouchableOpacity onPress={save} disabled={saving || !!dupe}
              style={[ChannelPartnersScreenS.btn, (saving || dupe) && ChannelPartnersScreenS.btnDim]}>
              <Text style={ChannelPartnersScreenS.box}>
                {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Channel Partner'}
              </Text>
            </TouchableOpacity>
            {isEdit && onRemove && (
              <TouchableOpacity onPress={() => onRemove(initial)} style={st.formRemove}>
                <Text style={st.removeText}>Remove partner</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// The Channel Partner directory — the partner firms themselves, not their leads.
// On the web it is the "CP Details" tab of the module's All Leads page; the app shows
// it there too (SalesLeadsScreen in cpOnly mode) and as this stand-alone screen.
//
// A FlatList, not a ScrollView of every card: a company's directory runs to hundreds
// of partners, and drawing them all at once froze the phone.
export function ChannelPartnerDirectory({ companyId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  // Matching web: a directory of hundreds is read by these columns, plus the
  // one question no column answers — which of these has produced anything.
  const [statusF, setStatusF] = useState('');
  const [segmentF, setSegmentF] = useState('');
  const [typeF, setTypeF] = useState('');
  const [stageF, setStageF] = useState('');
  const [firmF, setFirmF] = useState('');
  const [locationF, setLocationF] = useState('');
  const [bucket, setBucket] = useState('');
  const [facets, setFacets] = useState(null);
  const [editing, setEditing] = useState(null);   // partner being edited
  const [formOpen, setFormOpen] = useState(false);
  const [activity, setActivity] = useState(null); // partner whose follow-ups/visits are open

  useEffect(() => {
    apiFetch(`${SALES_ENDPOINTS.channelPartners}?facets=1${companyId ? `&company_id=${companyId}` : ''}`)
      .then((r) => (r.ok ? r.json() : null)).then((d) => d && setFacets(d)).catch(() => {});
  }, [companyId]);

  // Only the newest request writes to state — filters outpace the network, and
  // a slower earlier one landing last would show the wrong list.
  const reqRef = useRef(0);

  const load = useCallback(async () => {
    const ticket = ++reqRef.current;
    try {
      const params = new URLSearchParams();
      if (companyId) params.set('company_id', companyId);
      if (category) params.set('category', category);
      if (statusF) params.set('status', statusF);
      if (segmentF) params.set('segment', segmentF);
      if (typeF) params.set('cp_type', typeF);
      if (stageF) params.set('stage', stageF);
      if (firmF) params.set('firm', firmF);
      if (locationF) params.set('location', locationF);
      if (bucket) params.set('bucket', bucket);
      const query = params.toString();
      const res = await apiFetch(SALES_ENDPOINTS.channelPartners + (query ? `?${query}` : ''));
      if (res.ok) {
        const d = await res.json();
        if (ticket !== reqRef.current) return;
        setRows(Array.isArray(d) ? d : []);
      }
    } catch (_) {}
    if (ticket === reqRef.current) { setLoading(false); setRefreshing(false); }
  }, [companyId, category, statusF, segmentF, typeF, stageF, firmF, locationF, bucket]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const narrowed = !!(category || statusF || segmentF || typeF || stageF || firmF || locationF || bucket || q.trim());

  function clearFilters() {
    setCategory(''); setStatusF(''); setSegmentF(''); setLocationF(''); setBucket(''); setQ('');
  }

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
  // Everything but the search is applied by the server (it holds the whole
  // directory); the search stays here so typing filters without a round trip.
  const visible = useMemo(() => rows.filter((cp) =>
    (!needle || [cp.name, cp.contact_no, cp.firm_name]
      .some((v) => String(v || '').toLowerCase().includes(needle)))), [rows, needle]);

  const renderItem = useCallback(({ item: cp }) => (
    <TouchableOpacity activeOpacity={0.8} onPress={() => { setEditing(cp); setFormOpen(true); }} style={[CARD, st.card]}>
      <View style={st.row}>
        <Text style={st.name}>{cp.name}</Text>
        {/* Just the letter — the card is scanned, and the full wording is in
            the partner's own details. */}
        {!!cp.cp_type && (
          <View style={st.typeChip}><Text style={st.typeChipText}>{cp.cp_type}</Text></View>
        )}
        <StageChip stage={cp.stage} />
        <Badge category={cp.category} />
        {cp.is_active === false && (
          <View style={st.inactive}><Text style={st.inactiveText}>Inactive</Text></View>
        )}
      </View>
      {/* The number is not on the card — it shows in the partner's details. */}
      <Text style={st.line1}>{cp.firm_name || '—'}</Text>
      <Text style={st.line2}>
        {[SEGMENT_OPTIONS.find((o) => o.value === cp.segment)?.label, cp.city, cp.area]
          .filter((v) => v && v !== '— Select —').join(' · ') || '—'}
      </Text>
      {/* When the partnership started. The Add form can backdate this, so it is
          not always the row's creation timestamp. */}
      {!!cp.created_at && <Text style={st.added}>Added {fmtAdded(cp.created_at)}</Text>}

      <View style={st.actions}>
        <TouchableOpacity onPress={() => setActivity(cp)} style={st.activityBtn}>
          <Ionicons name="calendar-outline" size={14} color={BLUE} />
          <Text style={st.activityText}>
            {cp.follow_up_count || cp.site_visit_count
              ? `${cp.follow_up_count || 0} FU · ${cp.site_visit_count || 0} SV`
              : 'Schedule'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  ), [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const header = (
    <View>
      <View style={st.topRow}>
        <Text style={st.count}>
          {narrowed ? `${visible.length} of the directory` : `${rows.length} in the directory`}
        </Text>
        <TouchableOpacity onPress={() => { setEditing(null); setFormOpen(true); }} style={st.addBtn}>
          <Ionicons name="add" size={16} color={COLORS.white} />
          <Text style={st.addText}>Add</Text>
        </TouchableOpacity>
      </View>
      <TextInput value={q} onChangeText={setQ} placeholder="Search name, contact no or firm name…"
        placeholderTextColor={MUTED} style={st.search} />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterRow}>
        <FilterSelect label="All statuses" value={statusF} onChange={setStatusF}
          options={[{ value: '', label: 'All statuses' },
                    { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
        <FilterSelect label="All categories" value={category} onChange={setCategory}
          options={[{ value: '', label: 'All categories' },
                    ...onlyPresent(CATEGORY_OPTIONS.filter((o) => o.value), facets?.categories ?? null, category)]} />
        <FilterSelect label="All types" value={typeF} onChange={setTypeF}
          options={[{ value: '', label: 'All types' },
                    ...onlyPresent(CP_TYPE_OPTIONS.filter((o) => o.value), facets?.cp_types ?? null, typeF)]} />
        <FilterSelect label="All segments" value={segmentF} onChange={setSegmentF}
          options={[{ value: '', label: 'All segments' },
                    ...onlyPresent(SEGMENT_OPTIONS.filter((o) => o.value), facets?.segments ?? null, segmentF)]} />
        <FilterSelect label="All stages" value={stageF} onChange={setStageF}
          options={[{ value: '', label: 'All stages' },
                    ...onlyPresent(STAGE_OPTIONS.filter((o) => o.value), facets?.stages ?? null, stageF)]} />
        {/* Built from the firms actually on the directory, so a firm typed in
            today is in this list as soon as the screen reloads. */}
        <FilterSelect label="All firms" value={firmF} onChange={setFirmF}
          options={[{ value: '', label: 'All firms' },
                    ...(facets?.firms || []).map((f) => ({ value: f, label: f }))]} />
        <FilterSelect label="All locations" value={locationF} onChange={setLocationF}
          options={[{ value: '', label: 'All locations' },
                    ...(facets?.locations || []).map((l) => ({ value: l, label: l }))]} />
      </ScrollView>

      {/* The question a directory this size is opened with, and the one no
          column answers: which partners have produced anything, and which has
          nobody touched at all. Both are counts, not stored fields. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.pillRow}>
        {[{ value: 'with_leads', label: 'With leads' },
          { value: 'no_leads', label: 'No leads' },
          { value: 'untouched', label: 'Never contacted' }].map((b) => (
          <TouchableOpacity key={b.value} onPress={() => setBucket(bucket === b.value ? '' : b.value)}
            style={[st.pill, bucket === b.value && st.pillOn]}>
            <Text style={[st.pillText, bucket === b.value && st.pillTextOn]}>{b.label}</Text>
          </TouchableOpacity>
        ))}
        {narrowed && (
          <TouchableOpacity onPress={clearFilters} style={st.clearBtn}>
            <Text style={st.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );

  return (
    <View style={st.flex}>
      {loading ? (
        <View style={st.pad}>{header}<AppLoader style={st.loader} /></View>
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(cp) => String(cp.id)}
          renderItem={renderItem}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <Text style={st.empty}>
              {rows.length ? 'No partner matches that search.'
                : narrowed ? 'No partners match these filters.'
                : 'No channel partners yet. Add the first one.'}
            </Text>
          }
          contentContainerStyle={st.pad}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={7}
          removeClippedSubviews
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        />
      )}

      <PartnerForm visible={formOpen} initial={editing} companyId={companyId}
        onClose={() => setFormOpen(false)}
        onSaved={() => { setFormOpen(false); setEditing(null); load(); }}
        onRemove={(cp) => { setFormOpen(false); setEditing(null); remove(cp); }} />

      {/* Reload on close rather than per change: the FU/SV counts on each card
          are annotated server-side, so they only move when the list refetches. */}
      <PartnerActivitySheet visible={!!activity} partner={activity} companyId={companyId}
        onClose={() => { setActivity(null); load(); }} />
    </View>
  );
}

export default function ChannelPartnersScreen({ navigation }) {
  const companyId = useSelector((s) => s.adminFilter?.companyId);
  return (
    <SafeAreaView style={st.screen} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={st.title}>Channel Partners</Text>
      </View>
      <ChannelPartnerDirectory companyId={companyId} />
    </SafeAreaView>
  );
}

// Styles moved out of JSX (see AGENTS.md: no inline styles).
const ChannelPartnersScreenS = StyleSheet.create({
  btn: { backgroundColor: COLORS.btnTint, borderWidth: 1, borderColor: COLORS.btnBorder, borderRadius: 14, paddingVertical: 13, alignItems: 'center', opacity: 1 },
  btnDim: { opacity: 0.7 },
  box: { color: COLORS.btnText, fontSize: 14, fontWeight: '800' },
});

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: TEXT },
  pad: { padding: 16, paddingBottom: 40 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  count: { fontSize: 12, color: MUTED },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: BLUE },
  addText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  search: { height: 40, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border,
            backgroundColor: COLORS.surface, color: TEXT, fontSize: 14, marginBottom: 10 },
  filter: { alignSelf: 'flex-start', marginBottom: 12 },
  // Two scrolling rows rather than a wrap: on a phone four pickers and three
  // toggles stacked would push the first partner below the fold.
  filterRow: { flexDirection: 'row', gap: 8, paddingBottom: 8 },
  pillRow: { flexDirection: 'row', gap: 8, paddingBottom: 12, alignItems: 'center' },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  pillOn: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.link },
  pillText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  pillTextOn: { color: COLORS.link },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  clearText: { fontSize: 12, fontWeight: '700', color: COLORS.error },
  loader: { marginTop: 24 },
  empty: { textAlign: 'center', color: MUTED, marginTop: 40 },
  dupeWrap: { marginTop: -8, marginBottom: 14 },
  dupeChecking: { fontSize: 12, color: MUTED },
  dupeText: { fontSize: 12, color: COLORS.error, lineHeight: 17 },
  dupeName: { fontWeight: '800', color: COLORS.error },
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: '800', color: TEXT },
  inactive: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: COLORS.surfaceAlt },
  inactiveText: { fontSize: 11, fontWeight: '700', color: MUTED },
  line1: { fontSize: 13, color: MUTED, marginTop: 3 },
  line2: { fontSize: 12, color: MUTED, marginTop: 2 },
  added: { fontSize: 11.5, color: COLORS.textTertiary, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  activityBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7,
                 borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.border,
                 backgroundColor: COLORS.accentSoft },
  activityText: { fontSize: 12.5, fontWeight: '700', color: BLUE },
  formRemove: { marginTop: 10, paddingVertical: 12, alignItems: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.error2, backgroundColor: COLORS.errorBg },
  headText: { flex: 1 },
  tabs: { flexDirection: 'row', gap: 4, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt },
  tab: { paddingVertical: 11, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: BLUE },
  tabText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  tabTextOn: { color: BLUE },
  histWrap: { padding: 18, paddingBottom: 30 },
  histEmpty: { fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', marginTop: 20 },
  histRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  histDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.linkBg },
  histBody: { flex: 1 },
  histTitle: { fontSize: 13, fontWeight: '700', color: TEXT },
  histChange: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
  histMeta: { fontSize: 11, color: COLORS.textTertiary, marginTop: 4 },
  headTitle: { fontSize: 16, fontWeight: '800', color: TEXT },
  headSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  removeText: { fontSize: 13, fontWeight: '700', color: COLORS.error },
  // Field label + picker spacing in the add/edit form. The older fields around
  // them still carry the same values inline; these are the moved-out versions.
  fldLabel: { fontSize: 11, fontWeight: '700', color: MUTED, marginBottom: 5 },
  fldSelect: { marginBottom: 14, alignSelf: 'flex-start' },
  // The Type band on a partner's card, next to the Category badge.
  typeChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: COLORS.accentSoft },
  typeChipText: { fontSize: 11, fontWeight: '800', color: BLUE },
  // The Category tier chip — shell plus one pair per tier (see CATEGORY_COLOR).
  catChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  catChipText: { fontSize: 11, fontWeight: '700' },
  catPlatinum: { backgroundColor: COLORS.surfaceAlt },
  catPlatinumText: { color: MUTED },
  catGold: { backgroundColor: COLORS.warningBg },
  catGoldText: { color: COLORS.warning },
  catDiamond: { backgroundColor: COLORS.accentSoft },
  catDiamondText: { color: BLUE },
  // Stage chip tones — shares the catChip shell above.
  stageHot: { backgroundColor: COLORS.errorBg },
  stageHotText: { color: COLORS.error },
  stageWarm: { backgroundColor: COLORS.warningBg },
  stageWarmText: { color: COLORS.warning },
  stageCold: { backgroundColor: COLORS.accentSoft },
  stageColdText: { color: BLUE },
  stageNew: { backgroundColor: COLORS.surfaceAlt },
  stageNewText: { color: MUTED },
});
