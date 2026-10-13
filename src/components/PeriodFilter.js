import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import FilterSelect from './FilterSelect';

// The website's date filter, for the app: quick ranges plus Year / Month / Quarter on the
// Indian financial year (April–March). Controlled: `value` is { from, to } (YYYY-MM-DD,
// '' = open), `onChange` gets the new range. Used on Bookings and Approvals.
const istToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const istDaysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); };
const pad = (n) => String(n).padStart(2, '0');
const lastDay = (y, m) => new Date(y, m, 0).getDate();      // m is 1-12

const QUICK = [
  ['All', () => ({ from: '', to: '' })],
  ['Today', () => ({ from: istToday(), to: istToday() })],
  ['7 days', () => ({ from: istDaysAgo(6), to: istToday() })],
  ['30 days', () => ({ from: istDaysAgo(29), to: istToday() })],
  ['This month', () => { const t = istToday(); return { from: `${t.slice(0, 7)}-01`, to: t }; }],
];

export default function PeriodFilter({ value, onChange, anyLabel = 'Any date' }) {
  const range = value || { from: '', to: '' };
  const now = istToday();
  const curFy = +now.slice(5, 7) >= 4 ? +now.slice(0, 4) : +now.slice(0, 4) - 1;
  const [fyY, setFyY] = useState(curFy);
  const FYS = [0, 1, 2, 3].map((i) => curFy - i).filter((y) => y >= 2020);
  const MONTHS = Array.from({ length: 12 }, (_, i) => {
    const m = ((i + 3) % 12) + 1; const y = m >= 4 ? fyY : fyY + 1;
    return { key: `${y}-${pad(m)}`, label: new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
             from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${lastDay(y, m)}` };
  });
  const QUARTERS = [
    { key: 'Q1', label: 'Q1 · Apr–Jun', from: `${fyY}-04-01`, to: `${fyY}-06-30` },
    { key: 'Q2', label: 'Q2 · Jul–Sep', from: `${fyY}-07-01`, to: `${fyY}-09-30` },
    { key: 'Q3', label: 'Q3 · Oct–Dec', from: `${fyY}-10-01`, to: `${fyY}-12-31` },
    { key: 'Q4', label: 'Q4 · Jan–Mar', from: `${fyY + 1}-01-01`, to: `${fyY + 1}-03-31` },
  ];
  const is = (r) => r.from === range.from && r.to === range.to;
  const quick = (QUICK.find(([, make]) => is(make())) || [''])[0];
  const fySel = is({ from: `${fyY}-04-01`, to: `${fyY + 1}-03-31` }) ? String(fyY) : '';
  const monthSel = (MONTHS.find(is) || {}).key || '';
  const quarterSel = (QUARTERS.find(is) || {}).key || '';
  const set = (r) => onChange({ from: r.from, to: r.to });

  return (
    <View>
      <FilterSelect label={anyLabel} value={quick === 'All' ? '' : quick} style={s.full}
        onChange={(l) => set((QUICK.find(([k]) => k === (l || 'All')) || QUICK[0])[1]())}
        options={QUICK.map(([l]) => ({ value: l === 'All' ? '' : l, label: l === 'All' ? anyLabel : l }))} />
      <View style={s.row}>
        <FilterSelect label="Year" value={fySel} style={s.cell}
          onChange={(v) => { if (!v) { set({ from: '', to: '' }); return; } const y = +v; setFyY(y); set({ from: `${y}-04-01`, to: `${y + 1}-03-31` }); }}
          options={[{ value: '', label: 'Year' }, ...FYS.map((y) => ({ value: String(y), label: `FY ${y}-${String(y + 1).slice(2)}` }))]} />
        <FilterSelect label="Month" value={monthSel} style={s.cell}
          onChange={(v) => set(MONTHS.find((m) => m.key === v) || { from: '', to: '' })}
          options={[{ value: '', label: 'Month' }, ...MONTHS.map((m) => ({ value: m.key, label: m.label }))]} />
        <FilterSelect label="Quarter" value={quarterSel} style={s.cell}
          onChange={(v) => set(QUARTERS.find((q) => q.key === v) || { from: '', to: '' })}
          options={[{ value: '', label: 'Quarter' }, ...QUARTERS.map((q) => ({ value: q.key, label: q.label }))]} />
      </View>
    </View>
  );
}

// A booking date inside the range ('' ends are open).
export const inRange = (date, range) => {
  const d = String(date || '').slice(0, 10);
  if (!range || (!range.from && !range.to)) return true;
  if (!d) return false;
  return (!range.from || d >= range.from) && (!range.to || d <= range.to);
};

const s = StyleSheet.create({
  full: { marginBottom: 8, justifyContent: 'space-between' },
  row: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  cell: { flex: 1, justifyContent: 'space-between' },
});
