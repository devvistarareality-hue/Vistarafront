import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { openLoi } from '../../utils/openLoi';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary; const BLUE = COLORS.link;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 14, ...CARD_SHADOW };
const rupee = (n) => '₹ ' + Math.round(Number(n) || 0).toLocaleString('en-IN');

// "My Bookings" list — the bookings the user submitted, grouped project → plot,
// with a Revise LOI action. Rendered inside the Booking screen under a toggle.
export function MyBookingsList({ navigation }) {
  const companyId = useSelector((s) => s.adminFilter?.companyId);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const q = '?mine=1' + (companyId ? `&company_id=${companyId}` : '');
      const res = await apiFetch(SALES_ENDPOINTS.bookings + q);
      if (res.ok) { const d = await res.json(); setRows(Array.isArray(d) ? d : []); }
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }, [companyId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const groups = {};
  rows.forEach((b) => { const k = b.project_name || '—'; (groups[k] = groups[k] || []).push(b); });
  const projectNames = Object.keys(groups).sort();
  projectNames.forEach((pn) => groups[pn].sort((a, b) => String(a.plot_numbers || a.plot_number || a.area).localeCompare(String(b.plot_numbers || b.plot_number || b.area))));

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
      {loading ? <ActivityIndicator color={BLUE} style={{ marginTop: 30 }} /> : projectNames.length === 0 ? (
        <View style={[CARD, { alignItems: 'center', padding: 30 }]}><Text style={{ color: MUTED }}>You haven't booked any units yet.</Text></View>
      ) : projectNames.map((pn) => (
        <View key={pn} style={{ marginBottom: 18 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: BLUE, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
            🏢 {pn} · {groups[pn].length} unit{groups[pn].length === 1 ? '' : 's'}
          </Text>
          {groups[pn].map((b) => (
            <View key={b.id} style={[CARD, { marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>Plot {b.plot_numbers || b.plot_number || b.area}{b.revision_no > 0 ? `  R${b.revision_no}` : ''}</Text>
                  <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{b.client_name || '—'} · {b.phone}</Text>
                  <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>Booked {b.booking_date || '—'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0D47A1' }}>{rupee(b.final_amount)}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: MUTED, marginTop: 4 }}>{(b.approval_status || b.status || '').toUpperCase()}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                {b.loi_document && <TouchableOpacity onPress={() => openLoi(b.id)} style={[btn, { backgroundColor: COLORS.linkBg }]}><Text style={{ color: BLUE, fontWeight: '700', fontSize: 13 }}>📄 LOI</Text></TouchableOpacity>}
                {b.status === 'sold' && String(b.plot_numbers || '').toUpperCase().startsWith('EOI') && <TouchableOpacity onPress={() => navigation.navigate('ClosureViewer', { projectId: b.project, convertEoi: b.id })} style={[btn, { backgroundColor: '#E4571A' }]}><Text style={btnT}>→ Convert to LOI</Text></TouchableOpacity>}
                {b.status === 'sold' && !String(b.plot_numbers || '').toUpperCase().startsWith('EOI') && <TouchableOpacity onPress={() => navigation.navigate('BookingForm', { revise: b.id })} style={[btn, { backgroundColor: COLORS.purple }]}><Text style={btnT}>↻ Revise LOI</Text></TouchableOpacity>}
                {b.status === 'pending' && <Text style={{ fontSize: 12, color: COLORS.warning }}>Awaiting approval</Text>}
              </View>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
const btn = { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 };
const btnT = { color: '#fff', fontWeight: '700', fontSize: 13 };
