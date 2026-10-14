// Payment Plans for one project — the installments a new booking starts with. Two
// plans: an LOI booked directly, and an EOI converted to an LOI. Each lists the Extra
// Work Amount and Unit Price installments (% · days after the booking date · stage)
// and the Legal & Other Charges line. Everything stays editable on each booking.
// Mirrors vistaraweb/src/components/PaymentPlansModal.js.
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FormSheet from './FormSheet';
import { Button, Segmented } from './ui';
import { COLORS, RADIUS } from '../constants/theme';
import { apiFetch } from '../utils/apiFetch';
import { SALES_ENDPOINTS } from '../constants/api';
import { PLAN_KEYS, balance, emptyPlan, pctTotal, whenText } from '../lib/paymentPlans';

const SECTIONS = [
  ['extra', 'EXTRA WORK AMOUNT INSTALLMENTS'],
  ['unit', 'UNIT PRICE INSTALLMENTS'],
];

function seed(project) {
  const saved = (project && project.payment_plans) || {};
  return Object.fromEntries(PLAN_KEYS.map(([k]) => {
    const p = saved[k] || {};
    const rows = (list) => (list || []).map((r) => ({ pct: String(r.pct ?? ''), days: String(r.days ?? ''), stage: r.stage || '' }));
    return [k, { extra: rows(p.extra), unit: rows(p.unit),
      legal: { days: p.legal?.days != null ? String(p.legal.days) : '', stage: p.legal?.stage || '' } }];
  }));
}

