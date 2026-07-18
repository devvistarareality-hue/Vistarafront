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
  name: '', tenure_months: '12', fixed_return_pct: '', loyalty_benefit_pct: '0',
  min_ticket_size: '', premature_redemption_allowed: false,
  premature_redemption_lock_months: '', premature_redemption_rate_pct_per_month: '1.00',
  interest_payout_options: ['maturity'],
};

const INTEREST_PAYOUT_LABELS = { monthly: 'Monthly', quarterly: 'Quarterly', maturity: 'At Maturity' };

function NewSchemeSheet({ visible, onClose, onSaved }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const total = (Number(form.fixed_return_pct) || 0) + (Number(form.loyalty_benefit_pct) || 0);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function toggleInterestPayoutOption(key) {
    setForm((f) => ({
      ...f,
      interest_payout_options: f.interest_payout_options.includes(key)
        ? f.interest_payout_options.filter((k) => k !== key)
        : [...f.interest_payout_options, key],
    }));
  }

  async function submit() {
    if (!form.name.trim() || !form.fixed_return_pct || !form.min_ticket_size) {
      Alert.alert('Missing fields', 'Name, Fixed Return % and Min Ticket Size are required.');
      return;
    }
    if (!form.interest_payout_options.length) {
      Alert.alert('Missing fields', 'Select at least one interest payout option.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(CLUB1000_ENDPOINTS.schemes, {
        method: 'POST',
        body: JSON.stringify({ ...form, total_return_pct: total }),
      });
      const d = await res.json();
      if (!res.ok) {
        Alert.alert('Could not create scheme', d?.detail || Object.values(d || {})[0]?.toString() || 'Please check the fields.');
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
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: TEXT }}>New Scheme</Text>
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
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextField label="Fixed Return %" required value={form.fixed_return_pct} onChangeText={(v) => set('fixed_return_pct', v)} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Loyalty Benefit %" value={form.loyalty_benefit_pct} onChangeText={(v) => set('loyalty_benefit_pct', v)} keyboardType="decimal-pad" />
          </View>
        </View>
        <Text style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>Total Return: <Text style={{ fontWeight: '800', color: TEAL }}>{total}%</Text></Text>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 8 }}>Interest Payout Options</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {Object.entries(INTEREST_PAYOUT_LABELS).map(([key, label]) => {
              const checked = form.interest_payout_options.includes(key);
              return (
                <TouchableOpacity key={key} onPress={() => toggleInterestPayoutOption(key)}
                  style={{ flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: checked ? TEAL : COLORS.border, backgroundColor: checked ? TEAL : COLORS.white }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: checked ? COLORS.white : MUTED }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>Only the selected option(s) will be selectable when adding investors to this scheme.</Text>
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
          <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: '800' }}>Create Scheme</Text>
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

  useEffect(() => { if (!manager) navigation.goBack(); }, [manager]);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await apiFetch(CLUB1000_ENDPOINTS.schemes);
      if (res.ok) setSchemes(await res.json());
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }

  useFocusEffect(React.useCallback(() => { if (manager) load(); }, [manager]));

  function disableScheme(id) {
    Alert.alert('Disable scheme?', 'It will no longer be selectable for new investors.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Disable', style: 'destructive', onPress: async () => {
        const res = await apiFetch(CLUB1000_ENDPOINTS.scheme(id), { method: 'DELETE' });
        if (res.ok || res.status === 204) load();
      } },
    ]);
  }

  if (!manager) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <NewSchemeSheet visible={showNew} onClose={() => setShowNew(false)} onSaved={() => load()} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: TEXT }}>Schemes</Text>
        <TouchableOpacity onPress={() => setShowNew(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: TEAL, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
          <Ionicons name="add" size={16} color={COLORS.white} />
          <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: '700' }}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}>
        {loading ? <ActivityIndicator color={NAVY} style={{ marginTop: 30 }} /> : schemes.length === 0 ? (
          <Text style={{ textAlign: 'center', color: MUTED, marginTop: 30 }}>No schemes yet — create one to get started.</Text>
        ) : schemes.map((s) => (
          <View key={s.id} style={[CARD, { padding: 14, marginBottom: 10 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT }}>{s.name}</Text>
              <Text style={{ fontSize: 15, fontWeight: '800', color: TEAL }}>{s.total_return_pct}%</Text>
            </View>
            <Text style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>
              {s.tenure_months}mo · Min ₹{Number(s.min_ticket_size).toLocaleString('en-IN')} · {s.premature_redemption_allowed ? `Exit after ${s.premature_redemption_lock_months || 0}mo` : 'No premature exit'}
            </Text>
            <Text style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>
              Payout: {(s.interest_payout_options || []).map((k) => INTEREST_PAYOUT_LABELS[k] || k).join(', ') || '—'}
            </Text>
            <TouchableOpacity onPress={() => disableScheme(s.id)} style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: COLORS.errorBg }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.error }}>Disable</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
