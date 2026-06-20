import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, StatusBar, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../../utils/apiFetch';
import { useSelector } from 'react-redux';
import { SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const NAVY = COLORS.navy; const BLUE = COLORS.link; const BG = COLORS.screenBg; const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, ...CARD_SHADOW, marginBottom: 16 };

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function currentIST() {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return `${String(ist.getUTCHours()).padStart(2, '0')}:${String(ist.getUTCMinutes()).padStart(2, '0')}`;
}

function WeightBar({ pct, color }) {
  return (
    <View style={{ width: 52, height: 6, backgroundColor: color + '30', borderRadius: 4, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 4 }} />
    </View>
  );
}

function SectionLabel({ children, color }) {
  return (
    <Text style={{ fontSize: 12, fontWeight: '700', color: color || MUTED, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      {children}
    </Text>
  );
}

export default function SalesDistributionScreen({ navigation }) {
  const [settings,       setSettings]       = useState({ tc_signin_time: '10:20', tc_signout_time: '22:00', stm_signin_time: '10:20', stm_signout_time: '22:00' });
  const [settingsForm,   setSettingsForm]   = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [availability,   setAvailability]   = useState([]);
  const [allUsers,       setAllUsers]       = useState([]);
  const [weights,        setWeights]        = useState({});
  const [savedWeights,   setSavedWeights]   = useState({});
  const [savingWeights,  setSavingWeights]  = useState(false);
  const [distLog,        setDistLog]        = useState([]);
  const [stats,          setStats]          = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [distributing,   setDistributing]   = useState('');
  const [refreshing,     setRefreshing]     = useState(false);
  const companyId = useSelector((s) => s.adminFilter?.companyId);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const statsUrl = companyId ? `${SALES_ENDPOINTS.stats}?company_id=${companyId}` : SALES_ENDPOINTS.stats;
      const logUrl   = companyId ? `${SALES_ENDPOINTS.distLog}?company_id=${companyId}` : SALES_ENDPOINTS.distLog;
      const [sRes, aRes, wRes, lRes, stRes] = await Promise.all([
        apiFetch(SALES_ENDPOINTS.distSettings),
        apiFetch(SALES_ENDPOINTS.availability),
        apiFetch(SALES_ENDPOINTS.distWeight),
        apiFetch(logUrl),
        apiFetch(statsUrl),
      ]);
      if (sRes.ok)  { const d = await sRes.json(); if (!d.detail) setSettings(d); }
      if (aRes.ok)  { const d = await aRes.json(); setAvailability(Array.isArray(d) ? d : (d.results || [])); }
      if (wRes.ok)  {
        const d = await wRes.json();
        const arr = Array.isArray(d) ? d : (d.results || []);
        setAllUsers(arr);
        const wMap = {};
        arr.forEach(u => { wMap[u.user_id] = u.weight ?? 1; });
        setWeights(wMap);
        setSavedWeights(wMap);
      }
      if (lRes.ok)  { const d = await lRes.json(); setDistLog(Array.isArray(d) ? d : (d.results || [])); }
      if (stRes.ok) setStats(await stRes.json());
    } catch (_) {}
    setLoading(false);
    setRefreshing(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const now             = currentIST();
  const tcWindowOpen    = now >= settings.tc_signin_time  && now < settings.tc_signout_time;
  const stmWindowOpen   = now >= settings.stm_signin_time && now < settings.stm_signout_time;
  const tcAfterSignout  = now >= settings.tc_signout_time;
  const stmAfterSignout = now >= settings.stm_signout_time;

  const allTc    = availability.filter(a => (a.dist_type || a.role || '').toLowerCase() === 'telecaller');
  const allStm   = availability.filter(a => (a.dist_type || a.role || '').toLowerCase() === 'stm');
  const tcAvail  = allTc.filter(a => a.is_available);
  const stmAvail = allStm.filter(a => a.is_available);

  const tcUsers  = allUsers.filter(u => (u.dist_type || u.role || '').toLowerCase() === 'telecaller');
  const stmUsers = allUsers.filter(u => (u.dist_type || u.role || '').toLowerCase() === 'stm');
  const weightsChanged = Object.keys(weights).some(id => weights[id] !== savedWeights[id]);

  async function toggleAvailability(userId, current) {
    const res = await apiFetch(SALES_ENDPOINTS.availability, {
      method: 'POST', body: JSON.stringify({ user_id: userId, is_available: !current }),
    });
    if (res.ok) setAvailability(prev => prev.map(a => String(a.user_id) === String(userId) ? { ...a, is_available: !current } : a));
  }

  async function saveSettings() {
    setSavingSettings(true);
    await apiFetch(SALES_ENDPOINTS.distSettings, { method: 'PUT', body: JSON.stringify(settingsForm) });
    setSettings(settingsForm);
    setSettingsForm(null);
    setSavingSettings(false);
    Alert.alert('Saved', 'Distribution settings updated.');
  }

  async function saveWeights() {
    setSavingWeights(true);
    const updates = Object.entries(weights).map(([user_id, weight]) => ({ user_id: parseInt(user_id), weight: parseInt(weight) || 1 }));
    const res = await apiFetch(SALES_ENDPOINTS.distWeight, { method: 'PATCH', body: JSON.stringify({ updates }) });
    if (res.ok) setSavedWeights({ ...weights });
    setSavingWeights(false);
    Alert.alert('Saved', 'Distribution weights updated.');
  }

  async function triggerDist(type) {
    setDistributing(type);
    try {
      const res = await apiFetch(SALES_ENDPOINTS.distribute, { method: 'POST', body: JSON.stringify({ dist_type: type }) });
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
        await apiFetch(SALES_ENDPOINTS.distLog, { method: 'DELETE' });
        setDistLog([]);
      }},
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={22} color={NAVY} />
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 21, fontWeight: '800', color: TEXT }}>Lead Distribution</Text>
        <TouchableOpacity onPress={() => load(true)} disabled={refreshing} style={{ padding: 6, backgroundColor: BG, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
          <Ionicons name="refresh-outline" size={22} color={NAVY} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={NAVY} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}
        >

          {/* ═══ 1. Distribution Settings ═══ */}
          <View style={CARD}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, paddingBottom: 12 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: TEXT }}>⚙ Distribution Settings</Text>
              {settingsForm === null && (
                <TouchableOpacity onPress={() => setSettingsForm({ ...settings })}
                  style={{ paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: TEXT }}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {settingsForm ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                {[
                  { label: 'TC Sign-in',   key: 'tc_signin_time' },
                  { label: 'TC Sign-out',  key: 'tc_signout_time' },
                  { label: 'STM Sign-in',  key: 'stm_signin_time' },
                  { label: 'STM Sign-out', key: 'stm_signout_time' },
                ].map(f => (
                  <View key={f.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: TEXT }}>{f.label}</Text>
                    <TextInput
                      value={settingsForm[f.key] || ''} placeholder="HH:MM"
                      onChangeText={v => setSettingsForm(s => ({ ...s, [f.key]: v }))}
                      style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, fontSize: 15, width: 100, textAlign: 'center', color: TEXT }}
                    />
                  </View>
                ))}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <TouchableOpacity onPress={saveSettings} disabled={savingSettings}
                    style={{ flex: 1, paddingVertical: 12, backgroundColor: NAVY, borderRadius: 9, alignItems: 'center', opacity: savingSettings ? 0.6 : 1 }}>
                    {savingSettings
                      ? <ActivityIndicator color={COLORS.white} size="small" />
                      : <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 15 }}>Save Settings</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setSettingsForm(null)}
                    style={{ flex: 1, paddingVertical: 12, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 9, alignItems: 'center' }}>
                    <Text style={{ fontWeight: '600', fontSize: 15, color: TEXT }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 16 }}>
                {[
                  { role: 'TELECALLER', signin: settings.tc_signin_time, signout: settings.tc_signout_time },
                  { role: 'STM',        signin: settings.stm_signin_time, signout: settings.stm_signout_time },
                ].map(({ role, signin, signout }) => (
                  <View key={role} style={{ flex: 1, backgroundColor: COLORS.surfaceAlt, borderRadius: 10, padding: 13 }}>
                    <SectionLabel>{role}</SectionLabel>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 9, marginBottom: 6 }}>
                      <Text style={{ fontSize: 13, color: MUTED }}>Sign-in</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT }}>{signin}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: MUTED }}>Sign-out</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT }}>{signout}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ═══ 2. Today's Availability ═══ */}
          <View style={CARD}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: TEXT, padding: 16, paddingBottom: 12 }}>👥 Today's Availability</Text>
            <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 16, gap: 14 }}>

              <View style={{ flex: 1 }}>
                <SectionLabel>Telecallers · {tcAvail.length}/{allTc.length} avail</SectionLabel>
                <View style={{ marginTop: 10 }}>
                  {allTc.length === 0
                    ? <Text style={{ fontSize: 14, color: MUTED }}>No telecallers</Text>
                    : allTc.map(a => (
                      <TouchableOpacity key={a.user_id} onPress={() => toggleAvailability(a.user_id, a.is_available)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                        <Text style={{ fontSize: 18, color: a.is_available ? COLORS.successAlt : COLORS.divider, fontWeight: '800', width: 20 }}>
                          {a.is_available ? '✓' : '✗'}
                        </Text>
                        <Text style={{ fontSize: 15, color: a.is_available ? TEXT : MUTED }} numberOfLines={1}>{a.name}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>

              <View style={{ width: 1, backgroundColor: COLORS.surfaceAlt }} />

              <View style={{ flex: 1 }}>
                <SectionLabel>STMs · {stmAvail.length}/{allStm.length} avail</SectionLabel>
                <View style={{ marginTop: 10 }}>
                  {allStm.length === 0
                    ? <Text style={{ fontSize: 14, color: MUTED }}>No STMs</Text>
                    : allStm.map(a => (
                      <TouchableOpacity key={a.user_id} onPress={() => toggleAvailability(a.user_id, a.is_available)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
                        <Text style={{ fontSize: 18, color: a.is_available ? COLORS.successAlt : COLORS.divider, fontWeight: '800', width: 20 }}>
                          {a.is_available ? '✓' : '✗'}
                        </Text>
                        <Text style={{ fontSize: 15, color: a.is_available ? TEXT : MUTED }} numberOfLines={1}>{a.name}</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>
            </View>
          </View>

          {/* ═══ 3. Lead Distribution Ratio ═══ */}
          {allUsers.length > 0 && (
            <View style={CARD}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: 16, paddingBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 17, fontWeight: '700', color: TEXT }}>📊 Lead Distribution Ratio</Text>
                  <Text style={{ fontSize: 13, color: MUTED, marginTop: 3 }}>Higher weight = more leads assigned</Text>
                </View>
                <TouchableOpacity onPress={saveWeights} disabled={savingWeights || !weightsChanged}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: NAVY, borderRadius: 8, opacity: (!weightsChanged || savingWeights) ? 0.4 : 1 }}>
                  {savingWeights
                    ? <ActivityIndicator size="small" color={COLORS.white} />
                    : <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 14 }}>Save Weights</Text>}
                </TouchableOpacity>
              </View>

              {/* Telecallers panel */}
              {tcUsers.length > 0 && (() => {
                const total = tcUsers.reduce((s, u) => s + (weights[u.user_id] ?? 1), 0);
                return (
                  <View style={{ marginHorizontal: 16, marginBottom: 10, borderWidth: 1.5, borderColor: COLORS.divider, borderRadius: 12, padding: 14, backgroundColor: COLORS.screenBg }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.successAlt }} />
                      <SectionLabel color={COLORS.success}>Telecallers</SectionLabel>
                    </View>
                    {tcUsers.map(u => {
                      const w   = weights[u.user_id] ?? 1;
                      const pct = total > 0 ? Math.round((w / total) * 100) : 0;
                      return (
                        <View key={u.user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: COLORS.white, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.divider, marginBottom: 7 }}>
                          <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: TEXT }} numberOfLines={1}>{u.name}</Text>
                          <WeightBar pct={pct} color={COLORS.successAlt} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.success, width: 36, textAlign: 'right' }}>{pct}%</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.divider, borderRadius: 7, overflow: 'hidden', marginLeft: 2 }}>
                            <TouchableOpacity onPress={() => setWeights(prev => ({ ...prev, [u.user_id]: Math.max(1, (prev[u.user_id] ?? 1) - 1) }))}
                              style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.successBg }}>
                              <Text style={{ color: COLORS.success, fontWeight: '700', fontSize: 17, lineHeight: 20 }}>−</Text>
                            </TouchableOpacity>
                            <Text style={{ paddingHorizontal: 10, fontSize: 15, fontWeight: '700', color: TEXT }}>{w}</Text>
                            <TouchableOpacity onPress={() => setWeights(prev => ({ ...prev, [u.user_id]: (prev[u.user_id] ?? 1) + 1 }))}
                              style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.successBg }}>
                              <Text style={{ color: COLORS.success, fontWeight: '700', fontSize: 17, lineHeight: 20 }}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                    <Text style={{ fontSize: 13, color: COLORS.success, fontWeight: '600', marginTop: 5 }}>
                      Ratio: {tcUsers.map(u => weights[u.user_id] ?? 1).join(' : ')}
                    </Text>
                  </View>
                );
              })()}

              {/* STMs panel */}
              {stmUsers.length > 0 && (() => {
                const total = stmUsers.reduce((s, u) => s + (weights[u.user_id] ?? 1), 0);
                return (
                  <View style={{ marginHorizontal: 16, marginBottom: 16, borderWidth: 1.5, borderColor: COLORS.powderBlue, borderRadius: 12, padding: 14, backgroundColor: COLORS.screenBg }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.link }} />
                      <SectionLabel color={COLORS.linkPressed}>STMs</SectionLabel>
                    </View>
                    {stmUsers.map(u => {
                      const w   = weights[u.user_id] ?? 1;
                      const pct = total > 0 ? Math.round((w / total) * 100) : 0;
                      return (
                        <View key={u.user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: COLORS.white, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.powderBlue, marginBottom: 7 }}>
                          <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: TEXT }} numberOfLines={1}>{u.name}</Text>
                          <WeightBar pct={pct} color={COLORS.link} />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.linkPressed, width: 36, textAlign: 'right' }}>{pct}%</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: COLORS.powderBlue, borderRadius: 7, overflow: 'hidden', marginLeft: 2 }}>
                            <TouchableOpacity onPress={() => setWeights(prev => ({ ...prev, [u.user_id]: Math.max(1, (prev[u.user_id] ?? 1) - 1) }))}
                              style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.linkBg }}>
                              <Text style={{ color: COLORS.linkPressed, fontWeight: '700', fontSize: 17, lineHeight: 20 }}>−</Text>
                            </TouchableOpacity>
                            <Text style={{ paddingHorizontal: 10, fontSize: 15, fontWeight: '700', color: TEXT }}>{w}</Text>
                            <TouchableOpacity onPress={() => setWeights(prev => ({ ...prev, [u.user_id]: (prev[u.user_id] ?? 1) + 1 }))}
                              style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.linkBg }}>
                              <Text style={{ color: COLORS.linkPressed, fontWeight: '700', fontSize: 17, lineHeight: 20 }}>+</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                    <Text style={{ fontSize: 13, color: COLORS.linkPressed, fontWeight: '600', marginTop: 5 }}>
                      Ratio: {stmUsers.map(u => weights[u.user_id] ?? 1).join(' : ')}
                    </Text>
                  </View>
                );
              })()}
            </View>
          )}

          {/* ═══ 4 & 5. Distribution Action Cards ═══ */}
          {[
            {
              type: 'telecaller', label: 'Telecaller Distribution',
              unassigned: stats?.unassigned ?? 0, avail: tcAvail.length,
              windowOpen: tcWindowOpen, afterSignout: tcAfterSignout,
              signin: settings.tc_signin_time, signout: settings.tc_signout_time,
              borderOpen: COLORS.divider, bgOpen: COLORS.screenBg,
              borderClose: COLORS.errorBg, bgClose: COLORS.screenBg,
              badgeOpenBg: COLORS.successBg, badgeOpenColor: COLORS.success,
              badgeCloseBg: COLORS.errorBg, badgeCloseColor: COLORS.errorStrong,
              badgeWaitBg: COLORS.screenBg, badgeWaitColor: COLORS.navyMedium,
            },
            {
              type: 'stm', label: 'STM Distribution',
              unassigned: stats?.sv_done ?? 0, avail: stmAvail.length,
              windowOpen: stmWindowOpen, afterSignout: stmAfterSignout,
              signin: settings.stm_signin_time, signout: settings.stm_signout_time,
              borderOpen: COLORS.powderBlue, bgOpen: COLORS.screenBg,
              borderClose: COLORS.errorBg, bgClose: COLORS.screenBg,
              badgeOpenBg: COLORS.linkBg, badgeOpenColor: COLORS.linkPressed,
              badgeCloseBg: COLORS.errorBg, badgeCloseColor: COLORS.errorStrong,
              badgeWaitBg: COLORS.screenBg, badgeWaitColor: COLORS.navyMedium,
            },
          ].map(({ type, label, unassigned, avail, windowOpen, afterSignout, signin, signout,
                   borderOpen, bgOpen, borderClose, bgClose,
                   badgeOpenBg, badgeOpenColor, badgeCloseBg, badgeCloseColor, badgeWaitBg, badgeWaitColor }) => {
            const badgeBg    = windowOpen ? badgeOpenBg    : afterSignout ? badgeCloseBg    : badgeWaitBg;
            const badgeColor = windowOpen ? badgeOpenColor : afterSignout ? badgeCloseColor : badgeWaitColor;
            const borderClr  = windowOpen ? borderOpen     : afterSignout ? borderClose     : COLORS.border;
            const bgClr      = windowOpen ? bgOpen         : afterSignout ? bgClose         : COLORS.white;
            const disabled   = !!distributing || afterSignout || avail === 0;
            return (
              <View key={type} style={[CARD, { borderWidth: 2, borderColor: borderClr, backgroundColor: bgClr }]}>
                <View style={{ padding: 16 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={{ fontWeight: '700', fontSize: 17, color: TEXT, marginBottom: 4 }}>{label}</Text>
                      <Text style={{ fontSize: 14, color: MUTED }}>
                        {unassigned} unassigned leads · {avail} {type === 'telecaller' ? 'TC' : 'STM'}s signed in
                      </Text>
                    </View>
                    <View style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, backgroundColor: badgeBg }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: badgeColor }}>
                        {windowOpen ? 'Window open' : afterSignout ? 'Window closed' : `Opens ${signin}`}
                      </Text>
                    </View>
                  </View>

                  {afterSignout && (
                    <Text style={{ fontSize: 13, color: COLORS.errorStrong, marginBottom: 12 }}>
                      Sign-out ({signout}) has passed. Leads remain unassigned until tomorrow.
                    </Text>
                  )}

                  <TouchableOpacity onPress={() => triggerDist(type)} disabled={disabled}
                    style={{ paddingVertical: 14, backgroundColor: NAVY, borderRadius: 10, alignItems: 'center', opacity: disabled ? 0.45 : 1 }}>
                    {distributing === type
                      ? <ActivityIndicator color={COLORS.white} size="small" />
                      : <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 15 }}>
                          ⚡ Distribute to {type === 'telecaller' ? 'Telecallers' : 'STMs'}
                        </Text>}
                  </TouchableOpacity>

                  {avail === 0 && !afterSignout && (
                    <Text style={{ fontSize: 13, color: MUTED, textAlign: 'center', marginTop: 7 }}>
                      No {type === 'telecaller' ? 'telecallers' : 'STMs'} have signed in today
                    </Text>
                  )}
                </View>
              </View>
            );
          })}

          {/* ═══ 6. Distribution History ═══ */}
          <View style={CARD}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt, backgroundColor: COLORS.white, borderTopLeftRadius: 14, borderTopRightRadius: 14 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: TEXT }}>🕐 Recent Distribution History</Text>
              {distLog.length > 0 && (
                <TouchableOpacity onPress={clearLog}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.error }}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            {distLog.length === 0
              ? <Text style={{ textAlign: 'center', color: MUTED, padding: 36, fontSize: 15 }}>No distributions run yet</Text>
              : distLog.slice(0, 10).map((log, i) => (
                <View key={log.id || i} style={{ padding: 16, borderBottomWidth: i < Math.min(distLog.length, 10) - 1 ? 1 : 0, borderBottomColor: COLORS.surfaceAlt }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, backgroundColor: log.dist_type === 'telecaller' ? COLORS.warningBg : COLORS.screenBg }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: log.dist_type === 'telecaller' ? COLORS.warningAlt : COLORS.link }}>
                        {log.dist_type === 'telecaller' ? 'Telecaller' : 'STM'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.success }}>{log.leads_distributed} leads</Text>
                  </View>
                  <Text style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>
                    By {log.triggered_by_name || '—'} · {log.created_at ? new Date(log.created_at).toLocaleDateString('en-IN') : ''}
                  </Text>
                </View>
              ))
            }
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}