export default function PaymentPlansSheet({ project, visible, onClose, onSaved }) {
  const [plans, setPlans] = useState(() => seed(project));
  const [tab, setTab] = useState('direct');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!visible || !project) return;
    setPlans(seed(project)); setTab('direct'); setErr('');
  }, [visible, project?.id]);

  if (!project) return null;
  const plan = plans[tab] || emptyPlan();
  const setPlan = (fn) => setPlans((all) => ({ ...all, [tab]: fn(all[tab] || emptyPlan()) }));
  // The last installment takes whatever % the others leave, so a section always totals 100.
  const setRow = (sec, i, k, v) => setPlan((p) => ({ ...p, [sec]: balance(p[sec].map((r, idx) => (idx === i ? { ...r, [k]: v } : r))) }));
  // "No. of Installments", as on the booking form: rows already filled are kept, new
  // ones start empty, and the last one takes the remaining %.
  const setCount = (sec, n) => setPlan((p) => {
    const count = Math.min(24, Math.max(0, parseInt(n, 10) || 0));
    return { ...p, [sec]: balance(Array.from({ length: count }, (_, i) => p[sec][i] || { pct: '', days: '', stage: '' })) };
  });
  const setLegal = (k, v) => setPlan((p) => ({ ...p, legal: { ...p.legal, [k]: v } }));
  const copyDirect = () => setPlans((all) => ({ ...all, eoi: JSON.parse(JSON.stringify(all.direct || emptyPlan())) }));

  const save = async () => {
    // A section with rows must add up to 100%, the same rule the booking form enforces.
    for (const [k, label] of PLAN_KEYS) {
      for (const [sec] of SECTIONS) {
        const rows = plans[k]?.[sec] || [];
        if (rows.length && Math.abs(pctTotal(rows) - 100) > 0.01) {
          setTab(k);
          setErr(`${label} — ${sec === 'extra' ? 'Extra Work' : 'Unit Price'} installments add up to ${pctTotal(rows).toFixed(2)}%. They must total 100%.`);
          return;
        }
      }
    }
    setSaving(true); setErr('');
    const body = Object.fromEntries(PLAN_KEYS.map(([k]) => [k, {
      extra: plans[k].extra.map((r) => ({ pct: Number(r.pct) || 0, days: parseInt(r.days, 10) || 0, stage: r.stage.trim() })),
      unit: plans[k].unit.map((r) => ({ pct: Number(r.pct) || 0, days: parseInt(r.days, 10) || 0, stage: r.stage.trim() })),
      legal: { days: plans[k].legal.days === '' ? '' : parseInt(plans[k].legal.days, 10) || 0, stage: plans[k].legal.stage.trim() },
    }]));
    try {
      const r = await apiFetch(SALES_ENDPOINTS.project(project.id), { method: 'PATCH', body: JSON.stringify({ payment_plans: body }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(String(d.payment_plans || d.detail || 'Could not save.')); return; }
      onSaved?.(d);
      onClose();
    } catch (e) {
      setErr('Could not save. Check your connection.');
    } finally { setSaving(false); }
  };

  return (
    <FormSheet visible={visible} onClose={onClose}>
      <View style={s.head}>
        <View style={s.flex}>
          <Text style={s.title}>Payment Plans</Text>
          <Text style={s.sub} numberOfLines={2}>{project.name} — prefilled on every new booking, editable per booking.</Text>
        </View>
        <TouchableOpacity onPress={onClose} hitSlop={10} style={s.x}>
          <Ionicons name="close" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
      <View style={s.tabWrap}>
        <Segmented options={PLAN_KEYS.map(([value, label]) => ({ value, label }))} value={tab} onChange={setTab} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.lead}>
          {tab === 'direct' ? 'Used when an LOI is booked directly.' : 'Used when an EOI is converted to an LOI.'}
          {' '}Due is in days after the booking date — 0 means on the booking date. The last installment's share fills itself so each section totals 100%.
        </Text>
        {tab === 'eoi' ? (
          <TouchableOpacity onPress={copyDirect} style={s.copy}><Text style={s.copyText}>Copy from Direct LOI</Text></TouchableOpacity>
        ) : null}
        {err ? <Text style={s.err}>{err}</Text> : null}

        {SECTIONS.map(([sec, label]) => {
          const rows = plan[sec] || [];
          const total = pctTotal(rows);
          const ok = Math.abs(total - 100) < 0.01;
          return (
            <View key={sec} style={s.card}>
              <View style={s.cardHead}>
                <Text style={s.cardTitle}>{label}</Text>
                {rows.length ? <Text style={ok ? s.totalOk : s.totalBad}>Total {total.toFixed(2)}%</Text> : null}
              </View>
              <View style={s.countRow}>
                <Text style={s.countLabel}>No. of Installments</Text>
                <View style={s.countBox}>
                  <TextInput style={s.in} keyboardType="number-pad" value={rows.length ? String(rows.length) : ''}
                    onChangeText={(t) => setCount(sec, t.replace(/[^0-9]/g, ''))} placeholder="0" placeholderTextColor={COLORS.textTertiary} />
                </View>
              </View>
              {rows.length ? (
                <View style={s.bar}><View style={StyleSheet.compose(ok ? s.barOk : s.barBad, { width: `${Math.min(100, total)}%` })} /></View> // inline-ok: share of 100% filled
              ) : <Text style={s.empty}>0 = no installments; the booking starts this section blank.</Text>}
              {rows.map((r, i) => {
                const isLast = i === rows.length - 1;
                return (
                  <View key={i} style={s.item}>
                    <View style={s.itemTop}>
                      <View style={s.no}><Text style={s.noText}>{i + 1}</Text></View>
                      <View style={s.flex}>
                        <Text style={s.fLabel}>SHARE{isLast ? '  · AUTO' : ''}</Text>
                        <View style={isLast ? s.boxAuto : s.box}>
                          <TextInput style={isLast ? s.inAuto : s.in} keyboardType="numeric" value={r.pct} editable={!isLast}
                            onChangeText={(t) => setRow(sec, i, 'pct', t)} placeholder="0" placeholderTextColor={COLORS.textTertiary} />
                          <Text style={s.unit}>%</Text>
                        </View>
                      </View>
                      <View style={s.flex}>
                        <Text style={s.fLabel}>DUE</Text>
                        <View style={s.box}>
                          <TextInput style={s.in} keyboardType="number-pad" value={r.days}
                            onChangeText={(t) => setRow(sec, i, 'days', t.replace(/[^0-9]/g, ''))} placeholder="0" placeholderTextColor={COLORS.textTertiary} />
                          <Text style={s.unit}>days</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={s.when}>{whenText(r.days)}</Text>
                    <TextInput style={s.inStage} value={r.stage} onChangeText={(t) => setRow(sec, i, 'stage', t)} placeholder="Stage (optional), e.g. On booking" placeholderTextColor={COLORS.textTertiary} />
                  </View>
                );
              })}
            </View>
          );
        })}

        <View style={s.card}>
          <View style={s.cardHead}><Text style={s.cardTitle}>LEGAL & OTHER CHARGES</Text></View>
          <View style={s.box}>
            <TextInput style={s.in} keyboardType="number-pad" value={plan.legal.days} onChangeText={(t) => setLegal('days', t.replace(/[^0-9]/g, ''))} placeholder="—" placeholderTextColor={COLORS.textTertiary} />
            <Text style={s.unit}>days</Text>
          </View>
          <Text style={s.when}>{plan.legal.days === '' ? 'No date (sale deed or possession)' : whenText(plan.legal.days)}</Text>
          <TextInput style={s.inStage} value={plan.legal.stage} onChangeText={(t) => setLegal('stage', t)} placeholder="Stage (optional), e.g. At sale deed" placeholderTextColor={COLORS.textTertiary} />
        </View>
      </ScrollView>

      <View style={s.foot}>
        <Button title="Cancel" variant="secondary" size="sm" onPress={onClose} disabled={saving} />
        <Button title="Save plans" size="sm" onPress={save} loading={saving} />
      </View>
    </FormSheet>
  );
}

