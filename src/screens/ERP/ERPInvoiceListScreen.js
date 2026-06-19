import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { ERP_FINANCE } from '../../constants/api';

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

const MATCH_COLORS = {
  'Pending':  { bg: '#FFF8E1', text: '#F9A825' },
  '2-Way':    { bg: '#E0F7FA', text: '#0097A7' },
  '3-Way':    { bg: '#E8F5E9', text: '#2E7D32' },
  'Approved': { bg: '#E8EEFF', text: '#3D5AFE' },
  'Disputed': { bg: '#FEE2E2', text: '#DC2626' },
};

const PAY_COLORS = {
  'Pending': '#F9A825',
  'Partial': '#0097A7',
  'Paid':    '#2E7D32',
};

function InvoiceCard({ item }) {
  const match   = MATCH_COLORS[item.match_status] || { bg: '#F5F6FA', text: '#8492A6' };
  const payColor = PAY_COLORS[item.payment_status] || '#8492A6';
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <Text style={s.invNo}>{item.invoice_no}</Text>
        <View style={[s.badge, { backgroundColor: match.bg }]}>
          <Text style={[s.badgeText, { color: match.text }]}>{item.match_status}</Text>
        </View>
      </View>
      <Text style={s.projectName} numberOfLines={1}>{item.project_name}</Text>
      <View style={s.vendorRow}>
        <MaterialCommunityIcons name="account-hard-hat-outline" size={13} color={COLORS.textSecondary} />
        <Text style={s.vendorText} numberOfLines={1}>{item.vendor_name}</Text>
      </View>
      <View style={s.cardBottom}>
        <Text style={s.amount}>₹{parseFloat(item.total_amount).toLocaleString('en-IN')}</Text>
        <Text style={[s.payStatus, { color: payColor }]}>{item.payment_status}</Text>
        <View style={s.metaItem}>
          <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />
          <Text style={s.metaText}>{item.invoice_date}</Text>
        </View>
      </View>
    </View>
  );
}

export default function ERPInvoiceListScreen({ navigation }) {
  const [invoices,   setInvoices]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(ERP_FINANCE.invoices, { headers });
      if (res.ok) {
        const data = await res.json();
        setInvoices(Array.isArray(data) ? data : (data.results || []));
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  const filtered = invoices.filter(
    (inv) =>
      inv.invoice_no?.toLowerCase().includes(search.toLowerCase()) ||
      inv.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.project_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Vendor Invoices</Text>
      </View>
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} />
          <TextInput
            style={s.searchInput}
            placeholder="Search invoice, vendor or project..."
            placeholderTextColor={COLORS.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>
      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.navy} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <InvoiceCard item={item} />}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.navy} />}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="document-text-outline" size={48} color={COLORS.lightGray} />
              <Text style={s.emptyText}>No invoices found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.screenBg },
  header:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.navy, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18, gap: 12 },
  backBtn:     { padding: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  searchRow:   { padding: 16, paddingBottom: 8 },
  searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, ...CARD_SHADOW },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  list:        { padding: 16, paddingTop: 8, paddingBottom: 40 },
  card:        { backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 16, marginBottom: 12, ...CARD_SHADOW },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  invNo:       { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  projectName: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
  vendorRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  vendorText:  { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600', flex: 1 },
  cardBottom:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  amount:      { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, flex: 1 },
  payStatus:   { fontSize: 12, fontWeight: '700' },
  metaItem:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:    { fontSize: 11, color: COLORS.textSecondary },
  badge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:   { fontSize: 11, fontWeight: '700' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText:   { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
});
