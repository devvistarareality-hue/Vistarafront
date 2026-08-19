import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, StatusBar, RefreshControl, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { apiFetch } from '../../utils/apiFetch';
import { CLUB1000_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { isClub1000Manager } from '../../utils/club1000Access';
import { formatDMY } from '../../utils/dateFormat';
import FormSheet from '../../components/FormSheet';
import { TextField, inputStyle } from '../../components/Field';
import { buildInvestorLOIHtml } from '../../lib/investorLOIHtml';

const NAVY = COLORS.navy; const TEAL = '#00838F'; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, ...CARD_SHADOW };

const STATUS_COLOR = {
  active: { bg: COLORS.successBg, fg: COLORS.success },
  matured: { bg: COLORS.linkBg, fg: COLORS.link },
  redeemed: { bg: COLORS.purpleBg, fg: COLORS.purple },
  premature_redeemed: { bg: COLORS.warningBg, fg: COLORS.warning },
};

function fmtMoney(n) {
  const num = Number(n || 0);
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

// ── Date helpers — local date parts only, never toISOString() (avoids UTC day-shift). ──
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addMonths(d, n) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

// Every interest instalment (quarterly or monthly) falls on this fixed day of
// its month rather than the month-end — e.g. investing 25 Jun means the first
// quarterly instalment is 10 Jul (a 15-day stub), not 31 Jul — mirrors
// backend/club1000/services.py::PAYOUT_DAY.
const PAYOUT_DAY = 10;

// Company fiscal quarters: Q1 = Apr-Jun, Q2 = Jul-Sep, Q3 = Oct-Dec, Q4 = Jan-Mar.
// Quarterly interest is paid in the FIRST month of the quarter AFTER the one the
// investment falls in — e.g. investing anywhere in Q1 (Apr/May/Jun) pays out in
// July (Q2's start month), Q2 investments pay in October, Q3 in January, Q4 in
// April — mirrors backend/club1000/services.py::_next_quarter_payout.
const QUARTER_START_MONTHS = [4, 7, 10, 1]; // Q1, Q2, Q3, Q4 start months (1-indexed)

function quarterIndex(month) { // 0=Q1(Apr-Jun) 1=Q2(Jul-Sep) 2=Q3(Oct-Dec) 3=Q4(Jan-Mar)
  return Math.floor((((month - 4) % 12) + 12) % 12 / 3);
}

function nextQuarterPayout(d) {
  const idx = quarterIndex(d.getMonth() + 1); // getMonth() is 0-indexed
  const nextIdx = (idx + 1) % 4;
  const targetMonth = QUARTER_START_MONTHS[nextIdx]; // 1-indexed
  // Only the Q3 (Oct-Dec) -> Q4 (Jan) handoff crosses a calendar year boundary.
  const year = idx === 2 ? d.getFullYear() + 1 : d.getFullYear();
  return new Date(year, targetMonth - 1, PAYOUT_DAY);
}

// The LAST instalment is capped at the maturity date instead of always
// landing on the next quarter's PAYOUT_DAY — otherwise the stretch from the
// last regular quarterly date to maturity would go uncompensated. Mirrors
// backend/club1000/services.py::default_quarterly_dates.
function computeQuarterlyDates(investmentDate, tenureMonths) {
  const maturity = addMonths(investmentDate, Number(tenureMonths) || 0);
  let current = investmentDate;
  const dates = [];
  for (;;) {
    const nxt = nextQuarterPayout(current);
    if (nxt >= maturity) { dates.push(toISODate(maturity)); break; }
    dates.push(toISODate(nxt));
    current = nxt;
  }
  return dates;
}

// Mirrors backend/club1000/services.py::default_monthly_dates — one instalment
// per calendar month on PAYOUT_DAY, for the full tenure.
function nextMonth10th(d) {
  const totalMonth = d.getMonth() + 1 + 1; // 1-indexed, +1 month ahead
  const year = d.getFullYear() + Math.floor((totalMonth - 1) / 12);
  const month = ((totalMonth - 1) % 12) + 1;
  return new Date(year, month - 1, PAYOUT_DAY);
}

// The LAST instalment is capped at the maturity date — see computeQuarterlyDates.
function computeMonthlyDates(investmentDate, tenureMonths) {
  const maturity = addMonths(investmentDate, Number(tenureMonths) || 0);
  let current = investmentDate;
  const dates = [];
  for (;;) {
    const nxt = nextMonth10th(current);
    if (nxt >= maturity) { dates.push(toISODate(maturity)); break; }
    dates.push(toISODate(nxt));
    current = nxt;
  }
  return dates;
}

// Day-count proration, mirrors backend/club1000/services.py::generate_payout_schedule:
// dailyRate = principal * pct/100 / 365, each instalment = dailyRate * actual
// calendar days since the PREVIOUS instalment (or since investment_date for
// the first one) — so the first instalment is usually a stub. `investmentDate`
// is a Date object; `dates` are 'YYYY-MM-DD' strings.
function prorateInstalments(dates, investmentDate, principal, totalReturnPct) {
  const dailyRate = (principal * totalReturnPct) / 100 / 365;
  let prev = investmentDate;
  return dates.map((due_date) => {
    const cur = new Date(`${due_date}T00:00:00`);
    const days = Math.round((cur - prev) / 86400000);
    prev = cur;
    return +((dailyRate * days).toFixed(2));
  });
}

// Principal + full-tenure interest, day-count basis — mirrors
// backend/club1000/services.py::maturity_value exactly. `investmentDate`/
// `maturityDate` are Date objects.
function computeMaturityValue(investmentDate, maturityDate, principal, pct) {
  if (!investmentDate || !maturityDate) return principal;
  const days = Math.round((maturityDate - investmentDate) / 86400000);
  return principal + principal * (pct / 100) * (days / 365);
}

const INTEREST_PAYOUT_LABELS = { monthly: 'Monthly', quarterly: 'Quarterly', maturity: 'At Maturity' };
const SOURCE_LABELS = { referral: 'Referral', walk_in: 'Walk-in', website: 'Website', other: 'Other' };

// ── Add Investor sheet ──────────────────────────────────────────────────────
function AddInvestorSheet({ visible, onClose, onSaved, schemes, prefillLead }) {
  const [form, setForm] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [scheduleDirty, setScheduleDirty] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [openScheduleIdx, setOpenScheduleIdx] = useState(null);
  const [schemeOpen, setSchemeOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refSuggestions, setRefSuggestions] = useState([]);
  const [refOpen, setRefOpen] = useState(false);
  const [loiDone, setLoiDone] = useState(false);
  const [loiDownloading, setLoiDownloading] = useState(false);
  const [loiFile, setLoiFile] = useState(null); // signed scan, {name, type, data(base64)}

  // (Re)initialise the form whenever the sheet is opened.
  useEffect(() => {
    if (visible) {
      const s = prefillLead?.scheme_interest
        ? schemes.find((sc) => String(sc.id) === String(prefillLead.scheme_interest)) || schemes[0]
        : schemes[0];
      setForm({
        scheme: s?.id || '',
        source: 'referral',
        reference_name: prefillLead?.reference_name || '', reference_phone: prefillLead?.reference_phone || '',
        name: prefillLead?.name || '', phone: prefillLead?.phone || '', email: prefillLead?.email || '', pan: '',
        amount_invested: prefillLead?.amount_interested ? String(prefillLead.amount_interested) : '', investment_date: new Date(),
        interest_payout: s?.interest_payout_options?.[0] || 'maturity',
        // The lead's negotiated rate wins over the scheme's rate for the
        // default frequency, if one was set.
        total_return_pct: prefillLead?.total_return_pct != null ? String(prefillLead.total_return_pct)
          : s?.payout_rates?.[s?.interest_payout_options?.[0] || 'maturity'] != null ? String(s.payout_rates[s.interest_payout_options[0] || 'maturity']) : '',
        notes: '', security: '',
      });
      apiFetch(CLUB1000_ENDPOINTS.investorReferences)
        .then((r) => (r.ok ? r.json() : []))
        .then(setRefSuggestions)
        .catch(() => {});
      setDocumentFile(null);
      setSchedule([]);
      setScheduleDirty(false);
      setLoiDone(false);
      setLoiFile(null);
    }
  }, [visible]);

  // Hooks below must all run unconditionally (before the `if (!form) return null`
  // guard) so the hook count/order never changes between renders where `form`
  // is null (sheet not yet opened) vs populated.
  const scheme = form ? schemes.find((s) => String(s.id) === String(form.scheme)) : null;
  const maturityDate = form && scheme ? addMonths(form.investment_date, scheme.tenure_months) : null;
  const maturityValuePreview = form ? computeMaturityValue(form.investment_date, maturityDate, Number(form.amount_invested) || 0, Number(form.total_return_pct) || 0) : 0;
  const payoutOptions = scheme?.interest_payout_options?.length ? scheme.interest_payout_options : ['maturity'];
  const refQuery = form?.reference_name?.trim().toLowerCase() || '';
  const filteredRefSuggestions = (refQuery ? refSuggestions.filter((r) => r.reference_name.toLowerCase().includes(refQuery)) : refSuggestions).slice(0, 8);

  function selectReferenceSuggestion(r) {
    setForm((f) => ({ ...f, reference_name: r.reference_name, reference_phone: r.reference_phone }));
    setRefOpen(false);
  }

  function buildDefaultSchedule() {
    if (!form || !scheme || (form.interest_payout !== 'quarterly' && form.interest_payout !== 'monthly')) return [];
    const dates = form.interest_payout === 'quarterly'
      ? computeQuarterlyDates(form.investment_date, scheme.tenure_months)
      : computeMonthlyDates(form.investment_date, scheme.tenure_months);
    const principal = Number(form.amount_invested) || 0;
    const totalReturn = Number(form.total_return_pct) || 0;
    const amounts = prorateInstalments(dates, form.investment_date, principal, totalReturn);
    const rows = dates.map((due_date, i) => ({ due_date, amount_due: String(amounts[i]), payout_type: 'interest' }));
    rows.push({ due_date: maturityDate ? toISODate(maturityDate) : '', amount_due: String(principal), payout_type: 'maturity' });
    return rows;
  }

  useEffect(() => {
    if (!form) return;
    if (form.interest_payout === 'quarterly' || form.interest_payout === 'monthly') {
      if (!scheduleDirty) setSchedule(buildDefaultSchedule());
    } else if (schedule.length) {
      setSchedule([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.interest_payout, form?.scheme, form?.investment_date, form?.total_return_pct, form?.amount_invested]);

  if (!form) return null;

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function selectScheme(s) {
    const freq = s.interest_payout_options?.[0] || 'maturity';
    setSchemeOpen(false);
    setScheduleDirty(false);
    setForm((f) => ({ ...f, scheme: s.id, interest_payout: freq, total_return_pct: s.payout_rates?.[freq] != null ? String(s.payout_rates[freq]) : '' }));
  }

  // Changing the frequency re-prefills return % from the scheme's rate for
  // THAT frequency — each frequency carries its own rate, not one flat number.
  function selectInterestPayout(freq) {
    setForm((f) => ({ ...f, interest_payout: freq, total_return_pct: scheme?.payout_rates?.[freq] != null ? String(scheme.payout_rates[freq]) : '' }));
  }

  function updateScheduleRow(idx, field, value) {
    setScheduleDirty(true);
    setSchedule((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function resetSchedule() {
    setScheduleDirty(false);
    setSchedule(buildDefaultSchedule());
  }

  async function pickDocument() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      const data = await FileSystem.readAsStringAsync(a.uri, { encoding: FileSystem.EncodingType.Base64 });
      setDocumentFile({ name: a.name || 'document', type: a.mimeType || 'application/octet-stream', data });
    } catch (e) {
      Alert.alert('Attach failed', e.message);
    }
  }

  // Generate & share/download the Investment Proposal Form (LOI) from the
  // form's current values — client-side only, no API call except previewing
  // the stable LOI number so it's baked into the PDF (the real number is
  // (re)computed the same way at actual submit time).
  async function doDownloadLoi() {
    if (!scheme) { Alert.alert('Select a scheme', 'Choose a scheme before generating the LOI.'); return; }
    if (!form.name.trim()) { Alert.alert('Missing name', 'Investor name is required before generating the LOI.'); return; }
    if (Number(form.amount_invested) < Number(scheme.min_ticket_size)) {
      Alert.alert('Amount too low', `Minimum ticket size for ${scheme.name} is ${fmtMoney(scheme.min_ticket_size)}.`);
      return;
    }
    setLoiDownloading(true);
    try {
      const noRes = await apiFetch(`${CLUB1000_ENDPOINTS.investorNextLoiNo}?scheme_id=${scheme.id}`);
      const { loi_no } = noRes.ok ? await noRes.json() : { loi_no: '' };
      const html = buildInvestorLOIHtml({ ...form, investment_date: toISODate(form.investment_date), loi_no }, scheme, { schedule });
      const { uri } = await Print.printToFileAsync({ html });
      const name = `LOI_${loi_no || form.name}.pdf`.replace(/\s+/g, '_');
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: name });
      else await Print.printAsync({ uri });
      setLoiDone(true);
    } catch (e) {
      Alert.alert('Could not generate the LOI', e.message);
    } finally {
      setLoiDownloading(false);
    }
  }

  async function pickSignedLoi() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      const data = await FileSystem.readAsStringAsync(a.uri, { encoding: FileSystem.EncodingType.Base64 });
      setLoiFile({ name: a.name || 'signed_loi', type: a.mimeType || 'application/pdf', data });
    } catch (e) {
      Alert.alert('Attach failed', e.message);
    }
  }

  async function submit() {
    if (!form.name.trim() || !form.phone.trim() || !form.amount_invested || !scheme) {
      Alert.alert('Missing fields', 'Scheme, Name, Mobile Number and Amount Invested are required.');
      return;
    }
    if (Number(form.amount_invested) < Number(scheme.min_ticket_size)) {
      Alert.alert('Amount too low', `Minimum ticket size for ${scheme.name} is ${fmtMoney(scheme.min_ticket_size)}.`);
      return;
    }
    if (!loiFile) {
      Alert.alert('Signed LOI required', 'Download the LOI, get it signed, and attach it before submitting.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        scheme: form.scheme,
        source: form.source,
        reference_name: form.reference_name.trim(),
        reference_phone: form.reference_phone.trim(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        pan: form.pan.trim(),
        amount_invested: form.amount_invested,
        investment_date: toISODate(form.investment_date),
        interest_payout: form.interest_payout,
        total_return_pct: form.total_return_pct,
        notes: form.notes.trim(),
        security: (form.security || '').trim(),
        loi_file: loiFile,
      };
      if (payload.source !== 'referral') { delete payload.reference_name; delete payload.reference_phone; }
      if (documentFile) payload.document_file = documentFile;
      if ((form.interest_payout === 'quarterly' || form.interest_payout === 'monthly') && schedule.length) payload.payout_schedule = schedule;
      if (prefillLead?.id) payload.lead = prefillLead.id;
      const res = await apiFetch(CLUB1000_ENDPOINTS.investors, { method: 'POST', body: JSON.stringify(payload) });
      const d = await res.json();
      if (!res.ok) {
        Alert.alert('Could not add investor', d?.amount_invested?.[0] || d?.detail || 'Please check the fields.');
        return;
      }
      onSaved(d);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormSheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <Text style={{ flex: 1, fontSize: 17, fontWeight: '800', color: TEXT }}>Add Investor</Text>
        <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={18} color={TEXT} />
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Scheme picker */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6 }}>Scheme <Text style={{ color: COLORS.error }}>*</Text></Text>
          <TouchableOpacity onPress={() => setSchemeOpen((v) => !v)}
            style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <Text style={{ fontSize: 15, color: scheme ? TEXT : MUTED }}>{scheme ? scheme.name : 'Select a scheme'}</Text>
            <Ionicons name={schemeOpen ? 'chevron-up' : 'chevron-down'} size={16} color={MUTED} />
          </TouchableOpacity>
          {schemeOpen && (
            <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, marginTop: 6, overflow: 'hidden' }}>
              {schemes.map((s, i) => (
                <TouchableOpacity key={s.id} onPress={() => selectScheme(s)}
                  style={{ padding: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: COLORS.surfaceAlt, backgroundColor: String(form.scheme) === String(s.id) ? COLORS.linkBg : COLORS.white }}>
                  <Text style={{ fontSize: 14, color: TEXT, fontWeight: String(form.scheme) === String(s.id) ? '700' : '400' }}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {scheme && (
            <Text style={{ fontSize: 11, color: MUTED, marginTop: 5 }}>
              Min ticket {fmtMoney(scheme.min_ticket_size)}{maturityDate ? ` · Matures ${formatDMY(toISODate(maturityDate))}` : ''}
            </Text>
          )}
        </View>

        {/* Interest payout + return % */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6 }}>Interest Payout</Text>
            <View style={{ flexDirection: 'row', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border }}>
              {payoutOptions.map((v) => (
                <TouchableOpacity key={v} onPress={() => selectInterestPayout(v)}
                  style={{ flex: 1, paddingVertical: 11, alignItems: 'center', backgroundColor: form.interest_payout === v ? TEAL : COLORS.white }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: form.interest_payout === v ? COLORS.white : MUTED }}>{INTEREST_PAYOUT_LABELS[v] || v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Return %" required value={form.total_return_pct} onChangeText={(v) => set('total_return_pct', v)} keyboardType="decimal-pad" />
          </View>
        </View>

        {Number(form.amount_invested) > 0 && Number(form.total_return_pct) > 0 && (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0FBFA', borderWidth: 1, borderColor: '#CDEEEC', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 }}>
            <Text style={{ color: '#0D6E64', fontWeight: '600', fontSize: 13 }}>Maturity Value</Text>
            <Text style={{ color: '#0D6E64', fontWeight: '800', fontSize: 13 }}>{fmtMoney(maturityValuePreview)}</Text>
          </View>
        )}

        {/* Quarterly/monthly schedule preview */}
        {(form.interest_payout === 'quarterly' || form.interest_payout === 'monthly') && schedule.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED }}>Payout Schedule (confirm or edit)</Text>
              <TouchableOpacity onPress={resetSchedule}><Text style={{ fontSize: 12, fontWeight: '700', color: TEAL }}>Reset</Text></TouchableOpacity>
            </View>
            <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden' }}>
              {schedule.map((row, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: COLORS.surfaceAlt }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: row.payout_type === 'maturity' ? COLORS.purple : TEAL, width: 56 }}>
                    {row.payout_type === 'maturity' ? 'Principal' : form.interest_payout === 'monthly' ? `M${idx + 1}` : `Q${idx + 1}`}
                  </Text>
                  <TouchableOpacity onPress={() => setOpenScheduleIdx(openScheduleIdx === idx ? null : idx)}
                    style={{ flex: 1, height: 36, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', paddingHorizontal: 10 }}>
                    <Text style={{ fontSize: 12, color: TEXT }}>{formatDMY(row.due_date)}</Text>
                  </TouchableOpacity>
                  <TextInput value={String(row.amount_due)} onChangeText={(v) => updateScheduleRow(idx, 'amount_due', v)} keyboardType="decimal-pad"
                    style={{ flex: 1, height: 36, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, fontSize: 12, color: TEXT }} />
                </View>
              ))}
            </View>
            {openScheduleIdx !== null && (
              <DateTimePicker
                value={new Date(`${schedule[openScheduleIdx].due_date}T00:00:00`)}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, d) => {
                  setOpenScheduleIdx(null);
                  if (!d) return;
                  updateScheduleRow(openScheduleIdx, 'due_date', toISODate(d));
                }}
              />
            )}
          </View>
        )}

        {/* Source (mirrors the Lead form) */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6 }}>Source</Text>
          <View style={{ flexDirection: 'row', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border }}>
            {Object.entries(SOURCE_LABELS).map(([v, label]) => (
              <TouchableOpacity key={v} onPress={() => set('source', v)}
                style={{ flex: 1, paddingVertical: 11, alignItems: 'center', backgroundColor: form.source === v ? TEAL : COLORS.white }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: form.source === v ? COLORS.white : MUTED }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reference name (autocompletes from prior references) & number — only for referrals */}
        {form.source === 'referral' && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, marginBottom: 16 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6 }}>Reference Name</Text>
              <TextInput
                value={form.reference_name}
                onChangeText={(v) => { set('reference_name', v); setRefOpen(true); }}
                onFocus={() => setRefOpen(true)}
                style={inputStyle}
                placeholderTextColor="#666666"
              />
              {refOpen && filteredRefSuggestions.length > 0 && (
                <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, marginTop: 6, overflow: 'hidden' }}>
                  {filteredRefSuggestions.map((r, i) => (
                    <TouchableOpacity key={`${r.reference_phone}-${i}`} onPress={() => selectReferenceSuggestion(r)}
                      style={{ padding: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: COLORS.surfaceAlt }}>
                      <Text style={{ fontSize: 13, color: TEXT }}>{r.reference_name}{r.reference_phone ? ` — ${r.reference_phone}` : ''}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <TextField label="Reference Number" value={form.reference_phone} onChangeText={(v) => set('reference_phone', v)} keyboardType="phone-pad" />
            </View>
          </View>
        )}

        <TextField label="Investor Name" required value={form.name} onChangeText={(v) => set('name', v)} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <TextField label="Mobile Number" required value={form.phone} onChangeText={(v) => set('phone', v)} keyboardType="phone-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Email" value={form.email} onChangeText={(v) => set('email', v)} keyboardType="email-address" autoCapitalize="none" />
          </View>
        </View>
        <TextField label="PAN" value={form.pan} onChangeText={(v) => set('pan', v.toUpperCase())} autoCapitalize="characters" />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6 }}>Date of Investment</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={inputStyle}>
              <Text style={{ fontSize: 15, color: TEXT }}>{formatDMY(toISODate(form.investment_date))}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6 }}>Date of Maturity</Text>
            <View style={[inputStyle, { backgroundColor: COLORS.surfaceAlt }]}>
              <Text style={{ fontSize: 15, color: MUTED }}>{maturityDate ? formatDMY(toISODate(maturityDate)) : '—'}</Text>
            </View>
          </View>
        </View>
        {showDatePicker && (
          <DateTimePicker value={form.investment_date} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_, d) => { setShowDatePicker(false); if (d) set('investment_date', d); }} />
        )}

        <TextField label="Amount Invested (₹)" required value={form.amount_invested} onChangeText={(v) => set('amount_invested', v)} keyboardType="number-pad" />

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6 }}>Scan Document (KYC / ID proof)</Text>
          <TouchableOpacity onPress={pickDocument} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12 }}>
            <Ionicons name="attach-outline" size={18} color={TEAL} />
            <Text style={{ fontSize: 13, color: documentFile ? TEXT : MUTED, flex: 1 }} numberOfLines={1}>
              {documentFile ? documentFile.name : 'Attach a photo or PDF'}
            </Text>
          </TouchableOpacity>
        </View>

        <TextField label="Security (for LOI — optional)" value={form.security} onChangeText={(v) => set('security', v)} placeholder="NA" />
        <TextField label="Notes" value={form.notes} onChangeText={(v) => set('notes', v)} />

        <View style={{ backgroundColor: COLORS.surfaceAlt, borderRadius: 10, padding: 12, marginTop: 4, marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 8 }}>Investment Proposal Form (LOI)</Text>
          <TouchableOpacity onPress={doDownloadLoi} disabled={loiDownloading}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: TEAL, borderRadius: 10, height: 44, opacity: loiDownloading ? 0.7 : 1 }}>
            {loiDownloading ? <ActivityIndicator color={TEAL} /> : <Ionicons name="download-outline" size={17} color={TEAL} />}
            <Text style={{ color: TEAL, fontSize: 13, fontWeight: '700' }}>{loiDownloading ? 'Generating…' : 'Download LOI PDF (Print → Sign → Upload)'}</Text>
          </TouchableOpacity>
          {loiDone && <Text style={{ fontSize: 11, color: COLORS.success, marginTop: 6 }}>LOI downloaded — get it signed and upload below.</Text>}
          <TouchableOpacity onPress={pickSignedLoi} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, marginTop: 10 }}>
            <Ionicons name="attach-outline" size={18} color={TEAL} />
            <Text style={{ fontSize: 13, color: loiFile ? TEXT : MUTED, flex: 1 }} numberOfLines={1}>
              {loiFile ? loiFile.name : 'Attach the signed LOI (image / PDF) *'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={submit} disabled={saving || !loiFile}
          style={{ backgroundColor: TEAL, borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: (saving || !loiFile) ? 0.5 : 1, marginTop: 8 }}>
          {saving ? <ActivityIndicator color={COLORS.white} /> : <Ionicons name="save-outline" size={17} color={COLORS.white} />}
          <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: '800' }}>Submit for Approval</Text>
        </TouchableOpacity>
      </ScrollView>
    </FormSheet>
  );
}

