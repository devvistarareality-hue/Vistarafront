import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { MyBookingsList } from './MyBookingsScreen';

const NAVY = COLORS.navy; const BLUE = COLORS.link; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, ...CARD_SHADOW };

// Read-only project picker for the Record Closure flow (mobile mirror of web
// /sales/closure). No add/edit/manage — STM only picks a project to drill in.
export default function ClosureProjectsScreen({ navigation, route }) {
  const sv        = route.params?.sv || null;
  const companyId = useSelector((s) => s.adminFilter?.companyId);

  const [projects,   setProjects]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view,       setView]       = useState(route.params?.initialView || 'closures'); // 'closures' | 'mybookings'
  useEffect(() => { if (route.params?.initialView) setView(route.params.initialView); }, [route.params?.initialView]);

  const load = useCallback(async () => {
    try {
      const url = SALES_ENDPOINTS.projects + (companyId ? `?company_id=${companyId}` : '');
      const res = await apiFetch(url);
      if (res.ok) {
        const d = await res.json();
        setProjects(Array.isArray(d) ? d : (d.results || []));
      }
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }, [companyId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visible = projects.filter(p => p.is_active);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT }}>Select Project</Text>
          <Text style={{ fontSize: 12, color: MUTED }} numberOfLines={1}>
            {sv ? `Closure for ${sv.lead_name}` : 'Pick a project to view units'}
          </Text>
        </View>
      </View>

      {/* Toggle: Record Closure ↔ My Bookings */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        {[['closures', 'Record Closure'], ['mybookings', 'My Bookings']].map(([k, label]) => (
          <TouchableOpacity key={k} onPress={() => setView(k)} style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: view === k ? BLUE : COLORS.surfaceAlt }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: view === k ? '#fff' : MUTED }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {view === 'mybookings' ? <MyBookingsList navigation={navigation} /> : loading ? (
        <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
          {!visible.length ? (
            <Text style={{ textAlign: 'center', color: MUTED, marginTop: 40 }}>No active projects available.</Text>
          ) : visible.map(p => {
            const pc = p.plot_counts || {};
            const total = pc.total || 0;
            return (
              <TouchableOpacity key={p.id} activeOpacity={0.85}
                onPress={() => navigation.navigate('ClosureViewer', { projectId: p.id, sv })}
                style={[CARD, { overflow: 'hidden' }]}>
                <View style={{ height: 150, backgroundColor: COLORS.surfaceAlt }}>
                  {p.cover_image_url ? (
                    <Image source={{ uri: p.cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  ) : (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="image-outline" size={32} color={COLORS.border} />
                    </View>
                  )}
                </View>
                <View style={{ padding: 14 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT }}>{p.name}</Text>
                  {!!p.location && <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>📍 {p.location}</Text>}
                  {total > 0 && (
                    <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
                      <Text style={{ fontSize: 12, color: COLORS.success, fontWeight: '700' }}>✓ {pc.available || 0} available</Text>
                      <Text style={{ fontSize: 12, color: COLORS.warning, fontWeight: '700' }}>⏸ {pc.hold || 0}</Text>
                      <Text style={{ fontSize: 12, color: COLORS.error, fontWeight: '700' }}>✕ {pc.sold || 0}</Text>
                    </View>
                  )}
                  <View style={{ marginTop: 12, backgroundColor: COLORS.linkBg, borderRadius: 10, paddingVertical: 9, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: BLUE }}>View units →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
