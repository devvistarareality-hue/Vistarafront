import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { ERP_EXECUTION } from '../../constants/api';

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

const STATUS_COLORS = {
  'Raised':         { bg: '#E8EEFF', text: '#3D5AFE' },
  'Approved':       { bg: '#E8F5E9', text: '#2E7D32' },
  'PO Created':     { bg: '#FFF3E0', text: '#E65100' },
  'In Transit':     { bg: '#E0F7FA', text: '#0097A7' },
  'Received':       { bg: '#E8F5E9', text: '#2E7D32' },
  'Issued to Site': { bg: '#F3E5F5', text: '#6A1B9A' },
  'Closed':         { bg: '#F5F6FA', text: '#8492A6' },
};

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || { bg: '#F5F6FA', text: '#8492A6' };
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      <Text style={[s.badgeText, { color: c.text }]}>{status}</Text>
    </View>
  );
}

function PRCard({ item, onPress }) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.8}>
      <View style={s.cardTop}>
        <Text style={s.prNo}>{item.pr_no}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={s.projectName} numberOfLines={1}>{item.project_name}</Text>
      <View style={s.cardBottom}>
        <View style={s.metaItem}>
          <Ionicons name="person-outline" size={12} color={COLORS.textSecondary} />
          <Text style={s.metaText}>{item.raised_by_name}</Text>
        </View>
        <View style={s.metaItem}>
          <Ionicons name="layers-outline" size={12} color={COLORS.textSecondary} />
          <Text style={s.metaText}>{item.line_count} line{item.line_count !== 1 ? 's' : ''}</Text>
        </View>
        <View style={s.metaItem}>
          <Ionicons name="calendar-outline" size={12} color={COLORS.textSecondary} />
          <Text style={s.metaText}>{item.raised_date}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ERPPRListScreen({ navigation }) {
  const [prs,        setPRs]        = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(ERP_EXECUTION.prs, { headers });
      if (res.ok) {
        const data = await res.json();
        setPRs(Array.isArray(data) ? data : (data.results || []));
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  const filtered = prs.filter(
    (p) =>
      p.pr_no?.toLowerCase().includes(search.toLowerCase()) ||
      p.project_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Purchase Requisitions</Text>
      </View>

      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} />
          <TextInput
            style={s.searchInput}
            placeholder="Search PR no. or project..."
            placeholderTextColor={COLORS.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={COLORS.navy} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <PRCard item={item} onPress={() => navigation.navigate('ERPPRDetail', { id: item.id })} />
          )}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.navy} />}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="clipboard-outline" size={48} color={COLORS.lightGray} />
              <Text style={s.emptyText}>No purchase requisitions found</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.screenBg },

  header:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.navy, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18, gap: 12 },
  backBtn:     { padding: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },

  searchRow:   { padding: 16, paddingBottom: 8 },
  searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, ...CARD_SHADOW },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },

  list:        { padding: 16, paddingTop: 8, paddingBottom: 40 },
  card:        { backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 16, marginBottom: 12, ...CARD_SHADOW },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  prNo:        { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  projectName: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  cardBottom:  { flexDirection: 'row', gap: 16 },
  metaItem:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:    { fontSize: 11, color: COLORS.textSecondary },

  badge:     { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText: { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
});
