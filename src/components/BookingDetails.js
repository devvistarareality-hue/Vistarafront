import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '../constants/theme';

// The exact details entered on the booking form — client, property, rates, amounts
// and the payment schedule. Built for the Accounts & Finance review screen and now
// shared with Sales and Channel Partner: the same deal read by three teams should
// not be three different renderings of it, least of all three sets of rounding.
//
// `accent` colours the headings so the block sits in whichever module shows it.

const money0 = (n) => (n === '' || n == null) ? '—' : '₹ ' + Math.round(Number(n) || 0).toLocaleString('en-IN');
const val = (v) => (v === '' || v == null) ? '—' : String(v);

// One label:value row inside the Details panel.
const DRow = ({ l, v }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.surface2 }}>
    <Text style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', flexShrink: 1 }}>{l}</Text>
    <Text style={{ fontSize: 12, color: COLORS.textPrimary, fontWeight: '700', textAlign: 'right' }}>{v}</Text>
  </View>
);
// Due dates are stored yyyy-mm-dd; show them as dd-mm-yyyy for the accounts view.
const fmtDate = (d) => {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(d || ''));
  return m ? `${m[3].padStart(2, '0')}-${m[2].padStart(2, '0')}-${m[1]}` : (d || '—');
};
export default function BookingDetails({ b, accent = COLORS.success }) {
  const rawInsts = Array.isArray(b.installments) ? b.installments : [];
  // Sort the payment schedule by due date ascending (yyyy-mm-dd sorts chronologically).
  const insts = [...rawInsts].sort((a, x) => String(a.date || '').localeCompare(String(x.date || '')));
  const Head = ({ t }) => <Text style={{ fontSize: 10, fontWeight: '800', color: accent, textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 10, marginBottom: 4 }}>{t}</Text>;
  return (
    <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.borderStrong, borderStyle: 'dashed' }}>
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
      {/* Kalrav-3 / Ankhol / Industrial split maintenance into deposit + advance; plain
          Kalrav books a single Maintenance amount and leaves both at 0. Test numerically —
          DRF serialises decimals as strings, so "0.00" is truthy and a
          `maint_deposit || maintenance` fallback would never fire. */}
      {(Number(b.maint_deposit) || Number(b.maint_advance)) ? (
        <>
          <DRow l="Maintenance Deposit" v={money0(b.maint_deposit)} />
          {Number(b.maint_advance) ? <DRow l="Maintenance Advance" v={money0(b.maint_advance)} /> : null}
        </>
      ) : (
        <DRow l="Maintenance" v={money0(b.maintenance)} />
      )}
      <DRow l="Legal Charges" v={money0(b.legal_charges)} />
      <DRow l="Total Legal & Other" v={money0(b.total_extra)} />
      {Number(b.discount) ? <DRow l="Discount" v={money0(b.discount)} /> : null}
      {Number(b.extra_work_amount) ? <DRow l="Extra Work" v={money0(b.extra_work_amount)} /> : null}
      <DRow l="Final Amount" v={money0(b.final_amount)} />
      {insts.length > 0 && <Head t="Payment Schedule" />}
      {insts.map((i, idx) => (
        <DRow key={idx} l={`${idx + 1}. ${fmtDate(i.date)}  ${i.pct != null ? i.pct + '%' : ''}  ${i.isNsd ? '(Extra Work)' : i.isExtra ? '(Legal & Other)' : ''}`.trim()} v={money0(i.amt)} />
      ))}
    </View>
  );
}
