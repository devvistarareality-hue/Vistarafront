import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking, RefreshControl, Alert, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { openLoi } from '../../utils/openLoi';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { unitLabel } from '../../lib/bookingUnit';
import BookingDetails from '../../components/BookingDetails';

const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary; const BLUE = COLORS.link;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 14, ...CARD_SHADOW };
const rupee = (n) => '₹ ' + Math.round(Number(n) || 0).toLocaleString('en-IN');

// Same tabs as Bookings & Approvals, minus Drafts: this list is what you submitted,
// and a draft has not been. Values are the stored statuses — 'sold' is an approved
// booking, which is why the label and the value differ.
const TABS = [['', 'All'], ['pending', 'Pending'], ['sold', 'Approved'],
              ['rejected', 'Rejected'], ['cancelled', 'Cancelled']];

// A cancelled booking and a rejected one are both stored at status='rejected'; the
// difference is in approval_status. Filtering on status alone put a live sale that
// came off the books in the same list as one an approver refused up front.
const isCancelled = (b) => String(b.approval_status || '').toUpperCase().includes('CANCEL');
const inTab = (b, tab) => (
  !tab ? true
  : tab === 'cancelled' ? isCancelled(b)
  : tab === 'rejected' ? (b.status === 'rejected' && !isCancelled(b))
  : b.status === tab
);

// Everyone at or under `rootId` in the reporting tree. Cycle-safe on purpose: a
// manager loop in the data is a typo someone can make in User Management, and it
// should not hang the screen that surfaces it.
function subtreeIds(rootId, childrenOf) {
  const out = new Set([String(rootId)]);
  const queue = [String(rootId)];
  while (queue.length) {
    for (const kid of childrenOf[queue.shift()] || []) {
      if (out.has(kid)) continue;
      out.add(kid);
      queue.push(kid);
    }
  }
  return out;
}

