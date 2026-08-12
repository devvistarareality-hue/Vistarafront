import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StatusBar, RefreshControl, Switch } from 'react-native';
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

const NAVY = COLORS.navy; const TEAL = '#00838F'; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, ...CARD_SHADOW };

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
        <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
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
                    style={{ width: 110, paddingVertical: 11, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: checked ? TEAL : COLORS.border, backgroundColor: checked ? TEAL : COLORS.white }}>
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
          style={{ backgroundColor: TEAL, borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: saving ? 0.7 : 1, marginTop: 8 }}>
          {saving ? <ActivityIndicator color={COLORS.white} /> : <Ionicons name="save-outline" size={17} color={COLORS.white} />}
          <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: '800' }}>{isEdit ? 'Save Changes' : 'Create Scheme'}</Text>
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

  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await apiFetch(CLUB1000_ENDPOINTS.schemes);
      if (res.ok) setSchemes(await res.json());
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
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      {manager && <NewSchemeSheet visible={showNew} onClose={() => setShowNew(false)} onSaved={() => load()} />}
      {manager && <NewSchemeSheet visible={!!editing} scheme={editing} onClose={() => setEditing(null)} onSaved={() => load()} />}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: TEXT }}>Schemes</Text>
        {manager && (
          <TouchableOpacity onPress={() => setShowNew(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: TEAL, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
            <Ionicons name="add" size={16} color={COLORS.white} />
            <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: '700' }}>New</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}>
        {loading ? <ActivityIndicator color={NAVY} style={{ marginTop: 30 }} /> : schemes.length === 0 ? (
          <Text style={{ textAlign: 'center', color: MUTED, marginTop: 30 }}>No schemes yet — create one to get started.</Text>
        ) : schemes.map((s) => (
          <View key={s.id} style={[CARD, { padding: 14, marginBottom: 10 }]}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT, marginBottom: 6 }}>{s.name}</Text>
            <Text style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>
              {s.tenure_months}mo · Min ₹{Number(s.min_ticket_size).toLocaleString('en-IN')} · {s.premature_redemption_allowed ? `Exit after ${s.premature_redemption_lock_months || 0}mo` : 'No premature exit'}
            </Text>
            <Text style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>
              {(s.interest_payout_options || []).length
                ? (s.interest_payout_options || []).map((k) => `${INTEREST_PAYOUT_LABELS[k] || k}: ${s.payout_rates?.[k] ?? '—'}%`).join('  ·  ')
                : '—'}
            </Text>
            {manager && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity onPress={() => setEditing(s)} style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: COLORS.linkBg }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: TEAL }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => disableScheme(s.id)} style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: COLORS.errorBg }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.error }}>Disable</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
