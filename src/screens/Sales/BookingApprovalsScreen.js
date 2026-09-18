import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Linking, RefreshControl, TextInput, Modal, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { openLoi } from '../../utils/openLoi';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import FilterSelect from '../../components/FilterSelect';
import { isManagerRole } from '../../lib/roles';
import { unitLabel } from '../../lib/bookingUnit';
import BookingDetails from '../../components/BookingDetails';
import ExportBookings from '../../components/ExportBookings';

import AppIcon from '../../components/AppIcon';
import AppLoader from '../../components/AppLoader';
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary; const BLUE = COLORS.link;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 22, padding: 14, ...CARD_SHADOW , borderWidth: 1, borderColor: COLORS.cardBorder };

// Cancelled sits beside Rejected rather than inside it: both are stored at
// status='rejected', but one was refused before it counted and the other was a live
// sale that came off the books and keeps its signed LOI. The server splits them.
const TABS = [['draft', 'Drafts'], ['pending', 'Pending'], ['sold', 'Approved'],
              ['rejected', 'Rejected'], ['cancelled', 'Cancelled'], ['', 'All']];
const rupee = (n) => '₹ ' + Math.round(Number(n) || 0).toLocaleString('en-IN');

// Who decided this booking, and when — the Sales/CP stage, not the Accounts one. A
// deal on the books should name the person who put it there, and a cancellation
// should name whoever took a live sale off them.
function decidedBy(b) {
  if (b.cancelled_by_name) return { label: 'Cancelled by', who: b.cancelled_by_name, at: b.cancelled_at, tone: COLORS.text2 };
  if (b.rejected_by_name)  return { label: 'Rejected by',  who: b.rejected_by_name,  at: b.rejected_at,  tone: COLORS.error };
  if (b.approved_by_name)  return { label: 'Approved by',  who: b.approved_by_name,  at: b.approved_at,  tone: COLORS.success };
  return null;
}
function decidedWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return ' · ' + d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
       + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
}
// A sale now clears two gates: the Sales/CP approver puts it on the books, then
// Accounts signs it off, and only then is the unit actually gone — until that second
// sign-off the unit sits on hold, not sold. A rep reading only "APPROVED" would think
// the deal was done, so both gates are shown, in order, on the same card.
function DecidedBy({ b }) {
  const d = decidedBy(b);
  const acc = b.accounts_status;
  // The Accounts gate only means anything once Sales/CP has approved. A rejected or
  // cancelled deal never reaches it, and a pending one has not got there yet.
  const showAccounts = b.status === 'sold' && !b.cancelled_by_name;
  if (!d && !showAccounts) return null;
  return (
    <View style={{ marginTop: 3 }}>
      {d ? (
        <Text style={{ fontSize: 11, color: d.tone, fontWeight: '600' }}>
          {`${d.label} ${d.who}${decidedWhen(d.at)}`}
        </Text>
      ) : null}
      {showAccounts && acc === 'approved' ? (
        <Text style={{ fontSize: 11, color: COLORS.success, fontWeight: '600' }}>
          {`Accounts approved${b.accounts_approved_by_name ? ` by ${b.accounts_approved_by_name}` : ''}${decidedWhen(b.accounts_approved_at)}`}
        </Text>
      ) : null}
      {showAccounts && acc === 'pending' ? (
        <Text style={{ fontSize: 11, color: COLORS.warning, fontWeight: '600' }}>
          Awaiting Accounts approval · unit held, not yet sold
        </Text>
      ) : null}
      {showAccounts && acc === 'rejected' ? (
        <Text style={{ fontSize: 11, color: COLORS.error, fontWeight: '600' }}>
          {`Accounts rejected${b.accounts_rejected_by_name ? ` by ${b.accounts_rejected_by_name}` : ''}${decidedWhen(b.accounts_rejected_at)}`}
          {b.accounts_rejected_reason ? ` · ${b.accounts_rejected_reason}` : ''}
        </Text>
      ) : null}
    </View>
  );
}

