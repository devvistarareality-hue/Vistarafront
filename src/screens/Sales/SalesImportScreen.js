import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { SALES_ENDPOINTS } from '../../constants/api';

const NAVY = '#182350'; const BLUE = '#3D5AFE'; const BG = '#F5F6FA'; const TEXT = '#1A1A2E'; const MUTED = '#8492A6';
const CARD = { backgroundColor: '#fff', borderRadius: 14, shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 };

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { Authorization: `Bearer ${token}` };
}

export default function SalesImportScreen({ navigation }) {
  const [projects,   setProjects]   = useState([]);
  const [sources,    setSources]    = useState([]);
  const [project,    setProject]    = useState('');
  const [source,     setSource]     = useState('');
  const [file,       setFile]       = useState(null);
  const [importing,  setImporting]  = useState(false);
  const [result,     setResult]     = useState(null);

  useEffect(() => {
    (async () => {
      const headers = await authHeaders();
      const [pRes, sRes] = await Promise.all([
        fetch(SALES_ENDPOINTS.projects, { headers: { ...headers, 'Content-Type': 'application/json' } }),
        fetch(SALES_ENDPOINTS.sources,  { headers: { ...headers, 'Content-Type': 'application/json' } }),
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
    if (!project) { Alert.alert('Required', 'Please select a project.'); return; }
    if (!source)  { Alert.alert('Required', 'Please select a source.'); return; }
    setImporting(true); setResult(null);
    try {
      const headers = await authHeaders();
      const form    = new FormData();
      form.append('file',       { uri: file.uri, name: file.name, type: file.mimeType || 'text/csv' });
      form.append('project_id', String(project));
      form.append('source_id',  String(source));
      const res = await fetch(SALES_ENDPOINTS.leadsImport, { method: 'POST', headers, body: form });
      const d   = await res.json();
      if (res.ok) setResult(d);
      else Alert.alert('Import failed', d.detail || d.message || 'Unknown error.');
    } catch (e) { Alert.alert('Error', e.message); }
    setImporting(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#182350" />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#182350', borderBottomWidth: 0 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="arrow-back" size={22} color="#fff" /></TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: '800', color: '#fff' }}>Import Leads</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Step 1 — File */}
        <View style={[CARD, { padding: 16, marginBottom: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: file ? '#2E7D32' : NAVY, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{file ? '✓' : '1'}</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>Select File</Text>
          </View>
          <TouchableOpacity onPress={pickFile}
            style={{ borderWidth: 1.5, borderColor: file ? '#2E7D32' : '#E0E6F0', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 22, alignItems: 'center', backgroundColor: file ? '#E8F5E9' : '#FAFBFF' }}>
            <Ionicons name={file ? 'document-text' : 'cloud-upload-outline'} size={30} color={file ? '#2E7D32' : '#C0C8D8'} />
            <Text style={{ fontSize: 13, color: file ? '#2E7D32' : MUTED, marginTop: 8, fontWeight: '600' }}>
              {file ? file.name : 'Tap to pick CSV or Excel file'}
            </Text>
            {file ? <TouchableOpacity onPress={() => setFile(null)} style={{ marginTop: 8 }}><Text style={{ fontSize: 12, color: '#EF4444' }}>Remove</Text></TouchableOpacity> : null}
          </TouchableOpacity>
        </View>

        {/* Step 2 — Project */}
        <View style={[CARD, { padding: 16, marginBottom: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: project ? '#2E7D32' : NAVY, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{project ? '✓' : '2'}</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>Assign Project</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {projects.map(p => (
                <TouchableOpacity key={p.id} onPress={() => setProject(p.id)}
                  style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: String(project) === String(p.id) ? NAVY : '#F0F3FA', borderWidth: 1.5, borderColor: String(project) === String(p.id) ? NAVY : '#E0E6F0' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: String(project) === String(p.id) ? '#fff' : MUTED }}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Step 3 — Source */}
        <View style={[CARD, { padding: 16, marginBottom: 14 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: source ? '#2E7D32' : NAVY, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>{source ? '✓' : '3'}</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>Assign Source</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {sources.map(s => (
                <TouchableOpacity key={s.id} onPress={() => setSource(s.id)}
                  style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: String(source) === String(s.id) ? NAVY : '#F0F3FA', borderWidth: 1.5, borderColor: String(source) === String(s.id) ? NAVY : '#E0E6F0' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: String(source) === String(s.id) ? '#fff' : MUTED }}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Import button */}
        <TouchableOpacity onPress={doImport} disabled={importing || !file || !project || !source}
          style={{ paddingVertical: 15, backgroundColor: NAVY, borderRadius: 14, alignItems: 'center', marginBottom: 16, opacity: (!file || !project || !source) ? 0.5 : 1 }}>
          {importing ? <ActivityIndicator color="#fff" /> : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Import Leads</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Result */}
        {result && (
          <View style={[CARD, { padding: 16 }]}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT, marginBottom: 14 }}>Import Result</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {[
                { label: 'Imported',   value: result.imported   ?? result.created ?? 0, color: '#2E7D32', bg: '#E8F5E9' },
                { label: 'Duplicates', value: result.duplicates ?? 0,                   color: '#E65100', bg: '#FFF3E0' },
                { label: 'Errors',     value: result.errors     ?? result.failed ?? 0,  color: '#EF4444', bg: '#FEE2E2' },
              ].map(r => (
                <View key={r.label} style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: r.bg, alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: r.color }}>{r.value}</Text>
                  <Text style={{ fontSize: 11, color: MUTED, marginTop: 3, fontWeight: '600' }}>{r.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Info */}
        <View style={{ marginTop: 14, padding: 14, backgroundColor: '#F0F3FF', borderRadius: 12, borderWidth: 1, borderColor: BLUE + '30' }}>
          <Text style={{ fontSize: 12, color: '#3D5AFE', fontWeight: '600', marginBottom: 4 }}>Supported formats</Text>
          <Text style={{ fontSize: 11, color: MUTED }}>CSV, XLS, XLSX — columns auto-detected for name, phone, alt_phone, email, campaign, adset.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
