// Payouts ahead, by scheme — same as the website's _PayoutsAhead.js: what has to be
// paid out in each coming month (next 12), financial quarter (next 8) or financial
// year (next 6), interest / principal / both, as columns stacked by scheme, with an
// Overdue column first so nothing still owed is left off.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { apiFetch } from '../../utils/apiFetch';
import { CLUB1000_ENDPOINTS } from '../../constants/api';
import { COLORS } from '../../constants/theme';
import { inrShort } from '../../lib/inr';
import { DashCard } from '../../components/Dash';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const GRAINS = [['month', 'Month', 12], ['quarter', 'Quarter', 8], ['year', 'Year', 6]];
const KINDS = [['both', 'Int + Principal'], ['interest', 'Interest'], ['principal', 'Principal']];
// The dashboards' validated palette, extended for a 4th–6th scheme (same as the web's --viz-*).
const SERIES = COLORS.isDark
  ? ['#3987e5', '#d95926', '#199e70', '#d071bb', '#9b84ea', '#9aa6b4']
  : ['#2a78d6', '#eb6834', '#1baf7a', '#b0479a', '#7a5bd1', '#6b7785'];

const fy = (y, m) => (m >= 4 ? y : y - 1);
const fyLabel = (f) => `FY${String(f).slice(2)}-${String(f + 1).slice(2)}`;
const fq = (m) => (m >= 4 && m <= 6 ? 1 : m >= 7 && m <= 9 ? 2 : m >= 10 ? 3 : 4);
function bucketOf(iso, grain) {
  const [y, m] = String(iso).split('-').map(Number);
  if (grain === 'month') return { key: y * 100 + m, label: `${MONTHS[m - 1]} ${String(y).slice(2)}` };
  if (grain === 'quarter') { const f = fy(y, m), q = fq(m); return { key: f * 10 + q, label: `Q${q} ${fyLabel(f)}` }; }
  const f = fy(y, m); return { key: f, label: fyLabel(f) };
}
function nextBuckets(grain, n, today) {
  const [y0, m0] = today.split('-').map(Number);
  const out = []; const seen = new Set();
  for (let i = 0; out.length < n && i < 120; i += 1) {
    const d = new Date(y0, m0 - 1 + i, 1);
    const b = bucketOf(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`, grain);
    if (!seen.has(b.key)) { seen.add(b.key); out.push(b); }
  }
  return out;
}
// Heights and segment shares come from the data.
const heightOf = (pct) => ({ height: `${pct}%` });
const shareOf = (v, color) => ({ flexGrow: v, backgroundColor: color });
const dotOf = (color) => ({ backgroundColor: color });

export default function PayoutsAheadCard({ schemeSel = [] }) {
  const [payouts, setPayouts] = useState(null);
  const [grain, setGrain] = useState('month');
  const [kind, setKind] = useState('both');
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    let alive = true;
    apiFetch(`${CLUB1000_ENDPOINTS.payouts}?status=pending`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (alive) setPayouts(Array.isArray(d) ? d : (d.results || [])); })
      .catch(() => alive && setPayouts([]));
    return () => { alive = false; };
  }, []);

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const { columns, schemes, max, total } = useMemo(() => {
    const rows = (payouts || []).filter((p) => (!schemeSel.length || schemeSel.includes(p.scheme_name))
      && (kind === 'both' || (kind === 'principal' ? p.payout_type !== 'interest' : p.payout_type === 'interest')));
    const names = [...new Set((payouts || []).map((p) => p.scheme_name || '—'))].sort();
    const n = GRAINS.find((g) => g[0] === grain)[2];
    const cols = [{ key: 'overdue', label: 'Overdue', overdue: true, by: {}, sum: 0 },
      ...nextBuckets(grain, n, today).map((b) => ({ ...b, by: {}, sum: 0 }))];
    const byKey = Object.fromEntries(cols.map((c) => [c.key, c]));
    for (const p of rows) {
      const amt = Number(p.amount_due) || 0;
      const col = p.due_date < today ? byKey.overdue : byKey[bucketOf(p.due_date, grain).key];
      if (!col) continue;
      const s = p.scheme_name || '—';
      col.by[s] = (col.by[s] || 0) + amt; col.sum += amt;
    }
    const shown = cols.filter((c) => !c.overdue || c.sum > 0);
    return { columns: shown, schemes: names, max: Math.max(1, ...shown.map((c) => c.sum)), total: shown.reduce((t, c) => t + c.sum, 0) };
  }, [payouts, grain, kind, schemeSel.join('|'), today]);

  const colorOf = (name) => SERIES[schemes.indexOf(name) % SERIES.length];
  const sel = columns.find((c) => c.key === picked);

  return (
    <DashCard title="Payouts ahead" sub={`${KINDS.find((k) => k[0] === kind)[1]} to pay, by scheme`} total={inrShort(total)}>
      <View style={s.segRow}>
        <View style={s.seg}>
          {GRAINS.map(([k, label]) => (
            <TouchableOpacity key={k} onPress={() => { setGrain(k); setPicked(null); }} style={[s.segBtn, grain === k && s.segOn]}>
              <Text style={[s.segText, grain === k && s.segTextOn]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.seg}>
          {KINDS.map(([k, label]) => (
            <TouchableOpacity key={k} onPress={() => setKind(k)} style={[s.segBtn, kind === k && s.segOn]}>
              <Text style={[s.segText, kind === k && s.segTextOn]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {payouts === null ? <Text style={s.empty}>Loading…</Text> : total === 0 ? <Text style={s.empty}>Nothing to pay in this window.</Text> : <>
        <View style={s.chart}>
          {columns.map((c) => {
            const h = c.sum ? Math.max(3, (c.sum / max) * 100) : 0;
            return (
              <TouchableOpacity key={c.key} activeOpacity={0.7} onPress={() => setPicked(picked === c.key ? null : c.key)} style={[s.col, picked === c.key && s.colOn]}>
                <View style={s.bar}>
                  <View style={[s.stack, heightOf(h)]}>
                    {schemes.filter((n) => c.by[n]).map((n) => <View key={n} style={[s.seg2, shareOf(c.by[n], colorOf(n))]} />)}
                  </View>
                </View>
                <Text style={[s.lbl, c.overdue && s.lblBad]} numberOfLines={1}>{c.overdue ? 'Due' : c.label.replace(' FY', '\nFY')}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={s.detail}>
          {sel ? <>
            <Text style={s.detailTitle}>{sel.overdue ? 'Overdue (unpaid)' : sel.label} · {inrShort(sel.sum)}</Text>
            {schemes.filter((n) => sel.by[n]).map((n) => (
              <View key={n} style={s.legendRow}><View style={[s.dot, dotOf(colorOf(n))]} /><Text style={s.legendText}>{n}</Text><Text style={s.legendAmt}>{inrShort(sel.by[n])}</Text></View>
            ))}
          </> : <>
            {schemes.filter((n) => columns.some((c) => c.by[n])).map((n) => (
              <View key={n} style={s.legendRow}><View style={[s.dot, dotOf(colorOf(n))]} /><Text style={s.legendText}>{n}</Text>
                <Text style={s.legendAmt}>{inrShort(columns.reduce((t, c) => t + (c.by[n] || 0), 0))}</Text></View>
            ))}
            <Text style={s.hint}>Tap a column to see its schemes.</Text>
          </>}
        </View>
      </>}
    </DashCard>
  );
}

const s = StyleSheet.create({
  segRow: { gap: 8, marginBottom: 12 },
  seg: { flexDirection: 'row', alignSelf: 'flex-start', padding: 3, borderRadius: 10, backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border },
  segBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  segOn: { backgroundColor: COLORS.surface },
  segText: { fontSize: 11.5, fontWeight: '700', color: COLORS.textSecondary },
  segTextOn: { color: COLORS.link },
  chart: { flexDirection: 'row', alignItems: 'stretch', height: 170, gap: 3 },
  col: { flex: 1, minWidth: 0, alignItems: 'center', borderRadius: 6, paddingTop: 2 },
  colOn: { backgroundColor: COLORS.surfaceAlt },
  bar: { flex: 1, width: '80%', justifyContent: 'flex-end', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  stack: { width: '100%', flexDirection: 'column-reverse', gap: 1 },
  seg2: { minHeight: 2, borderRadius: 2 },
  lbl: { fontSize: 8.5, color: COLORS.textSecondary, marginTop: 3, textAlign: 'center' },
  lblBad: { color: COLORS.error, fontWeight: '800' },
  detail: { marginTop: 12, gap: 5 },
  detailTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 3 },
  legendText: { flex: 1, fontSize: 12, color: COLORS.textSecondary },
  legendAmt: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  hint: { fontSize: 10.5, color: COLORS.textSecondary, marginTop: 4 },
  empty: { fontSize: 12, color: COLORS.textSecondary, paddingVertical: 20, textAlign: 'center' },
});
