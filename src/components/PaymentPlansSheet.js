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
import { PLAN_KEYS, emptyPlan, pctTotal } from '../lib/paymentPlans';

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
  const setRow = (sec, i, k, v) => setPlan((p) => ({ ...p, [sec]: p[sec].map((r, idx) => (idx === i ? { ...r, [k]: v } : r)) }));
  const addRow = (sec) => setPlan((p) => ({ ...p, [sec]: [...p[sec], { pct: '', days: '', stage: '' }] }));
  const dropRow = (sec, i) => setPlan((p) => ({ ...p, [sec]: p[sec].filter((_, idx) => idx !== i) }));
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
          {' '}Days count from the booking date (0 = on the booking date). Leave a section empty to start it blank.
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
              {rows.map((r, i) => (
                <View key={i} style={s.rowBox}>
                  <View style={s.row}>
                    <Text style={s.no}>{i + 1}</Text>
                    <TextInput style={s.inSmall} keyboardType="numeric" value={r.pct} onChangeText={(t) => setRow(sec, i, 'pct', t)} placeholder="%" placeholderTextColor={COLORS.textTertiary} />
                    <TextInput style={s.inSmall} keyboardType="numeric" value={r.days} onChangeText={(t) => setRow(sec, i, 'days', t)} placeholder="Days" placeholderTextColor={COLORS.textTertiary} />
                    <TouchableOpacity onPress={() => dropRow(sec, i)} hitSlop={8} style={s.drop}>
                      <Ionicons name="close" size={16} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <TextInput style={s.inStage} value={r.stage} onChangeText={(t) => setRow(sec, i, 'stage', t)} placeholder="Stage (optional), e.g. On booking" placeholderTextColor={COLORS.textTertiary} />
                </View>
              ))}
              <TouchableOpacity onPress={() => addRow(sec)} style={s.add}><Text style={s.addText}>+ Add installment</Text></TouchableOpacity>
            </View>
          );
        })}

        <View style={s.card}>
          <View style={s.cardHead}><Text style={s.cardTitle}>LEGAL & OTHER CHARGES</Text></View>
          <TextInput style={s.inStage} keyboardType="numeric" value={plan.legal.days} onChangeText={(t) => setLegal('days', t)} placeholder="Days after booking (blank = no date)" placeholderTextColor={COLORS.textTertiary} />
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
  rowBox: { gap: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  no: { width: 18, fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },
  inSmall: { ...field, flex: 1 },
  inStage: { ...field },
  drop: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceAlt },
  add: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.pill, borderWidth: 1,
         borderColor: COLORS.border, backgroundColor: COLORS.surface, marginTop: 2 },
  addText: { fontSize: 12, fontWeight: '700', color: COLORS.link },
  foot: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6,
          borderTopWidth: 1, borderTopColor: COLORS.border },
});
