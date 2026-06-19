import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, StatusBar, ActivityIndicator, Alert,
  Modal, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { ERP_MASTER, ERP_EXECUTION } from '../../constants/api';

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function PickerModal({ visible, title, items, labelKey, onSelect, onClose, search, setSearch }) {
  const filtered = items.filter((i) =>
    (i[labelKey] || '').toLowerCase().includes((search || '').toLowerCase())
  );
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.sheet}>
          <View style={m.sheetHeader}>
            <Text style={m.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={COLORS.textPrimary} /></TouchableOpacity>
          </View>
          <View style={m.searchBox}>
            <Ionicons name="search-outline" size={15} color={COLORS.textSecondary} />
            <TextInput
              style={m.searchInput}
              placeholder={`Search ${title.toLowerCase()}...`}
              placeholderTextColor={COLORS.textSecondary}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <TouchableOpacity style={m.item} onPress={() => { onSelect(item); onClose(); setSearch(''); }}>
                <Text style={m.itemText}>{item[labelKey]}</Text>
                {item.code && <Text style={m.itemSub}>{item.code}</Text>}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={m.noItems}>No results</Text>}
          />
        </View>
      </View>
    </Modal>
  );
}

const emptyLine = () => ({
  activity: null, item_code: null, qty_required: '', uom: '', required_date: '', remarks: '',
});

