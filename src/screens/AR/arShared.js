import React, { useState } from 'react';
import { Text, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../../constants/theme';
import { apiFetch } from '../../utils/apiFetch';
import { AR_ENDPOINTS } from '../../constants/api';
import { formatDMY } from '../../utils/dateFormat';

// Shared bits for the Accounts Receivable screens — same rules as the website's _ar.js.
export const rupee = (n) => {
  const v = Math.round(Number(n) || 0);
  return (v < 0 ? '−₹ ' : '₹ ') + Math.abs(v).toLocaleString('en-IN');
};

// Dashboard-size money: ₹3.02 Cr, ₹45.6 L, ₹12,340 (same as the website).
export const inrShort = (n) => {
  const v = Number(n) || 0;
  const a = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  // Drop trailing zeros after the decimal point only — never from a whole number (400 stays 400).
  const trim = (x, d) => (d ? x.toFixed(d).replace(/\.?0+$/, '') : x.toFixed(0));
  if (a >= 1e7) return `${sign}₹${trim(a / 1e7, a >= 1e9 ? 0 : 2)} Cr`;
  if (a >= 1e5) return `${sign}₹${trim(a / 1e5, 2)} L`;
  return `${sign}₹${Math.round(a).toLocaleString('en-IN')}`;
};

export const MODES = [
  { value: 'loan', label: 'Loan' },
  { value: 'nbfc', label: 'NBFC' },
  { value: 'bank', label: 'Bank' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
];
// A payment is recorded as Loan or NBFC only. MODES above keeps Bank / Cash / Cheque so
// older receipts still read correctly; an edit of one of those keeps its own mode
// on offer (see recordModes) rather than silently switching it.
export const RECORD_MODES = MODES.filter((m) => m.value === 'loan' || m.value === 'nbfc');
export const recordModes = (current) => (RECORD_MODES.some((m) => m.value === current)
  ? RECORD_MODES : [...RECORD_MODES, ...MODES.filter((m) => m.value === current)]);
export const MODE_LABEL = Object.fromEntries(MODES.map((m) => [m.value, m.label]));

// Amount typed into a money field: keep only digits and one decimal point (max 2
// places), and show it with Indian grouping — "5000000" reads "50,00,000". The
// raw string is what gets saved; only the display is grouped.
export const cleanAmount = (v) => {
  const s = String(v ?? '').replace(/[^0-9.]/g, '');
  const [int, ...rest] = s.split('.');
  return rest.length ? `${int}.${rest.join('').slice(0, 2)}` : int;
};
export const groupINR = (raw) => {
  if (raw === '' || raw == null) return '';
  const [int, dec] = String(raw).split('.');
  const n = int.replace(/^0+(?=\d)/, '');
  const last3 = n.slice(-3);
  const head = n.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (head ? `${head},${last3}` : last3) + (dec !== undefined ? `.${dec}` : '');
};
// What a bank's balance becomes once this receipt is saved. An edit of a receipt
// already in that bank takes its old amount out first, so it is not counted twice.
export const balanceAfter = (bank, form) => {
  if (!bank) return 0;
  const same = form.orig_bank && String(form.orig_bank) === String(bank.id);
  return (bank.balance || 0) - (same ? Number(form.orig_amount) || 0 : 0) + (Number(form.amount) || 0);
};

export const AGE_LABELS = ['0-15', '16-30', '31-60', '61-90', '91-120', '121-180', '>180'];

export const STATUS = {
  completed: { tone: 'success', label: 'Completed' },
  partial:   { tone: 'warning', label: 'Partial' },
  pending:   { tone: 'neutral', label: 'Pending' },
};

export const ISSUES = [
  { value: 'no_schedule', label: 'No schedule', tone: 'warning', test: (r) => r.no_schedule },
  { value: 'plan_mismatch', label: 'Plan mismatch', tone: 'warning', test: (r) => !!r.plan_mismatch },
  { value: 'bad_dates', label: 'Check due dates', tone: 'danger', test: (r) => !!r.bad_dates },
];
export const hasIssue = (r) => ISSUES.some((i) => i.test(r));

const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => toISO(new Date());

export function worstBucket(ageing) {
  for (let i = AGE_LABELS.length - 1; i >= 0; i -= 1) {
    if ((ageing?.[AGE_LABELS[i]] || 0) > 0) return AGE_LABELS[i];
  }
  return '';
}

export const withCompany = (url, companyId, extra = []) => {
  const p = [...extra];
  if (companyId) p.push(`company_id=${companyId}`);
  return p.length ? `${url}${url.includes('?') ? '&' : '?'}${p.join('&')}` : url;
};

// A tappable date box that opens the native picker. value is 'YYYY-MM-DD' or ''.
export function DateField({ value, onChange, placeholder = 'Select date', maxToday, style, compact }) {
  const [open, setOpen] = useState(false);
  const current = value ? new Date(`${value}T00:00:00`) : new Date();
  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.75} style={[s.box, compact && s.boxCompact, style]}>
        <Text style={[s.text, !value && s.placeholder]} numberOfLines={1}>{value ? formatDMY(value) : placeholder}</Text>
        <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
      </TouchableOpacity>
      {open && (
        <DateTimePicker value={current} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'}
          maximumDate={maxToday ? new Date() : undefined}
          onChange={(_, d) => { setOpen(false); if (d) onChange(toISO(d)); }} />
      )}
    </>
  );
}

// The server renders the statement as print-ready HTML; turn it into a PDF and
// open the share sheet (WhatsApp, email, save to Files…). Returns an error or ''.
export async function shareStatement(accountId, asOf, companyId, fileLabel) {
  try {
    const r = await apiFetch(withCompany(AR_ENDPOINTS.statement(accountId), companyId, [`as_of=${asOf}`]));
    if (!r.ok) return 'Could not prepare the statement.';
    const html = await r.text();
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: `Statement · ${fileLabel}` });
    }
    return '';
  } catch (e) {
    return 'Could not prepare the statement. Check your connection.';
  }
}

const s = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderWidth: 1.5, borderColor: COLORS.border,
         borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: COLORS.inputBg },
  boxCompact: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1 },
  text: { flexShrink: 1, fontSize: 14.5, color: COLORS.textPrimary, fontWeight: '600' },
  placeholder: { color: COLORS.textTertiary, fontWeight: '500' },
});
