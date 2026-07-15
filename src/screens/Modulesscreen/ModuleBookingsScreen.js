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

const NAVY = COLORS.navy; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const TEAL = '#0D9488';
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 14, ...CARD_SHADOW };
const rupee = (n) => '₹ ' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const isEoi = (b) => String(b.plot_numbers || '').toUpperCase().startsWith('EOI');
const money0 = (n) => (n === '' || n == null) ? '—' : '₹ ' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const val = (v) => (v === '' || v == null) ? '—' : String(v);

// One label:value row inside the Details panel.
const DRow = ({ l, v }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}>
    <Text style={{ fontSize: 11, color: '#8492A6', fontWeight: '600', flexShrink: 1 }}>{l}</Text>
    <Text style={{ fontSize: 12, color: '#1A1A2E', fontWeight: '700', textAlign: 'right' }}>{v}</Text>
  </View>
);
function BookingDetails({ b }) {
  const insts = Array.isArray(b.installments) ? b.installments : [];
  const Head = ({ t }) => <Text style={{ fontSize: 10, fontWeight: '800', color: TEAL, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 10, marginBottom: 4 }}>{t}</Text>;
  return (
    <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#CBD5E1', borderStyle: 'dashed' }}>
      <Head t="Client & Property" />
      <DRow l="Client" v={val(b.client_name)} />
      <DRow l="Phone" v={val(b.phone)} />
      <DRow l="Gender" v={val(b.gender)} />
      <DRow l="Address" v={val(b.address)} />
      <DRow l="Source" v={val(b.source)} />
      {b.cp_name ? <DRow l="Reference / CP" v={val(b.cp_name)} /> : null}
      <DRow l="Unit" v={val(b.plot_numbers || b.plot_number)} />
      <DRow l="Type" v={val(b.villa_type || b.bunglow_type)} />
      <DRow l="STM" v={val(b.stm_name)} />
      <DRow l="Booking Date" v={val(b.booking_date)} />
      <DRow l="Pricing" v={String(b.formula_set || '').toUpperCase() || '—'} />
      <DRow l="Plot Area" v={`${val(b.area)} ${b.area_unit || ''}`.trim()} />
      <DRow l="Construction Area" v={val(b.const_area)} />
      <Head t="Rates & Amounts" />
      <DRow l="Land Rate" v={money0(b.land_rate)} />
      <DRow l="Development Rate" v={money0(b.dev_rate)} />
      <DRow l="Construction Rate" v={money0(b.const_rate)} />
      {Number(b.sale_deed_rate) ? <DRow l="Sale Deed Rate" v={money0(b.sale_deed_rate)} /> : null}
      <DRow l="Sale Deed %" v={b.sale_deed_pct != null ? b.sale_deed_pct + '%' : '—'} />
      {Number(b.land_sale_deed) ? <DRow l="Land Sale Deed" v={money0(b.land_sale_deed)} /> : null}
      {Number(b.const_agreement) ? <DRow l="Construction Agreement" v={money0(b.const_agreement)} /> : null}
      {Number(b.premium_location) ? <DRow l="Premium Location" v={money0(b.premium_location)} /> : null}
      <DRow l="Plot Basic" v={money0(b.plot_basic)} />
      <DRow l="Plot Development" v={money0(b.plot_dev)} />
      <DRow l="Construction Amount" v={money0(b.const_amt)} />
      <DRow l="Unit Price" v={money0(b.sale_deed)} />
      <DRow l="Stamp Duty" v={money0(b.stamp_duty)} />
      <DRow l="Registration" v={money0(b.reg_fees)} />
      <DRow l="GST" v={money0(b.gst)} />
      <DRow l="Maintenance Deposit" v={money0(b.maint_deposit || b.maintenance)} />
      {Number(b.maint_advance) ? <DRow l="Maintenance Advance" v={money0(b.maint_advance)} /> : null}
      <DRow l="Legal Charges" v={money0(b.legal_charges)} />
      <DRow l="Total Legal & Other" v={money0(b.total_extra)} />
      {Number(b.discount) ? <DRow l="Discount" v={money0(b.discount)} /> : null}
      {Number(b.extra_work_amount) ? <DRow l="Extra Work" v={money0(b.extra_work_amount)} /> : null}
      <DRow l="Final Amount" v={money0(b.final_amount)} />
      {insts.length > 0 && <Head t="Payment Schedule" />}
      {insts.map((i, idx) => (
        <DRow key={idx} l={`${i.no || idx + 1}. ${i.date || '—'}  ${i.pct != null ? i.pct + '%' : ''}  ${i.isNsd ? '(Extra Work)' : i.isExtra ? '(Legal & Other)' : ''}`.trim()} v={money0(i.amt)} />
      ))}
    </View>
  );
}

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
  const [detailsOpen, setDetailsOpen] = useState({});
  const toggleDetails = (id) => setDetailsOpen((o) => ({ ...o, [id]: !o[id] }));

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

  const groups = {};
  rows.forEach((b) => { const k = b.project_name || '—'; (groups[k] = groups[k] || []).push(b); });
  const projectNames = Object.keys(groups).sort();
  projectNames.forEach((pn) => groups[pn].sort((a, b) => String(b.booking_date || '').localeCompare(String(a.booking_date || ''))));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>Bookings</Text>
          <Text style={{ fontSize: 13, color: MUTED }}>All sales bookings · view only</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {loading ? <ActivityIndicator color={TEAL} style={{ marginTop: 30 }} />
        : err ? <View style={[CARD, { alignItems: 'center' }]}><Text style={{ color: COLORS.error }}>{err}</Text></View>
        : projectNames.length === 0 ? (
          <View style={[CARD, { alignItems: 'center', padding: 28 }]}><Text style={{ color: MUTED }}>No bookings yet.</Text></View>
        ) : projectNames.map((pn) => (
          <View key={pn} style={{ marginBottom: 12 }}>
            <TouchableOpacity onPress={() => toggle(pn)} activeOpacity={0.7}
              style={[CARD, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: open[pn] ? '#99F6E4' : 'transparent' }]}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: TEAL, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                🏢 {pn} · {groups[pn].length} booking{groups[pn].length === 1 ? '' : 's'}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: MUTED }}>{open[pn] ? '⌄' : '›'}</Text>
            </TouchableOpacity>
            {open[pn] && <View style={{ marginTop: 10 }}>
              {groups[pn].map((b) => (
                <View key={b.id} style={[CARD, { marginBottom: 10 }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>
                        {isEoi(b) ? <Text style={{ color: '#E4571A' }}>{b.plot_numbers}</Text> : `Plot ${b.plot_numbers || b.plot_number || b.area}`}
                        <Text style={{ color: MUTED, fontWeight: '600' }}>  {b.client_name || '—'}</Text>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: TEAL }}>  {isEoi(b) ? 'EOI' : 'LOI'}</Text>
                        {b.revision_no > 0 ? <Text style={{ fontSize: 10, color: '#B45309' }}>  R{b.revision_no}</Text> : null}
                      </Text>
                      <Text style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>{b.phone} · Booked {b.booking_date || '—'} · STM {b.stm_name || '—'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#0D47A1' }}>{rupee(b.final_amount)}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: MUTED, marginTop: 4 }}>{(b.approval_status || b.status || '').toUpperCase()}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <TouchableOpacity onPress={() => toggleDetails(b.id)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: '#CBD5E1', backgroundColor: COLORS.white }}>
                      <Text style={{ color: '#334155', fontWeight: '700', fontSize: 12 }}>{detailsOpen[b.id] ? '▲ Hide Details' : '▾ Details'}</Text>
                    </TouchableOpacity>
                    {b.loi_document ? (
                      <TouchableOpacity onPress={() => openLoi(b.id)} style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: '#99F6E4', backgroundColor: COLORS.white }}>
                        <Text style={{ color: TEAL, fontWeight: '700', fontSize: 12 }}>📄 View / Download {isEoi(b) ? 'EOI' : 'LOI'}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  {detailsOpen[b.id] ? <BookingDetails b={b} /> : null}
                </View>
              ))}
            </View>}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
