import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { ERP_EXECUTION, ERP_MASTER } from '../../constants/api';

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// Green-themed Execution Department
const EXEC_MODULES = [
  { name: 'Purchase\nRequisitions', icon: 'clipboard-list-outline', color: '#2E7D32', iconBg: '#E8F5E9', screen: 'ERPPRList',       desc: 'Raise material requests from site' },
  { name: 'Create New\nPR',         icon: 'clipboard-plus-outline',  color: '#1B5E20', iconBg: '#C8E6C9', screen: 'CreatePR',         desc: 'Add a new purchase requisition' },
  { name: 'Material\nIssues',       icon: 'transfer-right',          color: '#6A1B9A', iconBg: '#F3E5F5', screen: 'ERPMBList',        desc: 'Issue materials to site' },
  { name: 'Measurement\nBook',      icon: 'ruler-square',            color: '#0097A7', iconBg: '#E0F7FA', screen: 'ERPMBList',        desc: 'Record work progress' },
  { name: 'RA Bills',               icon: 'file-document-check-outline', color: '#E65100', iconBg: '#FFF3E0', screen: 'Placeholder',  desc: 'Running account bills' },
  { name: 'WBS\nActivities',        icon: 'file-tree-outline',        color: '#182350', iconBg: '#E8EEFF', screen: 'ERPProjectList',  desc: 'Work breakdown structure' },
  { name: 'ERP\nProjects',          icon: 'office-building-outline',  color: '#B9915E', iconBg: '#FDF4EC', screen: 'ERPProjectList',  desc: 'Manage ERP projects' },
];

export default function ExecutionDashboardScreen({ navigation }) {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    try {
      const headers = await authHeaders();
      const [prRes, mbRes] = await Promise.all([
        fetch(`${ERP_EXECUTION.prs}?limit=1`, { headers }),
        fetch(`${ERP_EXECUTION.mbs}?limit=1`, { headers }),
      ]);
      const [prData, mbData] = await Promise.all([
        prRes.ok ? prRes.json() : null,
        mbRes.ok ? mbRes.json() : null,
      ]);
      setStats({ prs: prData?.count ?? 0, mbs: mbData?.count ?? 0 });
    } catch {}
    setLoading(false);
  }

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />

      {/* Header — green theme for Execution */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Execution</Text>
          <Text style={s.headerSub}>Site & Work Management</Text>
        </View>
        <View style={s.headerIcon}>
          <MaterialCommunityIcons name="wrench-outline" size={22} color="#A5D6A7" />
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Stats strip */}
        <View style={s.statsRow}>
          {loading ? (
            <ActivityIndicator color="#2E7D32" />
          ) : (
            <>
              <StatPill label="Total PRs" value={stats?.prs ?? '—'} color="#2E7D32" bg="#E8F5E9" />
              <StatPill label="Total MBs" value={stats?.mbs ?? '—'} color="#0097A7" bg="#E0F7FA" />
              <StatPill label="Dept" value="Exec" color="#1B5E20" bg="#C8E6C9" />
            </>
          )}
        </View>

        {/* Quick action */}
        <TouchableOpacity style={s.quickAction} onPress={() => navigation.navigate('CreatePR')} activeOpacity={0.85}>
          <MaterialCommunityIcons name="plus-circle-outline" size={22} color="#fff" />
          <Text style={s.quickActionText}>Raise New Purchase Requisition</Text>
          <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <Text style={s.sectionTitle}>EXECUTION MODULES</Text>
        <View style={s.grid}>
          {EXEC_MODULES.map((mod) => (
            <TouchableOpacity
              key={mod.name}
              style={s.card}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(mod.screen, mod.screen === 'Placeholder' ? { title: mod.name } : undefined)}
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

  header:       { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1B5E20', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18, gap: 12 },
  backBtn:      { padding: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)' },
  headerCenter: { flex: 1 },
  headerTitle:  { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub:    { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  headerIcon:   { padding: 8, borderRadius: 12, backgroundColor: 'rgba(165,214,167,0.2)' },

  content:      { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.8, marginBottom: 14, marginTop: 6 },

  statsRow:   { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pill:       { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  pillValue:  { fontSize: 22, fontWeight: '800' },
  pillLabel:  { fontSize: 10, fontWeight: '600', marginTop: 3, opacity: 0.8 },

  quickAction: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#2E7D32', borderRadius: 14, padding: 16, marginBottom: 18,
    shadowColor: '#2E7D32', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  quickActionText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#fff' },

  grid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card:     { width: '47%', backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 14, ...CARD_SHADOW },
  iconBg:   { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  cardName: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4, lineHeight: 18 },
  cardDesc: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 10, lineHeight: 16 },
  cardArrow:{ fontSize: 11, fontWeight: '700' },
});
