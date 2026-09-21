import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StatusBar, Alert, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SHADOWS } from '../../constants/theme';
import { AR_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import common from '../../styles/common';
import AppLoader from '../../components/AppLoader';
import LoadError from '../../components/LoadError';
import FilterSelect from '../../components/FilterSelect';
import { Button } from '../../components/ui';
import { rupee, inrShort, MODES, withCompany, DateField } from './arShared';

let seq = 0;
const blank = () => ({ key: `l${++seq}`, paid_on: '', amount: '', mode: 'bank', remarks: '' });
const plotSort = (a, b) => {
  const m = (x) => { const r = String(x.plots).match(/^([A-Za-z-]*)(\d+)/); return r ? [r[1].toUpperCase(), Number(r[2])] : [String(x.plots), 0]; };
  const [pa, na] = m(a); const [pb, nb] = m(b);
  return pa.localeCompare(pb) || na - nb;
};
const ask = (title, msg, ok) => new Promise((resolve) => Alert.alert(title, msg, [
  { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) }, { text: ok, onPress: () => resolve(true) },
]));

// Receipts for a whole project, plot by plot — the phone version of the website's
// "Enter receipts" grid. Nothing is saved until the server preview passes.
export default function ARReceiptsEntryScreen({ navigation, route }) {
  const companyId = useSelector((st) => st.adminFilter?.companyId);
  const [accounts, setAccounts] = useState(null);
  const [err, setErr] = useState('');
  const [project, setProject] = useState(route?.params?.project || '');
  const [lines, setLines] = useState({});
  const [q, setQ] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

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

  const plots = useMemo(() => (accounts || [])
    .filter((a) => String(a.project_id) === String(project) && a.status !== 'frozen').sort(plotSort), [accounts, project]);

  useEffect(() => { setLines(Object.fromEntries(plots.map((a) => [a.id, [blank()]]))); setErrors({}); }, [plots]);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? plots.filter((a) => String(a.plots).toLowerCase().includes(n) || a.client_name.toLowerCase().includes(n)) : plots;
  }, [plots, q]);

  const filled = useMemo(() => plots.flatMap((a) => (lines[a.id] || [])
    .filter((l) => l.amount !== '' || l.paid_on !== '').map((l) => ({ ...l, account: a }))), [plots, lines]);
  const total = filled.reduce((t, l) => t + (Number(l.amount) || 0), 0);

  const setLine = (aid, key, k, v) => {
    setLines((m) => ({ ...m, [aid]: m[aid].map((l) => (l.key === key ? { ...l, [k]: v } : l)) }));
    setErrors((e) => { if (!e[key]) return e; const n = { ...e }; delete n[key]; return n; });
  };
  const addLine = (aid) => setLines((m) => ({ ...m, [aid]: [...m[aid], blank()] }));
  const removeLine = (aid, key) => setLines((m) => ({ ...m, [aid]: m[aid].length > 1 ? m[aid].filter((l) => l.key !== key) : [blank()] }));

  async function send(commit) {
    const rows = filled.map((l) => ({ line: l.key, account_id: l.account.id, plot: l.account.plots, paid_on: l.paid_on, amount: l.amount, mode: l.mode, remarks: l.remarks }));
    const r = await apiFetch(withCompany(AR_ENDPOINTS.importEntries, companyId), { method: 'POST', body: JSON.stringify({ project_id: project, rows, commit }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.detail || 'Could not check the payments.');
    return d;
  }

  async function review() {
    setBusy(true); setErrors({});
    try {
      const d = await send(false);
      if (d.skipped) {
        setErrors(Object.fromEntries(d.skipped_rows.map((x) => [x.line, x.reason])));
        Alert.alert('Fix these first', `${d.skipped} payment${d.skipped === 1 ? ' needs' : 's need'} fixing — they are marked in red.`);
      } else if (await ask('Save receipts?', `Save ${d.ready} payment${d.ready === 1 ? '' : 's'} totalling ${rupee(d.total_amount)}?`, 'Save')) {
        const c = await send(true);
        if (c.committed) {
          setLines(Object.fromEntries(plots.map((a) => [a.id, [blank()]])));
          await load();
          Alert.alert('Saved', `${c.ready} receipt${c.ready === 1 ? '' : 's'} saved (${rupee(c.total_amount)}).`);
        } else if (c.skipped) setErrors(Object.fromEntries(c.skipped_rows.map((x) => [x.line, x.reason])));
      }
    } catch (e) { Alert.alert('Error', e.message || 'Could not save. Check your connection.'); }
    setBusy(false);
  }

  return (
    <SafeAreaView style={common.screen} edges={['top', 'bottom']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      <View style={common.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={common.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={s.flex}>
          <Text style={common.headerTitle}>Enter receipts</Text>
          <Text style={common.headerSub}>Plot-wise, one project at a time</Text>
        </View>
      </View>

      {accounts === null && !err ? <AppLoader label="Loading projects…" /> : err && !accounts ? <LoadError message={err} onRetry={load} /> : (
        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.top}>
            <FilterSelect label="Project" value={project} onChange={setProject}
              options={[{ value: '', label: 'Choose project' }, ...projects.map(([id, name]) => ({ value: id, label: name }))]} />
            {project ? (
              <View style={[common.searchBox, s.search]}>
                <Ionicons name="search" size={16} color={COLORS.textSecondary} />
                <TextInput style={s.searchInput} value={q} onChangeText={setQ} placeholder="Find plot or client" placeholderTextColor={COLORS.textTertiary} />
              </View>
            ) : null}
          </View>

          {!project ? <Text style={s.empty}>Choose a project to see its plots.</Text> : (
            <FlatList
              data={shown}
              keyExtractor={(a) => String(a.id)}
              contentContainerStyle={s.list}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={8}
              windowSize={7}
              ListEmptyComponent={<Text style={s.empty}>No plot or client matches.</Text>}
              renderItem={({ item: a }) => (
                <View style={[common.card, s.card]}>
                  <View style={s.cardHead}>
                    <View style={s.plotBadge}><Text style={s.plotText}>{a.plots}</Text></View>
                    <View style={s.flex}>
                      <Text style={s.client} numberOfLines={1}>{a.client_name || '—'}</Text>
                      <Text style={s.sub}>Received so far {a.received ? inrShort(a.received) : '₹0'}</Text>
                    </View>
                    <TouchableOpacity onPress={() => addLine(a.id)} style={s.addBtn} accessibilityLabel="Add another payment">
                      <Ionicons name="add" size={18} color={COLORS.link} />
                    </TouchableOpacity>
                  </View>
                  {(lines[a.id] || []).map((l, i) => (
                    <View key={l.key} style={[s.line, i > 0 && s.lineMore, errors[l.key] && s.lineErr]}>
                      <View style={s.row}>
                        <DateField compact maxToday value={l.paid_on} onChange={(d) => setLine(a.id, l.key, 'paid_on', d)} placeholder="Paid on" style={s.flex} />
                        <TextInput style={[common.input, s.amount]} value={l.amount} keyboardType="decimal-pad" placeholder="Amount ₹"
                          placeholderTextColor={COLORS.textTertiary} onChangeText={(v) => setLine(a.id, l.key, 'amount', v.replace(/[^0-9.]/g, ''))} />
                        {(lines[a.id].length > 1 || l.amount || l.paid_on) ? (
                          <TouchableOpacity onPress={() => removeLine(a.id, l.key)} style={s.del} accessibilityLabel="Remove payment">
                            <Ionicons name="close" size={17} color={COLORS.textSecondary} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      <View style={s.modes}>
                        {MODES.map((m) => (
                          <TouchableOpacity key={m.value} onPress={() => setLine(a.id, l.key, 'mode', m.value)}
                            style={[s.mode, l.mode === m.value && s.modeOn]}>
                            <Text style={[s.modeText, l.mode === m.value && s.modeTextOn]}>{m.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {l.amount ? <Text style={s.hint}>{rupee(l.amount)}</Text> : null}
                      {errors[l.key] ? <Text style={s.reason}>{errors[l.key]}</Text> : null}
                    </View>
                  ))}
                </View>
              )}
            />
          )}

          {project ? (
            <View style={s.foot}>
              <View style={s.flex}>
                <Text style={s.footCount}>{filled.length} payment{filled.length === 1 ? '' : 's'}</Text>
                <Text style={s.footTotal}>{inrShort(total)}{Object.keys(errors).length ? <Text style={s.footErr}>  · {Object.keys(errors).length} to fix</Text> : null}</Text>
              </View>
              <Button title="Review & save" variant="primary" loading={busy} disabled={filled.length === 0} onPress={review} />
            </View>
          ) : null}
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  top: { paddingHorizontal: 16, gap: 10, marginBottom: 10 },
  search: { marginTop: 0 },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, paddingVertical: 0 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 13.5, padding: 32 },
  card: { marginBottom: 10, padding: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  plotBadge: { minWidth: 42, paddingHorizontal: 8, height: 36, borderRadius: 11, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center' },
  plotText: { fontSize: 13, fontWeight: '800', color: COLORS.link },
  client: { fontSize: 14.5, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center' },
  line: { gap: 8, paddingTop: 2 },
  lineMore: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border, borderStyle: 'dashed' },
  lineErr: { backgroundColor: COLORS.errorBg, borderRadius: RADIUS.md, padding: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, fontSize: 14, borderWidth: 1, textAlign: 'right' },
  del: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  modes: { flexDirection: 'row', gap: 6 },
  mode: { flex: 1, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.surface },
  modeOn: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.link },
  modeText: { fontSize: 12.5, fontWeight: '600', color: COLORS.textSecondary },
  modeTextOn: { color: COLORS.link, fontWeight: '800' },
  hint: { fontSize: 11.5, color: COLORS.textSecondary },
  reason: { fontSize: 12, fontWeight: '700', color: COLORS.error },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.surface,
          borderTopWidth: 1, borderTopColor: COLORS.border, ...SHADOWS.md },
  footCount: { fontSize: 12, color: COLORS.textSecondary },
  footTotal: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  footErr: { fontSize: 12.5, color: COLORS.error, fontWeight: '700' },
});
