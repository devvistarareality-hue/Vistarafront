import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { ERP_EXECUTION, ERP_PURCHASE, ERP_INVENTORY } from '../../constants/api';

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

const ERP_MODULES = [
  { name: 'Purchase\nRequisition', icon: 'clipboard-list-outline', color: '#2E7D32', iconBg: '#E8F5E9', screen: 'ERPPRList' },
  { name: 'Purchase\nOrders',      icon: 'cart-outline',            color: '#E65100', iconBg: '#FFF3E0', screen: 'ERPPOList' },
  { name: 'GRN',                   icon: 'truck-delivery-outline',  color: '#0097A7', iconBg: '#E0F7FA', screen: 'ERPGRNList' },
  { name: 'Stock\nBalance',        icon: 'package-variant-closed',  color: '#F9A825', iconBg: '#FFF8E1', screen: 'ERPStock' },
  { name: 'Measurement\nBook',     icon: 'ruler-square',            color: '#6A1B9A', iconBg: '#F3E5F5', screen: 'ERPMBList' },
  { name: 'Vendor\nInvoices',      icon: 'file-document-outline',   color: '#182350', iconBg: '#E8EEFF', screen: 'ERPInvoiceList' },
  { name: 'Vendors',               icon: 'account-hard-hat-outline',color: '#3D5AFE', iconBg: '#EEF0FF', screen: 'ERPVendorList' },
  { name: 'Projects',              icon: 'office-building-outline', color: '#B9915E', iconBg: '#FDF4EC', screen: 'ERPProjectList' },
];

export default function ERPDashboardScreen({ navigation }) {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const headers = await authHeaders();
      const [prRes, poRes, grnRes] = await Promise.all([
        fetch(`${ERP_EXECUTION.prs}?limit=1`, { headers }),
        fetch(`${ERP_PURCHASE.pos}?limit=1`, { headers }),
        fetch(`${ERP_INVENTORY.grns}?limit=1`, { headers }),
      ]);
      const [prData, poData, grnData] = await Promise.all([
        prRes.ok ? prRes.json() : null,
        poRes.ok ? poRes.json() : null,
        grnRes.ok ? grnRes.json() : null,
      ]);
      setStats({
        prs:  prData?.count  ?? 0,
        pos:  poData?.count  ?? 0,
        grns: grnData?.count ?? 0,
      });
    } catch {}
    setLoading(false);
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>ERP</Text>
          <Text style={s.headerSub}>Construction Execution</Text>
        </View>
        <View style={s.headerIcon}>
          <MaterialCommunityIcons name="office-building-cog-outline" size={22} color={COLORS.gold} />
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Stats strip */}
        <View style={s.statsRow}>
          {loading ? (
            <ActivityIndicator color={COLORS.navy} />
          ) : (
            <>
              <StatPill label="PRs" value={stats?.prs ?? '—'} color="#2E7D32" />
              <StatPill label="POs" value={stats?.pos ?? '—'} color="#E65100" />
              <StatPill label="GRNs" value={stats?.grns ?? '—'} color="#0097A7" />
            </>
          )}
        </View>

        <Text style={s.sectionTitle}>MODULES</Text>
        <View style={s.grid}>
          {ERP_MODULES.map((mod) => (
            <TouchableOpacity
              key={mod.name}
              style={s.card}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(mod.screen)}
            >
              <View style={[s.iconBg, { backgroundColor: mod.iconBg }]}>
                <MaterialCommunityIcons name={mod.icon} size={26} color={mod.color} />
              </View>
              <Text style={s.cardName}>{mod.name}</Text>
              <Text style={[s.cardArrow, { color: mod.color }]}>Open →</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatPill({ label, value, color }) {
  return (
    <View style={s.pill}>
      <Text style={[s.pillValue, { color }]}>{value}</Text>
      <Text style={s.pillLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.screenBg },

  header:       { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.navy, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18, gap: 12 },
  backBtn:      { padding: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)' },
  headerCenter: { flex: 1 },
  headerTitle:  { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub:    { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  headerIcon:   { padding: 8, borderRadius: 12, backgroundColor: 'rgba(185,145,94,0.18)' },

  content:    { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.8, marginBottom: 14, marginTop: 6 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 22 },
  pill:     { flex: 1, backgroundColor: COLORS.cardBg, borderRadius: 14, paddingVertical: 14, alignItems: 'center', ...CARD_SHADOW },
  pillValue: { fontSize: 22, fontWeight: '800' },
  pillLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginTop: 3 },

  grid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card:     { width: '47%', backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 16, ...CARD_SHADOW },
  iconBg:   { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cardName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10, lineHeight: 20 },
  cardArrow:{ fontSize: 12, fontWeight: '700' },
});
