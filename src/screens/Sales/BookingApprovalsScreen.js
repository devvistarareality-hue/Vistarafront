import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Linking, RefreshControl, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { openLoi } from '../../utils/openLoi';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary; const BLUE = COLORS.link;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 14, ...CARD_SHADOW };
const TABS = [['draft', 'Drafts'], ['pending', 'Pending'], ['sold', 'Approved'], ['rejected', 'Rejected'], ['', 'All']];
const rupee = (n) => '₹ ' + Math.round(Number(n) || 0).toLocaleString('en-IN');

export default function BookingApprovalsScreen({ navigation, route }) {
  const me = useSelector((s) => s.auth.user);
  const companyId = useSelector((s) => s.adminFilter?.companyId);
  const cq = (sep) => (companyId ? `${sep}company_id=${companyId}` : '');
  const isApprover = me?.role === 'Admin' || me?.role === 'Manager' || me?.is_staff;
  const isAdmin = me?.role === 'Admin' || me?.is_staff || (me?.admin_modules || []).includes('Sales');
  // Pushed from the Admin section (see SalesCRMScreen) — request full company data.
  const adminView = !!route?.params?.adminView;
  const [tab, setTab] = useState('pending');
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
      const q = '?' + [tab ? `status=${tab}` : '', companyId ? `company_id=${companyId}` : '', adminView ? 'admin_view=1' : ''].filter(Boolean).join('&');
      const res = await apiFetch(SALES_ENDPOINTS.bookings + q);
      if (res.ok) { const d = await res.json(); setRows(Array.isArray(d) ? d : []); }
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }, [tab, companyId, adminView]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!isAdmin) return;
    apiFetch(SALES_ENDPOINTS.distSettings + cq('?')).then(r => r.json()).then((d) => setManagers(d.managers || [])).catch(() => {});
    apiFetch(SALES_ENDPOINTS.projects + cq('?')).then(r => r.json()).then((d) => setProjects(Array.isArray(d) ? d : [])).catch(() => {});
  }, [isAdmin, companyId]);

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
  const visible = rows.filter((b) => matches(b) && inRange(b));

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
  const autoOpen = !!ql || dated || (tab !== 'rejected' && visible.length <= 10);
  const isOpen = (pn) => (openGroup[pn] === undefined ? autoOpen : openGroup[pn]);
  const tabLabel = (TABS.find(([k]) => k === tab) || ['', 'All'])[1];

  async function toggleApprover(projId, mgrId) {
    let next = [];
    setProjects((ps) => ps.map((p) => {
      if (p.id !== projId) return p;
      const arr = p.booking_approvers || [];
      next = arr.includes(mgrId) ? arr.filter((x) => x !== mgrId) : [...arr, mgrId];
      return { ...p, booking_approvers: next };
    }));
    await apiFetch(SALES_ENDPOINTS.project(projId) + cq('?'), { method: 'PATCH', body: JSON.stringify({ booking_approvers: next }) }).catch(() => {});
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.screenBg }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT }}>Bookings & Approvals</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {isAdmin && (
          <View style={[CARD, { marginBottom: 12 }]}>
            <TouchableOpacity onPress={() => setCfgOpen((o) => !o)}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: BLUE }}>⚙ Booking Approvers — by project {cfgOpen ? '▴' : '▾'}</Text>
            </TouchableOpacity>
            {cfgOpen && projects.map((p) => {
              const exp = openProj === p.id; const sel = p.booking_approvers || [];
              const names = managers.filter((m) => sel.includes(m.id)).map((m) => m.name).join(', ');
              return (
                <View key={p.id} style={{ borderTopWidth: 1, borderTopColor: COLORS.surfaceAlt, paddingVertical: 10 }}>
                  <TouchableOpacity onPress={() => setOpenProj(exp ? null : p.id)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT }}>{p.name}</Text>
                      <Text style={{ fontSize: 11, color: names ? MUTED : '#9CA3AF' }} numberOfLines={1}>{names || 'No approvers'}</Text>
                    </View>
                    <Ionicons name={exp ? 'chevron-up' : 'chevron-down'} size={18} color={MUTED} />
                  </TouchableOpacity>
                  {exp && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                      {managers.map((m) => {
                        const on = sel.includes(m.id);
                        return (
                          <TouchableOpacity key={m.id} onPress={() => toggleApprover(p.id, m.id)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: on ? BLUE : COLORS.border, backgroundColor: on ? BLUE : COLORS.white }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: on ? '#fff' : MUTED }}>{on ? '✓ ' : ''}{m.name}</Text>
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

        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
          {TABS.map(([k, label]) => (
            <TouchableOpacity key={k} onPress={() => setTab(k)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: tab === k ? BLUE : COLORS.surfaceAlt }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: tab === k ? '#fff' : MUTED }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Collapse state is keyed by project, so drop it as the query changes —
            otherwise a group the user collapsed earlier would hide its own hits. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border,
          borderRadius: 9, paddingHorizontal: 12, marginBottom: 14 }}>
          <Ionicons name="search" size={16} color={MUTED} />
          <TextInput value={q} onChangeText={(t) => { setQ(t); setOpenGroup({}); }}
            placeholder="Search name, phone or LOI / unit no…" placeholderTextColor="#9CA3AF" autoCapitalize="none"
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
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1.5,
                  borderColor: on ? BLUE : COLORS.border, backgroundColor: on ? '#EEF1FF' : COLORS.white }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: on ? BLUE : MUTED }}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {!loading && visible.length > 0 && (
          <View style={{ backgroundColor: BLUE, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 14 }}>
            <Text style={{ color: '#DBEAFE', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
              {(ql || dated ? 'MATCHING ' : 'TOTAL ') + String(tabLabel).toUpperCase()} · {visible.length} BOOKING{visible.length === 1 ? '' : 'S'} · {projectNames.length} PROJECT{projectNames.length === 1 ? '' : 'S'}
            </Text>
            <Text style={{ color: '#fff', fontSize: 21, fontWeight: '800', marginTop: 4 }}>{rupee(grandTotal)}</Text>
          </View>
        )}

        {loading ? <ActivityIndicator color={BLUE} style={{ marginTop: 30 }} /> : visible.length === 0 ? (
          <View style={[CARD, { alignItems: 'center', padding: 30 }]}>
            <Text style={{ color: MUTED, textAlign: 'center' }}>{ql ? `No bookings match “${q.trim()}”.` : dated ? 'No bookings were booked in this date range.' : 'No bookings here.'}</Text>
          </View>
        ) : projectNames.map((pn) => (
          <View key={pn} style={{ marginBottom: 12 }}>
            <TouchableOpacity onPress={() => setOpenGroup((o) => ({ ...o, [pn]: !isOpen(pn) }))}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, backgroundColor: COLORS.cardBg,
                borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1.5, borderColor: isOpen(pn) ? '#C7D2FE' : 'transparent', ...CARD_SHADOW }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: BLUE, letterSpacing: 0.4 }} numberOfLines={1}>
                  🏢 {String(pn).toUpperCase()}
                </Text>
                <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{groups[pn].length} booking{groups[pn].length === 1 ? '' : 's'}</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0D47A1' }}>{rupee(projectTotal(pn))}</Text>
              <Ionicons name={isOpen(pn) ? 'chevron-down' : 'chevron-forward'} size={16} color={MUTED} />
            </TouchableOpacity>

            {isOpen(pn) && groups[pn].map((b) => (
          <View key={b.id} style={[CARD, { marginTop: 10 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT }}>{b.client_name || '—'}{b.revision_no > 0 ? `  R${b.revision_no}` : ''}</Text>
                {/* Project lives in the group header now — don't repeat it on every card. */}
                <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{b.phone} · Unit {b.plot_numbers || b.plot_number || b.area}</Text>
                <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>STM: {b.stm_name || '—'} · {b.booking_date || '—'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0D47A1' }}>{rupee(b.final_amount)}</Text>
                <Text style={{ fontSize: 10, fontWeight: '800', color: MUTED, marginTop: 4 }}>{(b.approval_status || b.status || '').toUpperCase()}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {b.loi_document && <TouchableOpacity onPress={() => openLoi(b.id)} style={[btn, { backgroundColor: COLORS.linkBg }]}><Text style={{ color: BLUE, fontWeight: '700', fontSize: 13 }}>📄 LOI</Text></TouchableOpacity>}
              {b.status === 'draft' && (
                <>
                  <TouchableOpacity onPress={() => navigation.navigate('BookingForm', { draft: b.id })} style={[btn, { backgroundColor: COLORS.link }]}><Text style={btnT}>▸ Resume</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => discardDraft(b.id)} disabled={busy === b.id} style={[btn, { backgroundColor: COLORS.errorBg, borderWidth: 1.5, borderColor: '#FECACA' }]}><Text style={{ color: COLORS.error, fontWeight: '700', fontSize: 13 }}>✕ Discard</Text></TouchableOpacity>
                </>
              )}
              {b.status === 'pending' && isApprover && (
                <>
                  <TouchableOpacity onPress={() => act(b.id, 'approve')} disabled={busy === b.id} style={[btn, { backgroundColor: COLORS.success }]}><Text style={btnT}>✓ Approve</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => act(b.id, 'reject')} disabled={busy === b.id} style={[btn, { backgroundColor: COLORS.error }]}><Text style={btnT}>✕ Reject</Text></TouchableOpacity>
                </>
              )}
              {b.status === 'sold' && (() => {
                const isEoi = String(b.plot_numbers || '').toUpperCase().startsWith('EOI');
                return (
                  <>
                    {isEoi && <TouchableOpacity onPress={() => navigation.navigate('ClosureViewer', { projectId: b.project, convertEoi: b.id })} style={[btn, { backgroundColor: '#E4571A' }]}><Text style={btnT}>→ Convert to LOI</Text></TouchableOpacity>}
                    <TouchableOpacity onPress={() => navigation.navigate('BookingForm', isEoi ? { revise: b.id, eoi: '1' } : { revise: b.id })} style={[btn, { backgroundColor: COLORS.purple }]}><Text style={btnT}>↻ {isEoi ? 'Revise EOI' : 'Revise'}</Text></TouchableOpacity>
                    {/* Only an approver can cancel, and only once the booking has a
                        closure to cancel through. */}
                    {isApprover && !!b.closure && (
                      <TouchableOpacity onPress={() => setToCancel(b)} disabled={busy === b.id}
                        style={[btn, { backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: '#FECACA' }]}>
                        <Text style={{ color: COLORS.error, fontWeight: '700', fontSize: 13 }}>✕ Cancel Booking</Text>
                      </TouchableOpacity>
                    )}
                  </>
                );
              })()}
            </View>
          </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <CancelBookingModal b={toCancel} busy={!!toCancel && busy === toCancel.id}
        onClose={() => setToCancel(null)} onConfirm={() => cancelBooking(toCancel)} />
    </SafeAreaView>
  );
}

// Cancelling frees the unit and destroys the signed LOI — irreversible, so spell out
// exactly which booking is going and what it costs before letting it through.
function CancelBookingModal({ b, busy, onClose, onConfirm }) {
  const unit = b ? (b.plot_numbers || b.plot_number || b.area || '—') : '';
  const doc = String(b?.plot_numbers || '').toUpperCase().startsWith('EOI') ? 'EOI' : 'LOI';
  return (
    <Modal visible={!!b} transparent animationType="fade" onRequestClose={busy ? undefined : onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 22 }}>
        <View style={{ backgroundColor: COLORS.white, borderRadius: 16, padding: 20 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.error, marginBottom: 6 }}>Cancel this booking?</Text>
          <Text style={{ fontSize: 13, color: MUTED, lineHeight: 20, marginBottom: 14 }}>
            This frees the unit back to available, permanently deletes the signed {doc} from
            storage, and removes it from conversions. This cannot be undone.
          </Text>
          <View style={{ backgroundColor: COLORS.screenBg, borderRadius: 10, padding: 12, marginBottom: 18 }}>
            {[['Client', b?.client_name || '—'], ['Project', b?.project_name || '—'], ['Unit', unit], ['Amount', rupee(b?.final_amount)]].map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 3 }}>
                <Text style={{ fontSize: 12, color: MUTED, fontWeight: '600' }}>{k}</Text>
                <Text style={{ fontSize: 13, color: TEXT, fontWeight: '700', flexShrink: 1, textAlign: 'right' }}>{v}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
            <TouchableOpacity onPress={onClose} disabled={busy}
              style={{ paddingHorizontal: 16, paddingVertical: 11, borderRadius: 9, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#334155' }}>Keep Booking</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} disabled={busy}
              style={{ paddingHorizontal: 16, paddingVertical: 11, borderRadius: 9, backgroundColor: busy ? '#F3B4B4' : COLORS.error }}>
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
