import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SALES_ENDPOINTS } from '../../constants/api';

const NAVY = '#182350'; const BLUE = '#3D5AFE'; const BG = '#F5F6FA'; const TEXT = '#1A1A2E'; const MUTED = '#8492A6';

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

const PRESETS = ['Meta', 'Google', 'Referral', 'Walk-in', 'IVR', 'Portal', 'Other'];

const SOURCE_COLORS = ['#3D5AFE','#2E7D32','#E65100','#0097A7','#7B1FA2','#F9A825','#EF4444','#00796B','#1565C0'];

export default function SalesSourcesScreen({ navigation }) {
  const [sources,    setSources]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newName,    setNewName]    = useState('');
  const [adding,     setAdding]     = useState(false);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(SALES_ENDPOINTS.sources, { headers });
      if (res.ok) { const d = await res.json(); setSources(Array.isArray(d) ? d : (d.results || [])); }
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  async function addSource(name) {
    const n = name.trim();
    if (!n) return;
    if (sources.find(s => s.name.toLowerCase() === n.toLowerCase())) { Alert.alert('Already exists', `"${n}" source already added.`); return; }
    setAdding(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(SALES_ENDPOINTS.sources, { method: 'POST', headers, body: JSON.stringify({ name: n }) });
      if (res.ok) { const d = await res.json(); setSources(prev => [...prev, d]); setNewName(''); }
    } catch (_) {}
    setAdding(false);
  }

  async function deleteSource(id) {
    Alert.alert('Delete source?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const headers = await authHeaders();
        const res = await fetch(SALES_ENDPOINTS.source(id), { method: 'DELETE', headers });
        if (res.ok || res.status === 204) setSources(prev => prev.filter(s => s.id !== id));
      }},
    ]);
  }

  const existingNames = new Set(sources.map(s => s.name.toLowerCase()));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F3FA' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}><Ionicons name="arrow-back" size={22} color={TEXT} /></TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: TEXT }}>Lead Sources</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: BLUE }}>{sources.length} sources</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}>

        {/* Custom add */}
        <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 12 }}>Add Custom Source</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TextInput value={newName} onChangeText={setNewName} placeholder="e.g. Newspaper, Events…"
              style={{ flex: 1, borderWidth: 1.5, borderColor: '#E0E6F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: TEXT, backgroundColor: BG }}
              onSubmitEditing={() => addSource(newName)} returnKeyType="done" />
            <TouchableOpacity onPress={() => addSource(newName)} disabled={adding || !newName.trim()}
              style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: NAVY, borderRadius: 10, justifyContent: 'center', opacity: !newName.trim() ? 0.5 : 1 }}>
              {adding ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="add" size={20} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick-add presets */}
        <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT, marginBottom: 12 }}>Quick Add Presets</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PRESETS.map(name => {
              const exists = existingNames.has(name.toLowerCase());
              return (
                <TouchableOpacity key={name} onPress={() => !exists && addSource(name)} disabled={exists}
                  style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: exists ? '#F0F3FA' : NAVY, borderWidth: 1.5, borderColor: exists ? '#E0E6F0' : NAVY, opacity: exists ? 0.5 : 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: exists ? MUTED : '#fff' }}>
                    {exists ? '✓ ' : '+ '}{name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Active sources */}
        <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 10 }}>Active Sources ({sources.length})</Text>
        {loading ? <ActivityIndicator color={NAVY} /> : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {sources.map((s, i) => (
              <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingLeft: 14, paddingRight: 10, borderRadius: 30,
                backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] + '18', borderWidth: 1.5, borderColor: SOURCE_COLORS[i % SOURCE_COLORS.length] + '55' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: SOURCE_COLORS[i % SOURCE_COLORS.length] }}>{s.name}</Text>
                <TouchableOpacity onPress={() => deleteSource(s.id)} style={{ padding: 2 }}>
                  <Ionicons name="close" size={14} color={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                </TouchableOpacity>
              </View>
            ))}
            {sources.length === 0 && <Text style={{ color: MUTED, fontSize: 14 }}>No sources yet. Add one above.</Text>}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
