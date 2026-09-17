import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar,
         RefreshControl, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { openLoi } from '../../utils/openLoi';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import FilterSelect from '../../components/FilterSelect';
import BookingDetails from '../../components/BookingDetails';
import { unitLabel } from '../../lib/bookingUnit';

import AppIcon from '../../components/AppIcon';
import AppLoader from '../../components/AppLoader';
const TEAL = COLORS.success;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 18, padding: 14, ...CARD_SHADOW , borderWidth: 1, borderColor: COLORS.cardBorder };
const rupee = (n) => '₹ ' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const isEoi = (b) => String(b.plot_numbers || '').toUpperCase().startsWith('EOI');

// Awaiting Sales / Awaiting CP are read-only views into the earlier stage: a booking
// still waiting on Sales/CP has not reached Accounts, so it sits in its own tab rather
// than mixed into Pending — split by is_cp_sourced, the same flag that routes which
// approver list gates it there. Approve/Reject never render for those, because
// approving requires status='sold' first.
const TABS = [['awaiting_sales', 'Awaiting Sales'], ['awaiting_cp', 'Awaiting CP'],
              ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']];

// Full ISO timestamps render as date + time in IST, matching the backend's TIME_ZONE.
function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
    + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
}

// Rejecting at the Accounts gate sends the deal back with a reason attached, so the
// remark is required rather than optional — "rejected" with no cause is a dead end for
// whoever has to act on it.
// Cancelling frees the unit and destroys the signed LOI — irreversible, so spell out
// exactly which booking is going and what it costs before letting it through. Mirrors
// the web modal, which mirrors Sales' own: same endpoint, same consequence.
function CancelBookingModal({ b, busy, onClose, onConfirm }) {
  if (!b) return null;
  const u = unitLabel(b);
  const rows = [['Client', b.client_name || '—'], ['Project', b.project_name || '—'],
                ['Unit', u.isUnit ? `Unit ${u.text}` : u.text], ['Amount', rupee(b.final_amount)]];
  return (
    <Modal visible transparent animationType="fade" onRequestClose={busy ? undefined : onClose}>
      <View style={{ flex: 1, backgroundColor: `rgba(${COLORS.inkRgb},0.45)`, justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: COLORS.surface, borderRadius: 20, padding: 20 , borderWidth: 1, borderColor: COLORS.cardBorder }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: COLORS.error, marginBottom: 6 }}>Cancel this booking?</Text>
          <Text style={{ fontSize: 13, color: MUTED, lineHeight: 20, marginBottom: 14 }}>
            {`This frees the unit back to available, permanently deletes the signed ${isEoi(b) ? 'EOI' : 'LOI'} from storage, and removes it from conversions. It will then show under Cancelled in Bookings. This cannot be undone.`}
          </Text>
          <View style={{ backgroundColor: COLORS.surfaceAlt, borderRadius: 14, padding: 12, marginBottom: 18 }}>
            {rows.map(([k, v]) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 3 }}>
                <Text style={{ fontSize: 12, color: MUTED, fontWeight: '600' }}>{k}</Text>
                <Text style={{ fontSize: 13, color: TEXT, fontWeight: '700', flexShrink: 1, textAlign: 'right' }}>{v}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
            <TouchableOpacity onPress={onClose} disabled={busy}
              style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9, borderWidth: 1.5, borderColor: COLORS.border }}>
              <Text style={{ color: MUTED, fontWeight: '700', fontSize: 13 }}>Keep Booking</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onConfirm} disabled={busy}
              style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 9, backgroundColor: busy ? COLORS.error2 : COLORS.error }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{busy ? 'Cancelling…' : 'Yes, Cancel Booking'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RejectModal({ b, busy, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  return (
    <Modal visible={!!b} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: `rgba(${COLORS.inkRgb},0.45)`, justifyContent: 'center', padding: 20 }}>
        <View style={[CARD, { padding: 20 }]}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT }}>Reject this booking?</Text>
          <Text style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
            {b ? `${b.client_name || '—'} · ${rupee(b.final_amount)}` : ''}
          </Text>
          <TextInput value={reason} onChangeText={setReason} multiline
            placeholder="Remarks (required) — why is this being rejected?"
            placeholderTextColor={MUTED}
            style={{ minHeight: 88, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14,
              padding: 12, marginTop: 14, fontSize: 13, color: TEXT, textAlignVertical: 'top' }} />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
            <TouchableOpacity onPress={onClose} style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ color: MUTED, fontWeight: '700', fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={busy || !reason.trim()}
              onPress={() => reason.trim() && onConfirm(reason.trim())}
              style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 9,
                backgroundColor: (busy || !reason.trim()) ? COLORS.error2 : COLORS.error }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>
                {busy ? 'Rejecting…' : 'Reject'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Accounts & Finance — the second approval gate. Sales/CP puts a deal on the books;
// this is where it becomes real and the unit actually turns sold.
export default function ModuleApprovalsScreen({ navigation, route }) {
  const { name = 'Accounts & Finance' } = route?.params || {};
  const companyId = useSelector((s) => s.adminFilter?.companyId);
  const cq = (sep) => (companyId ? `${sep}company_id=${companyId}` : '');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('pending');
  const [busy, setBusy] = useState(null);
  const [toReject, setToReject] = useState(null);
  const [toCancel, setToCancel] = useState(null);  // approved booking awaiting cancel confirmation
  const [q, setQ] = useState('');
  const [proj, setProj] = useState('');
  const [stm, setStm] = useState('');
  const [open, setOpen] = useState({});
  const toggle = (pn) => setOpen((o) => ({ ...o, [pn]: !o[pn] }));
  const [detailsOpen, setDetailsOpen] = useState({});

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(SALES_ENDPOINTS.bookingsAll + cq('?'));
      if (res.ok) { const d = await res.json(); setRows(Array.isArray(d) ? d : []); setErr(''); }
      else setErr('Could not load bookings.');
    } catch (_) { setErr('Could not load bookings.'); }
    setLoading(false); setRefreshing(false);
  }, [companyId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function act(id, action, reason) {
    setBusy(id);
    try {
      const res = await apiFetch(SALES_ENDPOINTS.bookingAccountsAction(id) + cq('?'), {
        method: 'POST',
        body: JSON.stringify(reason ? { action, reason } : { action }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        Alert.alert(action === 'approve' ? 'Approve failed' : 'Reject failed',
                    d.detail || 'Network error.');
      }
    } catch (_) {
      Alert.alert('Network error', 'Please try again.');
    }
    setBusy(null); setToReject(null); load();
  }

  // Cancelling an approved booking goes through its closure: that endpoint frees the
  // plot(s), purges the signed LOI from storage and marks the booking CANCELLED — the
  // same endpoint Sales' own Cancel Booking uses, reachable by an Accounts approver
  // for the booking's project (see ClosureCancelView's dual-authority gate).
  async function cancelBooking(b) {
    setBusy(b.id);
    try {
      const r = await apiFetch(SALES_ENDPOINTS.closureCancel(b.closure)
        + (companyId ? `?company_id=${companyId}` : ''), { method: 'POST' });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        Alert.alert('Cancel failed', d.detail || `HTTP ${r.status}`);
      }
    } catch (e) {
      Alert.alert('Cancel failed', e.message);
    }
    setToCancel(null); setBusy(null); load();
  }

  // A booking cancelled after Accounts approval drops out of Approved — it belongs to
  // the Cancelled view in Bookings, not here.
  const isCancelled = (b) => String(b.approval_status || '').toUpperCase() === 'CANCELLED';
  const inTab = {
    awaiting_sales: (b) => b.status === 'pending' && !b.is_cp_sourced,
    awaiting_cp:    (b) => b.status === 'pending' && b.is_cp_sourced,
    pending:  (b) => b.status === 'sold' && b.accounts_status === 'pending',
    approved: (b) => b.status === 'sold' && b.accounts_status === 'approved' && !isCancelled(b),
    rejected: (b) => b.accounts_status === 'rejected',
  }[tab];
  const tabRows = rows.filter(inTab);

  // Same search rules as the Sales approvals screen, so a query that finds a booking
  // there finds it here. Phones are stored with spaces, so digit queries compare
  // digits-only; the LOI filename and the booking id match too.
  const ql = q.trim().toLowerCase();
  const qDigits = ql.replace(/\D/g, '');
  const numericQuery = !!qDigits && /^[\d\s+()-]+$/.test(ql);
  const matches = (b) => {
    if (!ql) return true;
    const text = [b.client_name, b.plot_numbers, b.plot_number, b.area, b.loi_document];
    if (text.some((v) => String(v || '').toLowerCase().includes(ql))) return true;
    if (!numericQuery) return false;
    if (String(b.id) === qDigits) return true;
    return qDigits.length >= 3 && String(b.phone || '').replace(/\D/g, '').includes(qDigits);
  };
  const stmName = (b) => b.stm_name || '—';
  const projName = (b) => b.project_name || '—';
  const stmOptions = [...new Set(tabRows.map(stmName))].sort((a, b) => a.localeCompare(b));
  const projOptions = [...new Set(tabRows.map(projName))].sort((a, b) => a.localeCompare(b));
  const narrowed = !!ql || !!stm || !!proj;

  const groups = {};
  tabRows
    .filter((b) => matches(b) && (!stm || stmName(b) === stm) && (!proj || projName(b) === proj))
    .forEach((b) => { const k = b.project_name || '—'; (groups[k] = groups[k] || []).push(b); });
  const projectNames = Object.keys(groups).sort();
  // Rejected and Approved sort by when that Accounts action happened; the two awaiting
  // tabs have no approval timestamp at all, so they sort by when the deal was booked.
  const sortKey = (b) => tab === 'rejected' ? (b.accounts_rejected_at || '')
    : tab === 'approved' ? (b.accounts_approved_at || b.approved_at || '')
    : (tab === 'awaiting_sales' || tab === 'awaiting_cp') ? (b.created_at || '')
    : (b.approved_at || '');
  projectNames.forEach((pn) => groups[pn].sort((a, b) => sortKey(b).localeCompare(sortKey(a))));
  const grandTotal = projectNames.reduce(
    (s, pn) => s + groups[pn].reduce((t, b) => t + (Number(b.final_amount) || 0), 0), 0);
  const grandCount = projectNames.reduce((s, pn) => s + groups[pn].length, 0);
  const tabLabel = (TABS.find(([k]) => k === tab) || ['', ''])[1];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.screenBg }} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
      <View style={{ backgroundColor: COLORS.navy, paddingHorizontal: 16, paddingVertical: 14,
        flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>Approvals</Text>
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>{name}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {TABS.map(([k, label]) => (
              <TouchableOpacity key={k} onPress={() => { setTab(k); setOpen({}); setDetailsOpen({}); }}
                style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
                  backgroundColor: tab === k ? TEAL : COLORS.surfaceAlt }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: tab === k ? '#fff' : MUTED }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <TextInput value={q} onChangeText={(t) => { setQ(t); setOpen({}); }}
          placeholder="Search name, phone or LOI / unit no…" placeholderTextColor={MUTED}
          style={{ height: 40, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1.5,
            borderColor: COLORS.border, backgroundColor: COLORS.surface, fontSize: 13,
            color: TEXT, marginBottom: 10 }} />

        {(projOptions.length > 1 || stmOptions.length > 1) && (
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {projOptions.length > 1 && (
              <FilterSelect label="All Projects" value={proj} onChange={(v) => { setProj(v); setOpen({}); }}
                options={[{ value: '', label: 'All Projects' }, ...projOptions.map((n) => ({ value: n, label: n }))]} />
            )}
            {stmOptions.length > 1 && (
              <FilterSelect label="All STMs" value={stm} onChange={(v) => { setStm(v); setOpen({}); }}
                options={[{ value: '', label: 'All STMs' }, ...stmOptions.map((n) => ({ value: n, label: n }))]} />
            )}
          </View>
        )}

        {loading ? <AppLoader style={{ marginTop: 24 }} />
        : err ? <View style={[CARD, { alignItems: 'center' }]}><Text style={{ color: COLORS.error }}>{err}</Text></View>
        : projectNames.length === 0 ? (
          <View style={[CARD, { alignItems: 'center', padding: 30 }]}>
            <Text style={{ color: MUTED, textAlign: 'center' }}>
              {narrowed ? `No ${tabLabel.toLowerCase()} bookings match these filters.`
                        : `No ${tabLabel.toLowerCase()} bookings.`}
            </Text>
          </View>
        ) : <>
          <View style={{ marginBottom: 12, borderRadius: 18, padding: 16, backgroundColor: TEAL }}>
            <Text style={{ color: COLORS.success2, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {`${narrowed ? 'Matching' : 'Total'} ${tabLabel} · ${grandCount} booking${grandCount === 1 ? '' : 's'}`}
            </Text>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4 }}>{rupee(grandTotal)}</Text>
          </View>

          {projectNames.map((pn) => (
            <View key={pn} style={{ marginBottom: 12 }}>
              <TouchableOpacity onPress={() => toggle(pn)} activeOpacity={0.7}
                style={[CARD, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingVertical: 14, borderWidth: 1.5, borderColor: open[pn] ? COLORS.success2 : 'transparent' }]}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: TEAL, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  <AppIcon name="building" size={12} /> {pn} · {groups[pn].length} booking{groups[pn].length === 1 ? '' : 's'}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: MUTED }}>{open[pn] ? '⌄' : '›'}</Text>
              </TouchableOpacity>

              {open[pn] && <View style={{ marginTop: 10 }}>
                {groups[pn].map((b) => (
                  <View key={b.id} style={[CARD, { marginBottom: 10 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>
                          {unitLabel(b).isUnit ? `Plot ${unitLabel(b).text}` : unitLabel(b).text}
                          {b.revision_no > 0 ? `  R${b.revision_no}` : ''}
                          {b.is_resale ? '  RESALE' : ''}
                        </Text>
                        <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                          {b.client_name || '—'} · {b.phone}
                        </Text>
                        <Text style={{ fontSize: 11, color: COLORS.text3, marginTop: 3 }}>
                          {`STM ${b.stm_name || '—'} · Booked ${fmtDateTime(b.created_at)}`}
                        </Text>
                        {b.approved_by_name ? (
                          <Text style={{ fontSize: 11, color: COLORS.success, marginTop: 3, fontWeight: '600' }}>
                            {`Sales approved by ${b.approved_by_name}`}
                          </Text>
                        ) : null}
                        {tab === 'approved' && b.accounts_approved_at ? (
                          <Text style={{ fontSize: 11, color: TEAL, marginTop: 2, fontWeight: '600' }}>
                            {`Accounts approved ${fmtDateTime(b.accounts_approved_at)}`}
                            {b.accounts_approved_by_name ? ` · ${b.accounts_approved_by_name}` : ''}
                          </Text>
                        ) : null}
                        {tab === 'rejected' ? (
                          <Text style={{ fontSize: 11, color: COLORS.error, marginTop: 2, fontWeight: '600' }}>
                            {`Accounts rejected ${fmtDateTime(b.accounts_rejected_at)}`}
                            {b.accounts_rejected_by_name ? ` · ${b.accounts_rejected_by_name}` : ''}
                          </Text>
                        ) : null}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.accentDeep }}>{rupee(b.final_amount)}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: MUTED, marginTop: 4 }}>
                          {isEoi(b) ? 'EOI' : 'LOI'}
                        </Text>
                      </View>
                    </View>

                    {tab === 'rejected' && b.accounts_rejected_reason ? (
                      <View style={{ marginTop: 10, padding: 10, borderRadius: 8, backgroundColor: COLORS.errorBg }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: COLORS.error, letterSpacing: 0.4 }}>REASON</Text>
                        <Text style={{ fontSize: 13, color: COLORS.errorStrong, marginTop: 2 }}>{b.accounts_rejected_reason}</Text>
                      </View>
                    ) : null}

                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {b.loi_document ? (
                        <TouchableOpacity onPress={() => openLoi(b.id)}
                          style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
                            borderWidth: 1.5, borderColor: COLORS.success2, backgroundColor: COLORS.surface }}>
                          <Text style={{ color: TEAL, fontWeight: '700', fontSize: 13 }}>
                            {`View / Download ${isEoi(b) ? 'EOI' : 'LOI'}`}
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity onPress={() => setDetailsOpen((o) => ({ ...o, [b.id]: !o[b.id] }))}
                        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
                          borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface }}>
                        <Text style={{ color: COLORS.textPrimary, fontWeight: '700', fontSize: 13 }}>
                          {detailsOpen[b.id] ? '▴ Hide Details' : '▾ Details'}
                        </Text>
                      </TouchableOpacity>

                      {/* Only the Pending tab can act: a booking still awaiting Sales/CP
                          has can_accounts_approve false, so the buttons would fail. */}
                      {tab === 'pending' && b.can_accounts_approve ? (
                        <>
                          <TouchableOpacity disabled={busy === b.id} onPress={() => act(b.id, 'approve')}
                            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: TEAL }}>
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                              {busy === b.id ? 'Working…' : <><AppIcon name="check" size={13} /> Approve</>}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity disabled={busy === b.id} onPress={() => setToReject(b)}
                            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.error }}>
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}><AppIcon name="x" size={13} /> Reject</Text>
                          </TouchableOpacity>
                        </>
                      ) : null}
                      {/* Undoing an Accounts approval — same authority, same server-computed
                          gate (can_accounts_cancel), only once it has a closure to cancel
                          through (it always will if it is status='sold'). */}
                      {tab === 'approved' && b.can_accounts_cancel ? (
                        <TouchableOpacity disabled={busy === b.id} onPress={() => setToCancel(b)}
                          style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
                            borderWidth: 1.5, borderColor: COLORS.error2, backgroundColor: COLORS.errorBg }}>
                          <Text style={{ color: COLORS.error, fontWeight: '700', fontSize: 13 }}><AppIcon name="x" size={13} /> Cancel Booking</Text>
                        </TouchableOpacity>
                      ) : null}
                      {(tab === 'awaiting_sales' || tab === 'awaiting_cp') ? (
                        <Text style={{ fontSize: 12, color: COLORS.warning, alignSelf: 'center' }}>
                          {tab === 'awaiting_cp' ? 'Waiting on the CP approver' : 'Waiting on the Sales approver'}
                        </Text>
                      ) : null}
                    </View>

                    {detailsOpen[b.id] ? <BookingDetails b={b} /> : null}
                  </View>
                ))}
              </View>}
            </View>
          ))}
        </>}
      </ScrollView>

      <RejectModal b={toReject} busy={busy === (toReject && toReject.id)}
        onClose={() => setToReject(null)}
        onConfirm={(reason) => act(toReject.id, 'reject', reason)} />

      <CancelBookingModal b={toCancel} busy={busy === (toCancel && toCancel.id)}
        onClose={() => setToCancel(null)} onConfirm={() => cancelBooking(toCancel)} />
    </SafeAreaView>
  );
}
