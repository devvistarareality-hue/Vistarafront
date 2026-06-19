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
import { ERP_MASTER } from '../../constants/api';

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

const STATUS_COLORS = {
  'Active':    { bg: '#E8F5E9', text: '#2E7D32' },
  'Completed': { bg: '#E8EEFF', text: '#3D5AFE' },
  'On Hold':   { bg: '#FFF8E1', text: '#F9A825' },
  'Cancelled': { bg: '#FEE2E2', text: '#DC2626' },
};

function ProjectCard({ item }) {
  const sc = STATUS_COLORS[item.status] || { bg: '#F5F6FA', text: '#8492A6' };
  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.iconBg}>
          <MaterialCommunityIcons name="office-building-outline" size={22} color={COLORS.gold} />
        </View>
        <View style={[s.badge, { backgroundColor: sc.bg }]}>
          <Text style={[s.badgeText, { color: sc.text }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={s.projName} numberOfLines={2}>{item.name}</Text>
      <Text style={s.client} numberOfLines={1}>{item.client_name}</Text>
      <View style={s.cardBottom}>
        <View style={s.metaItem}>
          <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
          <Text style={s.metaText} numberOfLines={1}>{item.location || 'N/A'}</Text>
        </View>
        <View style={s.metaItem}>
          <Ionicons name="code-slash-outline" size={12} color={COLORS.textSecondary} />
          <Text style={s.metaText}>{item.code}</Text>
        </View>
      </View>
    </View>
  );
}

export default function ERPProjectListScreen({ navigation }) {
  const [projects,   setProjects]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(ERP_MASTER.projects, { headers });
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : (data.results || []));
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  const filtered = projects.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase()) ||
      p.client_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>ERP Projects</Text>
      </View>
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} />
          <TextInput
            style={s.searchInput}
            placeholder="Search project, client or code..."
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
          renderItem={({ item }) => <ProjectCard item={item} />}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.navy} />}
          ListEmptyComponent={
            <View style={s.center}>
              <MaterialCommunityIcons name="office-building-outline" size={48} color={COLORS.lightGray} />
              <Text style={s.emptyText}>No projects found</Text>
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
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  iconBg:      { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FDF4EC', justifyContent: 'center', alignItems: 'center' },
  projName:    { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  client:      { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  cardBottom:  { flexDirection: 'row', gap: 16 },
  metaItem:    { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  metaText:    { fontSize: 11, color: COLORS.textSecondary, flex: 1 },
  badge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText:   { fontSize: 11, fontWeight: '700' },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText:   { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
});
