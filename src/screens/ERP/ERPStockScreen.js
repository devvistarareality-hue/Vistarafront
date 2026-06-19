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
import { ERP_MASTER, ERP_INVENTORY } from '../../constants/api';

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function StockCard({ item }) {
  const qty    = parseFloat(item.balance_qty || 0);
  const isLow  = qty <= 0;
  return (
    <View style={[s.card, isLow && s.cardLow]}>
      <View style={s.cardLeft}>
        <View style={[s.iconBg, { backgroundColor: isLow ? '#FEE2E2' : '#E8F5E9' }]}>
          <MaterialCommunityIcons
            name="package-variant-closed"
            size={20}
            color={isLow ? '#DC2626' : '#2E7D32'}
          />
        </View>
      </View>
      <View style={s.cardBody}>
        <Text style={s.itemName} numberOfLines={1}>{item.item_name}</Text>
        <Text style={s.itemCode} numberOfLines={1}>{item.uom}</Text>
      </View>
      <View style={s.qtyBox}>
        <Text style={[s.qty, { color: isLow ? '#DC2626' : COLORS.textPrimary }]}>
          {qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(2)}
        </Text>
        <Text style={s.qtyUnit}>{item.uom}</Text>
      </View>
    </View>
  );
}

export default function ERPStockScreen({ navigation }) {
  const [projects,   setProjects]   = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [stock,      setStock]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');

  useFocusEffect(useCallback(() => { loadProjects(); }, []));

  async function loadProjects() {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(ERP_MASTER.projects, { headers });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.results || []);
        setProjects(list);
        if (list.length > 0) loadStock(list[0].id, list[0]);
        else setLoading(false);
      } else { setLoading(false); }
    } catch { setLoading(false); }
  }

  async function loadStock(projectId, proj, isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoadingStock(true);
    setSelected(proj || projects.find((p) => p.id === projectId));
    try {
      const headers = await authHeaders();
      const res = await fetch(ERP_INVENTORY.stockBalance(projectId), { headers });
      if (res.ok) {
        const data = await res.json();
        setStock(Array.isArray(data) ? data : []);
      }
    } catch {}
    setLoading(false);
    setLoadingStock(false);
    setRefreshing(false);
  }

  const filtered = stock.filter(
    (s) => s.item_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Stock Balance</Text>
          {selected && <Text style={s.headerSub} numberOfLines={1}>{selected.name}</Text>}
        </View>
      </View>

      {/* Project tabs */}
      {!loading && projects.length > 1 && (
        <FlatList
          data={projects}
          horizontal
          keyExtractor={(p) => String(p.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.tabs}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.tab, selected?.id === item.id && s.tabActive]}
              onPress={() => loadStock(item.id, item)}
            >
              <Text style={[s.tabText, selected?.id === item.id && s.tabTextActive]} numberOfLines={1}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      <View style={s.searchRow}>
        <View style={s.searchBox}>
          <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} />
          <TextInput
            style={s.searchInput}
            placeholder="Search material..."
            placeholderTextColor={COLORS.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {loading || loadingStock ? (
        <View style={s.center}><ActivityIndicator size="large" color={COLORS.navy} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => <StockCard item={item} />}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => selected && loadStock(selected.id, selected, true)}
              tintColor={COLORS.navy}
            />
          }
          ListEmptyComponent={
            <View style={s.center}>
              <MaterialCommunityIcons name="package-variant-closed" size={48} color={COLORS.lightGray} />
              <Text style={s.emptyText}>No stock data for this project</Text>
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
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },

  tabs:         { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tab:          { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.lightGray },
  tabActive:    { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  tabText:      { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive:{ color: '#fff' },

  searchRow:   { padding: 16, paddingTop: 0, paddingBottom: 8 },
  searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, gap: 8, ...CARD_SHADOW },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },

  list:        { padding: 16, paddingTop: 4, paddingBottom: 40 },
  card:        { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 14, marginBottom: 10, ...CARD_SHADOW },
  cardLow:     { borderLeftWidth: 3, borderLeftColor: '#DC2626' },
  cardLeft:    { marginRight: 12 },
  iconBg:      { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardBody:    { flex: 1 },
  itemName:    { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  itemCode:    { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  qtyBox:      { alignItems: 'flex-end' },
  qty:         { fontSize: 18, fontWeight: '800' },
  qtyUnit:     { fontSize: 10, color: COLORS.textSecondary, marginTop: 2 },

  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyText:   { marginTop: 12, fontSize: 14, color: COLORS.textSecondary },
});