// ── Revise LOI sheet ─────────────────────────────────────────────────────────
// Proposes new terms + a newly signed LOI on an already-approved investor —
// re-enters the approval queue on the SAME record (see backend model
// docstring for why a new row isn't created). Scheme/identity/investment
// date stay fixed; only amount/return/payout/security/notes can change.
function ReviseInvestorSheet({ visible, investor, scheme, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [scheduleDirty, setScheduleDirty] = useState(false);
  const [openScheduleIdx, setOpenScheduleIdx] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loiDone, setLoiDone] = useState(false);
  const [loiDownloading, setLoiDownloading] = useState(false);
  const [loiFile, setLoiFile] = useState(null);

  useEffect(() => {
    if (visible && investor) {
      setForm({
        amount_invested: String(investor.amount_invested || ''),
        interest_payout: investor.interest_payout || 'maturity',
        total_return_pct: String(investor.total_return_pct ?? ''),
        security: investor.security || '',
        notes: investor.notes || '',
      });
      setSchedule([]); setScheduleDirty(false); setLoiDone(false); setLoiFile(null);
    }
  }, [visible, investor]);

  const nextRevisionNo = investor ? (investor.revision_no || 0) + 1 : 1;
  const investmentDate = investor ? new Date(`${investor.investment_date}T00:00:00`) : new Date();
  const maturityDate = investor && scheme ? addMonths(investmentDate, scheme.tenure_months) : null;

  function buildDefaultSchedule() {
    if (!form || !scheme || (form.interest_payout !== 'quarterly' && form.interest_payout !== 'monthly')) return [];
    const dates = form.interest_payout === 'quarterly'
      ? computeQuarterlyDates(investmentDate, scheme.tenure_months)
      : computeMonthlyDates(investmentDate, scheme.tenure_months);
    const principal = Number(form.amount_invested) || 0;
    const totalReturn = Number(form.total_return_pct) || 0;
    const amounts = prorateInstalments(dates, investmentDate, principal, totalReturn);
    const rows = dates.map((due_date, i) => ({ due_date, amount_due: String(amounts[i]), payout_type: 'interest' }));
    rows.push({ due_date: maturityDate ? toISODate(maturityDate) : '', amount_due: String(principal), payout_type: 'maturity' });
    return rows;
  }

  useEffect(() => {
    if (!form) return;
    if (form.interest_payout === 'quarterly' || form.interest_payout === 'monthly') {
      if (!scheduleDirty) setSchedule(buildDefaultSchedule());
    } else if (schedule.length) {
      setSchedule([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.interest_payout, form?.total_return_pct, form?.amount_invested]);

  if (!investor || !form) return null;

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  // Changing the frequency re-prefills return % from the scheme's rate for
  // THAT frequency — each frequency carries its own rate, not one flat number.
  function selectInterestPayout(freq) {
    setForm((f) => ({ ...f, interest_payout: freq, total_return_pct: scheme?.payout_rates?.[freq] != null ? String(scheme.payout_rates[freq]) : f.total_return_pct }));
  }

  function updateScheduleRow(idx, field, value) {
    setScheduleDirty(true);
    setSchedule((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }
  function resetSchedule() { setScheduleDirty(false); setSchedule(buildDefaultSchedule()); }

  async function doDownloadLoi() {
    if (Number(form.amount_invested) < Number(scheme.min_ticket_size)) {
      Alert.alert('Amount too low', `Minimum ticket size for ${scheme.name} is ${fmtMoney(scheme.min_ticket_size)}.`);
      return;
    }
    setLoiDownloading(true);
    try {
      const html = buildInvestorLOIHtml({ ...investor, ...form }, scheme, { revisionNo: nextRevisionNo, schedule });
      const { uri } = await Print.printToFileAsync({ html });
      const name = `LOI_${investor.loi_no || investor.name}_R${nextRevisionNo}.pdf`.replace(/\s+/g, '_');
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: name });
      else await Print.printAsync({ uri });
      setLoiDone(true);
    } catch (e) {
      Alert.alert('Could not generate the LOI', e.message);
    } finally {
      setLoiDownloading(false);
    }
  }

  async function pickSignedLoi() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      const data = await FileSystem.readAsStringAsync(a.uri, { encoding: FileSystem.EncodingType.Base64 });
      setLoiFile({ name: a.name || 'signed_loi', type: a.mimeType || 'application/pdf', data });
    } catch (e) {
      Alert.alert('Attach failed', e.message);
    }
  }

  async function submit() {
    if (Number(form.amount_invested) < Number(scheme.min_ticket_size)) {
      Alert.alert('Amount too low', `Minimum ticket size for ${scheme.name} is ${fmtMoney(scheme.min_ticket_size)}.`);
      return;
    }
    if (!loiFile) {
      Alert.alert('Signed LOI required', 'Download the revised LOI, get it signed, and attach it before submitting.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, loi_file: loiFile };
      if ((form.interest_payout === 'quarterly' || form.interest_payout === 'monthly') && schedule.length) payload.payout_schedule = schedule;
      const res = await apiFetch(CLUB1000_ENDPOINTS.investorRevise(investor.id), { method: 'POST', body: JSON.stringify(payload) });
      const d = await res.json();
      if (!res.ok) {
        Alert.alert('Could not submit revision', d?.detail || 'Please check the fields.');
        return;
      }
      onSaved(d);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormSheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT }}>Revise LOI · R{nextRevisionNo}</Text>
          <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{investor.name} · {investor.phone} · {scheme?.name}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={18} color={TEXT} />
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 11, color: MUTED, backgroundColor: COLORS.surfaceAlt, borderRadius: 10, padding: 10, marginBottom: 16 }}>
          Scheme, investor identity and investment date stay fixed across a revision — only the terms below can change. Matures {maturityDate ? formatDMY(toISODate(maturityDate)) : '—'}.
        </Text>

        <TextField label="Amount Invested (₹)" required value={form.amount_invested} onChangeText={(v) => set('amount_invested', v)} keyboardType="number-pad" />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6 }}>Interest Payout</Text>
            <View style={{ flexDirection: 'row', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border }}>
              {(scheme?.interest_payout_options?.length ? scheme.interest_payout_options : ['maturity']).map((v) => (
                <TouchableOpacity key={v} onPress={() => selectInterestPayout(v)}
                  style={{ flex: 1, paddingVertical: 11, alignItems: 'center', backgroundColor: form.interest_payout === v ? TEAL : COLORS.white }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: form.interest_payout === v ? COLORS.white : MUTED }}>{INTEREST_PAYOUT_LABELS[v] || v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Return %" required value={form.total_return_pct} onChangeText={(v) => set('total_return_pct', v)} keyboardType="decimal-pad" />
          </View>
        </View>

        {(form.interest_payout === 'quarterly' || form.interest_payout === 'monthly') && schedule.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED }}>Payout Schedule (confirm or edit)</Text>
              <TouchableOpacity onPress={resetSchedule}><Text style={{ fontSize: 12, fontWeight: '700', color: TEAL }}>Reset</Text></TouchableOpacity>
            </View>
            <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden' }}>
              {schedule.map((row, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: COLORS.surfaceAlt }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: row.payout_type === 'maturity' ? COLORS.purple : TEAL, width: 56 }}>
                    {row.payout_type === 'maturity' ? 'Principal' : form.interest_payout === 'monthly' ? `M${idx + 1}` : `Q${idx + 1}`}
                  </Text>
                  <Text style={{ flex: 1, fontSize: 12, color: TEXT }}>{formatDMY(row.due_date)}</Text>
                  <TextInput value={String(row.amount_due)} onChangeText={(v) => updateScheduleRow(idx, 'amount_due', v)} keyboardType="decimal-pad"
                    style={{ flex: 1, height: 36, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, fontSize: 12, color: TEXT }} />
                </View>
              ))}
            </View>
          </View>
        )}

        <TextField label="Security (for LOI — optional)" value={form.security} onChangeText={(v) => set('security', v)} placeholder="NA" />
        <TextField label="Notes" value={form.notes} onChangeText={(v) => set('notes', v)} />

        <View style={{ backgroundColor: COLORS.surfaceAlt, borderRadius: 10, padding: 12, marginTop: 4, marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 8 }}>Revised Investment Proposal Form (LOI)</Text>
          <TouchableOpacity onPress={doDownloadLoi} disabled={loiDownloading}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: COLORS.purple, borderRadius: 10, height: 44, opacity: loiDownloading ? 0.7 : 1 }}>
            {loiDownloading ? <ActivityIndicator color={COLORS.purple} /> : <Ionicons name="download-outline" size={17} color={COLORS.purple} />}
            <Text style={{ color: COLORS.purple, fontSize: 13, fontWeight: '700' }}>{loiDownloading ? 'Generating…' : `Download Revised LOI (R${nextRevisionNo})`}</Text>
          </TouchableOpacity>
          {loiDone && <Text style={{ fontSize: 11, color: COLORS.success, marginTop: 6 }}>Revised LOI downloaded — get it signed and upload below.</Text>}
          <TouchableOpacity onPress={pickSignedLoi} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, marginTop: 10 }}>
            <Ionicons name="attach-outline" size={18} color={COLORS.purple} />
            <Text style={{ fontSize: 13, color: loiFile ? TEXT : MUTED, flex: 1 }} numberOfLines={1}>
              {loiFile ? loiFile.name : 'Attach the signed revised LOI (image / PDF) *'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={submit} disabled={saving || !loiFile}
          style={{ backgroundColor: COLORS.purple, borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: (saving || !loiFile) ? 0.5 : 1, marginTop: 8 }}>
          {saving ? <ActivityIndicator color={COLORS.white} /> : <Ionicons name="save-outline" size={17} color={COLORS.white} />}
          <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: '800' }}>Submit Revision for Approval</Text>
        </TouchableOpacity>
      </ScrollView>
    </FormSheet>
  );
}