export default function CreatePRScreen({ navigation }) {
  const user = useSelector((s) => s.auth.user);

  const [projects,   setProjects]   = useState([]);
  const [activities, setActivities] = useState([]);
  const [materials,  setMaterials]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);

  const [selectedProject, setSelectedProject] = useState(null);
  const [remarks,         setRemarks]         = useState('');
  const [lines,           setLines]           = useState([emptyLine()]);

  const [picker, setPicker] = useState({ open: false, type: '', lineIdx: null });
  const [search, setSearch] = useState('');

  useEffect(() => { loadMasterData(); }, []);

  async function loadMasterData() {
    try {
      const headers = await authHeaders();
      const [prjRes, matRes] = await Promise.all([
        fetch(ERP_MASTER.projects, { headers }),
        fetch(ERP_MASTER.materials, { headers }),
      ]);
      if (prjRes.ok) setProjects(await prjRes.json().then((d) => Array.isArray(d) ? d : (d.results || [])));
      if (matRes.ok) setMaterials(await matRes.json().then((d) => Array.isArray(d) ? d : (d.results || [])));
    } catch {}
    setLoading(false);
  }

  async function loadActivities(projectId) {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${ERP_MASTER.wbs}?project=${projectId}`, { headers });
      if (res.ok) setActivities(await res.json().then((d) => Array.isArray(d) ? d : (d.results || [])));
    } catch {}
  }

  function openPicker(type, lineIdx = null) {
    setPicker({ open: true, type, lineIdx });
    setSearch('');
  }

  function handlePickerSelect(item) {
    if (picker.type === 'project') {
      setSelectedProject(item);
      setLines([emptyLine()]);
      setActivities([]);
      loadActivities(item.id);
    } else if (picker.type === 'activity') {
      updateLine(picker.lineIdx, { activity: item, uom: item.uom || '' });
    } else if (picker.type === 'material') {
      updateLine(picker.lineIdx, { item_code: item, uom: item.uom || '' });
    }
  }

  function updateLine(idx, patch) {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));
  }

  function addLine() { setLines((prev) => [...prev, emptyLine()]); }
  function removeLine(idx) {
    if (lines.length === 1) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!selectedProject) { Alert.alert('Validation', 'Please select a project.'); return; }
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.activity)    { Alert.alert('Validation', `Line ${i + 1}: Select a WBS activity.`); return; }
      if (!l.item_code)   { Alert.alert('Validation', `Line ${i + 1}: Select a material.`); return; }
      if (!l.qty_required || parseFloat(l.qty_required) <= 0) { Alert.alert('Validation', `Line ${i + 1}: Enter valid quantity.`); return; }
      if (!l.required_date) { Alert.alert('Validation', `Line ${i + 1}: Enter required date (YYYY-MM-DD).`); return; }
    }

    setSaving(true);
    try {
      const headers = await authHeaders();
      const body = {
        project: selectedProject.id,
        remarks,
        lines: lines.map((l) => ({
          activity:      l.activity.id,
          project:       selectedProject.id,
          item_code:     l.item_code.id,
          qty_required:  parseFloat(l.qty_required),
          uom:           l.uom || l.item_code.uom,
          required_date: l.required_date,
          remarks:       l.remarks,
        })),
      };
      const res = await fetch(ERP_EXECUTION.prs, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        Alert.alert('Success', `PR ${data.pr_no} raised successfully!`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        const err = await res.json();
        Alert.alert('Error', JSON.stringify(err));
      }
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.center}><ActivityIndicator size="large" color="#2E7D32" /></View>
      </SafeAreaView>
    );
  }

  const pickerItems = picker.type === 'project' ? projects : picker.type === 'activity' ? activities : materials;
  const pickerLabel = picker.type === 'project' ? 'name' : picker.type === 'activity' ? 'wbs_code' : 'name';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>New Purchase Requisition</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

          {/* Project */}
          <Text style={s.sectionLabel}>PROJECT *</Text>
          <TouchableOpacity style={s.selector} onPress={() => openPicker('project')}>
            <Text style={selectedProject ? s.selectorValue : s.selectorPlaceholder}>
              {selectedProject ? selectedProject.name : 'Select project...'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Remarks */}
          <Text style={s.sectionLabel}>REMARKS</Text>
          <TextInput
            style={[s.input, { height: 72, textAlignVertical: 'top' }]}
            placeholder="Optional remarks for this PR..."
            placeholderTextColor={COLORS.textSecondary}
            value={remarks}
            onChangeText={setRemarks}
            multiline
          />

          {/* Lines */}
          <View style={s.linesHeader}>
            <Text style={s.sectionLabel}>PR LINES *</Text>
            <TouchableOpacity style={s.addLineBtn} onPress={addLine}>
              <Ionicons name="add" size={16} color="#2E7D32" />
              <Text style={s.addLineTxt}>Add Line</Text>
            </TouchableOpacity>
          </View>

          {lines.map((line, idx) => (
            <View key={idx} style={s.lineCard}>
              <View style={s.lineCardHeader}>
                <Text style={s.lineNum}>Line {idx + 1}</Text>
                {lines.length > 1 && (
                  <TouchableOpacity onPress={() => removeLine(idx)}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                )}
              </View>

              {/* WBS Activity */}
              <Text style={s.fieldLabel}>WBS Activity *</Text>
              <TouchableOpacity
                style={[s.selector, !selectedProject && s.selectorDisabled]}
                onPress={() => selectedProject && openPicker('activity', idx)}
              >
                <Text style={line.activity ? s.selectorValue : s.selectorPlaceholder} numberOfLines={1}>
                  {line.activity ? `${line.activity.wbs_code} — ${line.activity.description}` : 'Select WBS activity...'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>

              {/* Material */}
              <Text style={s.fieldLabel}>Material *</Text>
              <TouchableOpacity style={s.selector} onPress={() => openPicker('material', idx)}>
                <Text style={line.item_code ? s.selectorValue : s.selectorPlaceholder} numberOfLines={1}>
                  {line.item_code ? line.item_code.name : 'Select material...'}
                </Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>

              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Qty Required *</Text>
                  <TextInput
                    style={s.input}
                    placeholder="0"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="numeric"
                    value={line.qty_required}
                    onChangeText={(v) => updateLine(idx, { qty_required: v })}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>UOM</Text>
                  <TextInput
                    style={s.input}
                    placeholder="Nos / Kg / Rft..."
                    placeholderTextColor={COLORS.textSecondary}
                    value={line.uom}
                    onChangeText={(v) => updateLine(idx, { uom: v })}
                  />
                </View>
              </View>

              <Text style={s.fieldLabel}>Required Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={s.input}
                placeholder="2026-07-01"
                placeholderTextColor={COLORS.textSecondary}
                value={line.required_date}
                onChangeText={(v) => updateLine(idx, { required_date: v })}
              />

              <Text style={s.fieldLabel}>Line Remarks</Text>
              <TextInput
                style={s.input}
                placeholder="Optional..."
                placeholderTextColor={COLORS.textSecondary}
                value={line.remarks}
                onChangeText={(v) => updateLine(idx, { remarks: v })}
              />
            </View>
          ))}

          {/* Submit */}
          <TouchableOpacity
            style={[s.submitBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="clipboard-check-outline" size={20} color="#fff" />
                <Text style={s.submitText}>Raise PR</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Picker Modal */}
      <PickerModal
        visible={picker.open}
        title={picker.type === 'project' ? 'Select Project' : picker.type === 'activity' ? 'Select WBS Activity' : 'Select Material'}
        items={pickerItems}
        labelKey={pickerLabel}
        onSelect={handlePickerSelect}
        onClose={() => setPicker({ open: false, type: '', lineIdx: null })}
        search={search}
        setSearch={setSearch}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.screenBg },
  header:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1B5E20', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18, gap: 12 },
  backBtn:   { padding: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)' },
  headerTitle:{ fontSize: 17, fontWeight: '800', color: '#fff' },
  content:   { padding: 16, paddingBottom: 40 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  sectionLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 1, marginBottom: 8, marginTop: 18 },
  fieldLabel:   { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6, marginTop: 10 },

  selector:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.cardBg, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E0E6F0' },
  selectorDisabled:    { opacity: 0.5 },
  selectorValue:       { flex: 1, fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' },
  selectorPlaceholder: { flex: 1, fontSize: 14, color: COLORS.textSecondary },

  input: { backgroundColor: COLORS.cardBg, borderRadius: 12, padding: 13, fontSize: 14, color: COLORS.textPrimary, borderWidth: 1, borderColor: '#E0E6F0' },
  row:   { flexDirection: 'row', gap: 10 },

  linesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 6 },
  addLineBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  addLineTxt:  { fontSize: 12, fontWeight: '700', color: '#2E7D32' },

  lineCard:       { backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 14, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#2E7D32', ...CARD_SHADOW },
  lineCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  lineNum:        { fontSize: 13, fontWeight: '800', color: '#2E7D32' },

  submitBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#2E7D32', borderRadius: 14, padding: 16, marginTop: 24 },
  submitText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});

const m = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#F0F4FA' },
  sheetTitle:  { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  searchBox:   { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 14, backgroundColor: COLORS.screenBg, borderRadius: 12, padding: 12 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  item:        { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F5F6FA' },
  itemText:    { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  itemSub:     { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  noItems:     { padding: 24, textAlign: 'center', color: COLORS.textSecondary },
});
