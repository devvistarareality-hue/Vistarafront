import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StatusBar, ActivityIndicator, Linking, RefreshControl, StyleSheet } from 'react-native';
import { AddInvestorSheet } from './Club1000InvestorsScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { CLUB1000_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { can } from '../../lib/roles';
import MultiFilterSelect from '../../components/MultiFilterSelect';
import PeriodFilter, { inRange } from '../../components/PeriodFilter';
import { formatDMY } from '../../utils/dateFormat';

import AppIcon from '../../components/AppIcon';
import AppLoader from '../../components/AppLoader';
import { errText } from '../../lib/apiError';
import { confirmAsk } from '../../lib/confirmAsk';
import { useReasonPrompt } from '../../components/ReasonPrompt';
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary; const TEAL = COLORS.success; const PURPLE = COLORS.link; const AMBER = COLORS.warning;

function fmtMoney(n) {
  const num = Number(n || 0);
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 22, padding: 14, ...CARD_SHADOW , borderWidth: 1, borderColor: COLORS.cardBorder };
// Drafts first because that is the step before Pending. The server only ever
// returns your own, so this tab is personal even though the screen is shared.
const TABS = [['draft', 'Drafts'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All']];
const APPROVAL_BADGE_COLOR = {
  draft: { bg: COLORS.surfaceAlt, fg: COLORS.textSecondary },
  pending: { bg: COLORS.warningBg, fg: COLORS.warning },
  approved: { bg: COLORS.successBg, fg: COLORS.success },
  rejected: { bg: COLORS.errorBg, fg: COLORS.error },
};

export default function Club1000InvestorApprovalsScreen({ navigation }) {
  const user = useSelector((s) => s.auth.user);
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(null);
  const [askReason, reasonUI] = useReasonPrompt();   // reject always says why
  const [busyAct, setBusyAct] = useState('');   // which action the busy row is running
  // A draft is edited from here, because it deliberately does not appear in the
  // Investors list — there is nowhere else to open it from.
  const [editDraft, setEditDraft] = useState(null);
  // An approved investor opened in Revise LOI — the Add Investor form, prefilled.
  const [revising, setRevising] = useState(null);
  // Filters, as on Sales' Booking Approvals: investment-date range, schemes, added by.
  const [range, setRange] = useState({ from: '', to: '' });
  const [schemeSel, setSchemeSel] = useState([]);
  const [addedBySel, setAddedBySel] = useState([]);
  const [openGroup, setOpenGroup] = useState({});
  const [managers, setManagers] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [openScheme, setOpenScheme] = useState(null);
  const [savedCfg, setSavedCfg] = useState('');
  const [search, setSearch] = useState('');
  const [searchText, setSearchText] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchText), 400);
    return () => clearTimeout(t);
  }, [searchText]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ approval_status: tab });
      if (search) params.set('search', search);
      const res = await apiFetch(`${CLUB1000_ENDPOINTS.investors}?${params.toString()}`);
      if (res.ok) { const d = await res.json(); setRows(Array.isArray(d) ? d : []); }
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }, [tab, search]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    // Only people with Club 1000 access — and manager-level access, which approving needs.
    apiFetch(`${CLUB1000_ENDPOINTS.users}?approvers=1`).then((r) => (r.ok ? r.json() : []))
      .then((d) => setManagers(Array.isArray(d) ? d.filter((u) => u.club_manager || u.director || u.role === 'Admin') : []))   // managers + every Director
      .catch(() => {});
    apiFetch(CLUB1000_ENDPOINTS.schemes).then((r) => (r.ok ? r.json() : []))
      .then((d) => setSchemes(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  async function act(id, action) {
    const inv = (rows || []).find((x) => x.id === id);
    const who = `${inv ? inv.name : 'this investor'}${inv?.scheme_name ? ` · ${inv.scheme_name}` : ''}`;
    let reason = '';
    if (action === 'approve') {
      if (!(await confirmAsk('Approve investor?', `Approve ${who}?`, 'Approve'))) return;
    } else {
      reason = await askReason({ title: 'Reject investor', message: `Reject ${who}? Write why — whoever added it sees this.`, confirmText: 'Reject', placeholder: 'e.g. Signed LOI missing, KYC unclear' });
      if (!reason) return;
    }
    setBusy(id); setBusyAct(action);
    try {
      const res = await apiFetch(CLUB1000_ENDPOINTS.investorAction(id), { method: 'POST', body: JSON.stringify(reason ? { action, reason } : { action }) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(errText(d, `Could not ${action} this investor.`));
      }
    } finally {
      setBusy(null); setBusyAct('');
      load();
    }
  }

  // A requested delete / undo-renewal: approve carries it out, reject says why.
  async function actRequest(inv, action) {
    const what = inv.pending_action?.type === 'delete' ? 'delete' : 'undo the renewal of';
    let reason = '';
    if (action === 'approve') {
      if (!(await confirmAsk('Approve request?', `Approve: ${what} ${inv.name}? This can't be undone.`, 'Approve', true))) return;
    } else {
      reason = await askReason({ title: 'Reject request', message: `Reject the request to ${what} ${inv.name}? Write why — whoever asked sees this.`, confirmText: 'Reject', placeholder: 'e.g. Keep it' });
      if (!reason) return;
    }
    setBusy(inv.id); setBusyAct(action);
    try {
      const res = await apiFetch(CLUB1000_ENDPOINTS.investorPendingAction(inv.id), { method: 'POST', body: JSON.stringify(reason ? { action, reason } : { action }) });
      if (!res.ok) alert(errText(await res.json().catch(() => ({})), 'Could not complete it.'));
    } finally { setBusy(null); setBusyAct(''); load(); }
  }

  // Per-scheme sequence counter — purely to stop a slow, out-of-order response
  // from visually flickering the display backwards after a newer toggle for
  // the same scheme has already landed. It's cosmetic only: the actual
  // save-without-loss guarantee comes from the backend's atomic toggle
  // endpoint (see SchemeToggleApproverView) — PATCHing the whole computed
  // array from here raced the moment two toggles for the same scheme were in
  // flight together, since whichever write landed LAST at the DB won
  // regardless of send order, silently dropping the other tap with no error
  // either side. The toggle endpoint instead sends just the one manager id
  // and lets the DB row lock serialize concurrent toggles, so nothing is
  // lost no matter how the requests interleave.
  const approverPatchSeq = useRef({});

  async function toggleApprover(schemeId, mgrId, level = 1) {
    const key = level === 2 ? 'investor_approvers_l2' : 'investor_approvers';
    // Optimistic instant feedback — the atomic call below reconciles this
    // with the server's authoritative result once it returns.
    setSchemes((ss) => ss.map((s) => {
      if (s.id !== schemeId) return s;
      const cur = s[key] || [];
      return { ...s, [key]: cur.includes(mgrId) ? cur.filter((x) => x !== mgrId) : [...cur, mgrId] };
    }));

    const seq = (approverPatchSeq.current[schemeId] || 0) + 1;
    approverPatchSeq.current[schemeId] = seq;

    let result = null;
    try {
      const res = await apiFetch(CLUB1000_ENDPOINTS.schemeToggleApprover(schemeId), { method: 'POST', body: JSON.stringify({ manager_id: mgrId, level }) });
      if (res.ok) result = await res.json();
    } catch { /* result stays null */ }

    if (approverPatchSeq.current[schemeId] !== seq) return;

    if (result) {
      setSchemes((ss) => ss.map((s) => (s.id === schemeId ? { ...s, investor_approvers: result.investor_approvers, investor_approvers_l2: result.investor_approvers_l2 } : s)));
      setSavedCfg('Saved'); setTimeout(() => setSavedCfg(''), 1500);
    } else {
      // Undo the optimistic toggle — it never actually reached the DB, so the
      // UI shouldn't keep showing it as selected.
      setSchemes((ss) => ss.map((s) => {
        if (s.id !== schemeId) return s;
        const cur = s[key] || [];
        return { ...s, [key]: cur.includes(mgrId) ? cur.filter((x) => x !== mgrId) : [...cur, mgrId] };
      }));
      setSavedCfg('Could not save — try again'); setTimeout(() => setSavedCfg(''), 3000);
    }
  }

  // Being on this screen at all means manager-level Club 1000 access, but
  // approval authority itself is scoped to the scheme's configured Investor
  // Approvers (or a real admin) — mirrors backend can_approve_investor and
  // the same fix on the web Approvals page. Without this, every manager saw
  // live Approve/Reject buttons for every scheme regardless of who was
  // actually picked above, which only 403'd on tap instead of not being
  // offered at all.
  const isRealAdmin = user?.is_staff || user?.role === 'Admin';
  // Two-level schemes: level 1 first; once it is done only level 2 can finish it.
  function canApprove(inv) {
    const scheme = schemes.find((s) => s.id === inv.scheme);
    const l2 = scheme?.investor_approvers_l2 || [];
    const inL1 = isRealAdmin || (!!scheme && (scheme.investor_approvers || []).includes(user?.id));
    const inL2 = isRealAdmin || l2.includes(user?.id);
    if (!l2.length) return inL1;
    return inv.approval_step ? inL2 : inL1;
  }
  function approveLabel(inv) {
    const scheme = schemes.find((s) => s.id === inv.scheme);
    if (!(scheme?.investor_approvers_l2 || []).length) return 'Approve';
    return inv.approval_step ? 'Final approve' : 'Approve (L1)';
  }
  // Who can SEE (let alone change) the "Investor Approvers — by scheme"
  // picker — deliberately narrower than manager-level Club 1000 access (which
  // just gets someone onto this screen at all): only Directors and real
  // admins get to decide who approves each scheme, same as the web page.
  const canConfigureApprovers = isRealAdmin || user?.role === 'Director';

  async function viewLoi(id, pending) {
    try {
      const res = await apiFetch(`${CLUB1000_ENDPOINTS.investorLoiUrl(id)}${pending ? '?pending=1' : ''}`);
      const d = await res.json();
      if (res.ok && d.url) Linking.openURL(d.url);
      else alert(errText(d, 'Could not open the LOI.'));
    } catch (e) { alert(e.message); }
  }

  // A revision can change anything on the Add Investor form, so every field it may
  // carry gets a readable name — and the scheme its name, not its number.
  const FIELD_LABELS = {
    amount_invested: 'Amount', total_return_pct: 'Return %', interest_payout: 'Payout', security: 'Security', notes: 'Notes',
    scheme: 'Scheme', email: 'Email', pan: 'PAN', source: 'Source', reference_name: 'Reference', reference_phone: 'Reference no.',
    name: 'Name', phone: 'Mobile', revision_date: 'Revision date',
  };
  function revisionSummary(inv) {
    const pr = inv.pending_revision;
    if (!pr) return null;
    const isRenew = inv.pending_revision_type === 'renew';
    return Object.entries(pr).filter(([k]) => k !== 'payout_schedule').map(([k, v]) => {
      if (k === 'document_name') return 'New KYC scan';
      if (k === 'investment_date') return `${isRenew ? 'Renewal Date' : 'Investment date'}: ${v}`;
      if (k === 'scheme') return `Scheme: ${(schemes.find((sc) => String(sc.id) === String(v)) || {}).name || v}`;
      return `${FIELD_LABELS[k] || k}: ${v === '' ? '—' : v}`;
    }).join(' · ');
  }

  // Filtered list and its scheme groups, as Sales groups bookings by project.
  const schemeOptions = [...new Set(rows.map((i) => i.scheme_name).filter(Boolean))].sort();
  const addedByOptions = [...new Set(rows.map((i) => i.added_by_name).filter(Boolean))].sort();
  const visible = rows.filter((i) => inRange(i.investment_date, range)
    && (!schemeSel.length || schemeSel.includes(i.scheme_name))
    && (!addedBySel.length || addedBySel.includes(i.added_by_name)));
  const narrowed = !!(range.from || range.to || schemeSel.length || addedBySel.length || search);
  const groups = {};
  visible.forEach((i) => { const k = i.scheme_name || '—'; (groups[k] = groups[k] || []).push(i); });
  const groupNames = Object.keys(groups).sort();
  groupNames.forEach((g) => groups[g].sort((x, y) => String(y.investment_date || '').localeCompare(String(x.investment_date || ''))));
  const grandTotal = visible.reduce((t, i) => t + (Number(i.amount_invested) || 0), 0);
  const tabLabel = (TABS.find(([k]) => k === tab) || ['', 'All'])[1];
  // Short lists open by default; a long one starts folded so the scheme totals read first.
  const isOpen = (g) => (openGroup[g] === undefined ? (narrowed || visible.length <= 12) : openGroup[g]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      {reasonUI}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'transparent', borderBottomWidth: 0, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT }}>Investor Approvals</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {canConfigureApprovers && (
          <View style={[CARD, { marginBottom: 12 }]}>
            <TouchableOpacity onPress={() => setCfgOpen((o) => !o)}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: TEAL }}>
                <AppIcon name="settings" size={13} /> Investor Approvers — by scheme {cfgOpen ? '▴' : '▾'}
                {!!savedCfg && <Text style={{ color: savedCfg.startsWith('Could not') ? COLORS.error : COLORS.success }}> {savedCfg}</Text>}
              </Text>
            </TouchableOpacity>
            {cfgOpen && schemes.map((s) => {
              const exp = openScheme === s.id; const sel = s.investor_approvers || [];
              const names = managers.filter((m) => sel.includes(m.id)).map((m) => m.name).join(', ');
              return (
                <View key={s.id} style={{ borderTopWidth: 1, borderTopColor: COLORS.surfaceAlt, paddingVertical: 10 }}>
                  <TouchableOpacity onPress={() => setOpenScheme(exp ? null : s.id)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT }}>{s.name}</Text>
                      <Text style={{ fontSize: 11, color: names ? MUTED : COLORS.textTertiary }} numberOfLines={1}>{names || 'No approvers'}</Text>
                    </View>
                    <Ionicons name={exp ? 'chevron-up' : 'chevron-down'} size={18} color={MUTED} />
                  </TouchableOpacity>
                  {exp && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                      {managers.map((m) => {
                        const on = sel.includes(m.id);
                        return (
                          <TouchableOpacity key={m.id} onPress={() => toggleApprover(s.id, m.id)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: on ? TEAL : COLORS.border, backgroundColor: on ? TEAL : COLORS.surface }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: on ? '#fff' : MUTED }}>{on ? <AppIcon name="check" size={12} /> : ''}{m.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  {exp && (
                    <>
                      <Text style={st.l2Head}>LEVEL 2 · FINAL APPROVAL {(s.investor_approvers_l2 || []).length ? '' : '(none — single step)'}</Text>
                      <View style={st.l2Chips}>
                        {managers.map((m) => {
                          const on2 = (s.investor_approvers_l2 || []).includes(m.id);
                          return (
                            <TouchableOpacity key={m.id} onPress={() => toggleApprover(s.id, m.id, 2)} style={[st.l2Chip, on2 && st.l2ChipOn]}>
                              <Text style={[st.l2ChipText, on2 && st.l2ChipTextOn]}>{on2 ? '✓ ' : ''}{m.name}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}
                  {(s.investor_approvers_l2 || []).length > 0 && !exp && (
                    <Text style={st.l2Names} numberOfLines={1}>Level 2: {managers.filter((m) => (s.investor_approvers_l2 || []).includes(m.id)).map((m) => m.name).join(', ')}</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: 14, paddingHorizontal: 12, height: 40, marginBottom: 12 }}>
          <Ionicons name="search-outline" size={16} color={MUTED} />
          <TextInput value={searchText} onChangeText={setSearchText} placeholder="Search name, phone, email, investor no.…" placeholderTextColor={COLORS.text3}
            style={{ flex: 1, marginLeft: 8, fontSize: 14, color: TEXT }} returnKeyType="search" />
          {searchText ? <TouchableOpacity onPress={() => setSearchText('')}><Ionicons name="close-circle" size={16} color={MUTED} /></TouchableOpacity> : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
          {TABS.map(([k, label]) => (
            <TouchableOpacity key={k} onPress={() => setTab(k)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: tab === k ? TEAL : COLORS.surfaceAlt }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: tab === k ? '#fff' : MUTED }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Investment-date range and the scheme / added-by pickers — as on Sales. */}
        <PeriodFilter value={range} onChange={setRange} anyLabel="Any investment date" />
        {(schemeOptions.length > 1 || addedByOptions.length > 1) && (
          <View style={st.filterRow}>
            {schemeOptions.length > 1 && (
              <MultiFilterSelect label="All Schemes" noun="schemes" value={schemeSel} onChange={(v) => { setSchemeSel(v); setOpenGroup({}); }}
                options={schemeOptions.map((n) => ({ value: n, label: n }))} />
            )}
            {addedByOptions.length > 1 && (
              <MultiFilterSelect label="All Added By" noun="people" value={addedBySel} onChange={(v) => { setAddedBySel(v); setOpenGroup({}); }}
                options={addedByOptions.map((n) => ({ value: n, label: n }))} />
            )}
          </View>
        )}

        {!loading && visible.length > 0 && (
          <View style={st.banner}>
            <Text style={st.bannerLabel}>
              {(narrowed ? 'MATCHING ' : 'TOTAL ') + String(tabLabel).toUpperCase()} · {visible.length} INVESTOR{visible.length === 1 ? '' : 'S'} · {groupNames.length} SCHEME{groupNames.length === 1 ? '' : 'S'}
            </Text>
            <Text style={st.bannerAmt}>{fmtMoney(grandTotal)}</Text>
          </View>
        )}

        {loading ? <AppLoader style={st.loader} /> : visible.length === 0 ? (
          <View style={[CARD, st.empty]}><Text style={st.emptyText}>{search ? 'No investors match your search.' : narrowed ? 'No investors match these filters.' : 'No investors here.'}</Text></View>
        ) : groupNames.map((gn) => (
          <View key={gn} style={st.group}>
            <TouchableOpacity onPress={() => setOpenGroup((o) => ({ ...o, [gn]: !isOpen(gn) }))}
              style={[st.groupHead, isOpen(gn) && st.groupHeadOpen]}>
              <View style={st.flex}>
                <Text style={st.groupName} numberOfLines={1}>{String(gn).toUpperCase()}</Text>
                <Text style={st.groupCount}>{groups[gn].length} investor{groups[gn].length === 1 ? '' : 's'}</Text>
              </View>
              <Text style={st.groupAmt}>{fmtMoney(groups[gn].reduce((t, i) => t + (Number(i.amount_invested) || 0), 0))}</Text>
              <Ionicons name={isOpen(gn) ? 'chevron-down' : 'chevron-forward'} size={16} color={MUTED} />
            </TouchableOpacity>
            {isOpen(gn) && groups[gn].map((inv) => {
          const ac = APPROVAL_BADGE_COLOR[inv.approval_status] || { bg: COLORS.surfaceAlt, fg: MUTED };
          const isRevision = !!inv.pending_revision;
          const isRenewal = isRevision && inv.pending_revision_type === 'renew';
          const accent = isRenewal ? AMBER : PURPLE;
          return (
            <View key={inv.id} style={[CARD, st.card]}>
              <View style={st.cardTop}>
                <View style={st.flex}>
                  <View style={st.nameRow}>
                    <Text style={st.name}>{inv.name}</Text>
                    {inv.revision_no > 0 && (
                      <View style={[st.rev, isRenewal && st.revRenew]}>
                        <Text style={[st.revText, isRenewal && st.revTextRenew]}>{isRenewal ? 'RENEW' : `R${inv.revision_no}`}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={st.sub}>{inv.phone || '—'}{inv.loi_no ? ` · LOI ${inv.loi_no}` : ''}</Text>
                  <Text style={st.sub2}>Added by {inv.added_by_name || '—'} · Invested {inv.investment_date ? formatDMY(inv.investment_date) : '—'}</Text>
                  {inv.approval_status === 'approved' && (
                    <Text style={st.decided}>Approved by {inv.approved_by_name || '—'}{inv.approved_at ? ` · ${formatDMY(String(inv.approved_at).slice(0, 10))}` : ''}</Text>
                  )}
                  {isRevision && <Text style={st.proposed}>Proposed: {revisionSummary(inv)}</Text>}
                  {inv.approval_status === 'rejected' && !!inv.rejected_reason && (
                    <View style={st.reasonBox}><Text style={st.reasonHead}>REJECTED — REASON</Text><Text style={st.reasonBody}>{inv.rejected_reason}</Text></View>
                  )}
                  {!!inv.approval_step && (
                    <Text style={st.l2Wait}>Level 1 approved by {inv.approval_step.by_name || '—'} — waiting for level 2</Text>
                  )}
                  {!!inv.pending_action && (
                    <View style={st.reasonBox}>
                      <Text style={st.reasonHead}>{inv.pending_action.type === 'delete' ? 'DELETE REQUESTED' : 'UNDO RENEWAL REQUESTED'} BY {String(inv.pending_action.by_name || '—').toUpperCase()}</Text>
                      <Text style={st.reasonBody}>{inv.pending_action.reason}</Text>
                    </View>
                  )}
                  {(inv.rejections || []).slice().reverse().map((rj, k) => (
                    <View key={k} style={st.reasonBox}>
                      <Text style={st.reasonHead}>{rj.kind === 'delete' ? 'DELETE REQUEST' : rj.kind === 'undo-renewal' ? 'UNDO-RENEWAL REQUEST' : rj.kind === 'undone-renewal' ? `RENEWAL R${rj.no}` : `${rj.kind === 'renewal' ? 'RENEWAL' : 'REVISION'} R${rj.no}`} {rj.kind === 'undone-renewal' ? 'UNDONE' : 'REJECTED'}{rj.by ? ` BY ${String(rj.by).toUpperCase()}` : ''}{rj.at ? ` · ${formatDMY(String(rj.at).slice(0, 10))}` : ''}{Number(rj.amount) ? ` · PROPOSED ${fmtMoney(rj.amount)}` : ''}</Text>
                      <Text style={st.reasonBody}>{rj.reason}</Text>
                    </View>
                  ))}
                </View>
                <View style={st.side}>
                  <Text style={st.amt}>{fmtMoney(inv.amount_invested)}</Text>
                  <View style={[st.badge, { backgroundColor: ac.bg }]}>{/* inline-ok: colour per status */}
                    <Text style={[st.badgeText, { color: ac.fg }]}>{isRevision && inv.approval_status === 'pending' ? (isRenewal ? 'RENEWAL PENDING' : `R${inv.revision_no} PENDING`) : inv.approval_status}</Text>{/* inline-ok: colour per status */}
                  </View>
                </View>
              </View>
              <View style={st.actions}>
                {isRevision && !!inv.pending_loi_document_url && (<TouchableOpacity onPress={() => viewLoi(inv.id, true)} style={[btn, isRenewal ? st.loiRenew : st.loiRev]}><Text style={[st.loiText, { color: accent }]}><AppIcon name="file" size={13} /> {isRenewal ? 'Renewed' : 'Revised'} LOI</Text></TouchableOpacity>)}{/* inline-ok: accent per kind */}
                {!isRevision && !!inv.loi_document_url && <TouchableOpacity onPress={() => viewLoi(inv.id)} style={[btn, st.loiSigned]}><Text style={st.loiSignedText}><AppIcon name="file" size={13} /> Signed LOI</Text></TouchableOpacity>}
                {inv.approval_status === 'draft' && (
                  <TouchableOpacity onPress={() => setEditDraft(inv)} style={[btn, btnDraft]}>
                    <Text style={draftBtnText}><AppIcon name="pencil" size={13} /> Edit & Submit</Text>
                  </TouchableOpacity>
                )}
                {inv.approval_status === 'approved' && can(user, 'club.investor.manage') && (
                  <TouchableOpacity onPress={() => setRevising(inv)} style={[btn, st.revise]}>
                    <Text style={st.reviseText}>↻ Revise LOI</Text>
                  </TouchableOpacity>
                )}
                {!!inv.pending_action && (
                  canApprove(inv) ? (
                    <>
                      <TouchableOpacity onPress={() => actRequest(inv, 'approve')} disabled={busy === inv.id} style={[btn, btnBad]}>{busy === inv.id && busyAct === 'approve' ? <ActivityIndicator size="small" color={COLORS.btnTextDanger} /> : <Text style={btnTBad}><AppIcon name="check" size={15} /> {approveLabel(inv)} {inv.pending_action.type === 'delete' ? 'delete' : 'undo'}</Text>}</TouchableOpacity>
                      <TouchableOpacity onPress={() => actRequest(inv, 'reject')} disabled={busy === inv.id} style={btn}>{busy === inv.id && busyAct === 'reject' ? <ActivityIndicator size="small" color={COLORS.textPrimary} /> : <Text style={st.reviseText}><AppIcon name="x" size={15} /> Reject</Text>}</TouchableOpacity>
                    </>
                  ) : <Text style={st.note}>Not an approver</Text>
                )}
                {inv.approval_status === 'pending' && (
                  canApprove(inv) ? (
                    <>
                      <TouchableOpacity onPress={() => act(inv.id, 'approve')} disabled={busy === inv.id} style={[btn, btnOk]}>{busy === inv.id && busyAct === 'approve' ? <ActivityIndicator size="small" color={COLORS.btnTextSuccess} /> : <Text style={btnTOk}><AppIcon name="check" size={15} /> {approveLabel(inv)}</Text>}</TouchableOpacity>
                      <TouchableOpacity onPress={() => act(inv.id, 'reject')} disabled={busy === inv.id} style={[btn, btnBad]}>{busy === inv.id && busyAct === 'reject' ? <ActivityIndicator size="small" color={COLORS.btnTextDanger} /> : <Text style={btnTBad}><AppIcon name="x" size={15} /> Reject</Text>}</TouchableOpacity>
                    </>
                  ) : <Text style={st.note}>Not an approver</Text>
                )}
              </View>
            </View>
          );
            })}
          </View>
        ))}
      </ScrollView>

      <AddInvestorSheet
        visible={!!editDraft}
        draft={editDraft}
        schemes={schemes}
        onClose={() => setEditDraft(null)}
        onSaved={() => { setEditDraft(null); load(); }}
      />
      {/* Revise LOI is the Add Investor form, prefilled — every field can change. */}
      <AddInvestorSheet visible={!!revising} revise={revising} schemes={schemes}
        onClose={() => setRevising(null)} onSaved={() => { setRevising(null); load(); }} />
    </SafeAreaView>
  );
}
const btn = { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 };
// Approve / Reject: tinted glass, like every other button in the app.
const btnOk  = { backgroundColor: COLORS.btnTintSuccess, borderWidth: 1, borderColor: COLORS.btnBorderSuccess };
const btnBad = { backgroundColor: COLORS.btnTintDanger, borderWidth: 1, borderColor: COLORS.btnBorderDanger };
// Stands in for the Approve/Reject buttons on a draft row, which has neither.
const draftHint = { fontSize: 11, color: COLORS.textSecondary, marginTop: 8 };
const btnDraft = { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.link };
const draftBtnText = { color: COLORS.link, fontWeight: '700', fontSize: 13 };
const btnT   = { color: COLORS.btnTextSuccess, fontWeight: '700', fontSize: 13 };
const btnTOk  = { ...btnT, color: COLORS.btnTextSuccess };
const btnTBad = { ...btnT, color: COLORS.btnTextDanger };

// The approvals list, laid out like Sales' Booking Approvals.
const st = StyleSheet.create({
  l2Head: { marginTop: 12, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, color: COLORS.textSecondary },
  l2Chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  l2Chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  l2ChipOn: { borderColor: COLORS.link, backgroundColor: COLORS.link },
  l2ChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  l2ChipTextOn: { color: '#fff' },
  l2Names: { fontSize: 11, color: COLORS.link, marginTop: 2 },
  l2Wait: { fontSize: 12, fontWeight: '700', color: COLORS.success, marginTop: 6 },
  reasonBox: { marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: COLORS.errorBg },
  reasonHead: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4, color: COLORS.error },
  reasonBody: { fontSize: 13, color: COLORS.textPrimary, marginTop: 2 },
  flex: { flex: 1 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  banner: { backgroundColor: COLORS.link, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 14 },
  bannerLabel: { color: COLORS.accentSoft, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  bannerAmt: { color: '#fff', fontSize: 21, fontWeight: '800', marginTop: 4 },
  loader: { marginTop: 24 },
  empty: { alignItems: 'center', padding: 30 },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center' },
  group: { marginBottom: 12 },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: COLORS.cardBg,
    borderRadius: 22, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1.5, borderColor: 'transparent', ...CARD_SHADOW },
  groupHeadOpen: { borderColor: COLORS.blue2 },
  groupName: { fontSize: 12, fontWeight: '800', color: COLORS.link, letterSpacing: 0.4 },
  groupCount: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  groupAmt: { fontSize: 13, fontWeight: '800', color: COLORS.accentDeep },
  card: { marginTop: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, flexShrink: 1 },
  rev: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 20, backgroundColor: COLORS.accentSoft },
  revRenew: { backgroundColor: COLORS.warningBg },
  revText: { fontSize: 10, fontWeight: '800', color: COLORS.link },
  revTextRenew: { color: COLORS.warning },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  sub2: { fontSize: 11, color: COLORS.text3, marginTop: 3 },
  decided: { fontSize: 11.5, fontWeight: '600', color: COLORS.success, marginTop: 3 },
  proposed: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3 },
  side: { alignItems: 'flex-end' },
  amt: { fontSize: 15, fontWeight: '800', color: COLORS.accentDeep },
  badge: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  loiRev: { backgroundColor: COLORS.accentSoft },
  loiRenew: { backgroundColor: COLORS.warningBg },
  loiText: { fontWeight: '700', fontSize: 13 },
  loiSigned: { backgroundColor: COLORS.linkBg },
  loiSignedText: { color: COLORS.link, fontWeight: '700', fontSize: 13 },
  revise: { backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: COLORS.blue2 },
  reviseText: { color: COLORS.link, fontWeight: '700', fontSize: 13 },
  note: { fontSize: 11, color: COLORS.textSecondary, alignSelf: 'center' },
});
