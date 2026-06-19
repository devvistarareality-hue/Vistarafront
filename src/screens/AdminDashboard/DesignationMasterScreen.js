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
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: meta.color || '#E0E6F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: meta.bg || '#F5F6FA', marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <MaterialCommunityIcons name={meta.icon} size={18} color={meta.color} />
          <Text style={{ fontSize: 14, fontWeight: '700', color: meta.color }}>{value}</Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={meta.color} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 36 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E6F0', alignSelf: 'center', marginTop: 12, marginBottom: 4 }} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A2E', paddingHorizontal: 16, paddingVertical: 12 }}>Select Module</Text>
            {ALL_MODULES.map(m => {
              const mt = MODULE_META[m];
              return (
                <TouchableOpacity key={m} onPress={() => { onChange(m); setOpen(false); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F5F6FA' }}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: mt.bg, justifyContent: 'center', alignItems: 'center' }}>
                    <MaterialCommunityIcons name={mt.icon} size={18} color={mt.color} />
                  </View>
                  <Text style={{ flex: 1, fontSize: 14, color: m === value ? COLORS.secondary : '#1A1A2E', fontWeight: m === value ? '700' : '400' }}>{m}</Text>
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
  Sales:       { color: '#E6960A', bg: '#FFF8E1', icon: 'pencil-outline' },
  HR:          { color: '#3D5AFE', bg: '#EEF0FF', icon: 'account-group-outline' },
  Execution:   { color: '#2E7D32', bg: '#E8F5E9', icon: 'wrench-outline' },
  Purchase:    { color: '#E65100', bg: '#FFF3E0', icon: 'cart-outline' },
  Land:        { color: '#6A1B9A', bg: '#F3E5F5', icon: 'terrain' },
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
          <View style={{ backgroundColor: COLORS.navy, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>Add New Designation</Text>
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Define designations for each module</Text>
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
                ? <ActivityIndicator color="#fff" size="small" />
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
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.cardBg, borderBottomWidth: 1, borderBottomColor: '#EEF1F7' },
  iconBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F0F3FA', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },

  card:        { backgroundColor: COLORS.cardBg, margin: 16, borderRadius: 16, padding: 18, ...CARD_SHADOW },
  cardTitle:   { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 14 },
  sectionLabel:{ fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.6, marginBottom: 10 },
  pillRow:     { gap: 8, paddingBottom: 4 },
  modPill:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#F0F3FA', borderWidth: 1.5, borderColor: '#DDE3F0' },
  modPillText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  inputRow:    { flexDirection: 'row', gap: 10 },
  input:       { flex: 1, backgroundColor: '#F5F6FA', borderRadius: 10, borderWidth: 1.5, borderColor: '#E0E6F0', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary },
  addBtn:      { backgroundColor: COLORS.navy, paddingHorizontal: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  addBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },

  groupsWrap:  { paddingHorizontal: 16, gap: 12 },
  groupCard:   { backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 1, shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 6 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  groupDot:    { width: 7, height: 7, borderRadius: 4 },
  groupName:   { flex: 1, fontSize: 13, fontWeight: '700' },
  countBadge:  { backgroundColor: '#F3F4F6', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countText:   { fontSize: 11, fontWeight: '600', color: '#9CA3AF' },
  emptyHint:   { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
  chipWrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  chipText:    { fontSize: 13, fontWeight: '600' },
});