// ── Renew sheet ──────────────────────────────────────────────────────────────
// Presented when a matured investor chooses to renew instead of taking a
// Payout — restarts the term from a chosen renewal date (defaults today),
// terms can go up or down, goes through the same sign-and-approve LOI flow
// as Revise but is a distinct endpoint so the backend knows to reset
// investment_date/maturity_date and apply the renewal referral-reward rate.
const AMBER = COLORS.warningAlt;

function RenewInvestorSheet({ visible, investor, scheme, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [scheduleDirty, setScheduleDirty] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loiDone, setLoiDone] = useState(false);
  const [loiDownloading, setLoiDownloading] = useState(false);
  const [loiFile, setLoiFile] = useState(null);

  useEffect(() => {
    if (visible && investor) {
      setForm({
        investment_date: new Date(),
        amount_invested: String(investor.amount_invested || ''),
        interest_payout: investor.interest_payout || 'maturity',
        total_return_pct: String(investor.total_return_pct ?? ''),
        security: investor.security || '',
        notes: investor.notes || '',
      });
      setSchedule([]); setScheduleDirty(false); setLoiDone(false); setLoiFile(null);
    }
  }, [visible, investor]);

  const nextRevisionNo = investor ? (investor.revision_no || 0) + 1 : 1;
  const maturityDate = form && scheme ? addMonths(form.investment_date, scheme.tenure_months) : null;

  function buildDefaultSchedule() {
    if (!form || !scheme || (form.interest_payout !== 'quarterly' && form.interest_payout !== 'monthly')) return [];
    const dates = form.interest_payout === 'quarterly'
      ? computeQuarterlyDates(form.investment_date, scheme.tenure_months)
      : computeMonthlyDates(form.investment_date, scheme.tenure_months);
    const principal = Number(form.amount_invested) || 0;
    const totalReturn = Number(form.total_return_pct) || 0;
    const amounts = prorateInstalments(dates, form.investment_date, principal, totalReturn);
    const rows = dates.map((due_date, i) => ({ due_date, amount_due: String(amounts[i]), payout_type: 'interest' }));
    rows.push({ due_date: maturityDate ? toISODate(maturityDate) : '', amount_due: String(principal), payout_type: 'maturity' });
    return rows;
  }

  useEffect(() => {
    if (!form) return;
    if (form.interest_payout === 'quarterly' || form.interest_payout === 'monthly') {
      if (!scheduleDirty) setSchedule(buildDefaultSchedule());
    } else if (schedule.length) {
      setSchedule([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.interest_payout, form?.total_return_pct, form?.amount_invested, form?.investment_date]);

  if (!investor || !form) return null;

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  // Changing the frequency re-prefills return % from the scheme's rate for
  // THAT frequency — each frequency carries its own rate, not one flat number.
  function selectInterestPayout(freq) {
    setForm((f) => ({ ...f, interest_payout: freq, total_return_pct: scheme?.payout_rates?.[freq] != null ? String(scheme.payout_rates[freq]) : f.total_return_pct }));
  }

  function updateScheduleRow(idx, field, value) {
    setScheduleDirty(true);
    setSchedule((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }
  function resetSchedule() { setScheduleDirty(false); setSchedule(buildDefaultSchedule()); }

  async function doDownloadLoi() {
    if (Number(form.amount_invested) < Number(scheme.min_ticket_size)) {
      Alert.alert('Amount too low', `Minimum ticket size for ${scheme.name} is ${fmtMoney(scheme.min_ticket_size)}.`);
      return;
    }
    setLoiDownloading(true);
    try {
      // maturity_date is explicitly overridden (not just spread from `investor`)
      // because renewing changes investment_date — the OLD investor.maturity_date
      // would otherwise leak through and understate/misdate the schedule's totals.
      const html = buildInvestorLOIHtml({ ...investor, ...form, investment_date: toISODate(form.investment_date), maturity_date: maturityDate ? toISODate(maturityDate) : null }, scheme, { renewalNo: nextRevisionNo, schedule });
      const { uri } = await Print.printToFileAsync({ html });
      const name = `LOI_${investor.loi_no || investor.name}_R${nextRevisionNo}.pdf`.replace(/\s+/g, '_');
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: name });
      else await Print.printAsync({ uri });
      setLoiDone(true);
    } catch (e) {
      Alert.alert('Could not generate the LOI', e.message);
    } finally {
      setLoiDownloading(false);
    }
  }

  async function pickSignedLoi() {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      const data = await FileSystem.readAsStringAsync(a.uri, { encoding: FileSystem.EncodingType.Base64 });
      setLoiFile({ name: a.name || 'signed_loi', type: a.mimeType || 'application/pdf', data });
    } catch (e) {
      Alert.alert('Attach failed', e.message);
    }
  }

  async function submit() {
    if (Number(form.amount_invested) < Number(scheme.min_ticket_size)) {
      Alert.alert('Amount too low', `Minimum ticket size for ${scheme.name} is ${fmtMoney(scheme.min_ticket_size)}.`);
      return;
    }
    if (!loiFile) {
      Alert.alert('Signed LOI required', 'Download the renewed LOI, get it signed, and attach it before submitting.');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, investment_date: toISODate(form.investment_date), loi_file: loiFile };
      if ((form.interest_payout === 'quarterly' || form.interest_payout === 'monthly') && schedule.length) payload.payout_schedule = schedule;
      const res = await apiFetch(CLUB1000_ENDPOINTS.investorRenew(investor.id), { method: 'POST', body: JSON.stringify(payload) });
      const d = await res.json();
      if (!res.ok) {
        Alert.alert('Could not submit renewal', d?.detail || 'Please check the fields.');
        return;
      }
      onSaved(d);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormSheet visible={visible} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT }}>Renew Investment · R{nextRevisionNo}</Text>
          <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{investor.name} · {investor.phone} · {scheme?.name}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={18} color={TEXT} />
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 11, color: MUTED, backgroundColor: COLORS.surfaceAlt, borderRadius: 10, padding: 10, marginBottom: 16 }}>
          This investment matured on {formatDMY(investor.maturity_date)}. Set the renewal terms below — amount can go up or down.
        </Text>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6 }}>Renewal Date</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)} style={inputStyle}>
              <Text style={{ fontSize: 15, color: TEXT }}>{formatDMY(toISODate(form.investment_date))}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6 }}>New Maturity</Text>
            <View style={[inputStyle, { backgroundColor: COLORS.surfaceAlt }]}>
              <Text style={{ fontSize: 15, color: MUTED }}>{maturityDate ? formatDMY(toISODate(maturityDate)) : '—'}</Text>
            </View>
          </View>
        </View>
        {showDatePicker && (
          <DateTimePicker value={form.investment_date} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_, d) => { setShowDatePicker(false); if (d) set('investment_date', d); }} />
        )}

        <TextField label="Amount Invested (₹)" required value={form.amount_invested} onChangeText={(v) => set('amount_invested', v)} keyboardType="number-pad" />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6 }}>Interest Payout</Text>
            <View style={{ flexDirection: 'row', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border }}>
              {(scheme?.interest_payout_options?.length ? scheme.interest_payout_options : ['maturity']).map((v) => (
                <TouchableOpacity key={v} onPress={() => selectInterestPayout(v)}
                  style={{ flex: 1, paddingVertical: 11, alignItems: 'center', backgroundColor: form.interest_payout === v ? TEAL : COLORS.white }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: form.interest_payout === v ? COLORS.white : MUTED }}>{INTEREST_PAYOUT_LABELS[v] || v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Return %" required value={form.total_return_pct} onChangeText={(v) => set('total_return_pct', v)} keyboardType="decimal-pad" />
          </View>
        </View>

        {(form.interest_payout === 'quarterly' || form.interest_payout === 'monthly') && schedule.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED }}>Payout Schedule (confirm or edit)</Text>
              <TouchableOpacity onPress={resetSchedule}><Text style={{ fontSize: 12, fontWeight: '700', color: TEAL }}>Reset</Text></TouchableOpacity>
            </View>
            <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, overflow: 'hidden' }}>
              {schedule.map((row, idx) => (
                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: COLORS.surfaceAlt }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: row.payout_type === 'maturity' ? AMBER : TEAL, width: 56 }}>
                    {row.payout_type === 'maturity' ? 'Principal' : form.interest_payout === 'monthly' ? `M${idx + 1}` : `Q${idx + 1}`}
                  </Text>
                  <Text style={{ flex: 1, fontSize: 12, color: TEXT }}>{formatDMY(row.due_date)}</Text>
                  <TextInput value={String(row.amount_due)} onChangeText={(v) => updateScheduleRow(idx, 'amount_due', v)} keyboardType="decimal-pad"
                    style={{ flex: 1, height: 36, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, fontSize: 12, color: TEXT }} />
                </View>
              ))}
            </View>
          </View>
        )}

        <TextField label="Security (for LOI — optional)" value={form.security} onChangeText={(v) => set('security', v)} placeholder="NA" />
        <TextField label="Notes" value={form.notes} onChangeText={(v) => set('notes', v)} />

        <View style={{ backgroundColor: COLORS.surfaceAlt, borderRadius: 10, padding: 12, marginTop: 4, marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 8 }}>Renewed Investment Proposal Form (LOI)</Text>
          <TouchableOpacity onPress={doDownloadLoi} disabled={loiDownloading}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: AMBER, borderRadius: 10, height: 44, opacity: loiDownloading ? 0.7 : 1 }}>
            {loiDownloading ? <ActivityIndicator color={AMBER} /> : <Ionicons name="download-outline" size={17} color={AMBER} />}
            <Text style={{ color: AMBER, fontSize: 13, fontWeight: '700' }}>{loiDownloading ? 'Generating…' : `Download Renewed LOI (R${nextRevisionNo})`}</Text>
          </TouchableOpacity>
          {loiDone && <Text style={{ fontSize: 11, color: COLORS.success, marginTop: 6 }}>Renewed LOI downloaded — get it signed and upload below.</Text>}
          <TouchableOpacity onPress={pickSignedLoi} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, marginTop: 10 }}>
            <Ionicons name="attach-outline" size={18} color={AMBER} />
            <Text style={{ fontSize: 13, color: loiFile ? TEXT : MUTED, flex: 1 }} numberOfLines={1}>
              {loiFile ? loiFile.name : 'Attach the signed renewed LOI (image / PDF) *'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={submit} disabled={saving || !loiFile}
          style={{ backgroundColor: AMBER, borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: (saving || !loiFile) ? 0.5 : 1, marginTop: 8 }}>
          {saving ? <ActivityIndicator color={COLORS.white} /> : <Ionicons name="save-outline" size={17} color={COLORS.white} />}
          <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: '800' }}>Submit Renewal for Approval</Text>
        </TouchableOpacity>
      </ScrollView>
    </FormSheet>
  );
}

