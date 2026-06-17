import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, StatusBar, Switch, RefreshControl } from 'react-native';
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

export default function SalesDistributionScreen({ navigation }) {
  const [settings,      setSettings]      = useState(null);
  const [availability,  setAvailability]  = useState([]);
  const [weights,       setWeights]       = useState([]);
  const [distLog,       setDistLog]       = useState([]);
  const [stats,         setStats]         = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [distributing,  setDistributing]  = useState('');
  const [savingSettings,setSavingSettings]= useState(false);
  const [refreshing,    setRefreshing]    = useState(false);
  const [localSettings, setLocalSettings] = useState({});
  const [localWeights,  setLocalWeights]  = useState({});

  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const headers = await authHeaders();
      const [sRes, aRes, wRes, lRes, stRes] = await Promise.all([
        fetch(SALES_ENDPOINTS.distSettings,  { headers }),
        fetch(SALES_ENDPOINTS.availability,  { headers }),
        fetch(SALES_ENDPOINTS.distWeight,    { headers }),
        fetch(SALES_ENDPOINTS.distLog,       { headers }),
        fetch(SALES_ENDPOINTS.stats,         { headers }),
      ]);
      if (sRes.ok)  { const d = await sRes.json();  setSettings(d);        setLocalSettings(d); }
      if (aRes.ok)  { const d = await aRes.json();  setAvailability(Array.isArray(d) ? d : (d.results || [])); }
      if (wRes.ok)  { const d = await wRes.json();  setWeights(Array.isArray(d) ? d : (d.results || []));
                      const wMap = {}; (Array.isArray(d) ? d : []).forEach(w => { wMap[w.user_id] = String(w.weight || 1); }); setLocalWeights(wMap); }
      if (lRes.ok)  { const d = await lRes.json();  setDistLog(Array.isArray(d) ? d : (d.results || [])); }
      if (stRes.ok) setStats(await stRes.json());
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleAvailability(userId) {
    const current = availability.find(a => String(a.user_id) === String(userId));
    const newVal  = !(current?.is_available);
    const headers = await authHeaders();
    const res = await fetch(SALES_ENDPOINTS.availability, {
      method: 'POST', headers, body: JSON.stringify({ user_id: userId, is_available: newVal }),
    });
    if (res.ok) setAvailability(prev => prev.map(a => String(a.user_id) === String(userId) ? { ...a, is_available: newVal } : a));
  }

  async function saveSettings() {
    setSavingSettings(true);
    const headers = await authHeaders();
    await fetch(SALES_ENDPOINTS.distSettings, { method: 'PUT', headers, body: JSON.stringify(localSettings) });
    setSavingSettings(false);
    Alert.alert('Saved', 'Distribution settings updated.');
  }

  async function saveWeights() {
    const headers = await authHeaders();
    const payload = Object.entries(localWeights).map(([user_id, weight]) => ({ user_id: parseInt(user_id), weight: parseInt(weight) || 1 }));
    await fetch(SALES_ENDPOINTS.distWeight, { method: 'PATCH', headers, body: JSON.stringify(payload) });
    Alert.alert('Saved', 'Distribution weights updated.');
  }

  async function triggerDist(type) {
    setDistributing(type);
    try {
      const headers = await authHeaders();
      const res = await fetch(SALES_ENDPOINTS.distribute, { method: 'POST', headers, body: JSON.stringify({ dist_type: type }) });
      if (res.ok) {
        const d = await res.json();
        Alert.alert('Distribution Complete', d.message || `${d.distributed || 0} leads distributed.`);
        load(true);
      } else {
        const e = await res.json();
        Alert.alert('Failed', e.detail || e.message || 'Distribution failed.');
      }
    } catch (e) { Alert.alert('Error', e.message); }
    setDistributing('');
  }

  async function clearLog() {
    Alert.alert('Clear history?', 'This will delete all distribution logs.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        const headers = await authHeaders();
        await fetch(SALES_ENDPOINTS.distLog, { method: 'DELETE', headers });
        setDistLog([]);
      }},
    ]);
  }

  const tcAvailable  = availability.filter(a => a.dist_type === 'telecaller' && a.is_available).length;
  const stmAvailable = availability.filter(a => a.dist_type === 'stm'        && a.is_available).length;
  const tcTotal      = availability.filter(a => a.dist_type === 'telecaller').length;
  const stmTotal     = availability.filter(a => a.dist_type === 'stm').length;

  const setLS = (k, v) => setLocalSettings(s => ({ ...s, [k]: v }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F3FA' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}><Ionicons name="arrow-back" size={22} color={TEXT} /></TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: TEXT }}>Distribution</Text>
        <TouchableOpacity onPress={() => load(true)} disabled={refreshing} style={{ padding: 6 }}>
          <Ionicons name="refresh-outline" size={20} color={refreshing ? MUTED : BLUE} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={NAVY} /></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}>

          {/* Trigger Distribution */}
          <View style={[CARD, { padding: 16, marginBottom: 16 }]}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: TEXT, marginBottom: 4 }}>Trigger Distribution</Text>
            <Text style={{ fontSize: 12, color: MUTED, marginBottom: 14 }}>
              Unassigned leads: <Text style={{ fontWeight: '700', color: BLUE }}>{stats?.unassigned ?? '—'}</Text>
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => triggerDist('telecaller')} disabled={!!distributing}
                style={{ flex: 1, paddingVertical: 12, backgroundColor: NAVY, borderRadius: 12, alignItems: 'center', opacity: distributing === 'telecaller' ? 0.6 : 1 }}>
                {distributing === 'telecaller' ? <ActivityIndicator color="#fff" size="small" /> :
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Telecallers ({tcAvailable}/{tcTotal})</Text>}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => triggerDist('stm')} disabled={!!distributing}
                style={{ flex: 1, paddingVertical: 12, backgroundColor: BLUE, borderRadius: 12, alignItems: 'center', opacity: distributing === 'stm' ? 0.6 : 1 }}>
                {distributing === 'stm' ? <ActivityIndicator color="#fff" size="small" /> :
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>STMs ({stmAvailable}/{stmTotal})</Text>}
              </TouchableOpacity>
            </View>
          </View>

          {/* Availability */}
          {availability.length > 0 && (
            <View style={[CARD, { padding: 16, marginBottom: 16 }]}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: TEXT, marginBottom: 12 }}>Today's Availability</Text>
              {availability.map(a => (
                <View key={a.user_id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F3FA' }}>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: TEXT }}>{a.name}</Text>
                    <Text style={{ fontSize: 11, color: MUTED }}>{a.dist_type?.toUpperCase()}</Text>
                  </View>
                  <Switch value={!!a.is_available} onValueChange={() => toggleAvailability(a.user_id)} trackColor={{ false: '#E0E6F0', true: '#2E7D32' }} />
                </View>
              ))}
            </View>
          )}

          {/* Distribution weights */}
          {weights.length > 0 && (
            <View style={[CARD, { padding: 16, marginBottom: 16 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: TEXT }}>Lead Distribution Ratio</Text>
                <TouchableOpacity onPress={saveWeights}
                  style={{ paddingHorizontal: 14, paddingVertical: 7, backgroundColor: NAVY, borderRadius: 8 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Save</Text>
                </TouchableOpacity>
              </View>
              {weights.map(w => (
                <View key={w.user_id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F3FA' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: TEXT }}>{w.name}</Text>
                    <Text style={{ fontSize: 11, color: MUTED }}>{w.dist_type?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity onPress={() => setLocalWeights(lw => ({ ...lw, [w.user_id]: String(Math.max(1, parseInt(lw[w.user_id] || 1) - 1)) }))}
                      style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: '#F0F3FA', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 18, color: TEXT, lineHeight: 22 }}>−</Text>
                    </TouchableOpacity>
                    <TextInput value={localWeights[w.user_id] || '1'} onChangeText={v => setLocalWeights(lw => ({ ...lw, [w.user_id]: v }))} keyboardType="numeric"
                      style={{ width: 40, textAlign: 'center', borderWidth: 1.5, borderColor: '#E0E6F0', borderRadius: 8, paddingVertical: 5, fontSize: 14, fontWeight: '700', color: TEXT }} />
                    <TouchableOpacity onPress={() => setLocalWeights(lw => ({ ...lw, [w.user_id]: String(parseInt(lw[w.user_id] || 1) + 1) }))}
                      style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 18, color: '#fff', lineHeight: 22 }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Distribution settings */}
          {localSettings && (
            <View style={[CARD, { padding: 16, marginBottom: 16 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: TEXT }}>Distribution Settings</Text>
                <TouchableOpacity onPress={saveSettings} disabled={savingSettings}
                  style={{ paddingHorizontal: 14, paddingVertical: 7, backgroundColor: NAVY, borderRadius: 8, opacity: savingSettings ? 0.6 : 1 }}>
                  {savingSettings ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Save</Text>}
                </TouchableOpacity>
              </View>
              {[
                { label: 'TC Sign-in',   key: 'tc_signin_time' },
                { label: 'TC Sign-out',  key: 'tc_signout_time' },
                { label: 'STM Sign-in',  key: 'stm_signin_time' },
                { label: 'STM Sign-out', key: 'stm_signout_time' },
              ].map(f => (
                <View key={f.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F3FA' }}>
                  <Text style={{ fontSize: 13, color: TEXT, fontWeight: '600' }}>{f.label}</Text>
                  <TextInput value={localSettings[f.key] || ''} onChangeText={v => setLS(f.key, v)} placeholder="HH:MM"
                    style={{ borderWidth: 1.5, borderColor: '#E0E6F0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, fontSize: 13, width: 90, textAlign: 'center', color: TEXT }} />
                </View>
              ))}
            </View>
          )}

          {/* Distribution log */}
          {distLog.length > 0 && (
            <View style={[CARD, { marginBottom: 16, overflow: 'hidden' }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F0F3FA', backgroundColor: '#FAFBFF' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: TEXT }}>Distribution History</Text>
                <TouchableOpacity onPress={clearLog}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>Clear</Text>
                </TouchableOpacity>
              </View>
              {distLog.slice(0, 10).map((log, i) => (
                <View key={log.id || i} style={{ padding: 14, borderBottomWidth: i < Math.min(distLog.length, 10) - 1 ? 1 : 0, borderBottomColor: '#F0F3FA' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT }}>{log.dist_type?.toUpperCase()}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#2E7D32' }}>{log.leads_distributed} leads</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>
                    By {log.triggered_by_name || '—'} · {log.created_at ? new Date(log.created_at).toLocaleDateString('en-IN') : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      )}
    </SafeAreaView>
  );
}
