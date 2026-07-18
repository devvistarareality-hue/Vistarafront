import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert, StatusBar, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { apiFetch } from '../../utils/apiFetch';
import { CLUB1000_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { isClub1000Manager } from '../../utils/club1000Access';
import { formatDMY } from '../../utils/dateFormat';
import FormSheet from '../../components/FormSheet';
import { TextField, inputStyle } from '../../components/Field';

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
  const lastDay = new Date(year, targetMonth, 0).getDate(); // day 0 of next month
  return new Date(year, targetMonth - 1, lastDay);
}

function computeQuarterlyDates(investmentDate, tenureMonths) {
  const quarters = Math.max(Math.floor((Number(tenureMonths) || 0) / 3), 1);
  let current = investmentDate;
  const dates = [];
  for (let i = 0; i < quarters; i++) {
    current = nextQuarterPayout(current);
    dates.push(toISODate(current));
  }
  return dates;
}

function nextMonthEnd(d) {
  const totalMonth = d.getMonth() + 1 + 1; // 1-indexed, +1 month ahead
  const year = d.getFullYear() + Math.floor((totalMonth - 1) / 12);
  const month = ((totalMonth - 1) % 12) + 1;
  const lastDay = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, lastDay);
}

function computeMonthlyDates(investmentDate, tenureMonths) {
  let current = investmentDate;
  const dates = [];
  for (let i = 0; i < Math.max(Number(tenureMonths) || 0, 1); i++) {
    current = nextMonthEnd(current);
    dates.push(toISODate(current));
  }
  return dates;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonthYear(dateStr) {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function lastDayOfMonthISO(y, m) { // m is 1-indexed
  const lastDay = new Date(y, m, 0).getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

const INTEREST_PAYOUT_LABELS = { monthly: 'Monthly', quarterly: 'Quarterly', maturity: 'At Maturity' };

// ── Add Investor sheet ──────────────────────────────────────────────────────
function AddInvestorSheet({ visible, onClose, onSaved, schemes }) {
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

  // (Re)initialise the form whenever the sheet is opened.
  useEffect(() => {
    if (visible) {
      const s = schemes[0];
      setForm({
        scheme: s?.id || '', reference_name: '', reference_phone: '', name: '', phone: '', email: '', pan: '',
        amount_invested: '', investment_date: new Date(),
        interest_payout: s?.interest_payout_options?.[0] || 'maturity',
        total_return_pct: s?.total_return_pct != null ? String(s.total_return_pct) : '',
        notes: '',
      });
      apiFetch(CLUB1000_ENDPOINTS.investorReferences)
        .then((r) => (r.ok ? r.json() : []))
        .then(setRefSuggestions)
        .catch(() => {});
      setDocumentFile(null);
      setSchedule([]);
      setScheduleDirty(false);
    }
  }, [visible]);

  // Hooks below must all run unconditionally (before the `if (!form) return null`
  // guard) so the hook count/order never changes between renders where `form`
  // is null (sheet not yet opened) vs populated.
  const scheme = form ? schemes.find((s) => String(s.id) === String(form.scheme)) : null;
  const maturityDate = form && scheme ? addMonths(form.investment_date, scheme.tenure_months) : null;
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
    const interestTotal = (principal * totalReturn) / 100;
    const perInstalment = dates.length ? +(interestTotal / dates.length).toFixed(2) : 0;
    const rows = dates.map((due_date) => ({ due_date, amount_due: String(perInstalment), payout_type: 'interest' }));
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
    setSchemeOpen(false);
    setScheduleDirty(false);
    setForm((f) => ({ ...f, scheme: s.id, interest_payout: s.interest_payout_options?.[0] || 'maturity', total_return_pct: s.total_return_pct != null ? String(s.total_return_pct) : '' }));
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

  async function submit() {
    if (!form.name.trim() || !form.phone.trim() || !form.amount_invested || !scheme) {
      Alert.alert('Missing fields', 'Scheme, Name, Mobile Number and Amount Invested are required.');
      return;
    }
    if (Number(form.amount_invested) < Number(scheme.min_ticket_size)) {
      Alert.alert('Amount too low', `Minimum ticket size for ${scheme.name} is ${fmtMoney(scheme.min_ticket_size)}.`);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        scheme: form.scheme,
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
      };
      if (documentFile) payload.document_file = documentFile;
      if ((form.interest_payout === 'quarterly' || form.interest_payout === 'monthly') && schedule.length) payload.payout_schedule = schedule;
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
                <TouchableOpacity key={v} onPress={() => set('interest_payout', v)}
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
                    <Text style={{ fontSize: 12, color: TEXT }}>{row.payout_type === 'maturity' ? formatDMY(row.due_date) : formatMonthYear(row.due_date)}</Text>
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
                  const row = schedule[openScheduleIdx];
                  // Interest instalments are month-end by construction — picking any day
                  // snaps to the last day of that month; the Principal row keeps the exact date.
                  const value = row.payout_type === 'maturity' ? toISODate(d) : lastDayOfMonthISO(d.getFullYear(), d.getMonth() + 1);
                  updateScheduleRow(openScheduleIdx, 'due_date', value);
                }}
              />
            )}
          </View>
        )}

        {/* Reference name (autocompletes from prior references) & number */}
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

        <TextField label="Notes" value={form.notes} onChangeText={(v) => set('notes', v)} />

        <TouchableOpacity onPress={submit} disabled={saving}
          style={{ backgroundColor: TEAL, borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: saving ? 0.7 : 1, marginTop: 8 }}>
          {saving ? <ActivityIndicator color={COLORS.white} /> : <Ionicons name="save-outline" size={17} color={COLORS.white} />}
          <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: '800' }}>Add Investor</Text>
        </TouchableOpacity>
      </ScrollView>
    </FormSheet>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────
export default function Club1000InvestorsScreen({ navigation }) {
  const user = useSelector((s) => s.auth.user);
  const manager = isClub1000Manager(user);

  const [investors,  setInvestors]  = useState([]);
  const [schemes,    setSchemes]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdd,    setShowAdd]    = useState(false);

  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const qs = statusFilter ? `?status=${statusFilter}` : '';
      const [invRes, schemesRes] = await Promise.all([
        apiFetch(`${CLUB1000_ENDPOINTS.investors}${qs}`),
        apiFetch(CLUB1000_ENDPOINTS.schemes),
      ]);
      if (invRes.ok) setInvestors(await invRes.json());
      if (schemesRes.ok) setSchemes(await schemesRes.json());
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }

  useFocusEffect(React.useCallback(() => { load(); }, [statusFilter]));

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <AddInvestorSheet visible={showAdd} onClose={() => setShowAdd(false)} onSaved={() => load()} schemes={schemes} />

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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
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
          <Text style={{ textAlign: 'center', color: MUTED, marginTop: 30 }}>No investors yet.</Text>
        ) : investors.map((inv) => {
          const sc = STATUS_COLOR[inv.status] || { bg: COLORS.surfaceAlt, fg: MUTED };
          return (
            <View key={inv.id} style={[CARD, { padding: 14, marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT }}>{inv.name}</Text>
                  <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{inv.scheme_name}{inv.reference_name ? ` · Ref: ${inv.reference_name}` : ''}</Text>
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
              {manager && inv.status === 'active' && (
                <TouchableOpacity onPress={() => redeem(inv.id)} style={{ alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, backgroundColor: COLORS.warningBg }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.warning }}>Redeem</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
