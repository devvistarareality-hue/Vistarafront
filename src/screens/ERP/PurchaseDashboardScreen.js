import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { ERP_PURCHASE, ERP_INVENTORY } from '../../constants/api';

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// Orange-themed Purchase Department — distinct from green Execution
const PURCHASE_MODULES = [
  { name: 'Purchase\nOrders',   icon: 'cart-outline',            color: '#E65100', iconBg: '#FFF3E0', screen: 'ERPPOList',       desc: 'Create & track vendor POs' },
  { name: 'Create\nNew PO',     icon: 'cart-plus',               color: '#BF360C', iconBg: '#FFCCBC', screen: 'CreatePO',         desc: 'Raise a new purchase order' },
  { name: 'GRN',                icon: 'truck-delivery-outline',  color: '#0097A7', iconBg: '#E0F7FA', screen: 'ERPGRNList',      desc: 'Record goods received' },
  { name: 'Stock\nBalance',     icon: 'package-variant-closed',  color: '#F9A825', iconBg: '#FFF8E1', screen: 'ERPStock',        desc: 'Live inventory per project' },
  { name: 'Vendor\nInvoices',   icon: 'file-document-outline',   color: '#182350', iconBg: '#E8EEFF', screen: 'ERPInvoiceList',  desc: '3-way match & payment status' },
  { name: 'Vendor\nMaster',     icon: 'account-hard-hat-outline',color: '#3D5AFE', iconBg: '#EEF0FF', screen: 'ERPVendorList',   desc: 'Manage approved vendors' },
];

export default function PurchaseDashboardScreen({ navigation }) {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    try {
      const headers = await authHeaders();
      const [poRes, grnRes] = await Promise.all([
        fetch(`${ERP_PURCHASE.pos}?limit=1`, { headers }),
        fetch(`${ERP_INVENTORY.grns}?limit=1`, { headers }),
      ]);
      const [poData, grnData] = await Promise.all([
        poRes.ok  ? poRes.json()  : null,
        grnRes.ok ? grnRes.json() : null,
      ]);
      setStats({ pos: poData?.count ?? 0, grns: grnData?.count ?? 0 });
    } catch {}
    setLoading(false);
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#BF360C" />

      {/* Header — deep orange theme for Purchase */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Purchase</Text>
          <Text style={s.headerSub}>Procurement & Inventory</Text>
        </View>
        <View style={s.headerIcon}>
          <MaterialCommunityIcons name="cart-outline" size={22} color="#FFCCBC" />
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Stats strip */}
        <View style={s.statsRow}>
          {loading ? (
            <ActivityIndicator color="#E65100" />
          ) : (
            <>
              <StatPill label="Total POs"  value={stats?.pos  ?? '—'} color="#E65100" bg="#FFF3E0" />
              <StatPill label="Total GRNs" value={stats?.grns ?? '—'} color="#0097A7" bg="#E0F7FA" />
              <StatPill label="Dept" value="Purch" color="#BF360C" bg="#FFCCBC" />
            </>
          )}
        </View>

        {/* Quick action */}
        <TouchableOpacity style={s.quickAction} onPress={() => navigation.navigate('CreatePO')} activeOpacity={0.85}>
          <MaterialCommunityIcons name="plus-circle-outline" size={22} color="#fff" />
          <Text style={s.quickActionText}>Create New Purchase Order</Text>
          <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <Text style={s.sectionTitle}>PURCHASE MODULES</Text>
        <View style={s.grid}>
          {PURCHASE_MODULES.map((mod) => (
            <TouchableOpacity
              key={mod.name}
              style={s.card}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(mod.screen)}
            >
              <View style={[s.iconBg, { backgroundColor: mod.iconBg }]}>
                <MaterialCommunityIcons name={mod.icon} size={24} color={mod.color} />
              </View>
              <Text style={s.cardName}>{mod.name}</Text>
              <Text style={s.cardDesc} numberOfLines={2}>{mod.desc}</Text>
              <Text style={[s.cardArrow, { color: mod.color }]}>Open →</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatPill({ label, value, color, bg }) {
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      <Text style={[s.pillValue, { color }]}>{value}</Text>
      <Text style={[s.pillLabel, { color }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.screenBg },

  header:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#BF360C', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18, gap: 12 },
  backBtn:      { padding: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)' },
  headerCenter: { flex: 1 },
  headerTitle:  { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub:    { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  headerIcon:   { padding: 8, borderRadius: 12, backgroundColor: 'rgba(255,204,188,0.2)' },

  content:      { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.8, marginBottom: 14, marginTop: 6 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pill:     { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  pillValue:{ fontSize: 22, fontWeight: '800' },
  pillLabel:{ fontSize: 10, fontWeight: '600', marginTop: 3, opacity: 0.8 },

  quickAction: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#E65100', borderRadius: 14, padding: 16, marginBottom: 18,
    shadowColor: '#E65100', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  quickActionText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#fff' },

  grid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card:     { width: '47%', backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 14, ...CARD_SHADOW },
  iconBg:   { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  cardName: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4, lineHeight: 18 },
  cardDesc: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 10, lineHeight: 16 },
  cardArrow:{ fontSize: 11, fontWeight: '700' },
});
