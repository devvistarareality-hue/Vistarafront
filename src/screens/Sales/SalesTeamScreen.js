import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SALES_ENDPOINTS } from '../../constants/api';

const NAVY = '#182350'; const BLUE = '#3D5AFE'; const BG = '#F5F6FA'; const TEXT = '#1A1A2E'; const MUTED = '#8492A6';
const CARD = { backgroundColor: '#fff', borderRadius: 14, shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 };

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

const DESIG_COLORS = {
  TELECALLER:         { bg: '#FFF8E1', text: '#F9A825' },
  STM:                { bg: '#E8EEFF', text: '#3D5AFE' },
  'MARKETING COORDINATOR': { bg: '#E0F7FA', text: '#0097A7' },
  CMO:                { bg: '#F3E5F5', text: '#7B1FA2' },
  'SALES CLUSTER HEAD': { bg: '#E8F5E9', text: '#2E7D32' },
  'CP CLUSTER HEAD':  { bg: '#FFF3E0', text: '#E65100' },
  'REGIONAL HEAD':    { bg: '#E8F5E9', text: '#1B5E20' },
};

function DesigBadge({ desig }) {
  const c = DESIG_COLORS[desig?.toUpperCase()] || { bg: '#F5F5F5', text: MUTED };
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, backgroundColor: c.bg }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: c.text }}>{desig || 'Member'}</Text>
    </View>
  );
}

function initials(name) { return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

export default function SalesTeamScreen({ navigation }) {
  const [members,    setMembers]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [fetchError, setFetchError] = useState('');

  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    setFetchError('');
    try {
      const headers = await authHeaders();
      const url = SALES_ENDPOINTS.usersSlim;
      const res = await fetch(url, { headers });
      if (res.ok) {
        const d = await res.json();
        const dataArray = Array.isArray(d) ? d : (d.results || []);
        setMembers(dataArray);
      } else {
        const t = await res.text();
        const msg = `${res.status} from ${url.replace(/https?:\/\/[^/]+/, '')}: ${t.slice(0, 200)}`;
        setFetchError(msg);
      }
    } catch (e) {
      setFetchError(e.message);
    }
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = search.trim()
    ? members.filter(m => [m.name, m.user_code, m.designation].join(' ').toLowerCase().includes(search.toLowerCase()))
    : members;

  // Designation counts
  const desigCounts = {};
  members.forEach(m => { if (m.designation) desigCounts[m.designation] = (desigCounts[m.designation] || 0) + 1; });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#182350" />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#182350', borderBottomWidth: 0 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="arrow-back" size={22} color="#fff" /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>Sales Team</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{members.length} team members</Text>
        </View>
        <TouchableOpacity onPress={() => load(true)} disabled={refreshing} style={{ padding: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 8 }}>
          <Ionicons name="refresh-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Designation counts */}
      {!loading && (
        <View style={{ backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F3FA' }}>
          <FlatList horizontal showsHorizontalScrollIndicator={false} data={Object.entries(desigCounts)}
            keyExtractor={([k]) => k}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
            renderItem={({ item: [desig, count] }) => {
              const c = DESIG_COLORS[desig?.toUpperCase()] || { bg: '#F5F5F5', text: MUTED };
              return (
                <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: c.bg }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: c.text }}>{desig.toUpperCase()}: {count}</Text>
                </View>
              );
            }} />
        </View>
      )}

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F3FA' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
          <Ionicons name="search-outline" size={16} color={MUTED} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search by name, user code, designation…" style={{ flex: 1, fontSize: 14, color: TEXT }} />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={MUTED} /></TouchableOpacity> : null}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={NAVY} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={m => String(m.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}
          renderItem={({ item: m }) => (
            <View style={[CARD, { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 10 }]}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{initials(m.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT }}>{m.name}</Text>
                  <DesigBadge desig={m.designation} />
                </View>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                  <Text style={{ fontSize: 12, color: MUTED }}>{m.user_code}</Text>
                  {m.role ? <Text style={{ fontSize: 12, color: MUTED }}>· {m.role}</Text> : null}
                </View>
                {m.email ? <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{m.email}</Text> : null}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 20 }}>
              <Ionicons name="people-outline" size={48} color="#DDE3F0" />
              <Text style={{ fontSize: 15, fontWeight: '700', color: MUTED, marginTop: 12 }}>No team members found</Text>
              {fetchError ? <Text style={{ fontSize: 11, color: '#EF4444', marginTop: 8, textAlign: 'center' }}>{fetchError}</Text> : null}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
