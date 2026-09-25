import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS } from '../../constants/theme';
import { COMPANY_ENDPOINTS, SALES_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import { fetchCompanies } from '../../redux/actions/companiesActions';
import common from '../../styles/common';
import { Button } from '../../components/ui';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Bring a deleted company back from its backup workbook — same as the web card. A
// restore only goes into the company a file came from, matched by id, so once a
// company is deleted its backups have nowhere to go; this recreates it under its
// original id and details first, then restores into it. Platform admins only.
export default function ReviveCompanyCard() {
  const dispatch = useDispatch();
  const [file, setFile] = useState(null);
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState('');       // '' | 'check' | 'commit'

  async function pickFile() {
    const res = await DocumentPicker.getDocumentAsync({
      type: [XLSX, 'application/vnd.ms-excel', 'application/gzip'], copyToCacheDirectory: true });
    if (!res.canceled && res.assets?.[0]) { setFile(res.assets[0]); setPreview(null); setCode(''); }
  }

  // Back when it is in the company list and its record count has stopped growing.
  async function waitForCompany(id) {
    let last = -1, still = 0;
    for (let i = 0; i < 120; i++) {              // up to 10 minutes
      await new Promise((res) => setTimeout(res, 5000));
      try {
        const l = await apiFetch(COMPANY_ENDPOINTS.list);
        if (!l.ok || !(await l.json()).some((c) => c.id === id)) continue;
        const r = await apiFetch(SALES_ENDPOINTS.backupReset(id));
        if (!r.ok) continue;
        const total = (await r.json()).total || 0;
        still = total === last ? still + 1 : 0;
        last = total;
        if (total > 0 && still >= 2) return true;
      } catch (e) { /* keep asking */ }
    }
    return false;
  }

  function finish() { setPreview(null); setFile(null); setCode(''); dispatch(fetchCompanies()); }

  async function send(commit) {
    setBusy(commit ? 'commit' : 'check');
    const token = await AsyncStorage.getItem('access_token');
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name || 'backup.xlsx', type: file.mimeType || XLSX });
    if (code.trim()) form.append('code', code.trim());
    if (commit) form.append('commit', '1');
    let r = null, d = {};
    try {
      // multipart: let fetch set the boundary, so no JSON content-type here
      r = await fetch(SALES_ENDPOINTS.backupRevive, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      d = await r.json().catch(() => ({}));
    } catch (e) { r = null; }

    if (commit && (!r || r.status === 502 || r.status === 504)) {
      if (await waitForCompany(preview?.company?.id)) {
        Alert.alert('Company brought back', `${preview.company.name} is back. It took longer than the connection stayed open, but the server finished it.`);
        finish();
      } else {
        Alert.alert('Could not confirm', 'The server may still be working. Check Company Management in a minute.');
      }
    } else if (!r) {
      Alert.alert('Could not reach the server', 'The connection dropped. Try again.');
    } else if (!r.ok) {
      setPreview(null);
      Alert.alert(commit ? 'Not brought back' : 'That file cannot be used', d.detail || `The server returned ${r.status}.`);
    } else if (commit) {
      Alert.alert('Company brought back',
        `${d.company?.name || 'The company'} (${d.company?.code}) is back with ${(d.total || 0).toLocaleString('en-IN')} records, under its original id.`);
      finish();
    } else {
      setPreview(d);
      if (d.company?.code) setCode(d.company.code);
    }
    setBusy('');
  }

  function confirmCommit() {
    Alert.alert('Bring it back?',
      `${preview.company?.name} is recreated under its original id #${preview.company?.id} and `
      + `${preview.total.toLocaleString('en-IN')} records are written back into it.`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Bring it back', onPress: () => send(true) }]);
  }

  const needsCode = !!preview?.needs_code;
  const rows = (preview?.plan || []).filter((p) => p.restore > 0);

  return (
    <View style={[common.card, st.card]}>
      <Text style={st.title}>Bring back a deleted company</Text>
      <Text style={st.sub}>
        A deleted company can’t be restored with “Restore from Excel”, because there is no company
        left to put it into. Choose that company’s backup here: it is recreated under its original
        id and details, then everything in the workbook goes back into it.
      </Text>

      <TouchableOpacity onPress={pickFile} style={st.file} activeOpacity={0.8} disabled={!!busy}>
        <Ionicons name="document-attach-outline" size={18} color={COLORS.link} />
        <Text style={st.fileText} numberOfLines={1}>{file ? file.name : 'Choose the deleted company’s backup'}</Text>
      </TouchableOpacity>

      {preview ? (
        <View style={st.plan}>
          <View style={st.planRow}><Text style={st.planLabel}>Company</Text><Text style={st.planValue}>{preview.company?.name}</Text></View>
          <View style={st.planRow}><Text style={st.planLabel}>Original id</Text><Text style={st.planValue}>#{preview.company?.id}</Text></View>
          {rows.map((p) => (
            <View style={st.planRow} key={p.table}>
              <Text style={st.planLabel}>{p.table}</Text>
              <Text style={st.planValue}>{p.restore.toLocaleString('en-IN')}</Text>
            </View>
          ))}
          <View style={[st.planRow, st.planTotal]}>
            <Text style={st.planTotalLabel}>Will be brought back</Text>
            <Text style={st.planTotalValue}>{preview.total.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      ) : null}

      {needsCode ? (
        <>
          <Text style={st.label}>Company code — this backup is older and doesn’t record it</Text>
          <TextInput style={st.input} value={code} onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="e.g. MEGA" placeholderTextColor={COLORS.textTertiary}
            autoCapitalize="characters" autoCorrect={false} editable={!busy} />
        </>
      ) : null}

      <View style={st.actions}>
        <Button title={busy === 'check' ? 'Checking…' : 'Check file'} variant="secondary"
          onPress={() => send(false)} loading={busy === 'check'} disabled={!file || !!busy} style={st.flex} />
        <Button title={busy === 'commit' ? 'Bringing back…' : 'Bring it back'}
          onPress={confirmCommit} loading={busy === 'commit'}
          disabled={!preview || !!busy || (needsCode && !code.trim())} style={st.flex} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card:     { padding: 16, marginBottom: 14 },
  title:    { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  sub:      { fontSize: 12.5, lineHeight: 18, color: COLORS.textSecondary, marginBottom: 12 },
  file:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed',
              borderColor: COLORS.borderStrong, borderRadius: 12, padding: 12, marginBottom: 12 },
  fileText: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  plan:     { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 10, marginBottom: 12 },
  planRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  planLabel: { fontSize: 12.5, color: COLORS.textSecondary },
  planValue: { fontSize: 12.5, fontWeight: '700', color: COLORS.textPrimary },
  planTotal: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 4, paddingTop: 8 },
  planTotalLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  planTotalValue: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  label:    { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  input:    { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
              fontSize: 14, color: COLORS.textPrimary, backgroundColor: COLORS.inputBg, marginBottom: 12 },
  actions:  { flexDirection: 'row', gap: 10 },
  flex:     { flex: 1 },
});
