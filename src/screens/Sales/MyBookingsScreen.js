import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking, RefreshControl, Alert, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { openLoi } from '../../utils/openLoi';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { unitLabel } from '../../lib/bookingUnit';

const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary; const BLUE = COLORS.link;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 14, ...CARD_SHADOW };
const rupee = (n) => '₹ ' + Math.round(Number(n) || 0).toLocaleString('en-IN');

// Same tabs as Bookings & Approvals, minus Drafts: this list is what you submitted,
// and a draft has not been. Values are the stored statuses — 'sold' is an approved
// booking, which is why the label and the value differ.
const TABS = [['', 'All'], ['pending', 'Pending'], ['sold', 'Approved'], ['rejected', 'Rejected']];

// "My Bookings" list — the bookings the user submitted, grouped project → plot,
// with a Revise LOI action. Rendered inside the Booking screen under a toggle.
export function MyBookingsList({ navigation }) {
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

  const load = useCallback(async () => {
    try {
      const q = '?mine=1' + (companyId ? `&company_id=${companyId}` : '');
      const res = await apiFetch(SALES_ENDPOINTS.bookings + q);
      if (res.ok) { const d = await res.json(); setRows(Array.isArray(d) ? d : []); }
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }, [companyId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

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
  const visible = rows.filter((b) => (!tab || b.status === tab) && matches(b)
    && (!proj || projName(b) === proj));

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
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#0D47A1' }}>{rupee(b.final_amount)}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: MUTED, marginTop: 4 }}>{(b.approval_status || b.status || '').toUpperCase()}</Text>
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
              </View>
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
