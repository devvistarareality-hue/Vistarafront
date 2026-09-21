import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { COLORS, RADIUS } from '../../constants/theme';
import { AR_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import { formatDMY } from '../../utils/dateFormat';
import common from '../../styles/common';
import AppLoader from '../../components/AppLoader';
import LoadError from '../../components/LoadError';
import FilterSelect from '../../components/FilterSelect';
import { Button } from '../../components/ui';
import { rupee, inrShort, MODE_LABEL, withCompany } from './arShared';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Import receipts in bulk — same as the website: download the project's template
// (one row per approved plot), fill it in, upload it, check the preview, import.
// Single payments are recorded from the ledger.
export default function ARImportScreen({ navigation, route }) {
  const companyId = useSelector((st) => st.adminFilter?.companyId);
  const [accounts, setAccounts] = useState(null);
  const [err, setErr] = useState('');
  const [project, setProject] = useState(route?.params?.project || '');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState('');       // '' | 'template' | 'preview' | 'import'
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    setErr('');
    try {
      const r = await apiFetch(withCompany(AR_ENDPOINTS.accounts, companyId));
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.detail || 'Could not load projects.'); return; }
      setAccounts(d.results || []);
    } catch (e) { setErr('Check your connection and try again.'); }
  }, [companyId]);
  useEffect(() => { load(); }, [load]);

  const projects = useMemo(() => {
    const m = new Map();
    (accounts || []).forEach((a) => { if (a.project_id) m.set(String(a.project_id), a.project); });
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [accounts]);
  const projectName = projects.find(([id]) => id === String(project))?.[1] || '';

  const chooseProject = (v) => { setProject(v); setFile(null); setResult(null); };

  async function downloadTemplate() {
    setBusy('template');
    try {
      const token = await AsyncStorage.getItem('access_token');
      const target = `${FileSystem.cacheDirectory}AR receipts - ${projectName.replace(/[^\w -]/g, '')}.xlsx`;
      const { uri, status } = await FileSystem.downloadAsync(withCompany(AR_ENDPOINTS.importTemplate, companyId, [`project_id=${project}`]), target,
        { headers: { Authorization: `Bearer ${token}` } });
      if (status !== 200) throw new Error('bad status');
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: XLSX, UTI: 'org.openxmlformats.spreadsheetml.sheet', dialogTitle: `Template · ${projectName}` });
    } catch (e) { Alert.alert('Error', 'Could not download the template.'); }
    setBusy('');
  }

  async function pickFile() {
    const res = await DocumentPicker.getDocumentAsync({ type: [XLSX, 'application/vnd.ms-excel'], copyToCacheDirectory: true });
    if (!res.canceled && res.assets?.[0]) { setFile(res.assets[0]); setResult(null); }
  }

  async function send(commit) {
    setBusy(commit ? 'import' : 'preview');
    try {
      const token = await AsyncStorage.getItem('access_token');
      const form = new FormData();
      form.append('file', { uri: file.uri, name: file.name || 'receipts.xlsx', type: file.mimeType || XLSX });
      form.append('project_id', String(project));
      if (commit) form.append('commit', '1');
      // multipart: let fetch set the boundary, so no JSON content-type here
      const r = await fetch(withCompany(AR_ENDPOINTS.import, companyId), { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) Alert.alert('Import failed', d.detail || 'The file could not be read.');
      else setResult(d);
    } catch (e) { Alert.alert('Error', 'The import failed. Check your connection.'); }
    setBusy('');
  }

  function confirmImport() {
    Alert.alert('Import receipts?', `Import ${result.ready} receipts totalling ${rupee(result.total_amount)} into ${projectName}? Skipped rows are not imported.`, [
      { text: 'Cancel', style: 'cancel' }, { text: 'Import', onPress: () => send(true) },
    ]);
  }

  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      <View style={common.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={common.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={s.flex}>
          <Text style={common.headerTitle}>Import receipts</Text>
          <Text style={common.headerSub}>From the Excel template</Text>
        </View>
      </View>

      {accounts === null && !err ? <AppLoader label="Loading projects…" /> : err && !accounts ? <LoadError message={err} onRetry={load} /> : (
        <ScrollView contentContainerStyle={common.scroll}>
          <Text style={s.lead}>To record a single payment, open the account in the Register and tap Record payment.</Text>

          <Step n={1} title="Choose the project" sub="One project per file.">
            <FilterSelect label="Project" value={project} onChange={chooseProject}
              options={[{ value: '', label: 'Choose project' }, ...projects.map(([id, name]) => ({ value: id, label: name }))]} />
          </Step>

          <Step n={2} title="Download the template" off={!project}
            sub="One row per approved plot. Fill in Paid Date, Paid and Mode; add a row with the same plot for a second payment.">
            <Button title="Download template" icon="download" variant="secondary" size="sm" disabled={!project} loading={busy === 'template'} onPress={downloadTemplate} />
          </Step>

          <Step n={3} title="Upload the filled template" off={!project} sub="You'll see a preview first — nothing is saved until you confirm.">
            <TouchableOpacity style={[s.file, file && s.fileOn]} disabled={!project || !!busy} onPress={pickFile} activeOpacity={0.8}>
              <Ionicons name={file ? 'document-text' : 'cloud-upload-outline'} size={18} color={file ? COLORS.success : COLORS.textSecondary} />
              <Text style={[s.fileText, file && s.fileTextOn]} numberOfLines={1}>{file ? file.name : 'Choose .xlsx file'}</Text>
            </TouchableOpacity>
            <Button title="Preview" variant="primary" size="sm" disabled={!project || !file || !!busy} loading={busy === 'preview'} onPress={() => send(false)} />
          </Step>

          {result && (
            <>
              <View style={s.stats}>
                <Stat label={result.committed ? 'Imported' : 'Ready'} value={String(result.ready)} tone="good" />
                <Stat label="Amount" value={inrShort(result.total_amount)} />
                <Stat label="Skipped" value={String(result.skipped)} tone={result.skipped ? 'bad' : undefined} />
              </View>
              {result.committed ? (
                <View style={[s.note, s.noteOk]}><Text style={[s.noteText, s.good]}>Done — {result.ready} receipts are now on their accounts.</Text></View>
              ) : result.ready > 0 ? (
                <Button title={`Import ${result.ready} receipts`} variant="primary" full loading={busy === 'import'} onPress={confirmImport} style={s.importBtn} />
              ) : (
                <View style={[s.note, s.noteBad]}><Text style={[s.noteText, s.bad]}>No payment in this file can be imported — see the reasons below.</Text></View>
              )}

              {result.rows.length > 0 && (
                <View style={[common.card, s.card]}>
                  <Text style={s.cardTitle}>{result.committed ? 'Imported' : 'Will be imported'}</Text>
                  {result.rows.map((r) => (
                    <View key={r.line} style={s.row}>
                      <View style={s.flex}>
                        <Text style={s.rowTitle} numberOfLines={1}>Plot {r.plot} · {r.client_name}</Text>
                        <Text style={s.rowSub}>{formatDMY(r.paid_on)} · {MODE_LABEL[r.mode]}{r.remarks ? ` · ${r.remarks}` : ''}</Text>
                      </View>
                      <Text style={s.rowAmt}>{rupee(r.amount)}</Text>
                    </View>
                  ))}
                </View>
              )}
              {result.skipped_rows.length > 0 && (
                <View style={[common.card, s.card]}>
                  <Text style={s.cardTitle}>Skipped</Text>
                  <Text style={s.cardSub}>Fix these in the file and upload it again — rows already imported are not added twice.</Text>
                  {result.skipped_rows.map((r) => (
                    <View key={r.line} style={s.row}>
                      <View style={s.flex}>
                        <Text style={s.rowTitle}>Row {r.line} · Plot {r.plot || '?'}</Text>
                        <Text style={[s.rowSub, s.bad]}>{r.reason}</Text>
                      </View>
                      <Text style={s.rowAmt}>{rupee(r.amount)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Step({ n, title, sub, off, children }) {
  return (
    <View style={[common.card, s.step, off && s.off]}>
      <View style={s.stepN}><Text style={s.stepNText}>{n}</Text></View>
      <View style={s.flex}>
        <Text style={s.stepTitle}>{title}</Text>
        <Text style={s.stepSub}>{sub}</Text>
        <View style={s.stepBody}>{children}</View>
      </View>
    </View>
  );
}

function Stat({ label, value, tone }) {
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={[s.statValue, tone === 'good' && s.good, tone === 'bad' && s.bad]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  good: { color: COLORS.success },
  bad: { color: COLORS.error },
  off: { opacity: 0.5 },
  lead: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginBottom: 12 },
  step: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  stepN: { width: 30, height: 30, borderRadius: 10, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center' },
  stepNText: { fontSize: 14, fontWeight: '800', color: COLORS.link },
  stepTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  stepSub: { fontSize: 12.5, color: COLORS.textSecondary, lineHeight: 18, marginTop: 3 },
  stepBody: { marginTop: 10, gap: 10, alignItems: 'flex-start' },
  file: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'stretch', paddingVertical: 11, paddingHorizontal: 14, borderRadius: RADIUS.md,
          borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.borderStrong, backgroundColor: COLORS.surface2 },
  fileOn: { borderStyle: 'solid', borderColor: COLORS.success, backgroundColor: COLORS.successBg },
  fileText: { flex: 1, fontSize: 13.5, fontWeight: '600', color: COLORS.textSecondary },
  fileTextOn: { color: COLORS.success },
  stats: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  stat: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: COLORS.cardBorder },
  statLabel: { fontSize: 10.5, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, marginTop: 3 },
  note: { borderRadius: RADIUS.md, padding: 12, marginBottom: 12 },
  noteOk: { backgroundColor: COLORS.successBg },
  noteBad: { backgroundColor: COLORS.errorBg },
  noteText: { fontSize: 13, fontWeight: '600', lineHeight: 19 },
  importBtn: { marginBottom: 12 },
  card: { marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  cardSub: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  rowTitle: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  rowSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  rowAmt: { fontSize: 13.5, fontWeight: '800', color: COLORS.textPrimary },
});
