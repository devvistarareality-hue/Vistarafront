import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StatusBar, RefreshControl, Switch, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { CLUB1000_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { isClub1000Manager } from '../../utils/club1000Access';
import FormSheet from '../../components/FormSheet';
import { TextField } from '../../components/Field';
import AppLoader from '../../components/AppLoader';
import { inrShort } from '../../lib/inr';

const NAVY = COLORS.navy; const TEAL = COLORS.success; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 22, ...CARD_SHADOW , borderWidth: 1, borderColor: COLORS.cardBorder };

const EMPTY_FORM = {
  name: '', tenure_months: '12', min_ticket_size: '',
  premature_redemption_allowed: false,
  premature_redemption_lock_months: '', premature_redemption_rate_pct_per_month: '1.00',
  interest_payout_options: ['maturity'],
  payout_rates: { maturity: '' },
};

const INTEREST_PAYOUT_LABELS = { monthly: 'Monthly', quarterly: 'Quarterly', maturity: 'At Maturity' };

function NewSchemeSheet({ visible, scheme, onClose, onSaved }) {
  const isEdit = !!scheme;
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // (Re)initialise whenever the sheet opens, from the scheme being edited (if any).
  useEffect(() => {
    if (!visible) return;
    setForm(scheme ? {
      name: scheme.name, tenure_months: String(scheme.tenure_months),
      min_ticket_size: String(scheme.min_ticket_size),
      premature_redemption_allowed: scheme.premature_redemption_allowed,
      premature_redemption_lock_months: scheme.premature_redemption_lock_months ? String(scheme.premature_redemption_lock_months) : '',
      premature_redemption_rate_pct_per_month: String(scheme.premature_redemption_rate_pct_per_month),
      interest_payout_options: scheme.interest_payout_options || ['maturity'],
      payout_rates: { ...(scheme.payout_rates || {}) },
    } : EMPTY_FORM);
  }, [visible, scheme]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }
  function setRate(key, v) { setForm((f) => ({ ...f, payout_rates: { ...f.payout_rates, [key]: v } })); }

  function toggleInterestPayoutOption(key) {
    setForm((f) => ({
      ...f,
      interest_payout_options: f.interest_payout_options.includes(key)
        ? f.interest_payout_options.filter((k) => k !== key)
        : [...f.interest_payout_options, key],
    }));
  }

  async function submit() {
    if (!form.name.trim() || !form.min_ticket_size) {
      Alert.alert('Missing fields', 'Name and Min Ticket Size are required.');
      return;
    }
    if (!form.interest_payout_options.length) {
      Alert.alert('Missing fields', 'Select at least one interest payout option.');
      return;
    }
    const missingRate = form.interest_payout_options.find((k) => !form.payout_rates[k]);
    if (missingRate) {
      Alert.alert('Missing fields', `Enter a return % for ${INTEREST_PAYOUT_LABELS[missingRate] || missingRate}.`);
      return;
    }
    setSaving(true);
    try {
      const payout_rates = Object.fromEntries(form.interest_payout_options.map((k) => [k, form.payout_rates[k]]));
      // premature_redemption_lock_months is a PositiveIntegerField(null=True) on the
      // backend — an empty string (the field's default/cleared value, and what's left
      // over when "Allow premature redemption" is off) fails "a valid integer is
      // required" instead of being treated as blank, so send null explicitly instead.
      const lock_months = form.premature_redemption_lock_months === '' ? null : form.premature_redemption_lock_months;
      const res = await apiFetch(isEdit ? CLUB1000_ENDPOINTS.scheme(scheme.id) : CLUB1000_ENDPOINTS.schemes, {
        method: isEdit ? 'PATCH' : 'POST',
        body: JSON.stringify({ ...form, payout_rates, premature_redemption_lock_months: lock_months }),
      });
      const d = await res.json();
      if (!res.ok) {
        Alert.alert(`Could not ${isEdit ? 'save' : 'create'} scheme`, d?.detail || Object.values(d || {})[0]?.toString() || 'Please check the fields.');
        return;
      }
      onSaved(d);
      setForm(EMPTY_FORM);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormSheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: TEXT }}>{isEdit ? 'Edit Scheme' : 'New Scheme'}</Text>
        <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 20, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={18} color={TEXT} />
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <TextField label="Scheme Name" required value={form.name} onChangeText={(v) => set('name', v)} placeholder="e.g. RISE" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextField label="Tenure (months)" required value={form.tenure_months} onChangeText={(v) => set('tenure_months', v)} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Min Ticket Size (₹)" required value={form.min_ticket_size} onChangeText={(v) => set('min_ticket_size', v)} keyboardType="number-pad" />
          </View>
        </View>
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 8 }}>Interest Payout Options &amp; Return %</Text>
          <View style={{ gap: 8 }}>
            {Object.entries(INTEREST_PAYOUT_LABELS).map(([key, label]) => {
              const checked = form.interest_payout_options.includes(key);
              return (
                <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity onPress={() => toggleInterestPayoutOption(key)}
                    style={{ width: 110, paddingVertical: 11, alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: checked ? TEAL : COLORS.border, backgroundColor: checked ? TEAL : COLORS.surface }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: checked ? COLORS.white : MUTED }}>{label}</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <TextField
                      placeholder="Return %"
                      editable={checked}
                      value={form.payout_rates[key] != null ? String(form.payout_rates[key]) : ''}
                      onChangeText={(v) => setRate(key, v)}
                      keyboardType="decimal-pad"
                      style={{ opacity: checked ? 1 : 0.5 }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
          <Text style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>Only the selected option(s) will be selectable when adding investors to this scheme — each carries its own annual return %.</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: TEXT }}>Allow premature redemption</Text>
          <Switch value={form.premature_redemption_allowed} onValueChange={(v) => set('premature_redemption_allowed', v)} trackColor={{ true: TEAL }} />
        </View>
        {form.premature_redemption_allowed && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <TextField label="Lock-in (months)" value={form.premature_redemption_lock_months} onChangeText={(v) => set('premature_redemption_lock_months', v)} keyboardType="number-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Rate %/month" value={form.premature_redemption_rate_pct_per_month} onChangeText={(v) => set('premature_redemption_rate_pct_per_month', v)} keyboardType="decimal-pad" />
            </View>
          </View>
        )}

        <TouchableOpacity onPress={submit} disabled={saving}
          style={[ClubSchemesScreenS.btn, (saving) && ClubSchemesScreenS.btnDim]}>
          {saving ? <ActivityIndicator color={COLORS.btnTextSuccess} /> : <Ionicons name="save-outline" size={17} color={COLORS.btnTextSuccess} />}
          <Text style={ClubSchemesScreenS.box}>{isEdit ? 'Save Changes' : 'Create Scheme'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </FormSheet>
  );
}

