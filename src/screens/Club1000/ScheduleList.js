// The payout schedule in the Add / Revise / Renew sheets — read first, edit when
// needed. Same as the website's _ScheduleTable.js: headline figures, then one line
// per payout (date chip, FY quarter with dates and days, share-of-term bar, amount
// with its working); tapping ✎ opens that line's date and amount.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';
import { perDayInterest, tenureDays } from '../../lib/c1Periods';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const inr = (n, d = 2) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: d ? 2 : 0, maximumFractionDigits: d });
const parts = (iso) => {
  const [y, m, d] = String(iso || '').slice(0, 10).split('-').map(Number);
  return y ? { y, m, d } : null;
};
function span(from, to) {
  const a = parts(from); const b = parts(to);
  if (!a || !b) return '';
  return a.y === b.y
    ? `${a.d} ${MONTHS[a.m - 1]} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`
    : `${a.d} ${MONTHS[a.m - 1]} ${a.y} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
}

// The bar's fill is the period's share of the term — a width from data.
const barFill = (pct) => ({ width: `${pct}%` });

export default function ScheduleList({ schedule, periods, principal, pct, from, to, onAmount, onPickDate, onReset, readOnly = false }) {
  const [editing, setEditing] = useState(null);
  const perDay = perDayInterest(principal, pct, from, to);
  const days = tenureDays(from, to);
  const interestRows = schedule.filter((r) => r.payout_type !== 'maturity');
  const totalInterest = interestRows.reduce((t, r) => t + (Number(r.amount_due) || 0), 0);
  const anyEdited = schedule.some((r, i) => periods[i] && Math.abs(Number(r.amount_due) - periods[i].computed) > 0.5);

  return (
    <View style={s.wrap}>
      <View style={s.stats}>
        <View style={s.stat}>
          <Text style={s.statLbl}>INTEREST A DAY</Text>
          <Text style={s.statVal}>₹{inr(perDay)}</Text>
          <Text style={s.statSub}>₹{inr(principal, 0)} × {Number(pct) || 0}% ÷ {days} days</Text>
        </View>
        <View style={s.stat}>
          <Text style={s.statLbl}>TOTAL INTEREST</Text>
          <Text style={s.statVal}>₹{inr(totalInterest, 0)}</Text>
          <Text style={s.statSub}>{readOnly ? 'paid at maturity' : `${interestRows.length} payouts`} · {days} days</Text>
        </View>
        <View style={[s.stat, s.statGood]}>
          <Text style={[s.statLbl, s.statLblGood]}>AT MATURITY</Text>
          <Text style={s.statVal}>₹{inr(totalInterest + (Number(principal) || 0), 0)}</Text>
          <Text style={s.statSub}>principal + interest</Text>
        </View>
      </View>

      <View style={s.list}>
        {schedule.map((row, idx) => {
          const per = periods[idx];
          const isPrincipal = row.payout_type === 'maturity';
          const edited = per && Math.abs(Number(row.amount_due) - per.computed) > 0.5;
          const [q, part] = per ? per.label.split(' (') : [];
          const open = editing === idx;
          const p = parts(row.due_date);
          const share = per && days ? Math.max(2, Math.round((per.days / days) * 100)) : 0;
          return (
            <View key={idx} style={[s.row, idx > 0 && s.rowSep, isPrincipal && s.rowPrincipal, edited && s.rowEdited]}>
              <View style={s.rowMain}>
                <View style={[s.chip, isPrincipal && s.chipPrincipal]}>
                  <Text style={[s.chipDay, isPrincipal && s.chipTextPrincipal]}>{p ? p.d : '—'}</Text>
                  <Text style={[s.chipMon, isPrincipal && s.chipTextPrincipal]}>{p ? `${MONTHS[p.m - 1]} ${String(p.y).slice(2)}`.toUpperCase() : ''}</Text>
                </View>
                <View style={s.what}>
                  <View style={s.titleRow}>
                    <Text style={s.title}>{isPrincipal ? 'Principal returned' : q || 'Interest'}</Text>
                    {!!part && <Text style={s.part}>PART</Text>}
                  </View>
                  {!!per && <Text style={s.sub}>{span(per.from, per.to)} · {per.days} days</Text>}
                  {!!per && <View style={s.bar}><View style={[s.barFill, barFill(share)]} /></View>}
                  <Text style={s.amt}>₹{inr(row.amount_due)}</Text>
                  {!!per && <Text style={[s.why, edited && s.whyEdited]}>{edited ? `edited · worked out ₹${inr(per.computed)}` : `${per.days} × ₹${inr(perDay)}`}</Text>}
                </View>
                {!readOnly && (
                  <TouchableOpacity onPress={() => setEditing(open ? null : idx)} style={[s.edit, open && s.editOn]}>
                    <Text style={[s.editText, open && s.editTextOn]}>{open ? '✓' : '✎'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {open && (
                <View style={s.editor}>
                  {!!onPickDate && (
                    <TouchableOpacity onPress={() => onPickDate(idx)} style={s.input}>
                      <Text style={s.inputLbl}>PAYOUT DATE</Text>
                      <Text style={s.inputText}>{p ? `${p.d} ${MONTHS[p.m - 1]} ${p.y}` : '—'}</Text>
                    </TouchableOpacity>
                  )}
                  <View style={s.input}>
                    <Text style={s.inputLbl}>AMOUNT (₹)</Text>
                    <TextInput value={String(row.amount_due)} keyboardType="decimal-pad" style={s.inputField}
                      onChangeText={(v) => onAmount(idx, v)}
                      onEndEditing={(e) => { const v = Number(e.nativeEvent.text); if (e.nativeEvent.text !== '' && !Number.isNaN(v)) onAmount(idx, v.toFixed(2)); }} />
                  </View>
                  {!!per && (
                    <TouchableOpacity onPress={() => onAmount(idx, per.computed.toFixed(2))}>
                      <Text style={s.use}>Use ₹{inr(per.computed)}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {anyEdited && (
        <TouchableOpacity onPress={() => { setEditing(null); onReset(); }} style={s.reset}>
          <Text style={s.resetText}>↺ Reset all to worked-out amounts</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 10 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stat: { flexGrow: 1, flexBasis: '30%', minWidth: 140, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 10, backgroundColor: COLORS.surface },
  statGood: { backgroundColor: COLORS.successBg },
  statLbl: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6, color: COLORS.textSecondary },
  statLblGood: { color: COLORS.success },
  statVal: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  statSub: { fontSize: 10.5, color: COLORS.textSecondary, marginTop: 1 },
  list: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, overflow: 'hidden', backgroundColor: COLORS.surface },
  row: { padding: 12 },
  rowSep: { borderTopWidth: 1, borderTopColor: COLORS.surfaceAlt },
  rowPrincipal: { backgroundColor: COLORS.surfaceAlt },
  rowEdited: { borderLeftWidth: 3, borderLeftColor: COLORS.warning },
  rowMain: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  chip: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.successBg },
  chipPrincipal: { backgroundColor: COLORS.linkBg },
  chipDay: { fontSize: 17, fontWeight: '800', color: COLORS.success },
  chipMon: { fontSize: 9, fontWeight: '800', color: COLORS.success },
  chipTextPrincipal: { color: COLORS.link },
  what: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  part: { fontSize: 9, fontWeight: '800', color: COLORS.warning, backgroundColor: COLORS.warningBg, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  sub: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 2 },
  bar: { height: 4, borderRadius: 4, backgroundColor: COLORS.surfaceAlt, marginTop: 5, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 4, backgroundColor: COLORS.success },
  amt: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginTop: 6 },
  why: { fontSize: 10.5, color: COLORS.textSecondary },
  whyEdited: { color: COLORS.warning, fontWeight: '700' },
  edit: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  editOn: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  editText: { fontSize: 14, color: COLORS.textSecondary },
  editTextOn: { color: '#fff' },
  editor: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 8, marginTop: 10, paddingLeft: 60 },
  input: { flexGrow: 1, minWidth: 120, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.cardBg },
  inputLbl: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, color: COLORS.textSecondary },
  inputText: { fontSize: 14, color: COLORS.textPrimary, marginTop: 2 },
  inputField: { fontSize: 14, color: COLORS.textPrimary, padding: 0, marginTop: 2 },
  use: { fontSize: 12, fontWeight: '700', color: COLORS.link, paddingVertical: 8 },
  reset: { alignSelf: 'flex-end', borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.surface },
  resetText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
});
