import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { CLUB1000_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { isClub1000Manager } from '../../utils/club1000Access';
import { formatDMY } from '../../utils/dateFormat';

const NAVY = COLORS.navy; const TEAL = '#00838F'; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, ...CARD_SHADOW };

const TYPE_LABELS = { interest: 'Interest', maturity: 'Maturity', premature_redemption: 'Premature Redemption' };

function fmtMoney(n) {
  const num = Number(n || 0);
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export default function Club1000PayoutsScreen({ navigation, route }) {
  const user = useSelector((s) => s.auth.user);
  const manager = isClub1000Manager(user);

  const [payouts,    setPayouts]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Deep-link support: the dashboard's Pending/Paid Payouts stat cards pass
  // initialFilter so this screen opens already switched to the matching tab.
  const [filter,     setFilter]     = useState(route?.params?.initialFilter ?? 'pending');

  useEffect(() => { if (!manager) navigation.goBack(); }, [manager]);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const qs = filter ? `?status=${filter}` : '';
      const res = await apiFetch(`${CLUB1000_ENDPOINTS.payouts}${qs}`);
      if (res.ok) setPayouts(await res.json());
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }

  useFocusEffect(React.useCallback(() => { if (manager) load(); }, [manager, filter]));

  function markPaid(id) {
    Alert.alert('Mark as paid?', 'This confirms the payout has been disbursed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Paid', onPress: async () => {
        const res = await apiFetch(CLUB1000_ENDPOINTS.payoutMarkPaid(id), { method: 'POST' });
        if (res.ok) load();
      } },
    ]);
  }

  if (!manager) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: TEXT }}>Payouts</Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 }}>
        {[{ key: 'pending', label: 'Pending' }, { key: 'paid', label: 'Paid' }, { key: '', label: 'All' }].map((f) => (
          <TouchableOpacity key={f.key} onPress={() => setFilter(f.key)}
            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: filter === f.key ? NAVY : COLORS.white, borderWidth: 1, borderColor: filter === f.key ? NAVY : COLORS.border }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: filter === f.key ? COLORS.white : MUTED }}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}>
        {loading ? <ActivityIndicator color={NAVY} style={{ marginTop: 30 }} /> : payouts.length === 0 ? (
          <Text style={{ textAlign: 'center', color: MUTED, marginTop: 30 }}>No payouts.</Text>
        ) : payouts.map((p) => (
          <View key={p.id} style={[CARD, { padding: 14, marginBottom: 10 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT }}>{p.investor_name}</Text>
                <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{p.scheme_name} · {TYPE_LABELS[p.payout_type] || p.payout_type}</Text>
                <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Due {formatDMY(p.due_date)}</Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: '800', color: TEAL }}>{fmtMoney(p.amount_due)}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: p.status === 'paid' ? COLORS.successBg : COLORS.warningBg }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: p.status === 'paid' ? COLORS.success : COLORS.warning }}>
                  {p.status === 'paid' ? 'Paid' : 'Pending'}
                </Text>
              </View>
              {p.status === 'pending' && (
                <TouchableOpacity onPress={() => markPaid(p.id)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: TEAL }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.white }}>Mark Paid</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
