import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, StatusBar, ActivityIndicator, Alert,
  Modal, FlatList, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { ERP_MASTER, ERP_EXECUTION, ERP_PURCHASE } from '../../constants/api';

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function PickerModal({ visible, title, items, labelKey, subKey, onSelect, onClose, search, setSearch }) {
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
            <TextInput style={m.searchInput} placeholder="Search..." placeholderTextColor={COLORS.textSecondary} value={search} onChangeText={setSearch} autoFocus />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <TouchableOpacity style={m.item} onPress={() => { onSelect(item); onClose(); setSearch(''); }}>
                <Text style={m.itemText}>{item[labelKey]}</Text>
                {subKey && item[subKey] && <Text style={m.itemSub}>{item[subKey]}</Text>}
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
  pr_line: null, activity: null, project: null, item_code: null,
  qty_ordered: '', unit_rate: '', uom: '', tax_pct: '0',
});

export default function CreatePOScreen({ navigation }) {
  const [vendors,    setVendors]    = useState([]);
  const [projects,   setProjects]   = useState([]);
  const [prLines,    setPRLines]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);

  const [selectedVendor,  setSelectedVendor]  = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [deliveryDate,    setDeliveryDate]    = useState('');
  const [paymentTerms,    setPaymentTerms]    = useState('30');
  const [remarks,         setRemarks]         = useState('');
  const [lines,           setLines]           = useState([emptyLine()]);

  const [picker, setPicker] = useState({ open: false, type: '', lineIdx: null });
  const [search, setSearch] = useState('');

  useEffect(() => { loadMasterData(); }, []);

  async function loadMasterData() {
    try {
      const headers = await authHeaders();
      const [vendRes, prjRes] = await Promise.all([
        fetch(ERP_MASTER.vendors, { headers }),
        fetch(ERP_MASTER.projects, { headers }),
      ]);
      if (vendRes.ok) setVendors(await vendRes.json().then((d) => Array.isArray(d) ? d : (d.results || [])));
      if (prjRes.ok)  setProjects(await prjRes.json().then((d) => Array.isArray(d) ? d : (d.results || [])));
    } catch {}
    setLoading(false);
  }

  async function loadPRLines(projectId) {
    try {
      const headers = await authHeaders();
      // Get approved PRs for this project
      const res = await fetch(`${ERP_EXECUTION.prs}?project=${projectId}&status=Approved`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      const prs  = Array.isArray(data) ? data : (data.results || []);
      // Flatten all lines from all approved PRs
      const allLines = [];
      for (const pr of prs) {
        const detailRes = await fetch(ERP_EXECUTION.pr(pr.id), { headers });
        if (!detailRes.ok) continue;
        const prDetail = await detailRes.json();
        (prDetail.lines || []).forEach((l) => {
          allLines.push({
            ...l,
            pr_no:        prDetail.pr_no,
            activity_code: l.activity_code,
            item_name:    l.item_name,
          });
        });
      }
      setPRLines(allLines);
    } catch {}
  }

  function openPicker(type, lineIdx = null) {
    setPicker({ open: true, type, lineIdx });
    setSearch('');
  }

  function handlePickerSelect(item) {
    if (picker.type === 'vendor') {
      setSelectedVendor(item);
    } else if (picker.type === 'project') {
      setSelectedProject(item);
      setLines([emptyLine()]);
      setPRLines([]);
      loadPRLines(item.id);
    } else if (picker.type === 'pr_line') {
      updateLine(picker.lineIdx, {
        pr_line:    item,
        activity:   { id: item.activity, wbs_code: item.activity_code },
        project:    selectedProject,
        item_code:  { id: item.item_code, name: item.item_name },
        uom:        item.uom,
        qty_ordered: String(item.qty_required),
      });
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

  function totalAmount() {
    return lines.reduce((sum, l) => sum + (parseFloat(l.qty_ordered) || 0) * (parseFloat(l.unit_rate) || 0), 0);
  }

  async function handleSave() {
    if (!selectedVendor)  { Alert.alert('Validation', 'Please select a vendor.'); return; }
    if (!selectedProject) { Alert.alert('Validation', 'Please select a project.'); return; }
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!l.pr_line) { Alert.alert('Validation', `Line ${i + 1}: Select an approved PR line.`); return; }
      if (!l.qty_ordered || parseFloat(l.qty_ordered) <= 0) { Alert.alert('Validation', `Line ${i + 1}: Enter valid quantity.`); return; }
      if (!l.unit_rate  || parseFloat(l.unit_rate)  <= 0) { Alert.alert('Validation', `Line ${i + 1}: Enter unit rate.`); return; }
    }

    setSaving(true);
    try {
      const headers = await authHeaders();
      const body = {
        project:       selectedProject.id,
        vendor:        selectedVendor.id,
        delivery_date: deliveryDate || null,
        payment_terms: parseInt(paymentTerms) || 30,
        remarks,
        lines: lines.map((l) => ({
          pr_line:     l.pr_line.id,
          activity:    l.activity?.id || l.pr_line.activity,
          project:     selectedProject.id,
          item_code:   l.item_code?.id || l.pr_line.item_code,
          qty_ordered: parseFloat(l.qty_ordered),
          unit_rate:   parseFloat(l.unit_rate),
          uom:         l.uom,
          tax_pct:     parseFloat(l.tax_pct) || 0,
        })),
      };
      const res = await fetch(ERP_PURCHASE.pos, {
        method: 'POST', headers, body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        Alert.alert('Success', `PO ${data.po_no} created successfully!`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        const err = await res.json();
        Alert.alert('Error', JSON.stringify(err));
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={s.container} edges={['top']}>
        <View style={s.center}><ActivityIndicator size="large" color="#E65100" /></View>
      </SafeAreaView>
    );
  }

  const pickerItems = picker.type === 'vendor' ? vendors : picker.type === 'project' ? projects : prLines;
  const pickerLabel = picker.type === 'pr_line' ? 'pr_no' : 'name';
  const pickerSub   = picker.type === 'pr_line' ? 'item_name' : 'code';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#BF360C" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>New Purchase Order</Text>
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

          {/* Vendor */}
          <Text style={s.sectionLabel}>VENDOR *</Text>
          <TouchableOpacity style={s.selector} onPress={() => openPicker('vendor')}>
            <Text style={selectedVendor ? s.selectorValue : s.selectorPlaceholder}>
              {selectedVendor ? selectedVendor.name : 'Select vendor...'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionLabel}>DELIVERY DATE</Text>
              <TextInput style={s.input} placeholder="YYYY-MM-DD" placeholderTextColor={COLORS.textSecondary} value={deliveryDate} onChangeText={setDeliveryDate} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.sectionLabel}>PAYMENT TERMS (DAYS)</Text>
              <TextInput style={s.input} placeholder="30" placeholderTextColor={COLORS.textSecondary} keyboardType="numeric" value={paymentTerms} onChangeText={setPaymentTerms} />
            </View>
          </View>

          <Text style={s.sectionLabel}>REMARKS</Text>
          <TextInput style={[s.input, { height: 60, textAlignVertical: 'top' }]} placeholder="Optional..." placeholderTextColor={COLORS.textSecondary} value={remarks} onChangeText={setRemarks} multiline />

          {/* PO Lines */}
          <View style={s.linesHeader}>
            <Text style={s.sectionLabel}>PO LINES * (from approved PRs)</Text>
            <TouchableOpacity style={s.addLineBtn} onPress={addLine}>
              <Ionicons name="add" size={16} color="#E65100" />
              <Text style={s.addLineTxt}>Add Line</Text>
            </TouchableOpacity>
          </View>

          {!selectedProject && (
            <View style={s.hint}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
              <Text style={s.hintText}>Select a project first to load approved PR lines.</Text>
            </View>
          )}

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

              <Text style={s.fieldLabel}>PR Line (Approved PR) *</Text>
              <TouchableOpacity
                style={[s.selector, !selectedProject && s.selectorDisabled]}
                onPress={() => selectedProject && openPicker('pr_line', idx)}
              >
                <View style={{ flex: 1 }}>
                  {line.pr_line ? (
                    <>
                      <Text style={s.selectorValue}>{line.pr_line.pr_no} — {line.pr_line.item_name}</Text>
                      <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>Activity: {line.pr_line.activity_code}</Text>
                    </>
                  ) : (
                    <Text style={s.selectorPlaceholder}>Select PR line...</Text>
                  )}
                </View>
                <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>

              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Qty Ordered *</Text>
                  <TextInput style={s.input} placeholder="0" placeholderTextColor={COLORS.textSecondary} keyboardType="numeric" value={line.qty_ordered} onChangeText={(v) => updateLine(idx, { qty_ordered: v })} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>UOM</Text>
                  <TextInput style={s.input} placeholder="Nos" placeholderTextColor={COLORS.textSecondary} value={line.uom} onChangeText={(v) => updateLine(idx, { uom: v })} />
                </View>
              </View>

              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Unit Rate *</Text>
                  <TextInput style={s.input} placeholder="₹0.00" placeholderTextColor={COLORS.textSecondary} keyboardType="numeric" value={line.unit_rate} onChangeText={(v) => updateLine(idx, { unit_rate: v })} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Tax %</Text>
                  <TextInput style={s.input} placeholder="18" placeholderTextColor={COLORS.textSecondary} keyboardType="numeric" value={line.tax_pct} onChangeText={(v) => updateLine(idx, { tax_pct: v })} />
                </View>
              </View>

              {line.qty_ordered && line.unit_rate && (
                <View style={s.lineTotal}>
                  <Text style={s.lineTotalLabel}>Line Total:</Text>
                  <Text style={s.lineTotalValue}>
                    ₹{((parseFloat(line.qty_ordered) || 0) * (parseFloat(line.unit_rate) || 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </Text>
                </View>
              )}
            </View>
          ))}

          {/* Grand total */}
          <View style={s.grandTotal}>
            <Text style={s.grandTotalLabel}>Grand Total (excl. tax)</Text>
            <Text style={s.grandTotalValue}>₹{totalAmount().toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text>
          </View>

          <TouchableOpacity style={[s.submitBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="cart-check" size={20} color="#fff" />
                <Text style={s.submitText}>Create Purchase Order</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      <PickerModal
        visible={picker.open}
        title={picker.type === 'vendor' ? 'Select Vendor' : picker.type === 'project' ? 'Select Project' : 'Select Approved PR Line'}
        items={pickerItems}
        labelKey={pickerLabel}
        subKey={pickerSub}
        onSelect={handlePickerSelect}
        onClose={() => setPicker({ open: false, type: '', lineIdx: null })}
        search={search}
        setSearch={setSearch}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.screenBg },
  header:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#BF360C', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18, gap: 12 },
  backBtn:     { padding: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)' },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#fff' },
  content:     { padding: 16, paddingBottom: 40 },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sectionLabel:{ fontSize: 10, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 1, marginBottom: 8, marginTop: 18 },
  fieldLabel:  { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6, marginTop: 10 },
  selector:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.cardBg, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E0E6F0' },
  selectorDisabled:    { opacity: 0.5 },
  selectorValue:       { flex: 1, fontSize: 14, color: COLORS.textPrimary, fontWeight: '600' },
  selectorPlaceholder: { flex: 1, fontSize: 14, color: COLORS.textSecondary },
  input:       { backgroundColor: COLORS.cardBg, borderRadius: 12, padding: 13, fontSize: 14, color: COLORS.textPrimary, borderWidth: 1, borderColor: '#E0E6F0' },
  row:         { flexDirection: 'row', gap: 10 },
  linesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 6 },
  addLineBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF3E0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  addLineTxt:  { fontSize: 12, fontWeight: '700', color: '#E65100' },
  hint:        { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F5F6FA', borderRadius: 10, padding: 12, marginBottom: 10 },
  hintText:    { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  lineCard:    { backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 14, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#E65100', ...CARD_SHADOW },
  lineCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  lineNum:     { fontSize: 13, fontWeight: '800', color: '#E65100' },
  lineTotal:   { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F4FA' },
  lineTotalLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  lineTotalValue: { fontSize: 14, fontWeight: '800', color: '#E65100' },
  grandTotal:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFF3E0', borderRadius: 14, padding: 16, marginTop: 8, marginBottom: 4 },
  grandTotalLabel: { fontSize: 13, fontWeight: '700', color: '#E65100' },
  grandTotalValue: { fontSize: 20, fontWeight: '900', color: '#E65100' },
  submitBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#E65100', borderRadius: 14, padding: 16, marginTop: 16 },
  submitText:  { fontSize: 16, fontWeight: '800', color: '#fff' },
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
