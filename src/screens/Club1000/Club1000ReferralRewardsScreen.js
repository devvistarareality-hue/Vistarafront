import React, { useState } from 'react';
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

function fmtMoney(n) {
  const num = Number(n || 0);
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function groupByReferrer(rewards) {
  const groups = new Map();
  for (const r of rewards) {
    const key = r.reference_phone || r.reference_name;
    if (!groups.has(key)) {
      groups.set(key, { reference_name: r.reference_name, reference_phone: r.reference_phone, total: 0, pending: 0, count: 0 });
    }
    const g = groups.get(key);
    const amount = Number(r.amount) || 0;
    g.total += amount;
    g.count += 1;
    if (r.status !== 'paid') g.pending += amount;
  }
  return Array.from(groups.values()).sort((a, b) => b.total - a.total);
}

export default function Club1000ReferralRewardsScreen({ navigation }) {
  const user = useSelector((s) => s.auth.user);
  const manager = isClub1000Manager(user);

  const [rewards,    setRewards]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState('pending');

  React.useEffect(() => { if (!manager) navigation.goBack(); }, [manager]);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const qs = filter ? `?status=${filter}` : '';
      const res = await apiFetch(`${CLUB1000_ENDPOINTS.referralRewards}${qs}`);
      if (res.ok) setRewards(await res.json());
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }

  useFocusEffect(React.useCallback(() => { if (manager) load(); }, [manager, filter]));

  function markPaid(id) {
    Alert.alert('Mark as paid?', 'This confirms the referral reward has been disbursed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Paid', onPress: async () => {
        const res = await apiFetch(CLUB1000_ENDPOINTS.referralRewardMarkPaid(id), { method: 'POST' });
        if (res.ok) load();
      } },
    ]);
  }

  if (!manager) return null;

  const referrers = groupByReferrer(rewards);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: TEXT }}>Referral Rewards</Text>
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
        {loading ? <ActivityIndicator color={NAVY} style={{ marginTop: 30 }} /> : (
          <>
            {referrers.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
                {referrers.map((g) => (
                  <View key={g.reference_phone || g.reference_name} style={[CARD, { width: '47%', padding: 14 }]}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT }} numberOfLines={1}>{g.reference_name || '—'}</Text>
                    {!!g.reference_phone && <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{g.reference_phone}</Text>}
                    <Text style={{ fontSize: 17, fontWeight: '800', color: TEAL, marginTop: 6 }}>{fmtMoney(g.total)}</Text>
                    <Text style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{g.count} referral{g.count === 1 ? '' : 's'}</Text>
                  </View>
                ))}
              </View>
            )}

            {rewards.length === 0 ? (
              <Text style={{ textAlign: 'center', color: MUTED, marginTop: 30 }}>No referral rewards yet.</Text>
            ) : rewards.map((r) => (
              <View key={r.id} style={[CARD, { padding: 14, marginBottom: 10 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT }}>{r.reference_name}</Text>
                    <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{r.reference_phone}</Text>
                    <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Referred {r.investor_name}</Text>
                    <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Earned {formatDMY(r.created_at?.slice(0, 10))}</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: TEAL }}>{fmtMoney(r.amount)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: r.status === 'paid' ? COLORS.successBg : COLORS.warningBg }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: r.status === 'paid' ? COLORS.success : COLORS.warning }}>
                      {r.status === 'paid' ? 'Paid' : 'Pending'}
                    </Text>
                  </View>
                  {r.status === 'pending' && (
                    <TouchableOpacity onPress={() => markPaid(r.id)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: TEAL }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.white }}>Mark Paid</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
