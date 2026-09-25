import React, { useState } from 'react';
import { Modal, View, Text, TextInput, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { COLORS } from '../../constants/theme';
import { COMPANY_ENDPOINTS, SALES_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import { Button } from '../../components/ui';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Deleting a company takes every module's data with it and leaves nothing to restore
// into — so, like the web, it asks for the reset key and the company's own code, and
// backs the company up and saves that backup to the phone before anything goes.
const STAGES = {
  check:    'Checking the reset key and company code…',
  backup:   'Taking a full backup…',
  download: 'Saving the backup to this phone…',
  delete:   'Deleting the company…',
  confirm:  'Still deleting — checking with the server…',
};

async function saveBackup(company) {
  const b = await apiFetch(SALES_ENDPOINTS.backupSchedule(company.id), { method: 'POST' });
  const bd = await b.json().catch(() => ({}));
  const latest = (bd.history || [])[0];
  if (!b.ok || !latest?.id) throw new Error(bd.detail || 'The backup could not be taken.');
  const l = await apiFetch(SALES_ENDPOINTS.backupStored(latest.id, company.id));
  const ld = await l.json().catch(() => ({}));
  if (!l.ok || !ld.url) throw new Error(ld.detail || 'The backup could not be downloaded.');
  const name = `${company.name.replace(/[^A-Za-z0-9]+/g, '-')}-before-delete.xlsx`;
  const got = await FileSystem.downloadAsync(ld.url, FileSystem.cacheDirectory + name).catch(() => null);
  if (!got || got.status !== 200) throw new Error('The backup could not be saved to this phone.');
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(got.uri, { mimeType: XLSX, UTI: 'org.openxmlformats.spreadsheetml.sheet',
      dialogTitle: `Backup before delete · ${company.name}` });
  }
}

// A big company can take longer to delete than the connection stays open; the
// server still finishes. Gone from the server means deleted.
async function waitUntilGone(id) {
  for (let i = 0; i < 120; i++) {                 // up to 10 minutes
    await new Promise((res) => setTimeout(res, 5000));
    try {
      const r = await apiFetch(COMPANY_ENDPOINTS.detail(id));
      if (r.status === 404) return true;
    } catch (e) { /* keep asking */ }
  }
  return false;
}

export default function DeleteCompanySheet({ company, onClose, onDeleted }) {
  const [key, setKey] = useState('');
  const [typed, setTyped] = useState('');
  const [stage, setStage] = useState('');
  if (!company) return null;

  const busy = !!stage;
  const codeOk = typed.trim().toUpperCase() === company.code.toUpperCase();

  async function run() {
    try {
      // Refuse a wrong key or code straight away, before minutes of backup.
      setStage('check');
      const chk = await apiFetch(COMPANY_ENDPOINTS.detail(company.id), {
        method: 'DELETE', body: JSON.stringify({ reset_key: key, confirm: typed.trim(), check_only: true }) });
      if (!chk.ok) {
        const cd = await chk.json().catch(() => ({}));
        Alert.alert('Not deleted', cd.detail || 'Nothing was deleted.');
        setStage(''); return;
      }
      setStage('backup');
      await saveBackup(company);
      setStage('delete');
      let r = null, d = {};
      try {
        r = await apiFetch(COMPANY_ENDPOINTS.detail(company.id), {
          method: 'DELETE', body: JSON.stringify({ reset_key: key, confirm: typed.trim() }) });
        if (r.status !== 204) d = await r.json().catch(() => ({}));
      } catch (e) { r = null; }
      if (!r || r.status === 502 || r.status === 504) {
        setStage('confirm');
        if (await waitUntilGone(company.id)) { setStage(''); onDeleted(company); return; }
        Alert.alert('Could not confirm', 'The server may still be working. Check this screen again in a minute.');
      } else if (r.ok) {
        setStage(''); onDeleted(company); return;
      } else {
        Alert.alert('Not deleted', d.detail || `The server returned ${r.status}. Nothing was deleted.`);
      }
    } catch (e) {
      Alert.alert('Not deleted', `${e.message} Nothing was deleted.`);
    }
    setStage('');
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={busy ? undefined : onClose}>
      <KeyboardAvoidingView style={st.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.sheet}>
          <Text style={st.title}>Delete {company.name}</Text>
          <Text style={st.text}>
            This permanently deletes {company.name} and everything in it — users, leads, bookings,
            projects, AR, Club 1000, tasks and its backups list. A full backup is taken and saved to
            this phone first, but it can only be restored into this company, which will no longer exist.
          </Text>

          <Text style={st.label}>Reset key</Text>
          <TextInput style={st.input} value={key} onChangeText={setKey} editable={!busy}
            placeholder="From the server environment" placeholderTextColor={COLORS.textTertiary}
            secureTextEntry autoCapitalize="none" autoCorrect={false} />

          <Text style={st.label}>Type the company code {company.code} to confirm</Text>
          <TextInput style={st.input} value={typed} onChangeText={setTyped} editable={!busy}
            placeholder={company.code} placeholderTextColor={COLORS.textTertiary}
            autoCapitalize="characters" autoCorrect={false} />

          {busy ? <Text style={st.stage}>{STAGES[stage]}</Text> : null}

          <View style={st.actions}>
            <Button title="Cancel" variant="secondary" onPress={onClose} disabled={busy} />
            <Button title={busy ? 'Working…' : 'Back up & delete'} variant="danger"
              onPress={run} loading={busy} disabled={busy || !key || !codeOk} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'center', padding: 16 },
  sheet:    { backgroundColor: COLORS.cardBg, borderRadius: 20, padding: 20 },
  title:    { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  text:     { fontSize: 13, lineHeight: 19, color: COLORS.textSecondary, marginBottom: 14 },
  label:    { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  input:    { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12,
              paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary, backgroundColor: COLORS.inputBg, marginBottom: 12 },
  stage:    { fontSize: 13, fontWeight: '600', color: COLORS.info, marginBottom: 10 },
  actions:  { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
});