// "My Bookings" list — the bookings the user submitted, grouped project → plot,
// with a Revise LOI action. Rendered inside the Booking screen under a toggle.
// Who decided this booking, and when — the Sales/CP stage, not the Accounts one. A
// deal on the books should name the person who put it there, and a cancellation
// should name whoever took a live sale off them.
function decidedBy(b) {
  if (b.cancelled_by_name) return { label: 'Cancelled by', who: b.cancelled_by_name, at: b.cancelled_at, tone: '#475569' };
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
        <Text style={{ fontSize: 11, color: '#0D9488', fontWeight: '600' }}>
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

export function MyBookingsList({ navigation, cpOnly = false }) {
  const companyId = useSelector((s) => s.adminFilter?.companyId);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState({});   // which project groups are expanded
  const toggle = (pn) => setOpen((o) => ({ ...o, [pn]: !o[pn] }));
  // Filtered here rather than server-side: the list is already everything this
  // person submitted, so narrowing it is instant and costs no round trip.
  const [tab, setTab] = useState('');
  const [q, setQ] = useState('');
  const [proj, setProj] = useState('');
  const [who, setWho] = useState('');     // 'booked by' — a user id, '' for everyone
  // Revision history, fetched per booking on demand: only a handful of deals are ever
  // revised, so loading every chain up front would be work for nothing.
  const [revs, setRevs] = useState({});      // booking id → array of versions
  const [revOpen, setRevOpen] = useState({});
  // Keyed by version id, so each version in the history opens and closes on its own —
  // the point of opening two is to read them side by side. Its own state rather than
  // one shared with the card: the current version shares the booking's id, so a
  // single map let one toggle open two blocks at once.
  const [revDetails, setRevDetails] = useState({});
  const [cardDetails, setCardDetails] = useState({});
  const toggleRevDetails = (id) => setRevDetails((o) => ({ ...o, [id]: !o[id] }));
  const me = useSelector((s) => s.auth.user);
  const [team, setTeam] = useState([]);   // the viewer's reporting subtree

  const load = useCallback(async () => {
    try {
      // cp_only tells the server this is the Channel Partner module, where My
      // Bookings also covers the CP pool. Without it the same screen in Sales shows
      // only own and team work, which is the intended difference between the two.
      const q = '?mine=1' + (cpOnly ? '&cp_only=true' : '')
        + (companyId ? `&company_id=${companyId}` : '');
      const res = await apiFetch(SALES_ENDPOINTS.bookings + q);
      if (res.ok) { const d = await res.json(); setRows(Array.isArray(d) ? d : []); }
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }, [companyId, cpOnly]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // The reporting tree, for the 'Booked by' filter. Failing quietly is right here:
  // someone with no reports gets an empty list and simply never sees the filter,
  // which is the same outcome as the request erroring.
  const loadTeam = useCallback(async () => {
    try {
      const res = await apiFetch(SALES_ENDPOINTS.myTeam + (companyId ? `?company_id=${companyId}` : ''));
      if (res.ok) { const d = await res.json(); setTeam(Array.isArray(d) ? d : []); }
    } catch (_) {}
  }, [companyId]);
  useFocusEffect(useCallback(() => { loadTeam(); }, [loadTeam]));

  async function toggleRevisions(id) {
    // Every open starts collapsed: the history is opened to scan the versions, and a
    // panel left open from last time buries the list it was opened to read.
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

  // Discarding a draft releases whatever plot(s) it still holds and deletes the row —
  // irreversible, but a draft is scratch work, not a real submission.
  function discardDraft(id) {
    Alert.alert('Discard draft?', 'This can\'t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: async () => {
        await apiFetch(SALES_ENDPOINTS.bookingDiscard(id) + (companyId ? `?company_id=${companyId}` : ''), { method: 'POST' }).catch(() => {});
        load();
      } },
    ]);
  }

  const groups = {};
  // Search behaves as it does in Bookings & Approvals, so a query that finds a
  // booking there finds it here.
  const ql = q.trim().toLowerCase();
  const qDigits = ql.replace(/\D/g, '');
  // Only treat the query as a phone/id when it is ALL digits and separators — else
  // "shop1" strips to "1" and matches every phone containing a 1.
  const numericQuery = !!qDigits && /^[\d\s+()-]+$/.test(ql);
  const matches = (b) => {
    if (!ql) return true;
    const text = [b.client_name, b.plot_numbers, b.plot_number, b.area, b.loi_document];
    if (text.some((v) => String(v || '').toLowerCase().includes(ql))) return true;
    if (!numericQuery) return false;
    if (String(b.id) === qDigits) return true;
    return qDigits.length >= 3 && String(b.phone || '').replace(/\D/g, '').includes(qDigits);
  };
  const projName = (b) => b.project_name || '—';
  // Built from every row, not the filtered ones, so picking a project never removes
  // the other options.
  const projOptions = [...new Set(rows.map(projName))].sort((a, b) => a.localeCompare(b));

  // Everything except the person filter, which is what the 'Booked by' counts are
  // taken over: the number beside a name has to be what you get when you tap it.
  // Counting over all rows instead kept the numbers still as you switched tabs, but
  // on Approved they then summed to the full 244 next to a list of 229 — a filter
  // that misreports its own result is worse than one that moves.
  const preWho = rows.filter((b) => inTab(b, tab) && matches(b)
    && (!proj || projName(b) === proj));

  // 'Booked by' — a manager's list holds their whole reporting subtree, so let them
  // narrow it to one person. Picking a manager keeps that manager's own reports in
  // view, because on an org chart the question is "what did this branch close", not
  // "what did this one desk close". 'Only me' is the exception, and says so.
  const bookedById = (b) => (b.stm == null ? '' : String(b.stm));
  const myId = me?.id == null ? '' : String(me.id);
  const childrenOf = {}, teamById = {}, nameById = {}, countsBy = {};
  team.forEach((m) => {
    teamById[String(m.id)] = m;
    const parent = m.reporting_manager_id == null ? '' : String(m.reporting_manager_id);
    (childrenOf[parent] = childrenOf[parent] || []).push(String(m.id));
  });
  preWho.forEach((b) => {
    const k = bookedById(b);
    if (!k) return;
    countsBy[k] = (countsBy[k] || 0) + 1;
  });
  // Names come from every row, not just the counted ones: someone with nothing in
  // the current tab can still be the selected person, and their chip needs a name.
  rows.forEach((b) => {
    const k = bookedById(b);
    if (k && !nameById[k]) nameById[k] = b.stm_name;
  });
  const personName = (id) => (teamById[id] && teamById[id].name) || nameById[id] || 'Unknown';
  const subtreeCount = (id) =>
    [...subtreeIds(id, childrenOf)].reduce((n, k) => n + (countsBy[k] || 0), 0);

  // Depth-first from the viewer's direct reports down, so the chips read in the order
  // the org chart does. Anyone whose branch booked nothing here is left out — a chip
  // that filters to an empty list is just a way to waste a tap — except whoever is
  // currently picked, who has to stay or the selection would vanish under them.
  const peopleOptions = [];
  const walked = new Set();
  const walk = (id, depth) => {
    if (walked.has(id) || id === myId) return;
    walked.add(id);
    if (subtreeCount(id) || id === who) {
      peopleOptions.push({ id, depth, label: personName(id), count: subtreeCount(id) });
    }
    (childrenOf[id] || []).forEach((kid) => walk(kid, depth + 1));
  };
  team.filter((m) => {
    const parent = m.reporting_manager_id == null ? '' : String(m.reporting_manager_id);
    return parent === myId || !teamById[parent];   // tops of the subtree we were given
  }).forEach((m) => walk(String(m.id), 0));
  // People who booked but sit outside the tree — in the CP module the pool carries
  // Channel-Partner deals closed by others. They belong in the filter all the same.
  const otherIds = new Set(Object.keys(countsBy).filter((k) => k !== myId && !teamById[k]));
  if (who && who !== 'cp' && who !== myId && !teamById[who]) otherIds.add(who);   // keep the picked one
  const others = [...otherIds]
    .map((k) => ({ id: k, depth: 0, label: personName(k), count: countsBy[k] || 0 }))
    .sort((a, b) => a.label.localeCompare(b.label));

  // 'Source: CP' sits in the same strip because it answers the same question — which
  // slice of this list am I looking at — even though it cuts across people rather
  // than down the tree. The flag is the server's: whether a deal is Channel-Partner-
  // sourced depends on the lead as well as the booking's own Source, and the lead
  // half never reaches the client.
  const isCp = (b) => !!b.is_cp_sourced;
  const cpCount = preWho.filter(isCp).length;
  const nonCpCount = preWho.length - cpCount;
  // Both modules: a Sales manager's list carries partner-sourced deals too, through
  // whoever on their team closed them. Shown only when the split is a real one — an
  // all-or-nothing source tells you nothing, and the zero half is a dead chip.
  const showSource = (cpCount > 0 && nonCpCount > 0) || who === 'cp' || who === 'noncp';
  // Two complete ways to slice the same list, each adding up to it on its own. They
  // are not meant to be added together — one booking has both a person and a source —
  // so the source pair sits behind a divider. Flat among the names, "Source: CP" read
  // as another person and invited 108 + 67 + 11 against a list of 119.
  const whoChips = [
    ...(countsBy[myId] || who === myId ? [{ id: myId, depth: 0, label: 'Only me', count: countsBy[myId] || 0 }] : []),
    ...peopleOptions, ...others,
    ...(showSource ? [
      { id: 'cp', depth: 0, label: 'Source: CP', count: cpCount, crossCut: true },
      { id: 'noncp', depth: 0, label: 'Every other source', count: nonCpCount },
    ] : []),
  ];

  const whoSet = !who || who === 'cp' || who === 'noncp' ? null
    : who === myId ? new Set([myId]) : subtreeIds(who, childrenOf);
  const byWho = (b) => (!who ? true
    : who === 'cp' ? isCp(b)
    : who === 'noncp' ? !isCp(b)
    : whoSet.has(bookedById(b)));

  const visible = preWho.filter(byWho);

  visible.forEach((b) => { const k = b.project_name || '—'; (groups[k] = groups[k] || []).push(b); });
  const projectNames = Object.keys(groups).sort();
  projectNames.forEach((pn) => groups[pn].sort((a, b) => String(a.plot_numbers || a.plot_number || a.area).localeCompare(String(b.plot_numbers || b.plot_number || b.area))));

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {TABS.map(([k, label]) => (
          <TouchableOpacity key={k} onPress={() => { setTab(k); setOpen({}); }}
            style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
              backgroundColor: tab === k ? BLUE : COLORS.surfaceAlt }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: tab === k ? '#fff' : MUTED }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput value={q} onChangeText={(t) => { setQ(t); setOpen({}); }}
        placeholder="Search name, phone or LOI / unit no…" placeholderTextColor={MUTED}
        style={{ height: 40, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1.5,
          borderColor: COLORS.border, backgroundColor: COLORS.white, fontSize: 13,
          color: TEXT, marginBottom: 10 }} />
      {projOptions.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {['', ...projOptions].map((p) => (
              <TouchableOpacity key={p || 'all'} onPress={() => { setProj(p); setOpen({}); }}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5,
                  borderColor: proj === p ? BLUE : COLORS.border,
                  backgroundColor: proj === p ? COLORS.linkBg : COLORS.white }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: proj === p ? BLUE : MUTED }}>{p || 'All Projects'}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}
      {whoChips.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[{ id: '', depth: 0, label: 'All People', count: preWho.length }, ...whoChips].map((p) => (
              <React.Fragment key={p.id || 'all'}>
              {p.crossCut && <View style={{ width: 1, backgroundColor: COLORS.border, marginHorizontal: 4, marginVertical: 4 }} />}
              <TouchableOpacity onPress={() => { setWho(p.id); setOpen({}); }}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5,
                  borderColor: who === p.id ? BLUE : COLORS.border,
                  backgroundColor: who === p.id ? COLORS.linkBg : COLORS.white }}>
                {/* The chips run in org-chart order; '└' marks someone nested under the
                    chip before them, since a horizontal strip cannot indent. */}
                <Text style={{ fontSize: 12, fontWeight: '700', color: who === p.id ? BLUE : MUTED }}>
                  {(p.depth ? '└ ' : '') + p.label + (p.count == null ? '' : ` (${p.count})`)}
                </Text>
              </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        </ScrollView>
      )}
      {loading ? <ActivityIndicator color={BLUE} style={{ marginTop: 30 }} /> : projectNames.length === 0 ? (
        <View style={[CARD, { alignItems: 'center', padding: 30 }]}>
          {/* "Nothing matched" is not "nothing exists" — saying someone has never
              booked a unit while a filter hides 121 of them is worse than silence. */}
          <Text style={{ color: MUTED }}>
            {rows.length ? 'No bookings match these filters.' : "You haven't booked any units yet."}
          </Text>
        </View>
      ) : projectNames.map((pn) => (
        <View key={pn} style={{ marginBottom: 12 }}>
          <TouchableOpacity onPress={() => toggle(pn)} activeOpacity={0.7}
            style={[CARD, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderWidth: 1.5, borderColor: open[pn] ? '#C7D2FE' : 'transparent' }]}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: BLUE, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              🏢 {pn} · {groups[pn].length} unit{groups[pn].length === 1 ? '' : 's'}
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: MUTED }}>{open[pn] ? '⌄' : '›'}</Text>
          </TouchableOpacity>
          {open[pn] && <View style={{ marginTop: 10 }}>
          {groups[pn].map((b) => (
            <View key={b.id} style={[CARD, { marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>{unitLabel(b).isUnit ? `Plot ${unitLabel(b).text}` : unitLabel(b).text}{b.revision_no > 0 ? `  R${b.revision_no}` : ''}</Text>
                  <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{b.client_name || '—'} · {b.phone}</Text>
                  {/* STM alongside the unit, as Bookings & Approvals shows it. Usually
                      the viewer, since this list is their own submissions — but a kiosk
                      booking records the assisting salesperson in manual_stm_name, which
                      stm_name prefers, so it is not always. */}
                  <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>
                    Booked {b.booking_date || '—'}{b.stm_name ? ` · STM: ${b.stm_name}` : ''}
                  </Text>
                  <DecidedBy b={b} />
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0D47A1' }}>{rupee(b.final_amount)}</Text>
                  {/* Approved by Sales/CP is not a finished sale — the unit is on
                      hold until Accounts signs off, so the label says so. */}
                  <Text style={{ fontSize: 10, fontWeight: '800', marginTop: 4,
                    color: b.accounts_status === 'rejected' ? COLORS.error
                      : (b.status === 'sold' && b.accounts_status === 'pending') ? COLORS.warning : MUTED }}>
                    {b.accounts_status === 'rejected' ? 'REJECTED BY ACCOUNTS'
                      : (b.status === 'sold' && b.accounts_status === 'pending') ? 'AWAITING ACCOUNTS'
                      : (b.approval_status || b.status || '').toUpperCase()}
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                {b.loi_document && <TouchableOpacity onPress={() => openLoi(b.id)} style={[btn, { backgroundColor: COLORS.linkBg }]}><Text style={{ color: BLUE, fontWeight: '700', fontSize: 13 }}>📄 LOI</Text></TouchableOpacity>}
                {b.status === 'draft' && (
                  <>
                    <TouchableOpacity onPress={() => navigation.navigate('BookingForm', { draft: b.id })} style={[btn, { backgroundColor: COLORS.link }]}><Text style={btnT}>▸ Resume</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => discardDraft(b.id)} style={[btn, { backgroundColor: COLORS.errorBg, borderWidth: 1.5, borderColor: '#FECACA' }]}><Text style={{ color: COLORS.error, fontWeight: '700', fontSize: 13 }}>✕ Discard</Text></TouchableOpacity>
                  </>
                )}
                {b.status === 'sold' && String(b.plot_numbers || '').toUpperCase().startsWith('EOI') && <TouchableOpacity onPress={() => navigation.navigate('ClosureViewer', { projectId: b.project, convertEoi: b.id })} style={[btn, { backgroundColor: '#E4571A' }]}><Text style={btnT}>→ Convert to LOI</Text></TouchableOpacity>}
                {b.status === 'sold' && String(b.plot_numbers || '').toUpperCase().startsWith('EOI') && <TouchableOpacity onPress={() => navigation.navigate('BookingForm', { revise: b.id, eoi: '1' })} style={[btn, { backgroundColor: COLORS.purple }]}><Text style={btnT}>↻ Revise EOI</Text></TouchableOpacity>}
                {b.status === 'sold' && !String(b.plot_numbers || '').toUpperCase().startsWith('EOI') && <TouchableOpacity onPress={() => navigation.navigate('BookingForm', { revise: b.id })} style={[btn, { backgroundColor: COLORS.purple }]}><Text style={btnT}>↻ Revise LOI</Text></TouchableOpacity>}
                {b.status === 'pending' && <Text style={{ fontSize: 12, color: COLORS.warning }}>Awaiting approval</Text>}
                {/* Every figure of the deal, beside its signed LOI. A revised deal gets
                    its Details per version inside the history instead — the current
                    version is one of them, so a card-level copy would be the same
                    figures twice, and the two share a booking id. */}
                {!b.revision_no ? (
                  <TouchableOpacity onPress={() => setCardDetails((o) => ({ ...o, [b.id]: !o[b.id] }))}
                    style={[btn, { backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5, borderColor: COLORS.border }]}>
                    <Text style={{ color: MUTED, fontWeight: '700', fontSize: 13 }}>
                      {cardDetails[b.id] ? '\u25B4 Hide Details' : '\u25BE Details'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {/* Only the latest version is ever listed, which is right — a deal
                    should appear once, at its current terms. But the earlier ones are
                    what was signed at the time, and there was no way to reach them
                    from the product at all. */}
                {b.revision_no > 0 && (
                  <TouchableOpacity onPress={() => toggleRevisions(b.id)}
                    style={[btn, { backgroundColor: COLORS.surfaceAlt, borderWidth: 1.5, borderColor: COLORS.border }]}>
                    <Text style={{ color: MUTED, fontWeight: '700', fontSize: 13 }}>
                      {`\u27F2 Revisions ${revOpen[b.id] ? '\u25B4' : '\u25BE'}`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {!b.revision_no && cardDetails[b.id] ? <BookingDetails b={b} accent={BLUE} /> : null}
              {revOpen[b.id] && (
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
                        {/* The version marked current is the one the card shows; the
                            rest are superseded and say so rather than looking live. */}
                        <Text style={{ fontSize: 10, fontWeight: '700', color: v.id === b.id ? COLORS.success : MUTED }}>
                          {v.id === b.id ? 'CURRENT' : 'superseded'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3 }}>
                        <Text style={{ fontSize: 11, color: MUTED, flex: 1 }}>
                          {`Booked ${v.booking_date || '—'} · ${(v.approval_status || v.status || '').toUpperCase()}`}
                          {v.stm_name ? ` · ${v.stm_name}` : ''}
                        </Text>
                        {v.loi_document
                          ? <TouchableOpacity onPress={() => openLoi(v.id)}
                              style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: COLORS.linkBg }}>
                              <Text style={{ color: BLUE, fontWeight: '700', fontSize: 12 }}>📄 LOI</Text>
                            </TouchableOpacity>
                          : <Text style={{ fontSize: 11, color: MUTED }}>no LOI on file</Text>}
                        {/* Details live here and only here. Per version, so two can
                            be open at once: what changed between R0 and R1 is the
                            question the history is opened to answer, and the figures
                            are where the answer is. */}
                        <TouchableOpacity onPress={() => toggleRevDetails(v.id)}
                          style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                            backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border, marginLeft: 6 }}>
                          <Text style={{ color: MUTED, fontWeight: '700', fontSize: 12 }}>
                            {revDetails[v.id] ? '\u25B4 Details' : '\u25BE Details'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      {revDetails[v.id] && <BookingDetails b={v} accent={BLUE} />}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
          </View>}
        </View>
      ))}
    </ScrollView>
  );
}
const btn = { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 };
const btnT = { color: '#fff', fontWeight: '700', fontSize: 13 };