export default function BookingApprovalsScreen({ navigation, route }) {
  const me = useSelector((s) => s.auth.user);
  const companyId = useSelector((s) => s.adminFilter?.companyId);
  const cq = (sep) => (companyId ? `${sep}company_id=${companyId}` : '');
  async function toggleRevisions(id) {
    setRevDetails({});   // every open starts collapsed
    setRevOpen((o) => ({ ...o, [id]: !o[id] }));
    if (revs[id]) return;
    try {
      const res = await apiFetch(SALES_ENDPOINTS.bookingRevisions(id) + cq('?'));
      const d = res.ok ? await res.json() : [];
      setRevs((m) => ({ ...m, [id]: Array.isArray(d) ? d : [] }));
    } catch (_) {
      setRevs((m) => ({ ...m, [id]: [] }));
    }
  }
  const isApprover = me?.role === 'Admin' || isManagerRole(me) || me?.is_staff;
  const isAdmin = me?.role === 'Admin' || me?.is_staff || (me?.admin_modules || []).includes('Sales');
  // Pushed from the Admin section (see SalesCRMScreen) — request full company data.
  const adminView = !!route?.params?.adminView;
  // Channel Partner module: partner-sourced bookings only, and the CP approver
  // list rather than the regular one — the two flags the web CP page passes.
  const cpOnly = !!route?.params?.cpOnly;
  const cpMode = !!route?.params?.cpMode;
  const [tab, setTab] = useState('pending');
  // Resale cuts across every status — a resold unit can be pending, approved or
  // cancelled — so it is a filter beside the others rather than a tab of its own.
  const [resale, setResale] = useState(false);
  // Details on the card, and the revision history loaded on demand — the same record
  // My Bookings shows, because an approver deciding on a deal needs the figures in
  // front of them, not a second screen to go and find.
  const [cardDetails, setCardDetails] = useState({});
  const [revs, setRevs] = useState({});
  const [revOpen, setRevOpen] = useState({});
  const [revDetails, setRevDetails] = useState({});
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(null);
  const [managers, setManagers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [openProj, setOpenProj] = useState(null);      // approver-config accordion
  const [openGroup, setOpenGroup] = useState({});      // project name → expanded?
  const [q, setQ] = useState('');
  // Booking-date range. Presets only on mobile — a phone has no room for the web's
  // month/quarter/FY dropdowns, and these are the ranges an approver actually asks for.
  const [range, setRange] = useState({ from: '', to: '' });
  const [stm, setStm] = useState('');     // '' = every STM
  const [proj, setProj] = useState('');   // '' = every project
  const istToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const istDaysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); };
  const DATE_PRESETS = [
    ['All',        () => ({ from: '', to: '' })],
    ['Today',      () => ({ from: istToday(), to: istToday() })],
    ['7 days',     () => ({ from: istDaysAgo(6), to: istToday() })],
    ['30 days',    () => ({ from: istDaysAgo(29), to: istToday() })],
    ['This month', () => { const t = istToday(); return { from: `${t.slice(0, 7)}-01`, to: t }; }],
  ];
  const [toCancel, setToCancel] = useState(null);      // booking awaiting cancel confirmation

  const load = useCallback(async () => {
    try {
      const q = '?' + [tab ? `status=${tab}` : '', companyId ? `company_id=${companyId}` : '', adminView ? 'admin_view=1' : '', cpOnly ? 'cp_only=true' : ''].filter(Boolean).join('&');
      const res = await apiFetch(SALES_ENDPOINTS.bookings + q);
      if (res.ok) { const d = await res.json(); setRows(Array.isArray(d) ? d : []); }
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }, [tab, companyId, adminView, cpOnly]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!isAdmin) return;
    apiFetch(SALES_ENDPOINTS.distSettings + cq('?')).then(r => r.json()).then((d) => setManagers(d.managers || [])).catch(() => {});
    apiFetch(SALES_ENDPOINTS.projects + cq('?')).then(r => r.json()).then((d) => setProjects(Array.isArray(d) ? d : [])).catch(() => {});
  }, [isAdmin, companyId]);

  // Pending lead transfers for the projects this user approves — same authority as a
  // booking on that project, so they belong on the same screen.
  const [xfers, setXfers] = useState([]);
  // Lead transfers and booking approvals are two jobs: one section each,
  // opening on transfers only while some are pending.
  const [section, setSection] = useState('bookings');
  const sectionPicked = useRef(false);
  useEffect(() => { if (!sectionPicked.current && xfers.length > 0) setSection('transfers'); }, [xfers.length]);
  const pickSection = (next) => { sectionPicked.current = true; setSection(next); };
  const [xferBusy, setXferBusy] = useState(null);
  const loadTransfers = useCallback(() => {
    // cp_only in the Channel Partner module: a lead transfer is a Sales activity, so
    // without it the CP approver was shown transfers for leads that never came through
    // a partner.
    apiFetch(`${SALES_ENDPOINTS.leadTransfers}?status=pending${companyId ? `&company_id=${companyId}` : ''}${cpOnly ? '&cp_only=true' : ''}`)
      .then(r => (r.ok ? r.json() : []))
      .then(d => setXfers(Array.isArray(d) ? d : []))
      .catch(() => setXfers([]));
  }, [companyId, cpOnly]);
  useFocusEffect(useCallback(() => { loadTransfers(); }, [loadTransfers]));

  async function actOnTransfer(id, action) {
    setXferBusy(id);
    await apiFetch(SALES_ENDPOINTS.leadTransferAction(id), {
      method: 'POST', body: JSON.stringify({ action }),
    }).catch(() => {});
    setXferBusy(null);
    loadTransfers();
  }

  async function act(id, action) { setBusy(id); await apiFetch(`${SALES_ENDPOINTS.bookings}${id}/action/${cq('?')}`, { method: 'POST', body: JSON.stringify({ action }) }).catch(() => {}); setBusy(null); load(); }

  // Discarding a draft releases whatever plot(s) it still holds and deletes the row —
  // irreversible, but a draft is scratch work, not a real submission.
  async function discardDraft(id) {
    Alert.alert('Discard draft?', 'This can\'t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: async () => {
        setBusy(id);
        await apiFetch(SALES_ENDPOINTS.bookingDiscard(id) + cq('?'), { method: 'POST' }).catch(() => {});
        setBusy(null); load();
      } },
    ]);
  }

  // Cancelling an approved booking goes through its closure: that endpoint frees the
  // plot(s), purges the signed LOI from storage and marks the booking CANCELLED.
  // Irreversible, so it always runs behind the confirmation modal below.
  async function cancelBooking(b) {
    setBusy(b.id);
    try {
      const r = await apiFetch(SALES_ENDPOINTS.closureCancel(b.closure) + cq('?'), { method: 'POST' });
      if (!r.ok) { const d = await r.json().catch(() => ({})); Alert.alert('Cancel failed', String(d.detail || r.status)); }
    } catch (e) { Alert.alert('Cancel failed', e.message); }
    setToCancel(null); setBusy(null); load();
  }

  // Search across client name, phone and the LOI/unit number. Phones are stored with
  // spaces ("81408 05999") so digit queries are compared digits-only; the LOI's stored
  // filename and the booking id are matched too, since either can be quoted as "LOI no".
  const ql = q.trim().toLowerCase();
  const qDigits = ql.replace(/\D/g, '');
  // Only treat the query as a phone/id when it is ALL digits and separators — otherwise
  // "shop1" would strip to "1" and match every phone containing a 1.
  const numericQuery = !!qDigits && /^[\d\s+()-]+$/.test(ql);
  const matches = (b) => {
    if (!ql) return true;
    const text = [b.client_name, b.plot_numbers, b.plot_number, b.area, b.loi_document];
    if (text.some((v) => String(v || '').toLowerCase().includes(ql))) return true;
    if (!numericQuery) return false;
    if (String(b.id) === qDigits) return true;
    // Need a few digits before matching phones, or "1" would hit almost everything.
    return qDigits.length >= 3 && String(b.phone || '').replace(/\D/g, '').includes(qDigits);
  };
  // Booking date is a plain YYYY-MM-DD, so the range compares as strings. A booking
  // with no date can't be placed in time, so a live range excludes it rather than
  // silently counting it in every period.
  const dated = !!(range.from || range.to);
  const inRange = (b) => {
    if (!dated) return true;
    const d = String(b.booking_date || '');
    if (!d) return false;
    return (!range.from || d >= range.from) && (!range.to || d <= range.to);
  };
  // Both lists come from the whole tab, not the filtered rows, so choosing one value
  // never removes the other options from its sheet.
  const stmName = (b) => b.stm_name || '—';
  const projName = (b) => b.project_name || '—';
  const stmOptions = [...new Set(rows.map(stmName))].sort((a, b) => a.localeCompare(b));
  const projOptions = [...new Set(rows.map(projName))].sort((a, b) => a.localeCompare(b));
  const narrowed = !!ql || dated || !!stm || !!proj || resale;
  const resaleCount = rows.filter((b) => b.is_resale).length;
  const visible = rows.filter((b) => matches(b) && inRange(b)
    && (!stm || stmName(b) === stm) && (!proj || projName(b) === proj)
    && (!resale || b.is_resale));

  // Project-wise grouping (same shape as the Accounts & Finance bookings view), but
  // applied to whichever tab is selected so approvers keep their per-booking actions.
  const groups = {};
  visible.forEach((b) => { const k = b.project_name || '—'; (groups[k] = groups[k] || []).push(b); });
  const projectNames = Object.keys(groups).sort();
  projectNames.forEach((pn) => groups[pn].sort((a, b) => String(b.booking_date || '').localeCompare(String(a.booking_date || ''))));
  const projectTotal = (pn) => groups[pn].reduce((s, b) => s + (Number(b.final_amount) || 0), 0);
  const grandTotal = projectNames.reduce((s, pn) => s + projectTotal(pn), 0);
  // Short lists (a handful of pending approvals) are more useful open than collapsed —
  // only make the user click through when there's actually a lot to scroll past.
  // Rejected is archival, though: always start it collapsed however few there are.
  // While searching, always open: hits are the point of the search.
  const autoOpen = narrowed || (tab !== 'rejected' && visible.length <= 10);
  const isOpen = (pn) => (openGroup[pn] === undefined ? autoOpen : openGroup[pn]);
  const tabLabel = (TABS.find(([k]) => k === tab) || ['', 'All'])[1];

  // Which approver list this module configures: the CP module names the CP approvers,
  // Sales names the regular ones. Same panel, different field — as on the web.
  const approverField = cpMode ? 'cp_booking_approvers' : 'booking_approvers';

  async function toggleApprover(projId, mgrId) {
    let next = [];
    setProjects((ps) => ps.map((p) => {
      if (p.id !== projId) return p;
      const arr = p[approverField] || [];
      next = arr.includes(mgrId) ? arr.filter((x) => x !== mgrId) : [...arr, mgrId];
      return { ...p, [approverField]: next };
    }));
    await apiFetch(SALES_ENDPOINTS.project(projId) + cq('?'), { method: 'PATCH', body: JSON.stringify({ [approverField]: next }) }).catch(() => {});
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'transparent', borderBottomWidth: 0, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.screenTitle}>Approvals</Text>
      </View>

      <View style={s.sectionTabs}>
        <TouchableOpacity onPress={() => pickSection('transfers')} style={[s.sectionTab, section === 'transfers' && s.sectionTabOn]}>
          <Text style={[s.sectionTabText, section === 'transfers' && s.sectionTabTextOn]} numberOfLines={1}>
            {xfers.length > 0 ? `Lead Transfers · ${xfers.length}` : 'Lead Transfers'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => pickSection('bookings')} style={[s.sectionTab, section === 'bookings' && s.sectionTabOn]}>
          <Text style={[s.sectionTabText, section === 'bookings' && s.sectionTabTextOn]} numberOfLines={1}>Booking Approvals</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {section === 'transfers' && xfers.length === 0 && (
          <View style={[CARD, s.emptyCard]}><Text style={s.emptyText}>No lead transfers are waiting for your approval.</Text></View>
        )}

        {section === 'transfers' && xfers.length > 0 && (
          <View style={[CARD, { marginBottom: 12, padding: 14, borderLeftWidth: 4, borderLeftColor: COLORS.warning }]}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.warning }}>
              ⇄ Lead Transfers awaiting your approval · {xfers.length}
            </Text>
            <Text style={{ fontSize: 11.5, color: MUTED, marginTop: 2, marginBottom: 10 }}>
              The lead stays with the current STM until you approve.
            </Text>
            {xfers.map((x) => (
              <View key={x.id} style={{ borderWidth: 1, borderColor: COLORS.surfaceAlt, borderRadius: 14, padding: 10, marginBottom: 8, backgroundColor: COLORS.warningBg }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT }}>
                  {x.lead_name || 'Lead'}{x.project_name ? ` · ${x.project_name}` : ''}
                </Text>
                <Text style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>
                  {x.from_stm_name || 'Unassigned'} → {x.to_stm_name}{x.reason ? ` · ${x.reason}` : ''}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity onPress={() => actOnTransfer(x.id, 'reject')} disabled={xferBusy === x.id}
                    style={{ flex: 1, paddingVertical: 9, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.errorBg, alignItems: 'center', backgroundColor: COLORS.surface }}>
                    <Text style={{ color: COLORS.error, fontWeight: '700', fontSize: 12.5 }}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => actOnTransfer(x.id, 'approve')} disabled={xferBusy === x.id}
                    style={{ flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: 'center', backgroundColor: COLORS.btnTintSuccess , borderWidth: 1, borderColor: COLORS.btnBorderSuccess }}>
                    <Text style={{ color: COLORS.btnTextSuccess, fontWeight: '700', fontSize: 12.5 }}>{xferBusy === x.id ? '…' : 'Approve'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {section === 'bookings' && (<>
        {isAdmin && (
          <View style={[CARD, { marginBottom: 12 }]}>
            <TouchableOpacity onPress={() => setCfgOpen((o) => !o)}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: BLUE }}>{`${cpMode ? 'CP ' : ''}Booking Approvers — by project ${cfgOpen ? '▴' : '▾'}`}</Text>
            </TouchableOpacity>
            {cfgOpen && projects.map((p) => {
              const exp = openProj === p.id; const sel = p[approverField] || [];
              const names = managers.filter((m) => sel.includes(m.id)).map((m) => m.name).join(', ');
              return (
                <View key={p.id} style={{ borderTopWidth: 1, borderTopColor: COLORS.surfaceAlt, paddingVertical: 10 }}>
                  <TouchableOpacity onPress={() => setOpenProj(exp ? null : p.id)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT }}>{p.name}</Text>
                      <Text style={{ fontSize: 11, color: names ? MUTED : COLORS.textTertiary }} numberOfLines={1}>{names || 'No approvers'}</Text>
                    </View>
                    <Ionicons name={exp ? 'chevron-up' : 'chevron-down'} size={18} color={MUTED} />
                  </TouchableOpacity>
                  {exp && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                      {managers.map((m) => {
                        const on = sel.includes(m.id);
                        return (
                          <TouchableOpacity key={m.id} onPress={() => toggleApprover(p.id, m.id)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: on ? BLUE : COLORS.border, backgroundColor: on ? BLUE : COLORS.surface }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: on ? '#fff' : MUTED }}>{on ? <AppIcon name="check" size={12} /> : ''}{m.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <ExportBookings projects={projects} companyId={companyId} />

        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
          {TABS.map(([k, label]) => (
            <TouchableOpacity key={k} onPress={() => setTab(k)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: tab === k ? BLUE : COLORS.surfaceAlt }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: tab === k ? '#fff' : MUTED }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Collapse state is keyed by project, so drop it as the query changes —
            otherwise a group the user collapsed earlier would hide its own hits. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
          borderRadius: 9, paddingHorizontal: 12, marginBottom: 14 }}>
          <Ionicons name="search" size={16} color={MUTED} />
          <TextInput value={q} onChangeText={(t) => { setQ(t); setOpenGroup({}); }}
            placeholder="Search name, phone or LOI / unit no…" placeholderTextColor={COLORS.textTertiary} autoCapitalize="none"
            style={{ flex: 1, height: 42, fontSize: 13, color: TEXT, padding: 0 }} />
          {!!q && (
            <TouchableOpacity onPress={() => { setQ(''); setOpenGroup({}); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={17} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>

        {/* Booking-date range */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 14, alignItems: 'center' }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 0.6, marginRight: 2 }}>BOOKED</Text>
          {DATE_PRESETS.map(([label, make]) => {
            const r = make();
            const on = range.from === r.from && range.to === r.to;
            return (
              <TouchableOpacity key={label} onPress={() => { setRange(r); setOpenGroup({}); }}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18, borderWidth: 1.5,
                  borderColor: on ? BLUE : COLORS.border, backgroundColor: on ? COLORS.accentSofter : COLORS.surface }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: on ? BLUE : MUTED }}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Which project and whose bookings — sheets rather than chips, since there are
            a dozen STMs and the names are too long to scan in a row. */}
        {(projOptions.length > 1 || stmOptions.length > 1) && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {projOptions.length > 1 && (
              <FilterSelect label="All Projects" value={proj} onChange={(v) => { setProj(v); setOpenGroup({}); }}
                options={[{ value: '', label: 'All Projects' }, ...projOptions.map((n) => ({ value: n, label: n }))]} />
            )}
            {stmOptions.length > 1 && (
              <FilterSelect label="All STMs" value={stm} onChange={(v) => { setStm(v); setOpenGroup({}); }}
                options={[{ value: '', label: 'All STMs' }, ...stmOptions.map((n) => ({ value: n, label: n }))]} />
            )}
            {/* Only offered when this tab actually holds one — a filter that can only
                ever return nothing is a way to waste a tap. */}
            {resaleCount > 0 ? (
              <TouchableOpacity onPress={() => { setResale((v) => !v); setOpenGroup({}); }}
                style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5,
                  borderColor: resale ? COLORS.accentDeep : COLORS.border,
                  backgroundColor: resale ? COLORS.accentSoft : COLORS.surface }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: resale ? COLORS.accentDeep : MUTED }}>
                  {`Resale (${resaleCount})`}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {!loading && visible.length > 0 && (
          <View style={{ backgroundColor: BLUE, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 14 }}>
            <Text style={{ color: COLORS.accentSoft, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
              {(narrowed ? 'MATCHING ' : 'TOTAL ') + String(tabLabel).toUpperCase()} · {visible.length} BOOKING{visible.length === 1 ? '' : 'S'} · {projectNames.length} PROJECT{projectNames.length === 1 ? '' : 'S'}
            </Text>
            {(!!stm || !!proj) && <Text style={{ color: COLORS.accentSoft, fontSize: 11, marginTop: 2 }} numberOfLines={1}>{[proj, stm && `STM: ${stm}`].filter(Boolean).join(' · ')}</Text>}
            <Text style={{ color: '#fff', fontSize: 21, fontWeight: '800', marginTop: 4 }}>{rupee(grandTotal)}</Text>
          </View>
        )}

        {loading ? <AppLoader style={{ marginTop: 24 }} /> : visible.length === 0 ? (
          <View style={[CARD, { alignItems: 'center', padding: 30 }]}>
            <Text style={{ color: MUTED, textAlign: 'center' }}>{ql ? `No bookings match “${q.trim()}”.` : (stm || proj) ? `No bookings for ${[stm, proj].filter(Boolean).join(' · ')}${dated ? ' in this date range' : ''}.` : dated ? 'No bookings were booked in this date range.' : 'No bookings here.'}</Text>
          </View>
        ) : projectNames.map((pn) => (
          <View key={pn} style={{ marginBottom: 12 }}>
            <TouchableOpacity onPress={() => setOpenGroup((o) => ({ ...o, [pn]: !isOpen(pn) }))}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: COLORS.cardBg,
                borderRadius: 22, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1.5, borderColor: isOpen(pn) ? COLORS.blue2 : 'transparent', ...CARD_SHADOW }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: BLUE, letterSpacing: 0.4 }} numberOfLines={1}>
                  <AppIcon name="building" size={12} /> {String(pn).toUpperCase()}
                </Text>
                <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{groups[pn].length} booking{groups[pn].length === 1 ? '' : 's'}</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.accentDeep }}>{rupee(projectTotal(pn))}</Text>
              <Ionicons name={isOpen(pn) ? 'chevron-down' : 'chevron-forward'} size={16} color={MUTED} />
            </TouchableOpacity>

            {isOpen(pn) && groups[pn].map((b) => (
          <View key={b.id} style={[CARD, { marginTop: 10 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT }}>{b.client_name || '—'}{b.revision_no > 0 ? `  R${b.revision_no}` : ''}</Text>
                {/* Project lives in the group header now — don't repeat it on every card. */}
                <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{b.phone} · {unitLabel(b).isUnit ? `Unit ${unitLabel(b).text}` : unitLabel(b).text}</Text>
                <Text style={{ fontSize: 11, color: COLORS.text3, marginTop: 3 }}>STM: {b.stm_name || '—'} · {b.booking_date || '—'}</Text>
                {b.is_resale && b.resale_of_client ? (
                  <Text style={{ fontSize: 11, color: COLORS.accentDeep, marginTop: 3, fontWeight: '600' }}>
                    {`Resold from ${b.resale_of_client}${b.stm_name ? ` · resold by ${b.stm_name}` : ''}`}
                  </Text>
                ) : null}
                <DecidedBy b={b} />
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.accentDeep }}>{rupee(b.final_amount)}</Text>
                {/* Approved by Sales/CP is not a finished sale — the unit is on hold
                    until Accounts signs off, so the label says so. */}
                <Text style={{ fontSize: 10, fontWeight: '800', marginTop: 4,
                  color: b.accounts_status === 'rejected' ? COLORS.error
                    : (b.status === 'sold' && b.accounts_status === 'pending') ? COLORS.warning : MUTED }}>
                  {b.accounts_status === 'rejected' ? 'REJECTED BY ACCOUNTS'
                    : (b.status === 'sold' && b.accounts_status === 'pending') ? 'AWAITING ACCOUNTS'
                    : (b.approval_status || b.status || '').toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {b.loi_document && <TouchableOpacity onPress={() => openLoi(b.id)} style={[btn, { backgroundColor: COLORS.linkBg }]}><Text style={{ color: BLUE, fontWeight: '700', fontSize: 13 }}><AppIcon name="file" size={13} /> LOI</Text></TouchableOpacity>}
              {/* A revised deal gets its Details per version inside the history
                  instead — the current version is one of them, so a card-level copy
                  would be the same figures twice. */}
              {!b.revision_no ? (
                <TouchableOpacity onPress={() => setCardDetails((o) => ({ ...o, [b.id]: !o[b.id] }))}
                  style={[btn, { backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5, borderColor: COLORS.border }]}>
                  <Text style={{ color: MUTED, fontWeight: '700', fontSize: 13 }}>
                    {cardDetails[b.id] ? '\u25B4 Hide Details' : '\u25BE Details'}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {b.revision_no > 0 ? (
                <TouchableOpacity onPress={() => toggleRevisions(b.id)}
                  style={[btn, { backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5, borderColor: COLORS.border }]}>
                  <Text style={{ color: MUTED, fontWeight: '700', fontSize: 13 }}>
                    {`\u27F2 Revisions ${revOpen[b.id] ? '\u25B4' : '\u25BE'}`}
                  </Text>
                </TouchableOpacity>
              ) : null}
              {b.status === 'draft' && (
                <>
                  <TouchableOpacity onPress={() => navigation.navigate('BookingForm', { draft: b.id })} style={[btn, { backgroundColor: COLORS.link }]}><Text style={btnT}>▸ Resume</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => discardDraft(b.id)} disabled={busy === b.id} style={[btn, { backgroundColor: COLORS.errorBg, borderWidth: 1.5, borderColor: COLORS.error2 }]}><Text style={{ color: COLORS.error, fontWeight: '700', fontSize: 13 }}><AppIcon name="x" size={13} /> Discard</Text></TouchableOpacity>
                </>
              )}
              {/* The server decides per booking, not per person: a CP-sourced deal
                  routes to the project's CP approvers and everything else to its
                  regular ones, so a CP manager cannot action a walk-in they booked
                  themselves. Offering the buttons anyway made the tap fail silently. */}
              {b.status === 'pending' && isApprover && b.can_approve && (
                <>
                  <TouchableOpacity onPress={() => act(b.id, 'approve')} disabled={busy === b.id} style={[btn, { backgroundColor: COLORS.success }]}><Text style={btnT}><AppIcon name="check" size={15} /> Approve</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => act(b.id, 'reject')} disabled={busy === b.id} style={[btn, { backgroundColor: COLORS.error }]}><Text style={btnT}><AppIcon name="x" size={15} /> Reject</Text></TouchableOpacity>
                </>
              )}
              {b.status === 'sold' && (() => {
                const isEoi = String(b.plot_numbers || '').toUpperCase().startsWith('EOI');
                return (
                  <>
                    {isEoi && <TouchableOpacity onPress={() => navigation.navigate('ClosureViewer', { projectId: b.project, convertEoi: b.id })} style={[btn, { backgroundColor: COLORS.warningSolid }]}><Text style={btnT}>→ Convert to LOI</Text></TouchableOpacity>}
                    <TouchableOpacity onPress={() => navigation.navigate('BookingForm', isEoi ? { revise: b.id, eoi: '1' } : { revise: b.id })} style={[btn, { backgroundColor: COLORS.purple }]}><Text style={btnT}>↻ {isEoi ? 'Revise EOI' : 'Revise'}</Text></TouchableOpacity>
                    {/* Only an approver can cancel, and only once the booking has a
                        closure to cancel through. */}
                    {isApprover && !!b.closure && (
                      <TouchableOpacity onPress={() => setToCancel(b)} disabled={busy === b.id}
                        style={[btn, { backgroundColor: COLORS.errorBg, borderWidth: 1.5, borderColor: COLORS.error2 }]}>
                        <Text style={{ color: COLORS.error, fontWeight: '700', fontSize: 13 }}><AppIcon name="x" size={13} /> Cancel Booking</Text>
                      </TouchableOpacity>
                    )}
                  </>
                );
              })()}
            </View>
            {!b.revision_no && cardDetails[b.id] ? <BookingDetails b={b} accent={BLUE} /> : null}
            {revOpen[b.id] ? (
              <View style={{ marginTop: 12, borderTopWidth: 1.5, borderTopColor: COLORS.border, paddingTop: 10 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 0.6, marginBottom: 8 }}>
                  REVISION HISTORY
                </Text>
                {!revs[b.id] ? <Text style={{ fontSize: 12, color: MUTED }}>Loading…</Text>
                 : revs[b.id].length === 0 ? <Text style={{ fontSize: 12, color: MUTED }}>Couldn&apos;t load the history.</Text>
                 : revs[b.id].map((v) => (
                  <View key={v.id} style={{ paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: v.id === b.id ? COLORS.success : MUTED }}>
                        {`R${v.revision_no || 0}`}
                      </Text>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: TEXT }}>{rupee(v.final_amount)}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: v.id === b.id ? COLORS.success : MUTED }}>
                        {v.id === b.id ? 'CURRENT' : 'superseded'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>
                      {`Booked ${v.booking_date || '—'} · ${(v.approval_status || v.status || '').toUpperCase()}`}
                      {v.stm_name ? ` · ${v.stm_name}` : ''}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      {v.loi_document
                        ? <TouchableOpacity onPress={() => openLoi(v.id)}
                            style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: COLORS.linkBg }}>
                            <Text style={{ color: BLUE, fontWeight: '700', fontSize: 12 }}><AppIcon name="file" size={12} /> LOI</Text>
                          </TouchableOpacity>
                        : <Text style={{ fontSize: 11, color: MUTED }}>no LOI on file</Text>}
                      <TouchableOpacity onPress={() => setRevDetails((o) => ({ ...o, [v.id]: !o[v.id] }))}
                        style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                          backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border }}>
                        <Text style={{ color: MUTED, fontWeight: '700', fontSize: 12 }}>
                          {revDetails[v.id] ? '\u25B4 Details' : '\u25BE Details'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {revDetails[v.id] ? <BookingDetails b={v} accent={BLUE} /> : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>
            ))}
          </View>
        ))}
        </>)}
      </ScrollView>

      <CancelBookingModal b={toCancel} busy={!!toCancel && busy === toCancel.id}
        onClose={() => setToCancel(null)} onConfirm={() => cancelBooking(toCancel)} />
    </SafeAreaView>
  );
}

// Cancelling frees the unit and destroys the signed LOI — irreversible, so spell out
// exactly which booking is going and what it costs before letting it through.
function CancelBookingModal({ b, busy, onClose, onConfirm }) {
  const unit = b ? (unitLabel(b).isUnit ? `Unit ${unitLabel(b).text}` : unitLabel(b).text) : '';
  const doc = String(b?.plot_numbers || '').toUpperCase().startsWith('EOI') ? 'EOI' : 'LOI';
  return (
    <Modal visible={!!b} transparent animationType="fade" onRequestClose={busy ? undefined : onClose}>
      <View style={{ flex: 1, backgroundColor: `rgba(${COLORS.inkRgb},0.45)`, justifyContent: 'center', padding: 22 }}>
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 22, padding: 20 , borderWidth: 1, borderColor: COLORS.cardBorder }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.error, marginBottom: 6 }}>Cancel this booking?</Text>
          <Text style={{ fontSize: 13, color: MUTED, lineHeight: 20, marginBottom: 14 }}>
            This frees the unit back to available, permanently deletes the signed {doc} from
            storage, and removes it from conversions. This cannot be undone.
          </Text>
          <View style={{ backgroundColor: COLORS.screenBg, borderRadius: 14, padding: 12, marginBottom: 18 }}>
            {[['Client', b?.client_name || '—'], ['Project', b?.project_name || '—'], ['Unit', unit], ['Amount', rupee(b?.final_amount)]].map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 3 }}>
                <Text style={{ fontSize: 12, color: MUTED, fontWeight: '600' }}>{k}</Text>
                <Text style={{ fontSize: 13, color: TEXT, fontWeight: '700', flexShrink: 1, textAlign: 'right' }}>{v}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
            <TouchableOpacity onPress={onClose} disabled={busy}
              style={{ paddingHorizontal: 16, paddingVertical: 11, borderRadius: 9, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textPrimary }}>Keep Booking</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} disabled={busy}
              style={{ paddingHorizontal: 16, paddingVertical: 11, borderRadius: 9, backgroundColor: busy ? COLORS.error2 : COLORS.error }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>{busy ? 'Cancelling…' : 'Yes, Cancel Booking'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const btn = { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 };
const btnT = { color: '#fff', fontWeight: '700', fontSize: 13 };

const s = StyleSheet.create({
  screenTitle:      { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  sectionTabs:      { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 6 },
  sectionTab:       { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 999, alignItems: 'center',
                      backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  sectionTabOn:     { backgroundColor: COLORS.btnTint, borderColor: COLORS.btnBorder },
  sectionTabText:   { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  sectionTabTextOn: { color: COLORS.btnText },
  emptyCard:        { marginBottom: 12, paddingVertical: 26, alignItems: 'center' },
  emptyText:        { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
});
