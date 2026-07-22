import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, TextInput, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const NAVY = COLORS.navy; const BG = COLORS.screenBg; const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const RED = COLORS.error; const BLUE = COLORS.link || COLORS.primary || '#3D5AFE';
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, ...CARD_SHADOW };

const ITEMS = [
  ['leads', 'Leads'],
  ['lead_history', 'Lead history'],
  ['follow_ups', 'Follow-ups'],
  ['site_visits', 'Site visits'],
  ['bookings', 'Bookings'],
  ['cancelled_bookings', 'Cancelled bookings (logs only)'],
  ['closures', 'Closures / conversions'],
  ['distribution_log', 'Distribution log'],
  ['availability', 'Availability records'],
  ['notifications', 'Notifications'],
  ['plots_to_reset', 'Plots to reset → available'],
];

export default function SalesDataResetScreen({ navigation }) {
  const user = useSelector((s) => s.auth.user);
  const companyId = useSelector((s) => s.adminFilter?.companyId);
  const cq = (sep) => (companyId ? `${sep}company_id=${companyId}` : '');
  const isAdmin = !!(user && (user.is_staff || user.role === 'Admin' || (user.admin_modules || []).includes('Sales')));

  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmText, setConfirmText] = useState('');
  const [withAttendance, setWithAttendance] = useState(false);
  const [withLoi, setWithLoi] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  // Which categories to clear — default all ticked (matches the old "wipe all" behaviour).
  const [selected, setSelected] = useState(() => new Set(ITEMS.map(([k]) => k)));
  const toggle = (k) => setSelected((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const allOn = selected.size === ITEMS.length;
  const toggleAll = () => setSelected(allOn ? new Set() : new Set(ITEMS.map(([k]) => k)));
  // Deleting leads cascades their children in the DB — show those as implied.
  const CASCADE = ['closures', 'site_visits', 'follow_ups', 'lead_history'];
  const implied = (k) => selected.has('leads') && CASCADE.includes(k);
  const nothingSelected = selected.size === 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(SALES_ENDPOINTS.dataReset + cq('?'));
      setCounts(res.ok ? await res.json() : null);
    } catch { setCounts(null); }
    setLoading(false);
  }, [companyId]);

  useEffect(() => { if (isAdmin) load(); else setLoading(false); }, [load, isAdmin]);

  const willClear = (k) => (selected.has(k) || implied(k)) && k !== 'plots_to_reset';
  const total = counts ? Object.entries(counts).reduce((a, [k, v]) => a + (willClear(k) ? v : 0), 0) : 0;

  function confirmReset() {
    if (confirmText !== 'DELETE' || nothingSelected) return;
    Alert.alert(
      'Delete selected trial data?',
      'This permanently deletes the selected trial data for this company. This cannot be undone.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: doReset }],
    );
  }

  async function doReset() {
    setBusy(true); setMsg('');
    try {
      const res = await apiFetch(SALES_ENDPOINTS.dataReset + cq('?'), {
        method: 'POST',
        body: JSON.stringify({ confirm: 'DELETE', targets: [...selected], with_attendance: withAttendance, with_loi_files: withLoi }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { setMsg('✅ Trial data cleared. Your CRM is now a clean slate.'); setConfirmText(''); load(); }
      else setMsg('Error: ' + (d.detail || res.status));
    } catch (e) { setMsg(e.message); }
    setBusy(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT }}>Data Reset</Text>
          <Text style={{ fontSize: 12, color: MUTED }}>Clear trial data before go-live</Text>
        </View>
      </View>

      {!isAdmin ? (
        <Text style={{ textAlign: 'center', marginTop: 60, color: MUTED }}>Admin access only.</Text>
      ) : (
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>
          Keeps your company, users, projects, plot definitions, sources and config — only deletes
          transactional data and resets plots.
        </Text>

        {/* Select what to clear */}
        <View style={[CARD, { padding: 16, marginBottom: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: MUTED, textTransform: 'uppercase' }}>Select what to clear</Text>
            {!loading && (
              <TouchableOpacity onPress={toggleAll}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: BLUE }}>{allOn ? 'Clear all' : 'Select all'}</Text>
              </TouchableOpacity>
            )}
          </View>
          {loading ? <ActivityIndicator color={NAVY} /> : ITEMS.map(([k, label]) => {
            const isImplied = implied(k) && !selected.has(k);
            const checked = selected.has(k) || isImplied;
            return (
              <TouchableOpacity key={k} activeOpacity={isImplied ? 1 : 0.6} onPress={() => !isImplied && toggle(k)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 7, opacity: isImplied ? 0.6 : 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={20} color={checked ? BLUE : COLORS.shadow} />
                  <Text style={{ fontSize: 13, color: '#374151' }}>{label}{isImplied ? '  (via Leads)' : ''}</Text>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '800', color: (counts?.[k] || 0) > 0 ? (k === 'plots_to_reset' ? COLORS.success : RED) : MUTED }}>{counts?.[k] ?? 0}</Text>
              </TouchableOpacity>
            );
          })}
          {!loading && selected.has('leads') && (
            <Text style={{ fontSize: 11, color: MUTED, marginTop: 8 }}>
              Deleting Leads also removes their history, follow-ups, site visits & closures.
            </Text>
          )}
        </View>

        {/* Options */}
        <View style={[CARD, { padding: 16, marginBottom: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text style={{ fontSize: 13, color: '#374151', flex: 1 }}>Also delete signed LOI PDFs from storage</Text>
            <Switch value={withLoi} onValueChange={setWithLoi} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}>
            <Text style={{ fontSize: 13, color: '#374151', flex: 1 }}>Also clear attendance & leave records</Text>
            <Switch value={withAttendance} onValueChange={setWithAttendance} />
          </View>
        </View>

        {/* Danger zone */}
        <View style={{ backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: RED, borderRadius: 14, padding: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: RED, marginBottom: 6 }}>⚠️ Danger zone — cannot be undone</Text>
          <Text style={{ fontSize: 13, color: '#7F1D1D', marginBottom: 12 }}>Take a database backup first. Then type DELETE to enable the button.</Text>
          <TextInput value={confirmText} onChangeText={setConfirmText} placeholder="Type DELETE" autoCapitalize="characters"
            placeholderTextColor={COLORS.shadow}
            style={{ backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: RED + '66', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: TEXT, marginBottom: 12 }} />
          <TouchableOpacity onPress={confirmReset} disabled={confirmText !== 'DELETE' || busy || nothingSelected}
            style={{ backgroundColor: (confirmText === 'DELETE' && !busy && !nothingSelected) ? RED : '#F3B4B4', borderRadius: 10, paddingVertical: 13, alignItems: 'center' }}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>{nothingSelected ? 'Select at least one item' : `Permanently delete ${total} records`}</Text>}
          </TouchableOpacity>
          {!!msg && <Text style={{ marginTop: 12, fontSize: 13, fontWeight: '600', color: msg[0] === '✅' ? COLORS.success : RED }}>{msg}</Text>}
        </View>
      </ScrollView>
      )}
    </SafeAreaView>
  );
}