const field = { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 10, paddingVertical: 8,
                fontSize: 13, color: COLORS.textPrimary, backgroundColor: COLORS.surface };
const s = StyleSheet.create({
  flex: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 20, paddingBottom: 10 },
  title: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  x: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceAlt },
  tabWrap: { paddingHorizontal: 20, paddingBottom: 6 },
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 12 },
  lead: { fontSize: 12, lineHeight: 17, color: COLORS.textSecondary, marginTop: 8 },
  copy: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.pill,
          borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  copyText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  err: { color: COLORS.danger, fontSize: 12.5, marginTop: 8 },
  card: { borderWidth: 1, borderColor: COLORS.cardBorder, backgroundColor: COLORS.surface2, borderRadius: RADIUS.lg, padding: 10, marginTop: 12, gap: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2, paddingBottom: 2 },
  cardTitle: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, color: COLORS.textSecondary },
  totalOk: { fontSize: 11.5, fontWeight: '800', color: COLORS.success },
  totalBad: { fontSize: 11.5, fontWeight: '800', color: COLORS.danger },
  bar: { height: 6, borderRadius: 999, backgroundColor: COLORS.surfaceAlt, overflow: 'hidden', marginBottom: 4 },
  barOk: { height: '100%', borderRadius: 999, backgroundColor: COLORS.success },
  barBad: { height: '100%', borderRadius: 999, backgroundColor: COLORS.danger },
  empty: { fontSize: 12, color: COLORS.textSecondary },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  countLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  countBox: { width: 90, flexDirection: 'row', alignItems: 'center', height: 40, borderWidth: 1.5, borderColor: COLORS.border,
              borderRadius: RADIUS.md, paddingHorizontal: 10, backgroundColor: COLORS.surface },
  // One installment: number · share · due · remove, then its date in words and the stage.
  item: { gap: 6, padding: 10, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  itemTop: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  no: { width: 26, height: 26, borderRadius: 13, marginBottom: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accentSoft },
  noText: { fontSize: 12, fontWeight: '800', color: COLORS.link },
  fLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: COLORS.textSecondary, marginBottom: 4 },
  box: { flexDirection: 'row', alignItems: 'center', height: 40, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
         paddingHorizontal: 10, backgroundColor: COLORS.surface },
  boxAuto: { flexDirection: 'row', alignItems: 'center', height: 40, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: RADIUS.md,
             paddingHorizontal: 10, backgroundColor: COLORS.accentSoft },
  in: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, paddingVertical: 0 },
  inAuto: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.link, paddingVertical: 0 },
  unit: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginLeft: 4 },
  when: { fontSize: 11, fontWeight: '600', color: COLORS.link, marginLeft: 34 },
  inStage: { ...field },
  drop: { width: 30, height: 30, borderRadius: 15, marginBottom: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceAlt },
  add: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.pill, borderWidth: 1,
         borderColor: COLORS.border, backgroundColor: COLORS.surface, marginTop: 2 },
  addText: { fontSize: 12, fontWeight: '700', color: COLORS.link },
  foot: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6,
          borderTopWidth: 1, borderTopColor: COLORS.border },
});
