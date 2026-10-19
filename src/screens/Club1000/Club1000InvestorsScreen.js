import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, StatusBar, RefreshControl, Platform, Linking, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { can, isManagerRole } from '../../lib/roles';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { apiFetch } from '../../utils/apiFetch';
import { CLUB1000_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { isClub1000Manager } from '../../utils/club1000Access';
import { formatDMY } from '../../utils/dateFormat';
import FormSheet from '../../components/FormSheet';
import { TextField, inputStyle } from '../../components/Field';
import { buildInvestorLOIHtml } from '../../lib/investorLOIHtml';

import AppIcon from '../../components/AppIcon';
import AppLoader from '../../components/AppLoader';
import { onlyPresent } from '../../lib/presentOptions';
import { errText } from '../../lib/apiError';
import PeriodFilter from '../../components/PeriodFilter';
import FilterSelect from '../../components/FilterSelect';
import { RedeemSheet, RenewalSummary } from './CloseInvestmentSheets';
import { schedulePeriods, maturityWorking } from '../../lib/c1Periods';
import InvestorHistorySheet from './InvestorHistorySheet';
import PortfolioSheet from './PortfolioSheet';
import { settledTo, settledRemark } from '../../lib/c1Settled';
import { loiFileName, sharePdfNamed, shareInvestorStatement } from '../../lib/c1Files';
import { earlierTerms } from '../../lib/c1History';
import { useReasonPrompt } from '../../components/ReasonPrompt';
import ImportInvestorsSheet from './ImportInvestorsSheet';
import ScheduleList from './ScheduleList';
import { confirmAsk } from '../../lib/confirmAsk';
// The ledger sheet is also opened from Payouts (declared further down; function declarations hoist).
export { LedgerModal };
const NAVY = COLORS.navy; const TEAL = COLORS.success; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 22, ...CARD_SHADOW , borderWidth: 1, borderColor: COLORS.cardBorder };

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
// A form date (a Date here, a string from the server) as YYYY-MM-DD.
const isoOf = (d) => (d instanceof Date ? toISODate(d) : d ? String(d).slice(0, 10) : '');

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
// the investor's FIXED total return over the tenure (principal * pct/100 —
// pct is the total return by maturity, not an annualized rate) is spread
// pro-rata across the tenure's actual days, not across a flat 365: dailyRate
// = principal * pct/100 / tenureDays, each instalment = dailyRate * actual
// calendar days since the PREVIOUS instalment (or since investment_date for
// the first one) — so the first instalment is usually a stub.
// `investmentDate`/`maturityDate` are Date objects; `dates` are 'YYYY-MM-DD'
// strings.
// The last day an instalment's interest accrues to. A payout DATE is when the
// money is handed over, not the period it covers: investing 1 Jul with
// quarterly payouts, the instalment due 10 Oct pays the quarter that ENDED
// 30 Sep, so accruing to the 10th charged ten days belonging to the next
// quarter. The final instalment is capped at maturity, which is a real end
// rather than a payment day, so it accrues to itself.
// Mirrors backend/club1000/services.py::accrual_end.
function accrualEnd(due, maturity) {
  if (due >= maturity) return maturity;
  // Day 0 of the due month is the last day of the month before it.
  return new Date(due.getFullYear(), due.getMonth(), 0);
}

function prorateInstalments(dates, investmentDate, maturityDate, principal, totalReturnPct) {
  const tenureDays = Math.round((maturityDate - investmentDate) / 86400000);
  const dailyRate = tenureDays > 0 ? (principal * totalReturnPct) / 100 / tenureDays : 0;
  let prev = investmentDate;
  return dates.map((due_date) => {
    // Accrue to the end of the period this instalment pays for, not to the day
    // it is handed over — see accrualEnd.
    const periodEnd = accrualEnd(new Date(`${due_date}T00:00:00`), maturityDate);
    const days = Math.round((periodEnd - prev) / 86400000);
    // Invested on or after this period's own end: nothing has accrued yet, and
    // prev stays put so the next instalment runs from the investment date.
    if (days <= 0) return 0;
    prev = periodEnd;
    return +((dailyRate * days).toFixed(2));
  });
}

// Principal + the scheme's total return, applied once over the whole tenure
// — mirrors backend/club1000/services.py::maturity_value exactly. pct is the
// total return BY maturity (e.g. a "GROWTH 35" scheme pays 35% total over
// its 2-year tenure, not 35% every year), not an annualized rate to scale by
// day-count. `investmentDate`/`maturityDate` are Date objects.
function computeMaturityValue(investmentDate, maturityDate, principal, pct) {
  if (!investmentDate || !maturityDate) return principal;
  return principal + principal * (pct / 100);
}

const INTEREST_PAYOUT_LABELS = { monthly: 'Monthly', quarterly: 'Quarterly', maturity: 'At Maturity' };
const SOURCE_LABELS = { referral: 'Referral', walk_in: 'Walk-in', website: 'Website', other: 'Other' };

// ── Add Investor sheet ──────────────────────────────────────────────────────
// `revise` (an approved investor) turns this into Revise LOI: the same form, prefilled
// with the investor — or with the revision they saved as a draft — where everything,
// the scheme and the investment date included, can change. It submits to the revise
// endpoint and goes for approval. Same as the website.
// Add more: a new investment for someone who already has one — their details carried
// over, the scheme, amount and date left to choose. Not linked to their lead.
export function morePrefill(inv) {
  return inv ? { more: true, name: inv.name, phone: inv.phone, email: inv.email || '', pan: inv.pan || '',
    source: inv.source || 'referral', reference_name: inv.reference_name || '', reference_phone: inv.reference_phone || '' } : null;
}

