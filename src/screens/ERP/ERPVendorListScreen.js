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

const AVATAR_COLORS = ['#182350', '#0097A7', '#3D5AFE', '#2E7D32', '#E65100', '#6A1B9A', '#F9A825'];
function avatarColor(name = '') { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] || '#182350'; }

function VendorCard({ item }) {
  const color = avatarColor(item.name);
  return (
    <View style={s.card}>
      <View style={[s.avatar, { backgroundColor: color }]}>
        <Text style={s.avatarText}>{(item.name || 'V')[0].toUpperCase()}</Text>
      </View>
      <View style={s.body}>
        <Text style={s.name} numberOfLines={1}>{item.name}</Text>
        <Text style={s.code}>{item.code}</Text>
        {item.phone ? (
          <View style={s.row}>
            <Ionicons name="call-outline" size={11} color={COLORS.textSecondary} />
            <Text style={s.meta}>{item.phone}</Text>
          </View>
        ) : null}
      </View>
      <View style={[s.statusDot, { backgroundColor: item.is_active ? '#2E7D32' : '#9CA3AF' }]} />
    </View>
  );
}

export default function ERPVendorListScreen({ navigation }) {
  const [vendors,    setVendors]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(ERP_MASTER.vendors, { headers });
      if (res.ok) {
        const data = await res.json();
        setVendors(Array.isArray(data) ? data : (data.results || []));
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  const filtered = vendors.filter(
    (v) =>
      v.name?.toLowerCase().includes(search.toLowerCase()) ||
      v.code?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Vendors</Text>
      </View>
      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} />
          <TextInput
            style={s.searchInput}
            placeholder="Search vendor..."
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
          renderItem={({ item }) => <VendorCard item={item} />}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.navy} />}
          ListEmptyComponent={
            <View style={s.center}>
              <MaterialCommunityIcons name="account-hard-hat-outline" size={48} color={COLORS.lightGray} />
              <Text style={s.emptyText}>No vendors found</Text>
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
  card:        { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 14, marginBottom: 10, ...CARD_SHADOW },
  avatar:      { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText:  { fontSize: 18, fontWeight: '800', color: '#fff' },
  body:        { flex: 1 },
  name:        { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  code:        { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  meta:        { fontSize: 11, color: COLORS.textSecondary },
  statusDot:   { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText:   { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
});
