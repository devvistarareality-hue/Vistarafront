import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StatusBar, Alert, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { COLORS } from '../../constants/theme';
import { SALES_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import { fetchCompanies } from '../../redux/actions/companiesActions';
import { setAdminCompany } from '../../redux/reducers/adminFilterReducer';
import common from '../../styles/common';
import FilterSelect from '../../components/FilterSelect';
import { Button } from '../../components/ui';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// The same two things the website's Data Backup page offers, for one company:
// take an Excel snapshot, and put one back after a Data Reset. The scheduled
// JSON backups stay a web/server concern — there is nothing to tap for those.
export default function DataBackupScreen({ navigation }) {
  const dispatch = useDispatch();
  const me = useSelector((s) => s.auth.user);
  const picked = useSelector((s) => s.adminFilter?.companyId);
  const companies = useSelector((s) => s.companies?.companies || []);
  // Only a VRL platform admin backs up somebody else's company, so only they get
  // a picker. Everyone else has exactly one — theirs — and the id is left off so
  // the server pins it to them.
  const isModuleAdmin = me?.role === 'Admin' && !me?.is_staff && (me?.modules || []).length === 1;
  const isPlatformAdmin = me?.company_code === 'VRL' && me?.role === 'Admin' && !isModuleAdmin;
  const companyId = isPlatformAdmin ? picked : null;
  const company = isPlatformAdmin
    ? (companies.find((c) => c.id === picked) || null)
    : (me?.company_name ? { name: me.company_name } : null);
  const ready = isPlatformAdmin ? !!picked : true;

  const [busy, setBusy] = useState('');       // 'download' | 'check' | 'restore'
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [resetInfo, setResetInfo] = useState(null);
  const [resetKey, setResetKey] = useState('');

  useEffect(() => { if (isPlatformAdmin) dispatch(fetchCompanies()); }, [dispatch, isPlatformAdmin]);
  // A different company or a different file invalidates what was checked.
  useEffect(() => { setPreview(null); }, [companyId, file]);

  const loadReset = useCallback(async () => {
    if (!ready) { setResetInfo(null); return; }
    try {
      const r = await apiFetch(SALES_ENDPOINTS.backupReset(companyId));
      setResetInfo(r.ok ? await r.json() : null);
    } catch (e) { setResetInfo(null); }
  }, [ready, companyId]);

  useEffect(() => { loadReset(); }, [loadReset]);

  function confirmReset() {
    Alert.alert('Delete everything?',
      `This empties every module for ${company?.name || 'this company'} — leads, bookings, `
      + 'projects, plots, users, AR, tasks, Club 1000. Your own account is kept so you can sign '
      + 'back in and restore from the backup. There is no undo.',
      [{ text: 'Cancel', style: 'cancel' },
       { text: 'Delete everything', style: 'destructive', onPress: runReset }]);
  }

  async function runReset() {
    setBusy('reset');
    try {
      const r = await apiFetch(SALES_ENDPOINTS.backupReset(companyId), {
        method: 'POST', body: JSON.stringify({ reset_key: resetKey, confirm: 'DELETE' }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) Alert.alert('Reset refused', d.detail || 'Could not reset.');
      else { Alert.alert('Reset done', d.detail); setResetKey(''); }
      loadReset();
    } catch (e) { Alert.alert('Reset failed', 'Check your connection and try again.'); }
    setBusy('');
  }

  async function download() {
    setBusy('download');
    try {
      const token = await AsyncStorage.getItem('access_token');
      const name = `${(company?.name || 'company').replace(/[^A-Za-z0-9]+/g, '-')}-backup.xlsx`;
      const { uri, status } = await FileSystem.downloadAsync(
        SALES_ENDPOINTS.backupExcel(companyId), FileSystem.cacheDirectory + name,
        { headers: { Authorization: `Bearer ${token}` } });
      if (status === 403) { Alert.alert('No access', 'Only a platform super admin can take a backup.'); return; }
      if (status === 404) { Alert.alert('Not available yet', 'This server does not have the Excel backup — the backend needs deploying.'); return; }
      if (status !== 200) { Alert.alert('Backup failed', 'Could not build the workbook. Try again.'); return; }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: XLSX, UTI: 'org.openxmlformats.spreadsheetml.sheet',
          dialogTitle: `Backup · ${company?.name || ''}` });
      } else {
        Alert.alert('Saved', 'Workbook saved to:\n' + uri);
      }
      loadReset();
    } catch (e) {
      Alert.alert('Backup failed', 'Check your connection and try again.');
    }
    setBusy('');
  }

  async function pickFile() {
    const res = await DocumentPicker.getDocumentAsync({ type: [XLSX, 'application/vnd.ms-excel'], copyToCacheDirectory: true });
    if (!res.canceled && res.assets?.[0]) { setFile(res.assets[0]); setPreview(null); }
  }

  async function send(commit) {
    setBusy(commit ? 'restore' : 'check');
    try {
      const token = await AsyncStorage.getItem('access_token');
      const form = new FormData();
      form.append('file', { uri: file.uri, name: file.name || 'backup.xlsx', type: file.mimeType || XLSX });
      if (companyId) form.append('company_id', String(companyId));
      if (commit) form.append('commit', '1');
      // multipart: let fetch set the boundary, so no JSON content-type here
      const r = await fetch(SALES_ENDPOINTS.backupRestore, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const d = await r.json().catch(() => ({}));
      if (r.status === 409) {
        setPreview(null);
        Alert.alert('Already there', d.detail || 'Those records still exist, so nothing was written.');
      } else if (!r.ok) {
        setPreview(null);
        Alert.alert('Restore failed', d.detail || 'The file could not be read.');
      } else if (commit) {
        setPreview(null); setFile(null); loadReset();
        Alert.alert('Restored', `${d.total} record${d.total === 1 ? '' : 's'} put back into ${company?.name || 'the company'}.`);
      } else {
        setPreview(d);
      }
    } catch (e) {
      Alert.alert('Restore failed', 'Check your connection and try again.');
    }
    setBusy('');
  }

  function confirmRestore() {
    Alert.alert('Restore this backup?',
      `Put ${preview.total} record${preview.total === 1 ? '' : 's'} back into ${company?.name || 'this company'}? `
      + 'This only fills what is missing — it never overwrites what is already there.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Restore', onPress: () => send(true) }]);
  }

  const rows = (preview?.plan || []).filter((p) => p.restore > 0);

  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      <View style={common.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={common.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={s.flex}>
          <Text style={common.headerTitle}>Data Backup</Text>
          <Text style={common.headerSub}>Take an Excel snapshot, or put one back</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={common.scroll}>
        {isPlatformAdmin ? (
          <>
            <Text style={common.sectionLabel}>Company</Text>
            <FilterSelect label="Choose a company" value={picked}
              onChange={(v) => dispatch(setAdminCompany(v))}
              options={companies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))} />
          </>
        ) : null}

        <View style={[common.card, s.card]}>
          <Text style={s.title}>Download as Excel</Text>
          <Text style={s.sub}>
            {company
              ? `A sheet per module for ${company.name} — Sales, Channel Partner, HR, AR, Task Allocation and Club 1000, as they stand right now.`
              : 'Choose a company above — a backup is always of one company.'}
          </Text>
          <Button title={busy === 'download' ? 'Building…' : 'Download Excel'}
            icon="download-outline" onPress={download}
            loading={busy === 'download'} disabled={!ready || !!busy} full />
          {company ? <Text style={s.hint}>A large company takes a minute to build.</Text> : null}
        </View>

        <View style={[common.card, s.card]}>
          <Text style={s.title}>Restore from Excel</Text>
          <Text style={s.sub}>
            Rebuilds this company from the workbook — every module, with the original ids, so
            everything still points where it did. Records already there are left alone, so this
            fills what is missing and never overwrites what is live. Restored user accounts come
            back without a password, so set one for each before they sign in.
          </Text>

          <TouchableOpacity onPress={pickFile} style={s.file} activeOpacity={0.8} disabled={!!busy}>
            <Ionicons name="document-attach-outline" size={18} color={COLORS.link} />
            <Text style={s.fileText} numberOfLines={1}>{file ? file.name : 'Choose a backup file'}</Text>
          </TouchableOpacity>

          {rows.length > 0 ? (
            <View style={s.plan}>
              {rows.map((p) => (
                <View style={s.planRow} key={p.table}>
                  <Text style={s.planLabel}>{p.table}</Text>
                  <Text style={s.planValue}>{p.restore.toLocaleString('en-IN')}</Text>
                </View>
              ))}
              {preview.already_there > 0 ? (
                <View style={s.planRow}>
                  <Text style={s.planLabel}>Already there, left alone</Text>
                  <Text style={s.planValue}>{preview.already_there.toLocaleString('en-IN')}</Text>
                </View>
              ) : null}
              <View style={[s.planRow, s.planTotal]}>
                <Text style={s.planTotalLabel}>Will be restored</Text>
                <Text style={s.planTotalValue}>{preview.total.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          ) : null}

          <View style={s.actions}>
            <Button title={busy === 'check' ? 'Checking…' : 'Check file'} variant="secondary"
              onPress={() => send(false)} loading={busy === 'check'}
              disabled={!ready || !file || !!busy} style={s.flex} />
            <Button title={busy === 'restore' ? 'Restoring…' : 'Restore'}
              onPress={confirmRestore} loading={busy === 'restore'}
              disabled={!preview || !!busy} style={s.flex} />
          </View>
        </View>

        <View style={[common.card, s.card, s.danger]}>
          <Text style={[s.title, s.dangerTitle]}>Delete everything in this company</Text>
          <Text style={s.sub}>
            Empties every module back to nothing. Your own account is kept so you can sign back in
            and restore. There is no undo except the backup above, which is why one is required
            first.
          </Text>

          <Text style={[s.gate, resetInfo?.can_reset ? s.gateOk : s.gateBad]}>
            {resetInfo?.can_reset
              ? '✓  Backup taken — a reset is allowed for 2 hours'
              : '✕  No recent backup, so a reset is blocked'}
          </Text>
          <Text style={[s.gate, resetInfo?.key_configured ? s.gateOk : s.gateBad]}>
            {resetInfo?.key_configured
              ? '✓  Reset key is configured on the server'
              : '✕  No reset key on the server — reset is disabled'}
          </Text>

          {resetInfo?.total > 0 ? (
            <Text style={s.hint}>{resetInfo.total.toLocaleString('en-IN')} records would be deleted.</Text>
          ) : null}

          <TextInput style={s.input} value={resetKey} onChangeText={setResetKey}
            placeholder="Reset key" placeholderTextColor={COLORS.textTertiary}
            secureTextEntry autoCapitalize="none"
            editable={!!resetInfo?.can_reset && !!resetInfo?.key_configured && !busy} />

          <Button title={busy === 'reset' ? 'Deleting…' : 'Reset this company'} variant="danger"
            onPress={confirmReset} loading={busy === 'reset'}
            disabled={!resetInfo?.can_reset || !resetInfo?.key_configured || !resetKey || !!busy}
            full />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  card: { marginTop: 12, padding: 16, gap: 10 },
  title: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 12.5, color: COLORS.textSecondary, lineHeight: 18 },
  hint: { fontSize: 11.5, color: COLORS.textTertiary },
  file: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12,
          borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: COLORS.border,
          backgroundColor: COLORS.inputBg },
  fileText: { flex: 1, fontSize: 13.5, fontWeight: '600', color: COLORS.textPrimary },
  plan: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10, gap: 2 },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  planLabel: { fontSize: 12.5, color: COLORS.textSecondary },
  planValue: { fontSize: 12.5, fontWeight: '700', color: COLORS.textPrimary },
  planTotal: { borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 6, paddingTop: 8 },
  planTotalLabel: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  planTotalValue: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  actions: { flexDirection: 'row', gap: 8 },
  danger: { borderColor: COLORS.error2, backgroundColor: COLORS.errorBg },
  dangerTitle: { color: COLORS.error },
  gate: { fontSize: 12.5, paddingVertical: 2 },
  gateOk: { color: COLORS.success },
  gateBad: { color: COLORS.error },
  input: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 14,
           paddingVertical: 11, fontSize: 14, color: COLORS.textPrimary, backgroundColor: COLORS.inputBg },
});
