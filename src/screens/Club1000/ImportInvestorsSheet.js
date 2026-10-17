// Import investors from Excel — same as the website's _ImportInvestors.js: get the
// template, pick the filled file to have every row checked (problems by Excel row),
// then import the rows that passed. They wait in Approvals like Add Investor.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { apiFetch } from '../../utils/apiFetch';
import { CLUB1000_ENDPOINTS } from '../../constants/api';
import { COLORS } from '../../constants/theme';
import { formatDMY } from '../../utils/dateFormat';
import { inrShort } from '../../lib/inr';
import { errText } from '../../lib/apiError';
import { downloadExcel } from '../../utils/downloadExcel';
import FormSheet from '../../components/FormSheet';

export default function ImportInvestorsSheet({ visible, onClose, onDone }) {
  const [file, setFile] = useState(null);
  const [check, setCheck] = useState(null);
  const [busy, setBusy] = useState('');
  const [onlyBad, setOnlyBad] = useState(false);

  function reset() { setFile(null); setCheck(null); setBusy(''); setOnlyBad(false); }

  async function template() {
    setBusy('template');
    const err = await downloadExcel(CLUB1000_ENDPOINTS.investorImportTemplate, 'club1000-investor-import-template.xlsx', 'Investor import template');
    setBusy('');
    if (err) Alert.alert('Template', err);
  }

  async function pick() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true,
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel', 'text/csv', 'text/comma-separated-values'] });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      const data = await FileSystem.readAsStringAsync(a.uri, { encoding: FileSystem.EncodingType.Base64 });
      setFile({ name: a.name || 'investors.xlsx', data }); setCheck(null);
    } catch (e) { Alert.alert('Could not open the file', e.message); }
  }

  async function send(commit) {
    setBusy(commit ? 'import' : 'check');
    const r = await apiFetch(CLUB1000_ENDPOINTS.investorImport, { method: 'POST', body: JSON.stringify({ file, commit }) }).catch(() => null);
    setBusy('');
    const d = r ? await r.json().catch(() => ({})) : {};
    if (!r || !r.ok) { Alert.alert('Not imported', errText(d, 'Could not read the file.')); return; }
    if (commit) {
      Alert.alert('Imported', `${d.created} investor${d.created === 1 ? '' : 's'} imported — waiting in Approvals.`);
      reset(); onDone();
      return;
    }
    setCheck(d);
  }

  const rows = check ? check.rows.filter((r) => !onlyBad || !r.ok) : [];
  return (
    <FormSheet visible={visible} onClose={() => { reset(); onClose(); }}>
      <View style={s.head}>
        <View style={s.flex}>
          <Text style={s.title}>Import investors from Excel</Text>
          <Text style={s.sub}>Each one waits in Approvals, like one added by hand</Text>
        </View>
        <TouchableOpacity onPress={() => { reset(); onClose(); }} style={s.close}><Ionicons name="close" size={18} color={COLORS.textPrimary} /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.body}>
        <Text style={s.section}>1 · GET THE TEMPLATE</Text>
        <Text style={s.help}>One row per investment. Scheme, payout and source are dropdowns; the Help sheet explains every column.</Text>
        <TouchableOpacity onPress={template} disabled={!!busy} style={s.ghostBtn}>
          {busy === 'template' ? <ActivityIndicator size="small" color={COLORS.link} /> : <Text style={s.ghostText}>⬇ Download template</Text>}
        </TouchableOpacity>

        <Text style={s.section}>2 · PICK THE FILLED FILE</Text>
        <TouchableOpacity onPress={pick} disabled={!!busy} style={s.pick}>
          <Ionicons name="document-attach-outline" size={18} color={COLORS.link} />
          <Text style={s.pickText} numberOfLines={1}>{file ? file.name : 'Choose an .xlsx or .csv file'}</Text>
        </TouchableOpacity>

        {!!check && <>
          <Text style={s.section}>3 · REVIEW</Text>
          <View style={s.sum}>
            <Text style={s.sumOk}>✓ {check.ok} ready · {inrShort(check.amount)}</Text>
            {check.failed > 0 && <Text style={s.sumBad}>⚠ {check.failed} with problems — left out</Text>}
            {check.failed > 0 && (
              <TouchableOpacity onPress={() => setOnlyBad((v) => !v)}><Text style={s.link}>{onlyBad ? 'Show all rows' : 'Show only problems'}</Text></TouchableOpacity>
            )}
          </View>
          {rows.map((r) => (
            <View key={r.row} style={[s.row, !r.ok && s.rowBad]}>
              <View style={s.rowTop}>
                <Text style={s.rowNo}>Row {r.row}</Text>
                <Text style={s.rowName} numberOfLines={1}>{r.preview.name || '—'}</Text>
                <Text style={s.rowAmt}>{r.preview.amount ? inrShort(r.preview.amount) : '—'}</Text>
              </View>
              <Text style={s.rowSub}>{r.preview.scheme || '—'} · {r.preview.interest_payout}{r.preview.investment_date ? ` · ${formatDMY(r.preview.investment_date)} → ${formatDMY(r.preview.maturity_date)}` : ''}</Text>
              {r.ok ? <Text style={s.ok}>Ready</Text> : r.errors.map((e) => <Text key={e} style={s.bad}>• {e}</Text>)}
              {r.warnings.map((w) => <Text key={w} style={s.warn}>• {w}</Text>)}
            </View>
          ))}
        </>}

        {check && check.ok > 0 ? (
          <TouchableOpacity onPress={() => send(true)} disabled={!!busy} style={s.goBtn}>
            {busy === 'import' ? <ActivityIndicator color={COLORS.btnTextSuccess} /> : <Text style={s.goText}>Import {check.ok} investor{check.ok === 1 ? '' : 's'} · {inrShort(check.amount)}</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => send(false)} disabled={!file || !!busy} style={[s.goBtn, (!file || busy) && s.dim]}>
            {busy === 'check' ? <ActivityIndicator color={COLORS.btnTextSuccess} /> : <Text style={s.goText}>{check ? 'Check again' : 'Check file'}</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>
    </FormSheet>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.screenBg, justifyContent: 'center', alignItems: 'center' },
  body: { paddingHorizontal: 16, paddingBottom: 30 },
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: COLORS.link, marginTop: 14, marginBottom: 6 },
  help: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
  ghostBtn: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, minWidth: 160, alignItems: 'center' },
  ghostText: { fontSize: 13, fontWeight: '700', color: COLORS.link },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, backgroundColor: COLORS.surface },
  pickText: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  sum: { gap: 4, marginBottom: 8 },
  sumOk: { fontSize: 13, fontWeight: '800', color: COLORS.success },
  sumBad: { fontSize: 13, fontWeight: '800', color: COLORS.error },
  link: { fontSize: 12, fontWeight: '700', color: COLORS.link },
  row: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, marginBottom: 8, backgroundColor: COLORS.surface },
  rowBad: { borderColor: COLORS.error, backgroundColor: COLORS.errorBg },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowNo: { fontSize: 11, color: COLORS.textSecondary, width: 50 },
  rowName: { flex: 1, fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  rowAmt: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  rowSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3, marginBottom: 3 },
  ok: { fontSize: 11.5, fontWeight: '700', color: COLORS.success },
  bad: { fontSize: 11.5, fontWeight: '700', color: COLORS.error },
  warn: { fontSize: 11.5, fontWeight: '700', color: COLORS.warning },
  goBtn: { marginTop: 18, backgroundColor: COLORS.btnTintSuccess, borderWidth: 1, borderColor: COLORS.btnBorderSuccess, borderRadius: 16, height: 48, alignItems: 'center', justifyContent: 'center' },
  goText: { color: COLORS.btnTextSuccess, fontSize: 15, fontWeight: '800' },
  dim: { opacity: 0.5 },
});