export function AddInvestorSheet({ visible, onClose, onSaved, schemes: schemeList, prefillLead, draft: savedDraft, revise }) {
  // What the form opens with: a revision's saved draft over the investor itself, or a
  // saved new-investor draft.
  const draft = revise ? { ...revise, ...(revise.revision_draft || {}) } : savedDraft;
  // The investor's own scheme stays selectable even if it is no longer offered.
  const schemes = revise && revise.scheme && !(schemeList || []).some((sc) => String(sc.id) === String(revise.scheme))
    ? [...(schemeList || []), { id: revise.scheme, name: revise.scheme_name || 'Current scheme', tenure_months: 0,
        min_ticket_size: 0, interest_payout_options: [revise.interest_payout || 'maturity'], payout_rates: {} }]
    : (schemeList || []);
  const nextRevisionNo = revise ? (revise.revision_no || 0) + 1 : 0;
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
      // Reopening a saved draft: it wins over the lead prefill, because the
      // draft IS what was last typed.
      const s = draft?.scheme
        ? schemes.find((sc) => String(sc.id) === String(draft.scheme)) || schemes[0]
        : prefillLead?.scheme_interest
          ? schemes.find((sc) => String(sc.id) === String(prefillLead.scheme_interest)) || schemes[0]
          : schemes[0];
      setForm({
        scheme: s?.id || '',
        source: draft?.source || prefillLead?.source || 'referral',
        reference_name: draft?.reference_name || prefillLead?.reference_name || '',
        reference_phone: draft?.reference_phone || prefillLead?.reference_phone || '',
        name: draft?.name || prefillLead?.name || '',
        phone: draft?.phone || prefillLead?.phone || '',
        email: draft?.email || prefillLead?.email || '',
        pan: draft?.pan || prefillLead?.pan || '',
        // A draft's amount may legitimately be 0 — that is "not said yet", so the
        // field reads empty rather than showing a figure nobody typed.
        amount_invested: (draft && Number(draft.amount_invested) > 0) ? String(draft.amount_invested)
          : prefillLead?.amount_interested ? String(prefillLead.amount_interested) : '',
        investment_date: draft?.investment_date ? new Date(`${String(draft.investment_date).slice(0, 10)}T00:00:00`) : new Date(),
        interest_payout: draft?.interest_payout || s?.interest_payout_options?.[0] || 'maturity',
        // The lead's negotiated rate wins over the scheme's rate for the
        // default frequency, if one was set.
        total_return_pct: (draft && Number(draft.total_return_pct) > 0) ? String(draft.total_return_pct)
          : prefillLead?.total_return_pct != null ? String(prefillLead.total_return_pct)
          : s?.payout_rates?.[s?.interest_payout_options?.[0] || 'maturity'] != null ? String(s.payout_rates[s.interest_payout_options[0] || 'maturity']) : '',
        notes: draft?.notes || '', security: draft?.security || '',
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
  }, [visible, revise]);

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
    const amounts = prorateInstalments(dates, form.investment_date, maturityDate, principal, totalReturn);
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

  const [draftId, setDraftId] = useState(null);
  useEffect(() => { if (visible) setDraftId(revise ? null : (draft?.id || null)); }, [visible, savedDraft, revise]);
  const [savingDraft, setSavingDraft] = useState(false);

  if (!form) return null;
  const periods = schedulePeriods(schedule, isoOf(form.investment_date), isoOf(maturityDate), form.amount_invested, form.total_return_pct, form.interest_payout);

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
      // A revised LOI keeps the investor's LOI number and carries R1, R2, …
      let loi_no = revise?.loi_no || '';
      if (!revise) {
        const noRes = await apiFetch(`${CLUB1000_ENDPOINTS.investorNextLoiNo}?scheme_id=${scheme.id}`);
        ({ loi_no } = noRes.ok ? await noRes.json() : { loi_no: '' });
      }
      // A renewed investment's revised LOI also states its earlier terms, as the renewal LOI does.
      // Its stamp names the term and counts revisions within it: "Renewal 2 · Revision 1".
      const past = revise?.renewal_count ? await earlierTerms(revise.id) : { history: [], revisions: 0 };
      const termLabel = revise?.renewal_count ? (past.current?.label || `Renewal ${revise.renewal_count}`).split(' · ')[0] : '';
      const termRevision = revise?.renewal_count ? past.revisions + 1 : nextRevisionNo;
      const loiOpts = revise ? { revisionNo: nextRevisionNo, termLabel, termRevision, schedule, ...(past.history.length ? { history: past.history, nextTerm: {
          label: `${termLabel} · Revision ${termRevision}`,
          start: toISODate(form.investment_date), maturity: maturityDate ? toISODate(maturityDate) : null,
          principal: form.amount_invested } } : {}) } : { schedule };
      const html = buildInvestorLOIHtml({ ...(revise || {}), ...form, investment_date: toISODate(form.investment_date), loi_no }, scheme, loiOpts);
      const { uri } = await Print.printToFileAsync({ html });
      await sharePdfNamed(uri, loiFileName({ loi_no, name: form.name }, loiOpts));
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

  // Saved but not submitted. None of submit()'s completeness checks apply — the
  // whole point is never to lose a long form because one field is missing. The
  // row it writes is the one submitting later promotes, so saving twice never
  // leaves two investors behind.

  async function saveDraft() {
    if (!form.scheme) { Alert.alert('Pick a scheme', 'A draft needs a scheme — the maturity date comes from it.'); return; }
    setSavingDraft(true);
    try {
      const payload = {
        ...(draftId ? { id: draftId } : {}),
        scheme: form.scheme, source: form.source,
        reference_name: form.reference_name.trim(), reference_phone: form.reference_phone.trim(),
        name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim(),
        pan: form.pan.trim(), amount_invested: form.amount_invested,
        investment_date: toISODate(form.investment_date),
        interest_payout: form.interest_payout, total_return_pct: form.total_return_pct,
        notes: form.notes.trim(), security: (form.security || '').trim(),
      };
      if (payload.source !== 'referral') { delete payload.reference_name; delete payload.reference_phone; }
      if (revise && (form.interest_payout === 'quarterly' || form.interest_payout === 'monthly') && schedule.length) payload.payout_schedule = schedule;
      // A revision's draft lives on the investor and leaves it approved and live.
      const res = await apiFetch(revise ? CLUB1000_ENDPOINTS.investorReviseDraft(revise.id) : CLUB1000_ENDPOINTS.investorDraft,
        { method: 'POST', body: JSON.stringify(payload) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { Alert.alert('Could not save the draft', errText(d, 'Please try again.')); return; }
      if (!revise) setDraftId(d.id);
      onSaved(d);
      onClose();
    } finally {
      setSavingDraft(false);
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
        ...(draftId ? { draft_id: draftId } : {}),
      };
      if (payload.source !== 'referral') { delete payload.reference_name; delete payload.reference_phone; }
      if (documentFile) payload.document_file = documentFile;
      if ((form.interest_payout === 'quarterly' || form.interest_payout === 'monthly') && schedule.length) payload.payout_schedule = schedule;
      if (prefillLead?.id && !revise) payload.lead = prefillLead.id;
      const res = await apiFetch(revise ? CLUB1000_ENDPOINTS.investorRevise(revise.id) : CLUB1000_ENDPOINTS.investors,
        { method: 'POST', body: JSON.stringify(payload) });
      const d = await res.json();
      if (!res.ok) {
        Alert.alert(revise ? 'Could not submit the revision' : 'Could not add investor', d?.amount_invested?.[0] || errText(d, 'Please check the fields.'));
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
        {revise ? (
          <View style={ClubInvestorsScreenS.reviseHead}>
            <Text style={ClubInvestorsScreenS.sheetTitle}>Revise LOI · R{nextRevisionNo}</Text>
            <Text style={ClubInvestorsScreenS.reviseSub}>{revise.name} · {revise.phone}</Text>
          </View>
        ) : (
          <Text style={ClubInvestorsScreenS.sheetTitle}>{draft ? 'Edit Draft Investor' : prefillLead?.more ? `Add more — ${prefillLead.name}` : 'Add Investor'}</Text>
        )}
        <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 20, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={18} color={TEXT} />
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Investor first, then where they came from — same order as the website. */}
        {!!prefillLead?.more && !draft && (
          <Text style={ClubInvestorsScreenS.moreNote}>A new investment for {prefillLead.name} — same or another scheme, with its own LOI, dates and payouts. It joins their portfolio; what they already hold is not changed.</Text>
        )}
        <Text style={ClubInvestorsScreenS.formSection}>INVESTOR</Text>
        <TextField label="Investor Name" required value={form.name} onChangeText={(v) => set('name', v)} />
        <View style={ClubInvestorsScreenS.fRow}>
          <View style={ClubInvestorsScreenS.flex1}>
            <TextField label="Mobile Number" required value={form.phone} onChangeText={(v) => set('phone', v)} keyboardType="phone-pad" />
          </View>
          <View style={ClubInvestorsScreenS.flex1}>
            <TextField label="Email" value={form.email} onChangeText={(v) => set('email', v)} keyboardType="email-address" autoCapitalize="none" />
          </View>
        </View>
        <TextField label="PAN" value={form.pan} onChangeText={(v) => set('pan', v.toUpperCase())} autoCapitalize="characters" />

        <Text style={ClubInvestorsScreenS.formSection}>SOURCE</Text>
        <View style={ClubInvestorsScreenS.fBlock}>
          <Text style={ClubInvestorsScreenS.fLabel}>Source</Text>
          <View style={ClubInvestorsScreenS.fSeg}>
            {Object.entries(SOURCE_LABELS).map(([v, label]) => (
              <TouchableOpacity key={v} onPress={() => set('source', v)}
                style={[ClubInvestorsScreenS.fSegBtn, form.source === v && ClubInvestorsScreenS.fSegBtnOn]}>
                <Text style={[ClubInvestorsScreenS.fSegText, form.source === v && ClubInvestorsScreenS.fSegTextOn]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Reference name (autocompletes from prior references) & number — only for referrals */}
        {form.source === 'referral' && (
          <View style={ClubInvestorsScreenS.fRow}>
            <View style={ClubInvestorsScreenS.fColMb}>
              <Text style={ClubInvestorsScreenS.fLabel}>Reference Name</Text>
              <TextInput
                value={form.reference_name}
                onChangeText={(v) => { set('reference_name', v); setRefOpen(true); }}
                onFocus={() => setRefOpen(true)}
                style={inputStyle}
                placeholderTextColor={COLORS.text3}
              />
              {refOpen && filteredRefSuggestions.length > 0 && (
                <View style={ClubInvestorsScreenS.fSuggest}>
                  {filteredRefSuggestions.map((r, i) => (
                    <TouchableOpacity key={`${r.reference_phone}-${i}`} onPress={() => selectReferenceSuggestion(r)}
                      style={[ClubInvestorsScreenS.fSuggestRow, i > 0 && ClubInvestorsScreenS.fSuggestSep]}>
                      <Text style={ClubInvestorsScreenS.fSuggestText}>{r.reference_name}{r.reference_phone ? ` — ${r.reference_phone}` : ''}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View style={ClubInvestorsScreenS.flex1}>
              <TextField label="Reference Number" value={form.reference_phone} onChangeText={(v) => set('reference_phone', v)} keyboardType="phone-pad" />
            </View>
          </View>
        )}

        <Text style={ClubInvestorsScreenS.formSection}>INVESTMENT</Text>
        {/* Scheme picker */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6 }}>Scheme <Text style={{ color: COLORS.error }}>*</Text></Text>
          <TouchableOpacity onPress={() => setSchemeOpen((v) => !v)}
            style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
            <Text style={{ fontSize: 15, color: scheme ? TEXT : MUTED }}>{scheme ? scheme.name : 'Select a scheme'}</Text>
            <Ionicons name={schemeOpen ? 'chevron-up' : 'chevron-down'} size={16} color={MUTED} />
          </TouchableOpacity>
          {schemeOpen && (
            <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, marginTop: 6, overflow: 'hidden' }}>
              {schemes.map((s, i) => (
                <TouchableOpacity key={s.id} onPress={() => selectScheme(s)}
                  style={{ padding: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: COLORS.surfaceAlt, backgroundColor: String(form.scheme) === String(s.id) ? COLORS.linkBg : COLORS.surface }}>
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
            <View style={{ flexDirection: 'row', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border }}>
              {payoutOptions.map((v) => (
                <TouchableOpacity key={v} onPress={() => selectInterestPayout(v)}
                  style={{ flex: 1, paddingVertical: 11, alignItems: 'center', backgroundColor: form.interest_payout === v ? TEAL : COLORS.surface }}>
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.success2, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 }}>
            <Text style={{ color: COLORS.success, fontWeight: '600', fontSize: 13 }}>Maturity Value</Text>
            <Text style={{ color: COLORS.success, fontWeight: '800', fontSize: 13 }}>{fmtMoney(maturityValuePreview)}</Text>
          </View>
        )}

        {/* Quarterly/monthly schedule preview */}
        {form.interest_payout === 'maturity' && !!maturityDate && Number(form.amount_invested) > 0 && (() => {
          const mw = maturityWorking(form.amount_invested, form.total_return_pct, isoOf(form.investment_date), isoOf(maturityDate));
          return mw.rows.length ? (
            <View style={ClubInvestorsScreenS.fBlock}>
              <Text style={ClubInvestorsScreenS.formSection}>INTEREST WORKING — PAID AT MATURITY</Text>
              <ScheduleList readOnly schedule={mw.rows} periods={mw.periods} principal={form.amount_invested} pct={form.total_return_pct}
                from={isoOf(form.investment_date)} to={isoOf(maturityDate)} onAmount={() => {}} onReset={() => {}} />
            </View>
          ) : null;
        })()}
        {(form.interest_payout === 'quarterly' || form.interest_payout === 'monthly') && schedule.length > 0 && (
          <View style={ClubInvestorsScreenS.fBlock}>
            <Text style={ClubInvestorsScreenS.formSection}>PAYOUT SCHEDULE — CONFIRM OR EDIT</Text>
            <ScheduleList schedule={schedule} periods={periods} principal={form.amount_invested} pct={form.total_return_pct}
              from={isoOf(form.investment_date)} to={isoOf(maturityDate)}
              onAmount={(idx, v) => updateScheduleRow(idx, 'amount_due', v)} onReset={resetSchedule} onPickDate={(idx) => setOpenScheduleIdx(idx)} />
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

        <TextField label="Amount Invested (₹)" required value={form.amount_invested} onChangeText={(v) => set('amount_invested', v)} keyboardType="decimal-pad" />

        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6 }}>Scan Document (KYC / ID proof)</Text>
          <TouchableOpacity onPress={pickDocument} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12 }}>
            <Ionicons name="attach-outline" size={18} color={TEAL} />
            <Text style={{ fontSize: 13, color: documentFile ? TEXT : MUTED, flex: 1 }} numberOfLines={1}>
              {documentFile ? documentFile.name : 'Attach a photo or PDF'}
            </Text>
          </TouchableOpacity>
        </View>

        <TextField label="Notes" value={form.notes} onChangeText={(v) => set('notes', v)} />

        <View style={{ backgroundColor: COLORS.surfaceAlt, borderRadius: 14, padding: 12, marginTop: 4, marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 8 }}>Investment Proposal Form (LOI)</Text>
          <TouchableOpacity onPress={doDownloadLoi} disabled={loiDownloading}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: TEAL, borderRadius: 14, height: 44, opacity: loiDownloading ? 0.7 : 1 }}>
            {loiDownloading ? <ActivityIndicator color={TEAL} /> : <Ionicons name="download-outline" size={17} color={TEAL} />}
            <Text style={ClubInvestorsScreenS.loiBtnText}>{loiDownloading ? 'Generating…' : revise ? `Download Revised LOI (R${nextRevisionNo})` : 'Download LOI PDF (Print → Sign → Upload)'}</Text>
          </TouchableOpacity>
          {loiDone && <Text style={{ fontSize: 11, color: COLORS.success, marginTop: 6 }}>LOI downloaded — get it signed and upload below.</Text>}
          <TouchableOpacity onPress={pickSignedLoi} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12, marginTop: 10 }}>
            <Ionicons name="attach-outline" size={18} color={TEAL} />
            <Text style={{ fontSize: 13, color: loiFile ? TEXT : MUTED, flex: 1 }} numberOfLines={1}>
              {loiFile ? loiFile.name : 'Attach the signed LOI (image / PDF) *'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Enabled without the signed LOI on purpose — saving a draft is what
            you do BEFORE you have one. */}
        <TouchableOpacity onPress={saveDraft} disabled={saving || savingDraft}
          style={ClubInvestorsScreenS.draftBtn}>
          {savingDraft ? <ActivityIndicator color={COLORS.link} />
                       : <Ionicons name="bookmark-outline" size={17} color={COLORS.link} />}
          <Text style={ClubInvestorsScreenS.draftBtnText}>{(draftId || revise?.revision_draft) ? 'Update Draft' : 'Save Draft'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={submit} disabled={saving || !loiFile}
          style={[ClubInvestorsScreenS.btn, (saving || !loiFile) && ClubInvestorsScreenS.box2]}>
          {saving ? <ActivityIndicator color={COLORS.btnTextSuccess} /> : <Ionicons name="save-outline" size={17} color={COLORS.btnTextSuccess} />}
          <Text style={ClubInvestorsScreenS.box2}>{saving ? 'Submitting…' : 'Submit for Approval'}</Text>
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

// Every earlier term for the renewal LOI's history, from the Ledger's own term figures,
// with the term ending now as the last row — what this renewal does with it.
async function renewalHistory(investor, form) {
  try {
    const r = await apiFetch(CLUB1000_ENDPOINTS.investorLedger(investor.id));
    const d = r.ok ? await r.json() : null;
    const terms = d?.terms || [];
    const rows = terms.filter((t) => !t.current);
    const cur = terms.find((t) => t.current);
    if (cur) {
      const principal = Number(cur.principal) || 0;
      const next = Number(form.amount_invested) || 0;
      const earned = Number(cur.summary?.interest) || 0;
      const unpaid = Math.max((Number(cur.summary?.pending) || 0) - principal, 0);
      const reinvest = (form.interest_choice || (next > principal ? 'reinvest' : 'pay')) === 'reinvest';
      const added = form.interest_added !== '' && form.interest_added != null ? Math.min(Number(form.interest_added) || 0, unpaid)
        : reinvest ? Math.min(unpaid, Math.max(next - principal, 0)) : 0;
      rows.push({ ...cur, interest_earned: earned, interest_added: added, interest_to_investor: Math.max(earned - added, 0),
        principal_returned: Math.max(principal - next, 0), fresh_money: Math.max(next - principal - added, 0), renewed_with: next,
        paid_at_renewal: toISODate(form.investment_date) || '' });
    }
    return rows;
  } catch { return []; }
}

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
        // A renewal carries straight on from the term that ended: it starts on that
        // term's maturity date (editable), not on the day the sheet is opened.
        investment_date: investor?.maturity_date ? new Date(`${investor.maturity_date}T00:00:00`) : new Date(),
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
    const amounts = prorateInstalments(dates, form.investment_date, maturityDate, principal, totalReturn);
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
  const periods = schedulePeriods(schedule, isoOf(form.investment_date), isoOf(maturityDate), form.amount_invested, form.total_return_pct, form.interest_payout);

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
      const html = buildInvestorLOIHtml({ ...investor, ...form, investment_date: toISODate(form.investment_date), maturity_date: maturityDate ? toISODate(maturityDate) : null }, scheme, {
        renewalNo: nextRevisionNo, schedule, history: await renewalHistory(investor, form),
        nextTerm: { label: `Renewal ${(investor.renewal_count || 0) + 1}`, start: toISODate(form.investment_date),
          maturity: maturityDate ? toISODate(maturityDate) : null, principal: form.amount_invested },
      });
      const { uri } = await Print.printToFileAsync({ html });
      await sharePdfNamed(uri, loiFileName({ loi_no: investor.loi_no, name: form.name || investor.name },
        { renewalNo: nextRevisionNo, nextTerm: { label: `Renewal ${(investor.renewal_count || 0) + 1}` } }));
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
      if (!payload.interest_choice) delete payload.interest_choice;
      if (payload.interest_added === '' || payload.interest_added == null) delete payload.interest_added;
      if (!payload.pay_now?.notes) delete payload.pay_now;
      if ((form.interest_payout === 'quarterly' || form.interest_payout === 'monthly') && schedule.length) payload.payout_schedule = schedule;
      const res = await apiFetch(CLUB1000_ENDPOINTS.investorRenew(investor.id), { method: 'POST', body: JSON.stringify(payload) });
      const d = await res.json();
      if (!res.ok) {
        Alert.alert('Could not submit renewal', errText(d, 'Please check the fields.'));
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
        <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 20, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={18} color={TEXT} />
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={ClubInvestorsScreenS.renewNote}>
          This investment matured on {formatDMY(investor.maturity_date)}. Set the renewal terms below — amount can go up or down.
        </Text>
        <RenewalSummary investorId={investor.id} newAmount={form.amount_invested}
          onRenewal={(r) => setForm((f) => ({ ...f, amount_invested: String(r.amount), interest_choice: r.interest_choice, interest_added: String(r.interest_added) }))}
          payNow={form.pay_now} onPayNow={(v) => setForm((f) => ({ ...f, pay_now: v }))} />

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

        <TextField label="Amount Invested (₹)" required value={form.amount_invested} onChangeText={(v) => setForm((f) => ({ ...f, amount_invested: v, interest_choice: '', interest_added: '' }))} keyboardType="decimal-pad" />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, marginBottom: 16 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6 }}>Interest Payout</Text>
            <View style={{ flexDirection: 'row', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border }}>
              {(scheme?.interest_payout_options?.length ? scheme.interest_payout_options : ['maturity']).map((v) => (
                <TouchableOpacity key={v} onPress={() => selectInterestPayout(v)}
                  style={{ flex: 1, paddingVertical: 11, alignItems: 'center', backgroundColor: form.interest_payout === v ? TEAL : COLORS.surface }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: form.interest_payout === v ? COLORS.white : MUTED }}>{INTEREST_PAYOUT_LABELS[v] || v}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <TextField label="Return %" required value={form.total_return_pct} onChangeText={(v) => set('total_return_pct', v)} keyboardType="decimal-pad" />
          </View>
        </View>

        {form.interest_payout === 'maturity' && !!maturityDate && Number(form.amount_invested) > 0 && (() => {
          const mw = maturityWorking(form.amount_invested, form.total_return_pct, isoOf(form.investment_date), isoOf(maturityDate));
          return mw.rows.length ? (
            <View style={ClubInvestorsScreenS.fBlock}>
              <Text style={ClubInvestorsScreenS.formSection}>INTEREST WORKING — PAID AT MATURITY</Text>
              <ScheduleList readOnly schedule={mw.rows} periods={mw.periods} principal={form.amount_invested} pct={form.total_return_pct}
                from={isoOf(form.investment_date)} to={isoOf(maturityDate)} onAmount={() => {}} onReset={() => {}} />
            </View>
          ) : null;
        })()}
        {(form.interest_payout === 'quarterly' || form.interest_payout === 'monthly') && schedule.length > 0 && (
          <View style={ClubInvestorsScreenS.fBlock}>
            <Text style={ClubInvestorsScreenS.formSection}>PAYOUT SCHEDULE — CONFIRM OR EDIT</Text>
            <ScheduleList schedule={schedule} periods={periods} principal={form.amount_invested} pct={form.total_return_pct}
              from={isoOf(form.investment_date)} to={isoOf(maturityDate)}
              onAmount={(idx, v) => updateScheduleRow(idx, 'amount_due', v)} onReset={resetSchedule} />
          </View>
        )}

        <TextField label="Notes" value={form.notes} onChangeText={(v) => set('notes', v)} />

        <View style={{ backgroundColor: COLORS.surfaceAlt, borderRadius: 14, padding: 12, marginTop: 4, marginBottom: 16 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 8 }}>Renewed Investment Proposal Form (LOI)</Text>
          <TouchableOpacity onPress={doDownloadLoi} disabled={loiDownloading}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: AMBER, borderRadius: 14, height: 44, opacity: loiDownloading ? 0.7 : 1 }}>
            {loiDownloading ? <ActivityIndicator color={AMBER} /> : <Ionicons name="download-outline" size={17} color={AMBER} />}
            <Text style={{ color: AMBER, fontSize: 13, fontWeight: '700' }}>{loiDownloading ? 'Generating…' : `Download Renewed LOI (R${nextRevisionNo})`}</Text>
          </TouchableOpacity>
          {loiDone && <Text style={{ fontSize: 11, color: COLORS.success, marginTop: 6 }}>Renewed LOI downloaded — get it signed and upload below.</Text>}
          <TouchableOpacity onPress={pickSignedLoi} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12, marginTop: 10 }}>
            <Ionicons name="attach-outline" size={18} color={AMBER} />
            <Text style={{ fontSize: 13, color: loiFile ? TEXT : MUTED, flex: 1 }} numberOfLines={1}>
              {loiFile ? loiFile.name : 'Attach the signed renewed LOI (image / PDF) *'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={submit} disabled={saving || !loiFile}
          style={{ backgroundColor: AMBER, borderRadius: 16, height: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: (saving || !loiFile) ? 0.5 : 1, marginTop: 8 }}>
          {saving ? <ActivityIndicator color={COLORS.white} /> : <Ionicons name="save-outline" size={17} color={COLORS.white} />}
          <Text style={ClubInvestorsScreenS.renewSubmitText}>{saving ? 'Submitting…' : 'Submit Renewal for Approval'}</Text>
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
  'paid early': { bg: COLORS.linkBg, fg: COLORS.link },  // paid before its due date
  settled: { bg: COLORS.surfaceAlt, fg: COLORS.link },     // closed by a renewal
  pending: { bg: COLORS.errorBg, fg: COLORS.error },     // due, not yet paid
  upcoming: { bg: COLORS.warningBg, fg: AMBER },         // not yet due
};

function LedgerBadge({ label, color }) {
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: color.bg, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: color.fg, textTransform: 'capitalize' }}>{label.replace(/_/g, ' ')}</Text>
    </View>
  );
}

// Card value colour per tone (a lookup, so no style is built inline).
const LG_TONE = { info: { color: COLORS.link }, good: { color: COLORS.success }, warn: { color: COLORS.warning } };

function LedgerModal({ investorId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [termSel, setTermSel] = useState('all');   // 'all', or a term's number (0 = the original)

  useEffect(() => {
    if (!investorId) return;
    let cancelled = false;
    setLoading(true); setErr(''); setTermSel('all');
    apiFetch(CLUB1000_ENDPOINTS.investorLedger(investorId))
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (r.ok) setData(d); else setErr(errText(d, 'Could not load the ledger.'));
      })
      .catch((e) => !cancelled && setErr(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [investorId]);

  const inv = data?.investor;
  const terms = data?.terms || [];
  const term = termSel === 'all' ? null : terms.find((t) => t.no === termSel);
  const s = term ? term.summary : data?.summary;
  const first = terms[0];
  const principalHint = term ? `${term.no === 0 ? 'invested' : 'renewed'} ${formatDMY(term.start)}`
    : first ? `${terms.length > 1 ? 'first invested' : 'invested'} ${formatDMY(first.start)}`
    : inv?.investment_date ? `invested ${formatDMY(inv.investment_date)}` : '';
  const rows = (data?.entries || []).filter((e) => e.type !== 'investment' && (termSel === 'all' || (e.term ?? 0) === termSel));
  const todayIso = toISODate(new Date());
  const [stmtBusy, setStmtBusy] = useState(false);
  async function statement() {
    setStmtBusy(true);
    const e = await shareInvestorStatement(inv);
    setStmtBusy(false);
    if (e) Alert.alert('Statement', e);
  }

  return (
    <Modal visible={!!investorId} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT }}>Ledger{inv ? ` — ${inv.name}` : ''}</Text>
              {!!inv && <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{inv.phone} · {inv.scheme_name}</Text>}
            </View>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={MUTED} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
            {loading ? (
              <AppLoader style={{ marginTop: 24 }} />
            ) : err ? (
              <Text style={{ textAlign: 'center', color: COLORS.error, marginTop: 30 }}>{err}</Text>
            ) : (
              <>
                <TouchableOpacity style={ClubInvestorsScreenS.lgStmt} onPress={statement} disabled={stmtBusy}>
                  {stmtBusy ? <ActivityIndicator size="small" color={COLORS.link} /> : <Ionicons name="download-outline" size={16} color={COLORS.link} />}
                  <Text style={ClubInvestorsScreenS.lgStmtText}>{stmtBusy ? 'Preparing statement…' : 'Statement PDF — to give the investor'}</Text>
                </TouchableOpacity>
                {terms.length > 1 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ClubInvestorsScreenS.lgTermScroll} contentContainerStyle={ClubInvestorsScreenS.lgTerms}>
                    {[{ no: 'all', label: 'All terms' }, ...terms].map((t) => (
                      <TouchableOpacity key={String(t.no)} onPress={() => setTermSel(t.no)} style={[ClubInvestorsScreenS.lgTerm, termSel === t.no && ClubInvestorsScreenS.lgTermOn]}>
                        <Text style={[ClubInvestorsScreenS.lgTermText, termSel === t.no && ClubInvestorsScreenS.lgTermTextOn]}>{t.label}{t.current ? '  ·  current' : ''}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                {!!term && <Text style={ClubInvestorsScreenS.lgTermLine}>{formatDMY(term.start)} → {formatDMY(term.maturity)} · principal {fmtMoney(term.principal)}</Text>}
                {!!term && (term.has_loi ? (
                  <TouchableOpacity style={ClubInvestorsScreenS.lgTermLoi} onPress={async () => {
                    try {
                      const r = await apiFetch(`${CLUB1000_ENDPOINTS.investorLoiUrl(investorId)}${term.current ? '' : `?term=${term.no}`}`);
                      const d = await r.json().catch(() => ({}));
                      if (r.ok && d.url) Linking.openURL(d.url); else Alert.alert('LOI unavailable', errText(d, 'Could not open the LOI.'));
                    } catch (e) { Alert.alert('LOI unavailable', e.message); }
                  }}>
                    <Text style={ClubInvestorsScreenS.lgTermLoiText}>Open this term's signed LOI</Text>
                  </TouchableOpacity>
                ) : !term.current && <Text style={ClubInvestorsScreenS.lgTermLine}>Its signed LOI was not kept (renewed before LOIs were kept).</Text>)}
                <View style={ClubInvestorsScreenS.lgCards}>
                  {[
                    ['Principal', s.principal ?? s.total_invested, null, principalHint],
                    ['Interest', s.interest, null],
                    ['Total', s.total ?? s.total_payout_due, 'sum'],
                    ['Due till today', s.due_till_today, 'info'],
                    ['Paid out', s.paid_out ?? s.total_paid, 'good'],
                    ['Upcoming interest', s.upcoming_interest, 'warn'],
                  ].map(([label, val, tone, hint]) => (
                    <View key={label} style={[ClubInvestorsScreenS.lgCard, tone === 'sum' && ClubInvestorsScreenS.lgCardSum]}>
                      <Text style={ClubInvestorsScreenS.lgCardLbl}>{label.toUpperCase()}</Text>
                      <Text style={[ClubInvestorsScreenS.lgCardVal, tone && LG_TONE[tone]]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{fmtMoney(val)}</Text>
                      {!!hint && <Text style={ClubInvestorsScreenS.lgCardHint}>{hint}</Text>}
                    </View>
                  ))}
                </View>

                {rows.length === 0 && <Text style={ClubInvestorsScreenS.lgNote}>No payouts in this term.</Text>}
                {rows.map((e, i) => {
                  // Unpaid: Pending once its date has come, Upcoming before that.
                  const due = e.due_date || e.date;
                  const settled = e.status === 'paid' ? settledTo(e.notes) : '';
                  const st = settled ? 'settled'
                    : e.status === 'pending' ? (due > todayIso ? 'upcoming' : 'pending')
                    : e.status === 'paid' && e.paid_date && e.paid_date < due ? 'paid early' : e.status;
                  const head = termSel === 'all' && terms.length > 1 && (i === 0 || (rows[i - 1].term ?? 0) !== (e.term ?? 0))
                    ? terms.find((t) => t.no === (e.term ?? 0)) : null;
                  return (
                    <View key={i}>
                    {!!head && <Text style={ClubInvestorsScreenS.lgTermHead}>{head.label} · {formatDMY(head.start)} → {formatDMY(head.maturity)} · {fmtMoney(head.principal)}</Text>}
                    <View style={[ClubInvestorsScreenS.lgRow, i > 0 && !head && ClubInvestorsScreenS.lgRowSep]}>
                      <View style={ClubInvestorsScreenS.lgTop}>
                        <View style={ClubInvestorsScreenS.flex1}>
                          <LedgerBadge label={e.label} color={LEDGER_TYPE_COLOR[e.type] || { bg: COLORS.surfaceAlt, fg: MUTED }} />
                          {!!e.period && <Text style={ClubInvestorsScreenS.schedWhy}>{e.period.label} · {e.period.days} days × ₹{Number(e.period.per_day).toLocaleString('en-IN')}</Text>}
                        </View>
                        <View style={ClubInvestorsScreenS.lgRight}>
                          <Text style={ClubInvestorsScreenS.lgAmt}>{fmtMoney(e.amount)}</Text>
                          {e.paid_amount != null && Number(e.paid_amount) !== Number(e.amount) && <Text style={ClubInvestorsScreenS.lgPaid}>Paid {fmtMoney(e.paid_amount)}</Text>}
                        </View>
                      </View>
                      <View style={ClubInvestorsScreenS.lgBottom}>
                        <Text style={ClubInvestorsScreenS.lgDates}>Due {formatDMY(e.due_date || e.date)}{e.paid_date ? ` · Paid ${formatDMY(e.paid_date)}` : ''}</Text>
                        <LedgerBadge label={settled || st} color={LEDGER_STATUS_COLOR[st] || { bg: COLORS.surfaceAlt, fg: MUTED }} />
                      </View>
                      {!!e.notes && !e.is_balance && !!(settled ? settledRemark(e.notes) : e.notes) && <Text style={ClubInvestorsScreenS.lgNote}>{settled ? settledRemark(e.notes) : e.notes}</Text>}
                    </View>
                    </View>
                  );
                })}
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
  // Delete goes by role — Manager and above (or an admin); manager-level module access is not enough.
  const canDelete = isManagerRole(user) || user?.role === 'Admin' || !!user?.is_staff;

  const [investors,  setInvestors]  = useState([]);
  const [schemes,    setSchemes]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  // Match the web: the dashboard narrows by investment date, payout frequency and who
  // added the investor, and its renewal / maturity tiles open the rows they counted.
  const [range, setRange] = useState({ from: '', to: '' });
  const [payoutFilter, setPayoutFilter] = useState('');
  // Scheme filter — the server's scheme_id, as on the website.
  const [schemeFilter, setSchemeFilter] = useState('');
  const [addedByFilter, setAddedByFilter] = useState('');
  const [bucket, setBucket] = useState(route?.params?.bucket || '');
  React.useEffect(() => { if (route?.params?.bucket !== undefined) setBucket(route.params.bucket || ''); }, [route?.params?.bucket]);
  // Only the values these rows hold (?facets=1), as on the web — see lib/presentOptions.
  const [facets, setFacets] = useState(null);
  useEffect(() => {
    let alive = true;
    apiFetch(`${CLUB1000_ENDPOINTS.investors}?facets=1&approval_status=approved`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (alive && d) setFacets(d); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const [showAdd,    setShowAdd]    = useState(false);
  const [revising,   setRevising]   = useState(null);
  const [renewing,   setRenewing]   = useState(null);
  const [redeeming, setRedeeming] = useState(null);   // Redeem sheet (before maturity)
  const [historyFor, setHistoryFor] = useState(null); // History sheet
  const [portfolioFor, setPortfolioFor] = useState(null); // the person's whole portfolio
  const [addMoreFor, setAddMoreFor] = useState(null);     // a new investment for the same person
  const [selecting, setSelecting] = useState(false);     // pick several to delete at once
  const [picked, setPicked] = useState(() => new Set());
  // Only what is on screen stays picked — a search, filter or reload that hides an
  // investor drops it, so the count, the amount and Delete never act on a hidden one.
  useEffect(() => {
    setPicked((prev) => {
      const shown = new Set(investors.map((i) => i.id));
      const next = new Set([...prev].filter((id) => shown.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [investors]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [working, setWorking] = useState('');            // full-screen 'Sending…' while a request goes
  const [askReason, reasonUI] = useReasonPrompt();
  const [deletingId, setDeletingId] = useState(null); // investor being deleted
  const [showImport, setShowImport] = useState(false); // Import from Excel
  const [ledgerFor,  setLedgerFor]  = useState(null);
  // Opened from an investor notification (openInvestorId): that investor's ledger.
  useEffect(() => {
    if (route?.params?.openInvestorId) setLedgerFor(Number(route.params.openInvestorId));
  }, [route?.params?.openInvestorId, route?.params?._n]);
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
      if (bucket) params.set('bucket', bucket);
      if (payoutFilter) params.set('interest_payout', payoutFilter);
      if (schemeFilter) params.set('scheme_id', schemeFilter);
      if (addedByFilter) params.set('added_by', addedByFilter);
      if (range.from) params.set('date_from', range.from);
      if (range.to) params.set('date_to', range.to);
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

  useFocusEffect(React.useCallback(() => { load(); },
    [statusFilter, search, bucket, payoutFilter, schemeFilter, addedByFilter, range.from, range.to]));

  // Delete an investment — managers only; the server refuses once money has moved.
  // Delete an investment — Club 1000 managers only; payments already made are named first.
  async function deleteInvestor(inv) {
    const ok = await confirmAsk('Delete investor?',
      `Delete ${inv.name}${inv.loi_no ? ` (LOI ${inv.loi_no})` : ''} · ${fmtMoney(inv.amount_invested)} permanently? Its payout schedule and referral rewards go with it. This can't be undone.`,
      'Delete', true);
    if (!ok) return;
    setDeletingId(inv.id); setWorking('Deleting…');
    try {
      let r = await apiFetch(CLUB1000_ENDPOINTS.investor(inv.id), { method: 'DELETE' }).catch(() => null);
      if (r && r.status === 409) {
        const d = await r.json().catch(() => ({}));
        if (d.code !== 'has_paid') { Alert.alert('Not deleted', errText(d, 'Please try again.')); return; }
        setWorking('');
        const what = [d.paid_payouts ? `${d.paid_payouts} paid payout${d.paid_payouts === 1 ? '' : 's'} (${fmtMoney(d.paid_amount)})` : '',
          d.paid_rewards ? `${d.paid_rewards} paid referral reward${d.paid_rewards === 1 ? '' : 's'} (${fmtMoney(d.paid_rewards_amount)})` : ''].filter(Boolean).join(' and ');
        if (!(await confirmAsk('Delete the payments too?', `${inv.name} already has ${what} recorded. Deleting the investor deletes these payments too — the log keeps a note. This can't be undone.`, 'Delete with payments', true))) return;
        setWorking('Deleting…');
        r = await apiFetch(`${CLUB1000_ENDPOINTS.investor(inv.id)}?include_paid=1`, { method: 'DELETE' }).catch(() => null);
      }
      if (!r || !(r.ok || r.status === 204)) { Alert.alert('Not deleted', errText(r ? await r.json().catch(() => ({})) : {}, 'Please try again.')); return; }
      load();
    } finally { setDeletingId(null); setWorking(''); }
  }

  const togglePick = (ids, on) => setPicked((prev) => {
    const next = new Set(prev);
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
    return next;
  });
  const stopSelecting = () => { setSelecting(false); setPicked(new Set()); };

  // Delete every picked investment; any with money already paid are kept and named.
  async function bulkDelete() {
    const list = investors.filter((i) => picked.has(i.id));
    if (!list.length) return;
    const sum = list.reduce((t, i) => t + (Number(i.amount_invested) || 0), 0);
    const ok = await confirmAsk(`Delete ${list.length} investor${list.length === 1 ? '' : 's'}?`,
      `${fmtMoney(sum)} in all, permanently. Their payout schedules and referral rewards go with them. Any with a payment already made are asked about next. This can't be undone.`,
      'Delete', true);
    if (!ok) return;
    setBulkBusy(true); setWorking('Deleting…');
    try {
      const send = (ids, paid) => apiFetch(CLUB1000_ENDPOINTS.investorBulkDelete, { method: 'POST', body: JSON.stringify({ ids, include_paid: paid }) })
        .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) })).catch(() => ({ ok: false, d: {} }));
      const first = await send(list.map((i) => i.id), false);
      if (!first.ok) { Alert.alert('Not deleted', errText(first.d, 'Please try again.')); return; }
      let kept = first.d.refused || [];
      const paidOnes = kept.filter((k) => k.paid_payouts || k.paid_rewards);
      if (paidOnes.length) {
        setWorking('');
        if (await confirmAsk('Delete the payments too?', `${paidOnes.map((k) => k.name).join(', ')} already ha${paidOnes.length === 1 ? 's' : 've'} payments recorded. Delete ${paidOnes.length === 1 ? 'it' : 'them'} with those payments?`, 'Delete with payments', true)) {
          setWorking('Deleting…');
          const again = await send(paidOnes.map((k) => k.id), true);
          if (again.ok) kept = kept.filter((k) => !(again.d.deleted || []).includes(k.id));
        }
      }
      if (kept.length) Alert.alert(`${kept.length} kept`, kept.map((k) => k.name || `#${k.id}`).join(', '));
      setPicked(new Set(kept.map((k) => k.id)));
      if (!kept.length) setSelecting(false);
      load();
    } finally { setBulkBusy(false); setWorking(''); }
  }

  // Undo the latest renewal — managers only; payments already made in the renewed
  // term are named and asked about first.
  async function undoRenewal(inv) {
    const reason = await askReason({ title: 'Undo renewal — send for approval',
      message: `Ask to undo the latest renewal of ${inv.name}${inv.loi_no ? ` (LOI ${inv.loi_no})` : ''}? Once an approver approves it goes back to the term before. Write why.`,
      confirmText: 'Send for approval', placeholder: 'e.g. Renewed by mistake' });
    if (!reason) return;
    setWorking('Sending for approval…');
    try {
      let r = await apiFetch(CLUB1000_ENDPOINTS.investorUndoRenewal(inv.id), { method: 'POST', body: JSON.stringify({ reason }) }).catch(() => null);
      let d = r ? await r.json().catch(() => ({})) : {};
      if (r && r.status === 409 && d.code === 'has_paid') {
        setWorking('');
        if (!(await confirmAsk('Delete the payments too?', `${d.detail} Once approved they are deleted too — the log keeps a note.`, 'Send for approval', true))) return;
        setWorking('Sending for approval…');
        r = await apiFetch(CLUB1000_ENDPOINTS.investorUndoRenewal(inv.id), { method: 'POST', body: JSON.stringify({ reason, confirm_paid: true }) }).catch(() => null);
        d = r ? await r.json().catch(() => ({})) : {};
      }
      if (!r || !r.ok) { Alert.alert('Not sent', errText(d, 'Please try again.')); return; }
      Alert.alert('Sent for approval', 'The renewal is undone once an approver approves.');
      load();
    } finally { setWorking(''); }
  }

  async function viewLoi(id) {
    try {
      const res = await apiFetch(CLUB1000_ENDPOINTS.investorLoiUrl(id));
      const d = await res.json();
      if (res.ok && d.url) Linking.openURL(d.url);
      else Alert.alert('LOI unavailable', errText(d, 'Could not open the LOI.'));
    } catch (e) { Alert.alert('LOI unavailable', e.message); }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={BG} />
      <AddInvestorSheet visible={showAdd} onClose={() => { setShowAdd(false); setPrefillLead(null); }} onSaved={() => load()} schemes={schemes} prefillLead={prefillLead} />
      {/* Revise LOI is the Add Investor form, prefilled — every field can change. */}
      <AddInvestorSheet visible={!!revising} revise={revising} schemes={schemes}
        onClose={() => setRevising(null)} onSaved={() => load()} />
      <ImportInvestorsSheet visible={showImport} onClose={() => setShowImport(false)} onDone={() => { setShowImport(false); load(); }} />
      <InvestorHistorySheet investor={historyFor} onClose={() => setHistoryFor(null)} />
      <PortfolioSheet investorId={portfolioFor} onClose={() => setPortfolioFor(null)}
        onAddMore={can(user, 'club.investor.manage') && schemes.length ? (pf) => { setPortfolioFor(null); setAddMoreFor(pf); } : null} />
      <AddInvestorSheet visible={!!addMoreFor} prefillLead={morePrefill(addMoreFor)} schemes={schemes}
        onClose={() => setAddMoreFor(null)} onSaved={() => { setAddMoreFor(null); load(); }} />
      <RedeemSheet investor={redeeming}
        scheme={schemes.find((sc) => String(sc.id) === String(redeeming?.scheme))}
        onClose={() => setRedeeming(null)}
        onDone={() => { setRedeeming(null); load(); }} />
      <RenewInvestorSheet visible={!!renewing} investor={renewing}
        scheme={schemes.find((s) => String(s.id) === String(renewing?.scheme))}
        onClose={() => setRenewing(null)} onSaved={() => load()} />
      <LedgerModal investorId={ledgerFor} onClose={() => setLedgerFor(null)} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'transparent', borderBottomWidth: 0, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT }}>Investors</Text>
          <Text style={{ fontSize: 12, color: MUTED }}>{manager ? 'All investors' : 'Investors you\'ve added'}</Text>
        </View>
        {manager && can(user, 'club.investor.manage') && (
          <TouchableOpacity onPress={() => setShowImport(true)} disabled={!schemes.length} style={ClubInvestorsScreenS.importBtn}>
            <Ionicons name="cloud-upload-outline" size={16} color={COLORS.link} />
          </TouchableOpacity>
        )}
        {canDelete && investors.length > 0 && (
          <TouchableOpacity onPress={() => (selecting ? stopSelecting() : setSelecting(true))} style={[ClubInvestorsScreenS.importBtn, selecting && ClubInvestorsScreenS.selectBtnOn]}>
            <Ionicons name={selecting ? 'close' : 'checkbox-outline'} size={16} color={selecting ? COLORS.error : COLORS.link} />
          </TouchableOpacity>
        )}
        {can(user, 'club.investor.manage') && <TouchableOpacity onPress={() => setShowAdd(true)} disabled={!schemes.length}
          style={[ClubInvestorsScreenS.btn2, (schemes.length) && ClubInvestorsScreenS.box23]}>
          <Ionicons name="add" size={16} color={COLORS.btnTextSuccess} />
          <Text style={ClubInvestorsScreenS.box24}>Add</Text>
        </TouchableOpacity>}
      </View>
      {!loading && !schemes.length && (
        <Text style={{ fontSize: 11, color: COLORS.warning, textAlign: 'center', paddingTop: 8 }}>
          {manager ? 'Create a scheme first.' : 'No schemes yet — ask your manager to create one.'}
        </Text>
      )}

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: 14, paddingHorizontal: 12, height: 40 }}>
          <Ionicons name="search-outline" size={16} color={MUTED} />
          <TextInput value={searchText} onChangeText={setSearchText} placeholder="Search name, phone, email, investor no.…" placeholderTextColor={COLORS.text3}
            style={{ flex: 1, marginLeft: 8, fontSize: 14, color: TEXT }} returnKeyType="search" />
          {searchText ? <TouchableOpacity onPress={() => setSearchText('')}><Ionicons name="close-circle" size={16} color={MUTED} /></TouchableOpacity> : null}
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ClubInvestorsScreenS.chipScroll} contentContainerStyle={ClubInvestorsScreenS.chipRow}>
        {[{ key: '', label: 'All' }, ...onlyPresent([{ value: 'active', label: 'Active' }, { value: 'matured', label: 'Matured' }, { value: 'redeemed', label: 'Redeemed' }, { value: 'premature_redeemed', label: 'Premature' }], facets?.statuses ?? null, statusFilter).map((o) => ({ key: o.value, label: o.label }))].map((f) => (
          <TouchableOpacity key={f.key} onPress={() => setStatusFilter(f.key)}
            style={[ClubInvestorsScreenS.chip, statusFilter === f.key && ClubInvestorsScreenS.chipOn]}>
            <Text style={[ClubInvestorsScreenS.chipText, statusFilter === f.key && ClubInvestorsScreenS.chipTextOn]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Date, payout and added-by — like the website (and a tile's bucket, removable). */}
      <View style={invF.wrap}>
        {!!bucket && (
          <TouchableOpacity style={invF.bucket} onPress={() => setBucket('')}>
            <Text style={invF.bucketText}>{bucket === 'due_for_renewal' ? 'Due for renewal' : 'Maturing in 30 days'}</Text>
            <Ionicons name="close" size={14} color={COLORS.warning} />
          </TouchableOpacity>
        )}
        <PeriodFilter value={range} onChange={setRange} anyLabel="Any investment date" />
        <View style={invF.row}>
          {schemes.length > 1 && (
            <FilterSelect label="All schemes" value={schemeFilter} onChange={setSchemeFilter} style={invF.cell}
              options={[{ value: '', label: 'All schemes' }, ...schemes.map((sc) => ({ value: String(sc.id), label: sc.name }))]} />
          )}
          <FilterSelect label="All payouts" value={payoutFilter} onChange={setPayoutFilter} style={invF.cell}
            options={[{ value: '', label: 'All payouts' }, ...[['quarterly', 'Quarterly'], ['monthly', 'Monthly'], ['yearly', 'Yearly'], ['maturity', 'At maturity']]
              .filter(([v]) => !facets?.payouts || facets.payouts.includes(v) || payoutFilter === v).map(([v, l]) => ({ value: v, label: l }))]} />
          {(facets?.added_by || []).length > 1 && (
            <FilterSelect label="Added by anyone" value={addedByFilter} onChange={setAddedByFilter} style={invF.cell}
              options={[{ value: '', label: 'Added by anyone' }, ...facets.added_by.map((a) => ({ value: a.id, label: a.name }))]} />
          )}
        </View>
      </View>

      {/* Above the list, so what is picked and Delete stay in view while scrolling. */}
      {selecting && (
        <View style={ClubInvestorsScreenS.bulkBar}>
          <Text style={ClubInvestorsScreenS.bulkText}>
            <Text style={ClubInvestorsScreenS.bulkCount}>{picked.size}</Text> selected{picked.size ? ` · ${fmtMoney(investors.filter((i) => picked.has(i.id)).reduce((t, i) => t + (Number(i.amount_invested) || 0), 0))}` : ''}
          </Text>
          <TouchableOpacity onPress={() => togglePick(investors.map((i) => i.id), picked.size !== investors.length)} style={ClubInvestorsScreenS.bulkAll}>
            <Text style={ClubInvestorsScreenS.bulkAllText}>{picked.size === investors.length ? 'Clear' : 'All'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={bulkDelete} disabled={!picked.size || bulkBusy} style={[ClubInvestorsScreenS.bulkDel, (!picked.size || bulkBusy) && ClubInvestorsScreenS.bulkDelOff]}>
            {bulkBusy ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="trash-outline" size={15} color="#fff" />}
            <Text style={ClubInvestorsScreenS.bulkDelText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}>
        {/* The book on screen: how many investors and how much. Same as the website. */}
        {!loading && investors.length > 0 && (
          <View style={ClubInvestorsScreenS.totalBanner}>
            <Text style={ClubInvestorsScreenS.totalLabel}>
              TOTAL · {investors.length} INVESTOR{investors.length === 1 ? '' : 'S'} · {new Set(investors.map((i) => i.scheme_name)).size} SCHEME{new Set(investors.map((i) => i.scheme_name)).size === 1 ? '' : 'S'}
            </Text>
            <Text style={ClubInvestorsScreenS.totalAmt}>{fmtMoney(investors.reduce((t, i) => t + (Number(i.amount_invested) || 0), 0))}</Text>
          </View>
        )}
        {loading ? <AppLoader style={ClubInvestorsScreenS.listLoader} /> : investors.length === 0 ? (
          <Text style={ClubInvestorsScreenS.listEmpty}>{search ? 'No investors match your search.' : 'No investors yet.'}</Text>
        ) : investors.map((inv) => {
          const sc = STATUS_COLOR[inv.status] || { bg: COLORS.surfaceAlt, fg: MUTED };
          return (
            <View key={inv.id} style={[CARD, ClubInvestorsScreenS.invCard, selecting && picked.has(inv.id) && ClubInvestorsScreenS.invCardPicked]}>
              <View style={ClubInvestorsScreenS.invCardTop}>
                {selecting && (
                  <TouchableOpacity onPress={() => togglePick([inv.id], !picked.has(inv.id))} hitSlop={10} style={ClubInvestorsScreenS.pickBox}>
                    <Ionicons name={picked.has(inv.id) ? 'checkbox' : 'square-outline'} size={22} color={picked.has(inv.id) ? COLORS.error : MUTED} />
                  </TouchableOpacity>
                )}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT }}>{inv.name}</Text>
                    {inv.revision_no > 0 && (
                      <View style={{ paddingHorizontal: 7, paddingVertical: 1, borderRadius: 20, backgroundColor: COLORS.purpleBg }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.purple }}>R{inv.revision_no}</Text>
                      </View>
                    )}
                    {inv.is_matured && (
                      <View style={ClubInvestorsScreenS.maturedTag}>
                        <Text style={ClubInvestorsScreenS.maturedTagText}>MATURED</Text>
                      </View>
                    )}
                    {inv.renewal_count > 0 && (
                      <View style={ClubInvestorsScreenS.renewedTag}>
                        <Text style={ClubInvestorsScreenS.renewedTagText}>RENEWED {inv.renewal_count}×</Text>
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
                <TouchableOpacity onPress={() => setLedgerFor(inv.id)} style={ClubInvestorsScreenS.ledgerChip}>
                  <Text style={ClubInvestorsScreenS.ledgerChipText}><AppIcon name="book" size={11} /> Ledger</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setHistoryFor(inv)} style={ClubInvestorsScreenS.historyChip}>
                  <Text style={ClubInvestorsScreenS.historyChipText}>History</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setPortfolioFor(inv.id)} style={ClubInvestorsScreenS.historyChip}>
                  <Text style={ClubInvestorsScreenS.historyChipText}>Portfolio</Text>
                </TouchableOpacity>
                {/* Viewing on the left; what changes the investment on the right. */}
                <View style={ClubInvestorsScreenS.actionsGap} />
                {!!inv.pending_action && (
                  <View style={ClubInvestorsScreenS.deleteChip}><Text style={ClubInvestorsScreenS.deleteChipText}>Undo requested</Text></View>
                )}
                {manager && inv.renewal_count > 0 && !inv.pending_action && (
                  <TouchableOpacity onPress={() => undoRenewal(inv)} style={ClubInvestorsScreenS.deleteChip}>
                    <Text style={ClubInvestorsScreenS.deleteChipText}>↶ Undo renewal</Text>
                  </TouchableOpacity>
                )}
                {can(user, 'club.investor.manage') && schemes.length > 0 && (
                  <TouchableOpacity onPress={() => setAddMoreFor(inv)} style={ClubInvestorsScreenS.moreChip}>
                    <Text style={ClubInvestorsScreenS.moreChipText}>+ Add more</Text>
                  </TouchableOpacity>
                )}
                {can(user, 'club.investor.manage') && (
                  <TouchableOpacity onPress={() => setRevising(inv)} style={ClubInvestorsScreenS.rowBtnPurple}>
                    <Text style={ClubInvestorsScreenS.rowBtnPurpleText}>↻ Revise LOI</Text>
                  </TouchableOpacity>
                )}
                {inv.is_matured ? (can(user, 'club.investor.manage') && (
                  <>
                    <TouchableOpacity onPress={() => setRenewing(inv)} style={ClubInvestorsScreenS.warnChip}>
                      <Text style={ClubInvestorsScreenS.renewChipText}>↻ Renew</Text>
                    </TouchableOpacity>
                    {manager && (
                      <TouchableOpacity onPress={() => navigation.navigate('Club1000Payouts', { investorId: inv.id })} style={ClubInvestorsScreenS.warnChip}>
                        <Text style={ClubInvestorsScreenS.warnChipText}>Payout</Text>
                      </TouchableOpacity>
                    )}
                  </>
                )) : (
                  manager && inv.status === 'active' && can(user, 'club.investor.manage') && (
                    <TouchableOpacity onPress={() => setRedeeming(inv)} style={ClubInvestorsScreenS.warnChip}>
                      <Text style={ClubInvestorsScreenS.warnChipText}>Redeem</Text>
                    </TouchableOpacity>
                  )
                )}
                {canDelete && (
                  <TouchableOpacity onPress={() => deleteInvestor(inv)} disabled={deletingId === inv.id} style={ClubInvestorsScreenS.deleteChip}>
                    {deletingId === inv.id ? <ActivityIndicator size="small" color={COLORS.error} />
                      : <Text style={ClubInvestorsScreenS.deleteChipText}>Delete</Text>}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
      {reasonUI}
      {!!working && (
        <View style={ClubInvestorsScreenS.workOverlay}>
          <ActivityIndicator size="large" color={COLORS.link} />
          <Text style={ClubInvestorsScreenS.workText}>{working}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// Styles moved out of JSX (see AGENTS.md: no inline styles).
const ClubInvestorsScreenS = StyleSheet.create({
  sheetTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  // Save Draft sits above Submit and reads as the quieter of the two: it is the
  // fallback, not the goal.
  draftBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
              borderWidth: 1.5, borderColor: COLORS.link, borderRadius: 16,
              paddingVertical: 13, marginTop: 14, backgroundColor: COLORS.surface },
  draftBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.link },
  btn: { backgroundColor: COLORS.btnTintSuccess, borderWidth: 1, borderColor: COLORS.btnBorderSuccess, borderRadius: 16, height: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 8, opacity: 1 },
  box2: { opacity: 0.5 },
  box: { color: COLORS.btnTextSuccess, fontSize: 15, fontWeight: '800' },
  btn2: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.btnTintSuccess, borderWidth: 1, borderColor: COLORS.btnBorderSuccess, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, opacity: 0.5 },
  box3: { opacity: 1 },
  box4: { color: COLORS.btnTextSuccess, fontSize: 13, fontWeight: '700' },
  btn3: { backgroundColor: COLORS.btnTint, borderWidth: 1, borderColor: COLORS.btnBorder, borderRadius: 16, height: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, marginTop: 8, opacity: 1 },
  btn3Dim: { opacity: 0.5 },
  // Revise LOI header: the R-number title and who it is for.
  reviseHead: { flex: 1 },
  fRow: { flexDirection: 'row', gap: 10 },
  fColMb: { flex: 1, marginBottom: 16 },
  fBlock: { marginBottom: 16 },
  fLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  fSeg: { flexDirection: 'row', borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  fSegBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', backgroundColor: COLORS.surface },
  fSegBtnOn: { backgroundColor: COLORS.success },
  fSegText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  fSegTextOn: { color: COLORS.white },
  fSuggest: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, marginTop: 6, overflow: 'hidden' },
  fSuggestRow: { padding: 10 },
  fSuggestSep: { borderTopWidth: 1, borderTopColor: COLORS.surfaceAlt },
  fSuggestText: { fontSize: 13, color: COLORS.textPrimary },
  formSection: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, color: COLORS.link, marginTop: 6, marginBottom: 10 },
  flex1: { flex: 1 },
  schedItemPrincipal: { backgroundColor: COLORS.surfaceAlt },
  schedTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  schedPart: { fontSize: 9, fontWeight: '800', color: COLORS.warning, backgroundColor: COLORS.warningBg, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, overflow: 'hidden' },
  schedDays: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  schedCovers: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 2 },
  schedWhyEdited: { color: COLORS.warning, fontWeight: '700' },
  schedBox: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, overflow: 'hidden' },
  schedBasis: { fontSize: 11.5, color: COLORS.textSecondary, backgroundColor: COLORS.surfaceAlt, borderRadius: 10, padding: 8, marginBottom: 8 },
  schedItem: { padding: 10, gap: 4 },
  schedItemSep: { borderTopWidth: 1, borderTopColor: COLORS.surfaceAlt },
  schedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  schedTag: { fontSize: 12.5, fontWeight: '800', color: COLORS.success },
  schedTagPrincipal: { color: COLORS.purple },
  schedDate: { flex: 1, height: 36, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', paddingHorizontal: 10 },
  schedDateText: { fontSize: 12, color: COLORS.textPrimary },
  schedDateFlat: { flex: 1, fontSize: 12, color: COLORS.textPrimary },
  schedAmt: { flex: 1, height: 36, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10, fontSize: 12, color: COLORS.textPrimary },
  schedWhy: { fontSize: 10.5, color: COLORS.textSecondary, marginTop: 2, textAlign: 'right' },
  lgStmt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.accentSoft, marginBottom: 12 },
  lgStmtText: { fontSize: 13, fontWeight: '700', color: COLORS.link },
  lgTermScroll: { flexGrow: 0, marginBottom: 8 },
  lgTerms: { gap: 6, alignItems: 'center' },
  lgTerm: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  lgTermOn: { backgroundColor: COLORS.link, borderColor: COLORS.link },
  lgTermText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  lgTermTextOn: { color: '#fff' },
  lgTermLoi: { alignSelf: 'flex-start', marginBottom: 10, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: COLORS.linkBg },
  lgTermLoiText: { fontSize: 12, fontWeight: '800', color: COLORS.link },
  lgTermLine: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 8 },
  lgTermHead: { marginTop: 10, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6, backgroundColor: COLORS.surfaceAlt, fontSize: 11.5, fontWeight: '800', color: COLORS.textPrimary },
  lgCards: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  lgCard: { flexBasis: '46%', flexGrow: 1, backgroundColor: COLORS.surfaceAlt, borderRadius: 14, padding: 10 },
  lgCardSum: { backgroundColor: COLORS.linkBg },
  lgCardLbl: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4, color: COLORS.textSecondary },
  lgCardHint: { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },
  lgCardVal: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  lgRow: { paddingVertical: 10 },
  lgRowSep: { borderTopWidth: 1, borderTopColor: COLORS.surfaceAlt },
  lgTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  lgRight: { alignItems: 'flex-end' },
  lgAmt: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  lgPaid: { fontSize: 11, fontWeight: '700', color: COLORS.warning },
  lgBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  lgDates: { fontSize: 11, color: COLORS.textSecondary },
  lgNote: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3 },
  maturedTag: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 20, backgroundColor: COLORS.warningBg },
  maturedTagText: { fontSize: 10, fontWeight: '800', color: COLORS.warningAlt },
  renewedTag: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 20, backgroundColor: COLORS.linkBg },
  renewedTagText: { fontSize: 10, fontWeight: '800', color: COLORS.link },
  ledgerChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: COLORS.successBg },
  ledgerChipText: { fontSize: 11, fontWeight: '700', color: COLORS.success },
  selectBtnOn: { backgroundColor: COLORS.errorBg },
  invCard: { padding: 14, marginBottom: 10 },
  invCardPicked: { borderColor: COLORS.error, borderWidth: 2 },
  invCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pickBox: { marginRight: 10, marginTop: 1 },
  bulkBar: { marginHorizontal: 16, marginTop: 4, marginBottom: 4, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingLeft: 16, paddingRight: 10, borderRadius: 28, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, ...CARD_SHADOW },
  bulkText: { flex: 1, fontSize: 13, color: COLORS.textSecondary },
  bulkCount: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  bulkAll: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, backgroundColor: COLORS.surfaceAlt },
  bulkAllText: { fontSize: 12.5, fontWeight: '700', color: COLORS.textPrimary },
  bulkDel: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: COLORS.error },
  bulkDelOff: { opacity: 0.45 },
  bulkDelText: { fontSize: 12.5, fontWeight: '800', color: '#fff' },
  renewSubmitText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  workOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay, alignItems: 'center', justifyContent: 'center', gap: 12 },
  workText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  moreChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: COLORS.successBg },
  moreChipText: { fontSize: 11, fontWeight: '700', color: COLORS.success },
  moreNote: { fontSize: 12, color: COLORS.link, backgroundColor: COLORS.linkBg, padding: 10, borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  actionsGap: { flexGrow: 1, minWidth: 8 },
  historyChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border },
  historyChipText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },
  importBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  deleteChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: COLORS.errorBg, minWidth: 54, alignItems: 'center' },
  deleteChipText: { fontSize: 11, fontWeight: '700', color: COLORS.error },
  renewNote: { fontSize: 11, color: COLORS.textSecondary, backgroundColor: COLORS.surfaceAlt, borderRadius: 14, padding: 10, marginBottom: 10 },
  warnChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: COLORS.warningBg },
  warnChipText: { fontSize: 11, fontWeight: '700', color: COLORS.warning },
  renewChipText: { fontSize: 11, fontWeight: '700', color: COLORS.warningAlt },
  totalBanner: { backgroundColor: COLORS.link, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 14 },
  totalLabel: { color: '#fff', opacity: 0.85, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  chipScroll: { flexGrow: 0, flexShrink: 0 },
  chipRow: { paddingHorizontal: 16, paddingTop: 12, gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, minHeight: 34, justifyContent: 'center', borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  chipOn: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 12, fontWeight: '700', color: MUTED },
  chipTextOn: { color: '#fff' },
  box23: { opacity: 1 },
  box24: { color: COLORS.btnTextSuccess, fontSize: 13, fontWeight: '700' },
  totalAmt: { color: '#fff', fontSize: 21, fontWeight: '800', marginTop: 4 },
  listLoader: { marginTop: 24 },
  listEmpty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 30 },
  loiBtnText: { color: COLORS.success, fontSize: 13, fontWeight: '700' },
  reviseSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  // A small action chip in an investor row (Revise LOI).
  rowBtnPurple: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: COLORS.purpleBg },
  rowBtnPurpleText: { fontSize: 11, fontWeight: '700', color: COLORS.purple },
  box5: { color: COLORS.btnText, fontSize: 15, fontWeight: '800' },
});

const invF = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 10 },
  row: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1, justifyContent: 'space-between' },
  bucket: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: 8, paddingHorizontal: 12,
            paddingVertical: 6, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.warning, backgroundColor: COLORS.warningBg },
  bucketText: { fontSize: 12, fontWeight: '700', color: COLORS.warning },
});