export default function Club1000SchemesScreen({ navigation }) {
  const user = useSelector((s) => s.auth.user);
  const manager = isClub1000Manager(user);

  const [schemes,    setSchemes]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNew,    setShowNew]    = useState(false);
  const [editing,    setEditing]    = useState(null);
  // How much of the book sits in each scheme (from the dashboard figures).
  const [book,       setBook]       = useState({});

  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const [res, st] = await Promise.all([apiFetch(CLUB1000_ENDPOINTS.schemes), apiFetch(CLUB1000_ENDPOINTS.stats)]);
      if (res.ok) setSchemes(await res.json());
      if (st.ok) { const d = await st.json(); setBook(Object.fromEntries((d.by_scheme || []).map((r) => [r.scheme, r]))); }
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }

  useFocusEffect(React.useCallback(() => { load(); }, []));

  function disableScheme(id) {
    Alert.alert('Disable scheme?', 'It will no longer be selectable for new investors.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disable', style: 'destructive', onPress: async () => {
        const res = await apiFetch(CLUB1000_ENDPOINTS.scheme(id), { method: 'DELETE' });
        if (res.ok || res.status === 204) load();
      } },
    ]);
  }

  return (
    <SafeAreaView style={sc.safe} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={BG} />
      {manager && <NewSchemeSheet visible={showNew} onClose={() => setShowNew(false)} onSaved={() => load()} />}
      {manager && <NewSchemeSheet visible={!!editing} scheme={editing} onClose={() => setEditing(null)} onSaved={() => load()} />}

      <View style={sc.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={sc.back}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={sc.flex}>
          <Text style={sc.title}>Schemes</Text>
          {schemes.length > 0 && <Text style={sc.subtitle}>{schemes.length} scheme{schemes.length === 1 ? '' : 's'}</Text>}
        </View>
        {manager && (
          <TouchableOpacity onPress={() => setShowNew(true)} style={ClubSchemesScreenS.btn2}>
            <Ionicons name="add" size={16} color={COLORS.btnTextSuccess} />
            <Text style={ClubSchemesScreenS.box2}>New</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={sc.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}>
        {loading ? <AppLoader style={sc.loader} /> : schemes.length === 0 ? (
          <Text style={sc.empty}>No schemes yet — create one to get started.</Text>
        ) : schemes.map((s) => {
          const b = book[s.name] || { investors: 0, amount: 0 };
          return (
            <View key={s.id} style={sc.card}>
              <View style={sc.head}>
                <View style={sc.icon}><Ionicons name="layers-outline" size={18} color={COLORS.link} /></View>
                <View style={sc.flex}>
                  <Text style={sc.name}>{s.name}</Text>
                  <Text style={sc.meta}>{s.tenure_months} months · min ₹{Number(s.min_ticket_size).toLocaleString('en-IN')}</Text>
                </View>
              </View>
              <View style={sc.rates}>
                {(s.interest_payout_options || []).length ? (s.interest_payout_options || []).map((k) => (
                  <View key={k} style={sc.rate}><Text style={sc.rateLabel}>{INTEREST_PAYOUT_LABELS[k] || k}</Text><Text style={sc.rateVal}>{s.payout_rates?.[k] ?? '—'}%</Text></View>
                )) : <Text style={sc.meta}>No payout options set</Text>}
              </View>
              <View style={sc.figs}>
                <View style={sc.fig}><Text style={sc.figLabel}>INVESTORS</Text><Text style={sc.figVal}>{b.investors || 0}</Text></View>
                <View style={sc.fig}><Text style={sc.figLabel}>INVESTED</Text><Text style={sc.figVal}>{b.amount ? inrShort(b.amount) : '—'}</Text></View>
                <View style={sc.fig}><Text style={sc.figLabel}>EARLY EXIT</Text><Text style={sc.figVal}>{s.premature_redemption_allowed ? `After ${s.premature_redemption_lock_months || 0} mo` : 'No'}</Text></View>
              </View>
              {manager && (
                <View style={sc.foot}>
                  <TouchableOpacity onPress={() => setEditing(s)} style={sc.btn}><Text style={sc.btnText}>Edit</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => disableScheme(s.id)} style={[sc.btn, sc.btnDanger]}><Text style={sc.btnDangerText}>Disable</Text></TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const sc = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1, minWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: TEXT },
  subtitle: { fontSize: 12, color: MUTED, marginTop: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  loader: { marginTop: 24 },
  empty: { textAlign: 'center', color: MUTED, marginTop: 30 },
  card: { ...CARD, padding: 14, marginBottom: 12, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accentSoft },
  name: { fontSize: 15.5, fontWeight: '800', color: TEXT },
  meta: { fontSize: 12, color: MUTED, marginTop: 1 },
  rates: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rate: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: COLORS.successBg },
  rateLabel: { fontSize: 12, color: COLORS.text2 },
  rateVal: { fontSize: 12, fontWeight: '800', color: TEAL },
  figs: { flexDirection: 'row', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  fig: { flex: 1 },
  figLabel: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.3, color: MUTED },
  figVal: { fontSize: 14, fontWeight: '800', color: TEXT, marginTop: 2 },
  foot: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  btn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  btnText: { fontSize: 13, fontWeight: '700', color: TEXT },
  btnDanger: { backgroundColor: COLORS.errorBg, borderColor: 'transparent' },
  btnDangerText: { fontSize: 13, fontWeight: '700', color: COLORS.error },
});

// Styles moved out of JSX (see AGENTS.md: no inline styles).
const ClubSchemesScreenS = StyleSheet.create({
  btn: { backgroundColor: COLORS.btnTintSuccess, borderWidth: 1, borderColor: COLORS.btnBorderSuccess, borderRadius: 16, height: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 8, opacity: 1 },
  btnDim: { opacity: 0.7 },
  box: { color: COLORS.btnTextSuccess, fontSize: 15, fontWeight: '800' },
  btn2: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.btnTintSuccess, borderWidth: 1, borderColor: COLORS.btnBorderSuccess, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  box2: { color: COLORS.btnTextSuccess, fontSize: 13, fontWeight: '700' },
});