// ── Ledger modal ─────────────────────────────────────────────────────────────
// Full money-movement history for one investor — the investment itself plus
// every scheduled payout (interest/maturity/premature redemption), paid or
// still pending — in one chronological timeline.
const LEDGER_TYPE_COLOR = {
  investment: { bg: COLORS.linkBg, fg: COLORS.link },
  interest: { bg: COLORS.successBg, fg: COLORS.success },
  maturity: { bg: COLORS.purpleBg, fg: COLORS.purple },
  premature_redemption: { bg: COLORS.warningBg, fg: COLORS.warning },
};
const LEDGER_STATUS_COLOR = {
  completed: { bg: COLORS.successBg, fg: COLORS.success },
  paid: { bg: COLORS.successBg, fg: COLORS.success },
  pending: { bg: COLORS.warningBg, fg: AMBER },
};

function LedgerBadge({ label, color }) {
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: color.bg, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: color.fg, textTransform: 'capitalize' }}>{label.replace(/_/g, ' ')}</Text>
    </View>
  );
}

function LedgerModal({ investorId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!investorId) return;
    let cancelled = false;
    setLoading(true); setErr('');
    apiFetch(CLUB1000_ENDPOINTS.investorLedger(investorId))
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (r.ok) setData(d); else setErr(d?.detail || 'Could not load the ledger.');
      })
      .catch((e) => !cancelled && setErr(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [investorId]);

  const inv = data?.investor;
  const s = data?.summary;

  return (
    <Modal visible={!!investorId} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT }}>Ledger{inv ? ` — ${inv.name}` : ''}</Text>
              {!!inv && <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{inv.phone} · {inv.scheme_name}</Text>}
            </View>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={MUTED} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
            {loading ? (
              <ActivityIndicator color={NAVY} style={{ marginTop: 30 }} />
            ) : err ? (
              <Text style={{ textAlign: 'center', color: COLORS.error, marginTop: 30 }}>{err}</Text>
            ) : (
              <>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {[
                    ['Invested', s.total_invested, COLORS.link],
                    ['Scheduled', s.total_payout_due, COLORS.purple],
                    ['Paid Out', s.total_paid, COLORS.success],
                    ['Pending', s.total_pending, AMBER],
                  ].map(([label, val, color]) => (
                    <View key={label} style={{ flexBasis: '47%', flexGrow: 1, backgroundColor: COLORS.surfaceAlt, borderRadius: 10, padding: 10 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase' }}>{label}</Text>
                      <Text style={{ fontSize: 15, fontWeight: '800', color, marginTop: 2 }}>{fmtMoney(val)}</Text>
                    </View>
                  ))}
                </View>

                {(data.entries || []).map((e, i) => (
                  <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: COLORS.surfaceAlt }}>
                    <View style={{ flex: 1 }}>
                      <LedgerBadge label={e.label} color={LEDGER_TYPE_COLOR[e.type] || { bg: COLORS.surfaceAlt, fg: MUTED }} />
                      <Text style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{formatDMY(e.date)}{e.paid_date && e.type !== 'investment' ? ` · Paid ${formatDMY(e.paid_date)}` : ''}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT }}>{fmtMoney(e.amount)}</Text>
                      <LedgerBadge label={e.status} color={LEDGER_STATUS_COLOR[e.status] || { bg: COLORS.surfaceAlt, fg: MUTED }} />
                    </View>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function Club1000InvestorsScreen({ navigation, route }) {
  const user = useSelector((s) => s.auth.user);
  const manager = isClub1000Manager(user);

  const [investors,  setInvestors]  = useState([]);
  const [schemes,    setSchemes]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdd,    setShowAdd]    = useState(false);
  const [revising,   setRevising]   = useState(null);
  const [renewing,   setRenewing]   = useState(null);
  const [ledgerFor,  setLedgerFor]  = useState(null);
  // Opened from a Lead's "Convert to Investor" action (see Club1000LeadsScreen).
  const [prefillLead, setPrefillLead] = useState(route?.params?.prefillLead || null);
  const [search, setSearch] = useState('');
  const [searchText, setSearchText] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchText), 400);
    return () => clearTimeout(t);
  }, [searchText]);

  useEffect(() => {
    if (route?.params?.prefillLead) {
      setPrefillLead(route.params.prefillLead);
      setShowAdd(true);
      navigation.setParams({ prefillLead: undefined });
    }
  }, [route?.params?.prefillLead]);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      // The approved portfolio only — pending/rejected submissions live on the
      // dedicated Investor Approvals screen (managers) until they're actioned.
      params.set('approval_status', 'approved');
      const [invRes, schemesRes] = await Promise.all([
        apiFetch(`${CLUB1000_ENDPOINTS.investors}?${params.toString()}`),
        apiFetch(CLUB1000_ENDPOINTS.schemes),
      ]);
      if (invRes.ok) setInvestors(await invRes.json());
      if (schemesRes.ok) setSchemes(await schemesRes.json());
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }

  useFocusEffect(React.useCallback(() => { load(); }, [statusFilter, search]));

  function redeem(id) {
    Alert.alert('Redeem investment?', 'This applies the premature-redemption rate for the elapsed period.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Redeem', style: 'destructive', onPress: async () => {
        const res = await apiFetch(CLUB1000_ENDPOINTS.investorRedeem(id), { method: 'POST' });
        const d = await res.json();
        if (!res.ok) { Alert.alert('Could not redeem', d?.detail || 'Please try again.'); return; }
        load();
      } },
    ]);
  }

  function maturePayout(id) {
    Alert.alert('Pay out this investment?', 'The investor will be marked redeemed. Mark the scheduled maturity payout paid separately from the Payouts screen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Payout', style: 'destructive', onPress: async () => {
        const res = await apiFetch(CLUB1000_ENDPOINTS.investorMaturePayout(id), { method: 'POST' });
        const d = await res.json();
        if (!res.ok) { Alert.alert('Could not process the payout', d?.detail || 'Please try again.'); return; }
        load();
      } },
    ]);
  }

  async function viewLoi(id) {
    try {
      const res = await apiFetch(CLUB1000_ENDPOINTS.investorLoiUrl(id));
      const d = await res.json();
      if (res.ok && d.url) Linking.openURL(d.url);
      else Alert.alert('LOI unavailable', d?.detail || 'Could not open the LOI.');
    } catch (e) { Alert.alert('LOI unavailable', e.message); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <AddInvestorSheet visible={showAdd} onClose={() => { setShowAdd(false); setPrefillLead(null); }} onSaved={() => load()} schemes={schemes} prefillLead={prefillLead} />
      <ReviseInvestorSheet visible={!!revising} investor={revising}
        scheme={schemes.find((s) => String(s.id) === String(revising?.scheme))}
        onClose={() => setRevising(null)} onSaved={() => load()} />
      <RenewInvestorSheet visible={!!renewing} investor={renewing}
        scheme={schemes.find((s) => String(s.id) === String(renewing?.scheme))}
        onClose={() => setRenewing(null)} onSaved={() => load()} />
      <LedgerModal investorId={ledgerFor} onClose={() => setLedgerFor(null)} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT }}>Investors</Text>
          <Text style={{ fontSize: 12, color: MUTED }}>{manager ? 'All investors' : 'Investors you\'ve added'}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAdd(true)} disabled={!schemes.length}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: TEAL, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, opacity: schemes.length ? 1 : 0.5 }}>
          <Ionicons name="add" size={16} color={COLORS.white} />
          <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: '700' }}>Add</Text>
        </TouchableOpacity>
      </View>
      {!loading && !schemes.length && (
        <Text style={{ fontSize: 11, color: COLORS.warning, textAlign: 'center', paddingTop: 8 }}>
          {manager ? 'Create a scheme first.' : 'No schemes yet — ask your manager to create one.'}
        </Text>
      )}

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: 10, paddingHorizontal: 12, height: 40 }}>
          <Ionicons name="search-outline" size={16} color={MUTED} />
          <TextInput value={searchText} onChangeText={setSearchText} placeholder="Search name, phone, email, investor no.…" placeholderTextColor="#666666"
            style={{ flex: 1, marginLeft: 8, fontSize: 14, color: TEXT }} returnKeyType="search" />
          {searchText ? <TouchableOpacity onPress={() => setSearchText('')}><Ionicons name="close-circle" size={16} color={MUTED} /></TouchableOpacity> : null}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 8, alignItems: 'center' }}>
        {[{ key: '', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'matured', label: 'Matured' }, { key: 'redeemed', label: 'Redeemed' }, { key: 'premature_redeemed', label: 'Premature' }].map((f) => (
          <TouchableOpacity key={f.key} onPress={() => setStatusFilter(f.key)}
            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: statusFilter === f.key ? NAVY : COLORS.white, borderWidth: 1, borderColor: statusFilter === f.key ? NAVY : COLORS.border }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: statusFilter === f.key ? COLORS.white : MUTED }}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}>
        {loading ? <ActivityIndicator color={NAVY} style={{ marginTop: 30 }} /> : investors.length === 0 ? (
          <Text style={{ textAlign: 'center', color: MUTED, marginTop: 30 }}>{search ? 'No investors match your search.' : 'No investors yet.'}</Text>
        ) : investors.map((inv) => {
          const sc = STATUS_COLOR[inv.status] || { bg: COLORS.surfaceAlt, fg: MUTED };
          return (
            <View key={inv.id} style={[CARD, { padding: 14, marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT }}>{inv.name}</Text>
                    {inv.revision_no > 0 && (
                      <View style={{ paddingHorizontal: 7, paddingVertical: 1, borderRadius: 20, backgroundColor: COLORS.purpleBg }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.purple }}>R{inv.revision_no}</Text>
                      </View>
                    )}
                    {inv.is_matured && (
                      <View style={{ paddingHorizontal: 7, paddingVertical: 1, borderRadius: 20, backgroundColor: COLORS.warningBg }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: AMBER }}>MATURED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{inv.phone || '—'} · {inv.scheme_name}{inv.reference_name ? ` · Ref: ${inv.reference_name}` : ''}</Text>
                </View>
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: sc.bg }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: sc.fg, textTransform: 'capitalize' }}>{inv.status.replace(/_/g, ' ')}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: TEAL }}>{fmtMoney(inv.amount_invested)}</Text>
                <Text style={{ fontSize: 12, color: MUTED }}>{inv.total_return_pct}% · {INTEREST_PAYOUT_LABELS[inv.interest_payout] || 'At Maturity'}</Text>
              </View>
              <Text style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>
                Invested {formatDMY(inv.investment_date)} · Matures {formatDMY(inv.maturity_date)}
              </Text>
              {manager && (
                <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Added by {inv.added_by_name || '—'}</Text>
              )}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {!!inv.loi_document_url && (
                  <TouchableOpacity onPress={() => viewLoi(inv.id)} style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: COLORS.linkBg }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.link }}>View LOI</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setLedgerFor(inv.id)} style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: '#E0F2F1' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: TEAL }}>📒 Ledger</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setRevising(inv)} style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: COLORS.purpleBg }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.purple }}>↻ Revise LOI</Text>
                </TouchableOpacity>
                {inv.is_matured ? (
                  <>
                    <TouchableOpacity onPress={() => setRenewing(inv)} style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: COLORS.warningBg }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: AMBER }}>↻ Renew</Text>
                    </TouchableOpacity>
                    {manager && (
                      <TouchableOpacity onPress={() => maturePayout(inv.id)} style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: COLORS.warningBg }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.warning }}>Payout</Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  manager && inv.status === 'active' && (
                    <TouchableOpacity onPress={() => redeem(inv.id)} style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: COLORS.warningBg }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.warning }}>Redeem</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
