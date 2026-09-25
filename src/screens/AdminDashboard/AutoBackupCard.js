import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, Alert, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { COLORS } from '../../constants/theme';
import { SALES_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import common from '../../styles/common';
import { Button } from '../../components/ui';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const FREQS = [['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']];
const fmtWhen = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const fmtSize = (b) => (b ? `${(b / 1024 / 1024).toFixed(1)} MB` : '—');

// Automatic backup — mirrors the web card (web/src/app/admin/data-backup): a stored
// workbook on a schedule, "Take one now", and the kept list to download from.
// Taking one by hand saves it to this phone straight away, as the web downloads it.
export default function AutoBackupCard({ companyId, company, ready }) {
  const [sched, setSched] = useState(null);
  const [busy, setBusy] = useState('');          // '' | 'save' | 'take' | `get:<id>`
  const [keepDraft, setKeepDraft] = useState('10');

  const load = useCallback(async () => {
    if (!ready) { setSched(null); return; }
    try {
      const r = await apiFetch(SALES_ENDPOINTS.backupSchedule(companyId));
      if (r.ok) setSched(await r.json());
    } catch (e) { /* the card just stays empty */ }
  }, [ready, companyId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (sched?.keep_last != null) setKeepDraft(String(sched.keep_last)); }, [sched?.keep_last]);

  async function save(patch) {
    setBusy('save');
    try {
      const r = await apiFetch(SALES_ENDPOINTS.backupSchedule(companyId), { method: 'PATCH', body: JSON.stringify(patch) });
      if (r.ok) setSched(await r.json());
      else Alert.alert('Not saved', 'The schedule could not be changed.');
    } catch (e) { Alert.alert('Not saved', 'Check your connection and try again.'); }
    setBusy('');
  }

  function commitKeep() {
    const n = parseInt(keepDraft, 10);
    if (!Number.isFinite(n)) { setKeepDraft(String(sched?.keep_last ?? 10)); return; }
    const clamped = Math.max(1, Math.min(50, n));       // same bounds the server applies
    setKeepDraft(String(clamped));
    if (clamped !== sched?.keep_last) save({ keep_last: clamped });
  }

  // Fetch a stored backup's link, save it to the phone and open the share sheet.
  async function saveToPhone(id) {
    const r = await apiFetch(SALES_ENDPOINTS.backupStored(id, companyId));
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.url) throw new Error(d.detail || 'No download link.');
    const name = `${(company?.name || 'company').replace(/[^A-Za-z0-9]+/g, '-')}-backup-${id}.xlsx`;
    const got = await FileSystem.downloadAsync(d.url, FileSystem.cacheDirectory + name);
    if (got.status !== 200) throw new Error('The file could not be saved to this phone.');
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(got.uri, { mimeType: XLSX, UTI: 'org.openxmlformats.spreadsheetml.sheet',
        dialogTitle: `Backup · ${company?.name || ''}` });
    } else {
      Alert.alert('Saved', `Workbook saved to:\n${got.uri}`);
    }
  }

  async function takeNow() {
    setBusy('take');
    try {
      const r = await apiFetch(SALES_ENDPOINTS.backupSchedule(companyId), { method: 'POST' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { Alert.alert('Backup not taken', d.detail || 'Try again.'); setBusy(''); return; }
      setSched(d);
      const latest = (d.history || [])[0];
      // Taking one by hand means you want it in hand too.
      if (latest?.id) await saveToPhone(latest.id);
    } catch (e) { Alert.alert('Backup taken, not saved', `${e.message} It is in the list below.`); }
    setBusy('');
  }

  async function download(id) {
    setBusy(`get:${id}`);
    try { await saveToPhone(id); }
    catch (e) { Alert.alert('Could not download', e.message); }
    setBusy('');
  }

  const history = sched?.history || [];
  return (
    <View style={[common.card, st.card]}>
      <Text style={st.title}>Automatic backup</Text>
      <Text style={st.sub}>
        Runs unattended and keeps the workbook, so there is always a recent one to fall back on.
      </Text>

      <Button title={busy === 'take' ? 'Taking…' : 'Take one now'} variant="secondary" icon="cloud-upload-outline"
        onPress={takeNow} loading={busy === 'take'} disabled={!ready || !!busy} full />

      <View style={st.rowBetween}>
        <Text style={st.label}>Enabled</Text>
        <Switch value={!!sched?.is_enabled} disabled={!ready || !!busy}
          onValueChange={(v) => save({ is_enabled: v })} />
      </View>

      <Text style={st.label}>Frequency</Text>
      <View style={st.seg}>
        {FREQS.map(([k, label]) => {
          const on = (sched?.frequency || 'weekly') === k;
          return (
            <TouchableOpacity key={k} onPress={() => save({ frequency: k })} disabled={!ready || !!busy}
              style={[st.segBtn, on && st.segOn]}>
              <Text style={[st.segText, on && st.segTextOn]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={st.label}>Keep last</Text>
      <TextInput style={st.input} value={keepDraft} onChangeText={setKeepDraft} onBlur={commitKeep}
        onSubmitEditing={commitKeep} keyboardType="number-pad" editable={ready && busy !== 'take'} />

      <Text style={[st.label, st.listHead]}>Stored backups</Text>
      {history.length === 0 ? <Text style={st.sub}>No stored backups yet.</Text> : history.map((h) => (
        <View key={h.id} style={st.hrow}>
          <View style={st.flex}>
            <Text style={st.hwhen}>{fmtWhen(h.taken_at)}</Text>
            <Text style={st.hmeta}>{h.rows?.toLocaleString('en-IN')} rows · {fmtSize(h.size)}{h.by ? ` · ${h.by}` : ''}</Text>
          </View>
          <Button title={busy === `get:${h.id}` ? '…' : 'Save'} variant="secondary" size="sm"
            onPress={() => download(h.id)} disabled={!!busy} />
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  card:      { padding: 16, marginBottom: 14 },
  title:     { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  sub:       { fontSize: 12.5, lineHeight: 18, color: COLORS.textSecondary, marginBottom: 12 },
  label:     { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  listHead:  { marginTop: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12 },
  seg:       { flexDirection: 'row', gap: 8, marginBottom: 12 },
  segBtn:    { flex: 1, paddingVertical: 9, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.surfaceAlt },
  segOn:     { backgroundColor: COLORS.linkBg },
  segText:   { fontSize: 12.5, fontWeight: '700', color: COLORS.textSecondary },
  segTextOn: { color: COLORS.link },
  input:     { borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
               fontSize: 14, color: COLORS.textPrimary, backgroundColor: COLORS.inputBg, marginBottom: 12 },
  hrow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  flex:      { flex: 1 },
  hwhen:     { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  hmeta:     { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 2 },
});
