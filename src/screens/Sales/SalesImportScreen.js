import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../../utils/apiFetch';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

import AppIcon from '../../components/AppIcon';
import { can } from '../../lib/roles';
const NAVY = COLORS.navy; const BLUE = COLORS.link; const BG = COLORS.screenBg; const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 22, ...CARD_SHADOW , borderWidth: 1, borderColor: COLORS.cardBorder };

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { Authorization: `Bearer ${token}` };
}

export default function SalesImportScreen({ navigation }) {
  const user  = useSelector((s) => s.auth.user);
  // An STM only works the STM stage — the template the backend generates for them
  // already omits the telecaller columns (uploads ignore them regardless either
  // way); this just keeps the on-screen copy accurate for who's looking at it.
  const isStm = can(user, 'sales.pipeline.stm');
  const [projects,   setProjects]   = useState([]);
  const [sources,    setSources]    = useState([]);
  const [project,    setProject]    = useState('');
  const [source,     setSource]     = useState('');
  const [file,       setFile]       = useState(null);
  const [importing,  setImporting]  = useState(false);
  const [result,     setResult]     = useState(null);
  const [dlTpl,      setDlTpl]      = useState(false);

  async function downloadTemplate() {
    try {
      setDlTpl(true);
      const token = await AsyncStorage.getItem('access_token');
      const fileUri = FileSystem.cacheDirectory + 'vistara_pipeline_import_template.xlsx';
      const { uri, status } = await FileSystem.downloadAsync(SALES_ENDPOINTS.leadsImportTemplate, fileUri, { headers: { Authorization: `Bearer ${token}` } });
      if (status !== 200) { Alert.alert('Download failed', 'Could not get the template. Try again.'); return; }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', dialogTitle: 'Nexora — Full Pipeline import template', UTI: 'org.openxmlformats.spreadsheetml.sheet' });
      } else {
        Alert.alert('Saved', 'Template saved to:\n' + uri);
      }
    } catch (e) { Alert.alert('Error', e.message); }
    finally { setDlTpl(false); }
  }

  useEffect(() => {
    (async () => {
      const [pRes, sRes] = await Promise.all([
        apiFetch(SALES_ENDPOINTS.projects),
        apiFetch(SALES_ENDPOINTS.sources),
      ]);
      if (pRes.ok) { const d = await pRes.json(); setProjects(Array.isArray(d) ? d : (d.results || [])); }
      if (sRes.ok) { const d = await sRes.json(); setSources(Array.isArray(d) ? d : (d.results || [])); }
    })();
  }, []);

  async function pickFile() {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'text/comma-separated-values'],
      copyToCacheDirectory: true,
    });
    if (!res.canceled && res.assets?.[0]) setFile(res.assets[0]);
  }

  async function doImport() {
    if (!file)    { Alert.alert('No file', 'Please select a CSV or Excel file.'); return; }
    setImporting(true); setResult(null);
    try {
      const headers = await authHeaders();
      const form    = new FormData();
      form.append('file',       { uri: file.uri, name: file.name, type: file.mimeType || 'text/csv' });
      if (project) form.append('project_id', String(project));
      if (source)  form.append('source_id',  String(source));
      const res = await fetch(SALES_ENDPOINTS.leadsImport, { method: 'POST', headers, body: form });
      const d   = await res.json();
      if (res.ok) setResult(d);
      else Alert.alert('Import failed', d.detail || d.message || 'Unknown error.');
    } catch (e) { Alert.alert('Error', e.message); }
    setImporting(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.screenBg} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'transparent', borderBottomWidth: 0, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 32, height: 32, borderRadius: 20, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} /></TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: TEXT }}>Import Leads</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Download template */}
        <View style={[CARD, { padding: 16, marginBottom: 14 }]}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT, marginBottom: 4 }}>Full Pipeline template</Text>
          <Text style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>{isStm ? 'Lead → STM → site visit → closure, with dropdowns. Fill it, then upload below.' : 'Lead → telecaller → STM → site visit → closure, with dropdowns. Fill it, then upload below.'}</Text>
          <TouchableOpacity onPress={downloadTemplate} disabled={dlTpl}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 22, borderWidth: 1.5, borderColor: BLUE, backgroundColor: COLORS.surface }}>
            {dlTpl ? <ActivityIndicator color={BLUE} /> : (
              <>
                <Ionicons name="download-outline" size={18} color={BLUE} />
                <Text style={{ color: BLUE, fontWeight: '700', fontSize: 14 }}>Download template</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Step 1 — File */}
        <View style={[CARD, { padding: 16, marginBottom: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: file ? COLORS.success : NAVY, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 12 }}>{file ? <AppIcon name="check" size={12} /> : '1'}</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>Select File</Text>
          </View>
          <TouchableOpacity onPress={pickFile}
            style={{ borderWidth: 1.5, borderColor: file ? COLORS.success : COLORS.border, borderStyle: 'dashed', borderRadius: 16, paddingVertical: 22, alignItems: 'center', backgroundColor: file ? COLORS.successBg : COLORS.surface }}>
            <Ionicons name={file ? 'document-text' : 'cloud-upload-outline'} size={30} color={file ? COLORS.success : COLORS.shadow} />
            <Text style={{ fontSize: 13, color: file ? COLORS.success : MUTED, marginTop: 8, fontWeight: '600' }}>
              {file ? file.name : 'Tap to pick CSV or Excel file'}
            </Text>
            {file ? <TouchableOpacity onPress={() => setFile(null)} style={{ marginTop: 8 }}><Text style={{ fontSize: 12, color: COLORS.error }}>Remove</Text></TouchableOpacity> : null}
          </TouchableOpacity>
        </View>

        {/* Step 2 — Project */}
        <View style={[CARD, { padding: 16, marginBottom: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: project ? COLORS.success : NAVY, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 12 }}>{project ? <AppIcon name="check" size={12} /> : '2'}</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>Assign Project (optional)</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {projects.map(p => (
                <TouchableOpacity key={p.id} onPress={() => setProject(p.id)}
                  style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, backgroundColor: String(project) === String(p.id) ? NAVY : COLORS.surfaceAlt, borderWidth: 1.5, borderColor: String(project) === String(p.id) ? NAVY : COLORS.border }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: String(project) === String(p.id) ? COLORS.white : MUTED }}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Step 3 — Source */}
        <View style={[CARD, { padding: 16, marginBottom: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: source ? COLORS.success : NAVY, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 12 }}>{source ? <AppIcon name="check" size={12} /> : '3'}</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>Assign Source (optional)</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {sources.map(s => (
                <TouchableOpacity key={s.id} onPress={() => setSource(s.id)}
                  style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 14, backgroundColor: String(source) === String(s.id) ? NAVY : COLORS.surfaceAlt, borderWidth: 1.5, borderColor: String(source) === String(s.id) ? NAVY : COLORS.border }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: String(source) === String(s.id) ? COLORS.white : MUTED }}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Import button */}
        <TouchableOpacity onPress={doImport} disabled={importing || !file}
          style={[SalesImportScreenS.btn, (!file) && SalesImportScreenS.btnDim]}>
          {importing ? <ActivityIndicator color={COLORS.btnText} /> : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="cloud-upload-outline" size={18} color={COLORS.btnText} />
              <Text style={{ color: COLORS.btnText, fontWeight: '700', fontSize: 15 }}>Import Leads</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Result */}
        {result && (
          <View style={[CARD, { padding: 16 }]}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT, marginBottom: 14 }}>Import Result</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[
                { label: 'Imported',   value: result.imported   ?? result.created ?? 0, color: COLORS.success, bg: COLORS.successBg },
                { label: 'Duplicates', value: result.duplicates ?? 0,                   color: COLORS.warning, bg: COLORS.warningBg },
                { label: 'Errors',     value: result.errors     ?? result.failed ?? 0,  color: COLORS.error, bg: COLORS.errorBg },
              ].map(r => (
                <View key={r.label} style={{ flex: 1, padding: 12, borderRadius: 16, backgroundColor: r.bg, alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: r.color }}>{r.value}</Text>
                  <Text style={{ fontSize: 11, color: MUTED, marginTop: 3, fontWeight: '600' }}>{r.label}</Text>
                </View>
              ))}
            </View>
            {(result.site_visits > 0 || result.closures > 0) && (
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                {[
                  { label: 'Site visits', value: result.site_visits ?? 0, color: COLORS.accentDeep, bg: COLORS.infoBg || COLORS.surfaceAlt },
                  { label: 'Closures',    value: result.closures ?? 0,    color: COLORS.purple, bg: COLORS.surfaceAlt },
                ].map(r => (
                  <View key={r.label} style={{ flex: 1, padding: 12, borderRadius: 16, backgroundColor: r.bg, alignItems: 'center' }}>
                    <Text style={{ fontSize: 22, fontWeight: '800', color: r.color }}>{r.value}</Text>
                    <Text style={{ fontSize: 11, color: MUTED, marginTop: 3, fontWeight: '600' }}>{r.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Info */}
        <View style={{ marginTop: 14, padding: 14, backgroundColor: COLORS.screenBg, borderRadius: 16, borderWidth: 1, borderColor: BLUE + '30' }}>
          <Text style={{ fontSize: 12, color: COLORS.link, fontWeight: '600', marginBottom: 4 }}>Supported formats</Text>
          <Text style={{ fontSize: 11, color: MUTED }}>CSV, XLS, XLSX. Use the Full Pipeline template above to import the whole journey — {isStm ? 'STM' : 'telecaller, STM'}, statuses, site visits and closures — all linked. A plain name/phone sheet works too.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// Styles moved out of JSX (see AGENTS.md: no inline styles).
const SalesImportScreenS = StyleSheet.create({
  btn: { paddingVertical: 15, backgroundColor: COLORS.btnTint, borderRadius: 18, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: COLORS.btnBorder, opacity: 1 },
  btnDim: { opacity: 0.5 },
});
