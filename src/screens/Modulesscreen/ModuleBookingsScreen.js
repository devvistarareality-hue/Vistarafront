import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { openLoi } from '../../utils/openLoi';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import FilterSelect from '../../components/FilterSelect';
import { unitLabel } from '../../lib/bookingUnit';
import BookingDetails from '../../components/BookingDetails';

import AppIcon from '../../components/AppIcon';
import AppLoader from '../../components/AppLoader';
const NAVY = COLORS.navy; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const TEAL = COLORS.success;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 18, padding: 14, ...CARD_SHADOW , borderWidth: 1, borderColor: COLORS.cardBorder };
const rupee = (n) => '₹ ' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const isEoi = (b) => String(b.plot_numbers || '').toUpperCase().startsWith('EOI');
// Due dates are stored yyyy-mm-dd; show them as dd-mm-yyyy. This moved out with
// BookingDetails when that block was shared, but the card here still calls it.
const fmtDate = (d) => {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(d || ''));
  return m ? `${m[3].padStart(2, '0')}-${m[2].padStart(2, '0')}-${m[1]}` : (d || '—');
};
// Accounts & Finance — read-only view of every sales booking (LOI + EOI), grouped by
// project. Review details + open the signed document; no editing.
export default function ModuleBookingsScreen({ navigation, route }) {
  const { name = 'Accounts & Finance' } = route?.params || {};
  const companyId = useSelector((s) => s.adminFilter?.companyId);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState('');
  const [open, setOpen] = useState({});
  const toggle = (pn) => setOpen((o) => ({ ...o, [pn]: !o[pn] }));
  const [tab, setTab] = useState('approved');   // 'approved' | 'cancelled'
  const [detailsOpen, setDetailsOpen] = useState({});
  // Same three filters as the Sales approvals screen: booking date, project, STM.
  const [range, setRange] = useState({ from: '', to: '' });
  const [proj, setProj] = useState('');   // '' = every project
  const [stm, setStm] = useState('');     // '' = every STM
  const istToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const istDaysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); };
  const DATE_PRESETS = [
    ['All',        () => ({ from: '', to: '' })],
    ['Today',      () => ({ from: istToday(), to: istToday() })],
    ['7 days',     () => ({ from: istDaysAgo(6), to: istToday() })],
    ['30 days',    () => ({ from: istDaysAgo(29), to: istToday() })],
    ['This month', () => { const t = istToday(); return { from: `${t.slice(0, 7)}-01`, to: t }; }],
  ];
  const toggleDetails = (id) => setDetailsOpen((o) => ({ ...o, [id]: !o[id] }));
  // Revision history, fetched per booking on demand: only a handful of deals are ever
  // revised, so loading every chain up front would be work for nothing.
  const [revs, setRevs] = useState({});      // booking id → array of versions
  const [revOpen, setRevOpen] = useState({});
  // Details inside the history get their own key space, separate from the card's: the
  // current version shares the booking's id, so one shared map let a single toggle
  // open two blocks at once. Cleared on every open so the history starts collapsed —
  // it is opened to scan the versions, and a panel left open buries that list.
  const [revDetails, setRevDetails] = useState({});
  const toggleRevDetails = (id) => setRevDetails((o) => ({ ...o, [id]: !o[id] }));
  async function toggleRevisions(id) {
    setRevDetails({});
    setRevOpen((o) => ({ ...o, [id]: !o[id] }));
    if (revs[id]) return;                      // already loaded, just reopening
    try {
      const res = await apiFetch(SALES_ENDPOINTS.bookingRevisions(id)
        + (companyId ? `?company_id=${companyId}` : ''));
      const d = res.ok ? await res.json() : [];
      setRevs((m) => ({ ...m, [id]: Array.isArray(d) ? d : [] }));
    } catch (_) {
      setRevs((m) => ({ ...m, [id]: [] }));
    }
  }

  const load = useCallback(async () => {
    setErr('');
    try {
      const res = await apiFetch(SALES_ENDPOINTS.bookingsAll + (companyId ? `?company_id=${companyId}` : ''));
      if (res.ok) { const d = await res.json(); setRows(Array.isArray(d) ? d : []); }
      else setErr(res.status === 403 ? 'You do not have access to bookings.' : 'Could not load bookings.');
    } catch (_) { setErr('Could not load bookings.'); }
    setLoading(false); setRefreshing(false);
  }, [companyId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Accounts view shows ONLY bookings approved by an approver — pending / revision-pending,
  // rejected and cancelled are all excluded (money is only real once approved).
  const isApproved = (b) => {
    const a = String(b.approval_status || '').toUpperCase();
    if (a.includes('REJECT') || a.includes('CANCEL') || a.includes('PENDING')) return false;
    return a.includes('APPROVED') || b.status === 'sold';
  };
  // A cancelled booking keeps its signed LOI, and Accounts reconciles against it —
  // a deal that was on the books and came off has to be explainable, not a gap. Kept
  // on its own tab so it can never be mistaken for revenue.
  const isCancelled = (b) => String(b.approval_status || '').toUpperCase().includes('CANCEL');
  const approvedRows  = rows.filter(isApproved);
  const cancelledRows = rows.filter(isCancelled);
  const approved = tab === 'cancelled' ? cancelledRows : approvedRows;

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
  // Both option lists come from every approved booking, not the filtered set, so
  // choosing one value never removes the other options from its sheet.
  const stmName = (b) => b.stm_name || '—';
  const projName = (b) => b.project_name || '—';
  const stmOptions = [...new Set(approved.map(stmName))].sort((a, b) => a.localeCompare(b));
  const projOptions = [...new Set(approved.map(projName))].sort((a, b) => a.localeCompare(b));
  const narrowed = dated || !!stm || !!proj;

  const groups = {};
  approved
    .filter((b) => inRange(b) && (!stm || stmName(b) === stm) && (!proj || projName(b) === proj))
    .forEach((b) => { const k = b.project_name || '—'; (groups[k] = groups[k] || []).push(b); });
  const projectNames = Object.keys(groups).sort();
  projectNames.forEach((pn) => groups[pn].sort((a, b) => String(b.booking_date || '').localeCompare(String(a.booking_date || ''))));
  // Project-wise total booking value (sum of approved final_amount) + grand total.
  const projectTotal = (pn) => groups[pn].reduce((s, b) => s + (Number(b.final_amount) || 0), 0);
  const grandTotal = projectNames.reduce((s, pn) => s + projectTotal(pn), 0);
  const grandCount = projectNames.reduce((s, pn) => s + groups[pn].length, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>Bookings</Text>
          <Text style={{ fontSize: 13, color: MUTED }}>Approved bookings only · view only</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {loading ? <AppLoader style={{ marginTop: 24 }} />
        : err ? <View style={[CARD, { alignItems: 'center' }]}><Text style={{ color: COLORS.error }}>{err}</Text></View>
        : <>
          {(approvedRows.length > 0 || cancelledRows.length > 0) && (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {[['approved', 'Approved', approvedRows.length], ['cancelled', 'Cancelled', cancelledRows.length]].map(([k, label, n]) => (
                <TouchableOpacity key={k} onPress={() => { setTab(k); setDetailsOpen({}); }}
                  style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
                    backgroundColor: tab === k ? TEAL : COLORS.surfaceAlt }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: tab === k ? '#fff' : MUTED }}>
                    {`${label} (${n})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {approved.length > 0 && (
            <>
              {/* Booking-date range */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginBottom: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 0.6, marginRight: 2 }}>BOOKED</Text>
                {DATE_PRESETS.map(([label, make]) => {
                  const r = make();
                  const on = range.from === r.from && range.to === r.to;
                  return (
                    <TouchableOpacity key={label} onPress={() => { setRange(r); setOpen({}); }}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18, borderWidth: 1.5,
                        borderColor: on ? TEAL : COLORS.border, backgroundColor: on ? COLORS.success2 : COLORS.surface }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: on ? TEAL : MUTED }}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {(projOptions.length > 1 || stmOptions.length > 1) && (
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
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
            </>
          )}
          {projectNames.length === 0 ? (
          <View style={[CARD, { alignItems: 'center', padding: 28 }]}>
            <Text style={{ color: MUTED, textAlign: 'center' }}>{narrowed ? `No ${tab} bookings match these filters.` : (tab === 'cancelled' ? 'No cancelled bookings.' : 'No bookings yet.')}</Text>
          </View>
        ) : <>
          <View style={{ marginBottom: 12, borderRadius: 18, padding: 16, backgroundColor: tab === 'cancelled' ? COLORS.strong2 : TEAL }}>
            <Text style={{ color: tab === 'cancelled' ? COLORS.border : COLORS.success2, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {`${narrowed ? 'Matching' : 'Total'} ${tab === 'cancelled' ? 'Cancelled' : 'Approved'} · ${grandCount} booking${grandCount === 1 ? '' : 's'} · ${projectNames.length} project${projectNames.length === 1 ? '' : 's'}`}
            </Text>
            {(!!proj || !!stm) && <Text style={{ color: COLORS.success2, fontSize: 11, marginTop: 2 }} numberOfLines={1}>{[proj, stm && `STM: ${stm}`].filter(Boolean).join(' · ')}</Text>}
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4 }}>{rupee(grandTotal)}</Text>
          </View>
          {projectNames.map((pn) => (
          <View key={pn} style={{ marginBottom: 12 }}>
            <TouchableOpacity onPress={() => toggle(pn)} activeOpacity={0.7}
              style={[CARD, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: open[pn] ? COLORS.success2 : 'transparent' }]}>
              <Text style={{ flex: 1, fontSize: 12, fontWeight: '800', color: TEAL, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                <AppIcon name="building" size={12} /> {pn} · {groups[pn].length} booking{groups[pn].length === 1 ? '' : 's'}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.accentDeep, marginRight: 10 }}>{rupee(projectTotal(pn))}</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: MUTED }}>{open[pn] ? '⌄' : '›'}</Text>
            </TouchableOpacity>
            {open[pn] && <View style={{ marginTop: 10 }}>
              {groups[pn].map((b) => (
                <View key={b.id} style={[CARD, { marginBottom: 10 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>
                        {isEoi(b) ? <Text style={{ color: COLORS.warningAlt }}>{b.plot_numbers}</Text> : (unitLabel(b).isUnit ? `Plot ${unitLabel(b).text}` : unitLabel(b).text)}
                        <Text style={{ color: MUTED, fontWeight: '600' }}>  {b.client_name || '—'}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: TEAL }}>  {isEoi(b) ? 'EOI' : 'LOI'}</Text>
                        {b.revision_no > 0 ? <Text style={{ fontSize: 10, color: COLORS.warning }}>  R{b.revision_no}</Text> : null}
                      </Text>
                      <Text style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{b.phone} · Booked {fmtDate(b.booking_date)} · STM {b.stm_name || '—'}</Text>
                      {/* The Sales/CP decision — who put the deal on the books, or
                          took it off them. The Accounts stage has its own line. */}
                      {b.cancelled_by_name ? (
                        <Text style={{ fontSize: 11, color: COLORS.text2, marginTop: 2, fontWeight: '600' }}>
                          {`Cancelled by ${b.cancelled_by_name}`}
                        </Text>
                      ) : b.rejected_by_name ? (
                        <Text style={{ fontSize: 11, color: COLORS.error, marginTop: 2, fontWeight: '600' }}>
                          {`Rejected by ${b.rejected_by_name}`}
                        </Text>
                      ) : b.approved_by_name ? (
                        <Text style={{ fontSize: 11, color: COLORS.success, marginTop: 2, fontWeight: '600' }}>
                          {`Approved by ${b.approved_by_name}`}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.accentDeep }}>{rupee(b.final_amount)}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: MUTED, marginTop: 4 }}>{(b.approval_status || b.status || '').toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    {/* A revised deal gets its Details per version inside the history
                        instead — the current version is one of them, so a card-level
                        copy is the same figures twice. It also shares an id with that
                        row, which rendered the block twice at once. */}
                    {!b.revision_no ? (
                      <TouchableOpacity onPress={() => toggleDetails(b.id)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.borderStrong, backgroundColor: COLORS.surface }}>
                        <Text style={{ color: COLORS.textPrimary, fontWeight: '700', fontSize: 12 }}>{detailsOpen[b.id] ? '▲ Hide Details' : '▾ Details'}</Text>
                      </TouchableOpacity>
                    ) : null}
                    {b.loi_document ? (
                      <TouchableOpacity onPress={() => openLoi(b.id)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.success2, backgroundColor: COLORS.surface }}>
                        <Text style={{ color: TEAL, fontWeight: '700', fontSize: 12 }}><AppIcon name="file" size={12} /> View / Download {isEoi(b) ? 'EOI' : 'LOI'}</Text>
                      </TouchableOpacity>
                    ) : null}
                    {/* Only the latest version is listed here, at its current terms.
                        The earlier ones are what was signed at the time — which for a
                        team reconciling payments against documents is the whole
                        question when a deal carries an R1. */}
                    {b.revision_no > 0 ? (
                      <TouchableOpacity onPress={() => toggleRevisions(b.id)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.borderStrong, backgroundColor: COLORS.surface }}>
                        <Text style={{ color: COLORS.textPrimary, fontWeight: '700', fontSize: 12 }}>
                          {`\u27F2 Revisions ${revOpen[b.id] ? '\u25B2' : '\u25BE'}`}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  {!b.revision_no && detailsOpen[b.id] ? <BookingDetails b={b} /> : null}
                  {revOpen[b.id] ? (
                    <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.borderStrong, paddingTop: 10 }}>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: TEAL, letterSpacing: 0.6, marginBottom: 8 }}>
                        REVISION HISTORY
                      </Text>
                      {!revs[b.id] ? <Text style={{ fontSize: 12, color: MUTED }}>Loading…</Text>
                       : revs[b.id].length === 0 ? <Text style={{ fontSize: 12, color: MUTED }}>Couldn&apos;t load the history.</Text>
                       : revs[b.id].map((v) => (
                        <View key={v.id} style={{ paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.surface2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: v.id === b.id ? TEAL : MUTED }}>
                              {`R${v.revision_no || 0}`}
                            </Text>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: TEXT }}>{rupee(v.final_amount)}</Text>
                            {/* The version marked current is the one the card shows; the
                                rest are superseded and say so rather than looking live. */}
                            <Text style={{ fontSize: 10, fontWeight: '700', color: v.id === b.id ? TEAL : MUTED }}>
                              {v.id === b.id ? 'CURRENT' : 'superseded'}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>
                            {`Booked ${v.booking_date || '—'} · ${(v.approval_status || v.status || '').toUpperCase()}`}
                            {v.stm_name ? ` · ${v.stm_name}` : ''}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                            {v.loi_document ? (
                              <TouchableOpacity onPress={() => openLoi(v.id)} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.success2, backgroundColor: COLORS.surface }}>
                                <Text style={{ color: TEAL, fontWeight: '700', fontSize: 12 }}>{`View / Download ${isEoi(v) ? 'EOI' : 'LOI'}`}</Text>
                              </TouchableOpacity>
                            ) : <Text style={{ fontSize: 11, color: MUTED }}>no document on file</Text>}
                            <TouchableOpacity onPress={() => toggleRevDetails(v.id)} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.borderStrong, backgroundColor: COLORS.surface }}>
                              <Text style={{ color: COLORS.textPrimary, fontWeight: '700', fontSize: 12 }}>
                                {revDetails[v.id] ? '\u25B2 Details' : '\u25BE Details'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                          {revDetails[v.id] ? <BookingDetails b={v} /> : null}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>}
          </View>
        ))}
        </>}
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}
