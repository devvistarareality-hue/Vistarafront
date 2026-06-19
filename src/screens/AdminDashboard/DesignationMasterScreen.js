import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, Alert, StyleSheet, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BASE_URL } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const ALL_MODULES = ['Sales', 'HR', 'Execution', 'Purchase', 'Land'];

function ModuleDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const meta = MODULE_META[value] || {};
  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.85}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: meta.color || COLORS.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: meta.bg || COLORS.screenBg, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <MaterialCommunityIcons name={meta.icon} size={18} color={meta.color} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: meta.color }}>{value}</Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={meta.color} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 36 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 12, marginBottom: 4 }} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, paddingHorizontal: 16, paddingVertical: 12 }}>Select Module</Text>
            {ALL_MODULES.map(m => {
              const mt = MODULE_META[m];
              return (
                <TouchableOpacity key={m} onPress={() => { onChange(m); setOpen(false); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: COLORS.screenBg }}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: mt.bg, justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialCommunityIcons name={mt.icon} size={18} color={mt.color} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, color: m === value ? COLORS.secondary : COLORS.textPrimary, fontWeight: m === value ? '700' : '400' }}>{m}</Text>
                  {m === value && <Ionicons name="checkmark" size={18} color={COLORS.secondary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const MODULE_META = {
  Sales:       { color: COLORS.warningAlt, bg: COLORS.warningBg, icon: 'pencil-outline' },
  HR:          { color: COLORS.link, bg: COLORS.linkBg, icon: 'account-group-outline' },
  Execution:   { color: COLORS.success, bg: COLORS.successBg, icon: 'wrench-outline' },
  Purchase:    { color: COLORS.warning, bg: COLORS.warningBg, icon: 'cart-outline' },
  Land:        { color: COLORS.purple, bg: COLORS.purpleBg, icon: 'terrain' },
};

export default function DesignationMasterScreen({ navigation }) {
  const [designations,   setDesignations]   = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [selectedModule, setSelectedModule] = useState('Sales');
  const [name,           setName]           = useState('');
  const [saving,         setSaving]         = useState(false);

  const loadDesignations = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res   = await fetch(`${BASE_URL}/api/auth/designations/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setDesignations(await res.json());
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => { loadDesignations(); }, []);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res   = await fetch(`${BASE_URL}/api/auth/designations/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ module: selectedModule, name: name.trim() }),
      });
      if (res.ok) {
        const newDesig = await res.json();
        setDesignations((prev) => [...prev, newDesig]);
        setName('');
      } else {
        const data = await res.json();
        Alert.alert('Error', data.detail || JSON.stringify(data));
      }
    } catch {
      Alert.alert('Error', 'Network error.');
    }
    setSaving(false);
  };

  const handleDelete = (d) =>
    Alert.alert('Remove Designation', `Remove "${d.name}" from ${d.module}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('access_token');
            await fetch(`${BASE_URL}/api/auth/designations/${d.id}/`, {
              method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
            });
            setDesignations((prev) => prev.filter((x) => x.id !== d.id));
          } catch { Alert.alert('Error', 'Network error.'); }
        },
      },
    ]);

  const grouped = ALL_MODULES.reduce((acc, mod) => {
    acc[mod] = designations.filter((d) => d.module === mod);
    return acc;
  }, {});

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Designation Master</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Add form */}
        <View style={[s.card, { padding: 0, overflow: 'hidden' }]}>
          <View style={{ backgroundColor: COLORS.surfaceAlt, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.textPrimary }}>Add New Designation</Text>
            <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>Define designations for each module</Text>
          </View>
          <View style={{ padding: 18 }}>

          <Text style={s.sectionLabel}>SELECT MODULE</Text>
          <ModuleDropdown value={selectedModule} onChange={setSelectedModule} />

          <Text style={[s.sectionLabel, { marginTop: 16 }]}>DESIGNATION NAME</Text>
          <View style={s.inputRow}>
            <TextInput
              style={s.input}
              placeholder="e.g. Site Team Manager, Channel Partner"
              placeholderTextColor={COLORS.textSecondary}
              value={name}
              onChangeText={setName}
              onSubmitEditing={handleAdd}
            />
            <TouchableOpacity
              style={[s.addBtn, saving && { opacity: 0.6 }]}
              onPress={handleAdd}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color={COLORS.white} size="small" />
                : <Text style={s.addBtnText}>Add</Text>}
            </TouchableOpacity>
          </View>
          </View>
        </View>

        {/* Grouped list */}
        {loading ? (
          <ActivityIndicator color={COLORS.secondary} style={{ marginTop: 30 }} />
        ) : (
          <View style={s.groupsWrap}>
            {ALL_MODULES.map((mod) => {
              const meta = MODULE_META[mod];
              const list = grouped[mod] || [];
              return (
                <View key={mod} style={s.groupCard}>
                  <View style={s.groupHeader}>
                    <View style={[s.groupDot, { backgroundColor: meta.color }]} />
                    <MaterialCommunityIcons name={meta.icon} size={14} color={meta.color} />
                    <Text style={[s.groupName, { color: meta.color }]}>{mod}</Text>
                    <View style={s.countBadge}>
                      <Text style={s.countText}>{list.length}</Text>
                    </View>
                  </View>
                  {list.length === 0 ? (
                    <Text style={s.emptyHint}>No designations yet</Text>
                  ) : (
                    <View style={s.chipWrap}>
                      {list.map((d) => (
                        <View key={d.id} style={[s.chip, { backgroundColor: meta.bg }]}>
                          <Text style={[s.chipText, { color: meta.color }]}>{d.name}</Text>
                          <TouchableOpacity
                            onPress={() => handleDelete(d)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="close-circle" size={15} color={meta.color} style={{ opacity: 0.7 }} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: COLORS.screenBg },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.cardBg, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt },
  iconBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },

  card:        { backgroundColor: COLORS.cardBg, margin: 16, borderRadius: 16, padding: 18, ...CARD_SHADOW },
  cardTitle:   { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14 },
  sectionLabel:{ fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.6, marginBottom: 10 },
  pillRow:     { gap: 8, paddingBottom: 4 },
  modPill:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5, borderColor: COLORS.divider },
  modPillText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  inputRow:    { flexDirection: 'row', gap: 10 },
  input:       { flex: 1, backgroundColor: COLORS.screenBg, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary },
  addBtn:      { backgroundColor: COLORS.navy, paddingHorizontal: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  addBtnText:  { color: COLORS.white, fontWeight: '700', fontSize: 14 },

  groupsWrap:  { paddingHorizontal: 16, gap: 12 },
  groupCard:   { backgroundColor: COLORS.white, borderRadius: 14, padding: 16, elevation: 1, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 6 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  groupDot:    { width: 7, height: 7, borderRadius: 4 },
  groupName:   { flex: 1, fontSize: 13, fontWeight: '700' },
  countBadge:  { backgroundColor: COLORS.screenBg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countText:   { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  emptyHint:   { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic' },
  chipWrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  chipText:    { fontSize: 13, fontWeight: '600' },
});
