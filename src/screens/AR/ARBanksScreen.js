import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../../constants/theme';
import { AR_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import common from '../../styles/common';
import AppLoader from '../../components/AppLoader';
import LoadError from '../../components/LoadError';
import FormSheet from '../../components/FormSheet';
import { Button } from '../../components/ui';
import { rupee, withCompany, cleanAmount, groupINR } from './arShared';

// Bank Master — mirrors the web page (web/src/app/m/[module]/banks). A Loan payment is
// recorded into one of these banks; its balance = opening balance + those payments,
// worked out by the server every time.
export default function ARBanksScreen({ navigation }) {
  const companyId = useSelector((st) => st.adminFilter?.companyId);
  const [rows, setRows] = useState(null);
  const [canManage, setCanManage] = useState(false);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState(null);      // { id?, name, account_no, opening_balance }
  const [formErr, setFormErr] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setErr('');
    try {
      const r = await apiFetch(withCompany(AR_ENDPOINTS.banks, companyId));
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.detail || 'Could not load the banks.'); setRows([]); return; }
      setRows(d.results || []); setCanManage(!!d.can_manage);
    } catch (e) { setErr('Check your connection and try again.'); setRows([]); }
  }, [companyId]);
  useEffect(() => { load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const openNew = () => { setFormErr({}); setForm({ name: '', account_no: '', opening_balance: '' }); };
  const openEdit = (b) => { setFormErr({}); setForm({ id: b.id, name: b.name, account_no: b.account_no, opening_balance: String(b.opening_balance) }); };

  async function save() {
    setSaving(true); setFormErr({});
    try {
      const r = await apiFetch(withCompany(form.id ? AR_ENDPOINTS.bank(form.id) : AR_ENDPOINTS.banks, companyId), {
        method: form.id ? 'PATCH' : 'POST',
        body: JSON.stringify({ name: form.name, account_no: form.account_no, opening_balance: form.opening_balance || 0 }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setFormErr(d.detail ? { _: d.detail } : d); setSaving(false); return; }
      setForm(null);
      await load();
    } catch (e) { setFormErr({ _: 'Could not save. Check your connection.' }); }
    setSaving(false);
  }

  async function reactivate(b) {
    const r = await apiFetch(withCompany(AR_ENDPOINTS.bank(b.id), companyId), { method: 'PATCH', body: JSON.stringify({ is_active: true }) }).catch(() => null);
    if (r?.ok) load(); else Alert.alert('Error', 'Could not update the bank.');
  }

  function remove(b) {
    const used = b.received > 0;
    Alert.alert(used ? 'Retire bank?' : 'Remove bank?',
      used ? `${b.name} has payments recorded against it, so it will be retired (kept for history, not offered for new payments).`
           : `Remove ${b.name}? It has no payments recorded against it.`,
      [{ text: 'Cancel', style: 'cancel' },
       { text: used ? 'Retire' : 'Remove', style: 'destructive', onPress: async () => {
           const r = await apiFetch(withCompany(AR_ENDPOINTS.bank(b.id), companyId), { method: 'DELETE' }).catch(() => null);
           if (r?.ok) load(); else Alert.alert('Error', 'Could not remove the bank.');
         } }]);
  }

  const active = (rows || []).filter((b) => b.is_active);
  const total = active.reduce((a, b) => a + (b.balance || 0), 0);

  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <View style={common.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={common.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={s.flex}>
          <Text style={common.headerTitle} numberOfLines={1}>Bank Master</Text>
          <Text style={common.headerSub} numberOfLines={1}>Loan payments are received into these</Text>
        </View>
        {canManage ? <Button title="+ Add" size="sm" variant="primary" onPress={openNew} /> : null}
      </View>

      {rows === null ? <AppLoader label="Loading banks…" /> : err && !rows.length ? <LoadError message={err} onRetry={load} /> : (
        <ScrollView contentContainerStyle={s.body} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {active.length > 1 ? (
            <View style={[common.card, s.totalCard]}>
              <Text style={s.totalLabel}>Total across active banks</Text>
              <Text style={s.totalValue}>{rupee(total)}</Text>
            </View>
          ) : null}
          {!rows.length ? (
            <Text style={s.empty}>No banks yet.{canManage ? ' Tap Add to enter your first bank with its opening balance.' : ''}</Text>
          ) : rows.map((b) => (
            <View key={b.id} style={[common.card, s.card, !b.is_active && s.retired]}>
              <TouchableOpacity style={s.row} activeOpacity={0.7} onPress={() => navigation.navigate('ARBankStatement', { id: b.id, name: b.name })}>
                <Text style={s.name} numberOfLines={1}>{b.name}</Text>
                {!b.is_active ? <Text style={s.retiredTag}>Retired</Text> : null}
                <Text style={s.stmtLink}>Statement ›</Text>
              </TouchableOpacity>
              {b.account_no ? <Text style={s.sub}>A/c {b.account_no}</Text> : null}
              <View style={s.nums}>
                <View style={s.flex}><Text style={s.numLabel}>Opening</Text><Text style={s.numValue}>{rupee(b.opening_balance)}</Text></View>
                <View style={s.flex}><Text style={s.numLabel}>Loan payments</Text><Text style={s.numValue}>{rupee(b.received)}</Text></View>
                <View style={s.flex}><Text style={s.numLabel}>Balance</Text><Text style={[s.numValue, s.balance]}>{rupee(b.balance)}</Text></View>
              </View>
              {canManage ? (
                <View style={s.actions}>
                  <Button title="Edit" size="sm" variant="secondary" onPress={() => openEdit(b)} style={s.flex} />
                  {b.is_active
                    ? <Button title={b.received > 0 ? 'Retire' : 'Remove'} size="sm" variant="danger" onPress={() => remove(b)} style={s.flex} />
                    : <Button title="Reactivate" size="sm" variant="secondary" onPress={() => reactivate(b)} style={s.flex} />}
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>
      )}

      <FormSheet visible={!!form} onClose={() => !saving && setForm(null)}>
        {form ? (
          <ScrollView style={s.sheetScroll} contentContainerStyle={s.sheetBody} keyboardShouldPersistTaps="handled">
            <Text style={s.sheetTitle}>{form.id ? 'Edit bank' : 'Add bank'}</Text>
            {formErr._ ? <Text style={s.fieldErr}>{formErr._}</Text> : null}
            <Text style={[common.label, s.gapTop]}>Bank name</Text>
            <TextInput style={common.input} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })}
              placeholder="e.g. HDFC Current A/c" placeholderTextColor={COLORS.textTertiary} />
            {formErr.name ? <Text style={s.fieldErr}>{formErr.name}</Text> : null}
            <Text style={[common.label, s.gapTop]}>Account no. (optional)</Text>
            <TextInput style={common.input} value={form.account_no} onChangeText={(v) => setForm({ ...form, account_no: v })}
              placeholderTextColor={COLORS.textTertiary} />
            <Text style={[common.label, s.gapTop]}>Opening balance (₹)</Text>
            <TextInput style={common.input} value={groupINR(form.opening_balance)} keyboardType="decimal-pad" placeholder="0"
              onChangeText={(v) => setForm({ ...form, opening_balance: cleanAmount(v) })} placeholderTextColor={COLORS.textTertiary} />
            {formErr.opening_balance ? <Text style={s.fieldErr}>{formErr.opening_balance}</Text> : null}
            <View style={s.sheetFoot}>
              <Button title="Cancel" variant="secondary" onPress={() => setForm(null)} disabled={saving} style={s.flex} />
              <Button title={form.id ? 'Update' : 'Add bank'} variant="primary" loading={saving} style={s.flex}
                disabled={!form.name.trim()} onPress={save} />
            </View>
          </ScrollView>
        ) : null}
      </FormSheet>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40, fontSize: 14 },
  totalCard: { padding: 16, marginBottom: 12 },
  totalLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  totalValue: { fontSize: 22, fontWeight: '800', color: COLORS.success, marginTop: 4 },
  card: { padding: 16, marginBottom: 12 },
  retired: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  retiredTag: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, backgroundColor: COLORS.surfaceAlt,
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm, overflow: 'hidden' },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  nums: { flexDirection: 'row', gap: 10, marginTop: 12 },
  numLabel: { fontSize: 11, color: COLORS.textSecondary },
  numValue: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
  balance: { color: COLORS.success },
  stmtLink: { fontSize: 13, fontWeight: '700', color: COLORS.link },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  sheetScroll: { flexShrink: 1 },
  sheetBody: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  sheetFoot: { flexDirection: 'row', gap: 10, marginTop: 20 },
  gapTop: { marginTop: 14 },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  fieldErr: { fontSize: 12, color: COLORS.error, marginTop: 4 },
});
