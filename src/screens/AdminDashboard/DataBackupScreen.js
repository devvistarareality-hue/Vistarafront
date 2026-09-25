import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StatusBar, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { COLORS } from '../../constants/theme';
import { SALES_ENDPOINTS } from '../../constants/api';
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
  const companyId = useSelector((s) => s.adminFilter?.companyId);
  const companies = useSelector((s) => s.companies?.companies || []);
  const company = companies.find((c) => c.id === companyId) || null;

  const [busy, setBusy] = useState('');       // 'download' | 'check' | 'restore'
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => { dispatch(fetchCompanies()); }, [dispatch]);
  // A different company or a different file invalidates what was checked.
  useEffect(() => { setPreview(null); }, [companyId, file]);

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
      form.append('company_id', String(companyId));
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
        setPreview(null); setFile(null);
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
      + 'This only fills data that has been cleared — it never overwrites what is there.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Restore', onPress: () => send(true) }]);
  }

  const rows = (preview?.plan || []).filter((p) => p.rows > 0);

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
        <Text style={common.sectionLabel}>Company</Text>
        <FilterSelect label="Choose a company" value={companyId}
          onChange={(v) => dispatch(setAdminCompany(v))}
          options={companies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))} />

        <View style={[common.card, s.card]}>
          <Text style={s.title}>Download as Excel</Text>
          <Text style={s.sub}>
            {company
              ? `A sheet per module for ${company.name} — Sales, Channel Partner, HR, AR, Task Allocation and Club 1000, as they stand right now.`
              : 'Choose a company above — a backup is always of one company.'}
          </Text>
          <Button title={busy === 'download' ? 'Building…' : 'Download Excel'}
            icon="download-outline" onPress={download}
            loading={busy === 'download'} disabled={!companyId || !!busy} full />
          {company ? <Text style={s.hint}>A large company takes a minute to build.</Text> : null}
        </View>

        <View style={[common.card, s.card]}>
          <Text style={s.title}>Restore from Excel</Text>
          <Text style={s.sub}>
            For after a Data Reset: this writes back the leads, follow-ups, site visits, bookings,
            closures, distribution log, availability and notifications from the file, with their
            original ids. It refuses if any of those records still exist, so it can only fill data
            that has been cleared — never overwrite what is live.
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
                  <Text style={s.planValue}>{p.rows.toLocaleString('en-IN')}</Text>
                </View>
              ))}
              <View style={[s.planRow, s.planTotal]}>
                <Text style={s.planTotalLabel}>Ready to restore</Text>
                <Text style={s.planTotalValue}>{preview.total.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          ) : null}

          <View style={s.actions}>
            <Button title={busy === 'check' ? 'Checking…' : 'Check file'} variant="secondary"
              onPress={() => send(false)} loading={busy === 'check'}
              disabled={!companyId || !file || !!busy} style={s.flex} />
            <Button title={busy === 'restore' ? 'Restoring…' : 'Restore'}
              onPress={confirmRestore} loading={busy === 'restore'}
              disabled={!preview || !!busy} style={s.flex} />
          </View>
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
});
