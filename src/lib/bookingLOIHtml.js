// LOI / EOI as HTML → fed to expo-print (Print.printAsync) on mobile.
// Mirrors the web jsPDF LOI content; rendered via the OS print engine.

const num = (n) => Number(n || 0).toLocaleString('en-IN');
const rs = (n) => 'Rs. ' + Math.round(Number(n) || 0).toLocaleString('en-IN');
function fmtDate(s) { if (!s) return '—'; const p = String(s).split('-'); if (p.length === 3 && p[0].length === 4) return p[2] + '-' + p[1] + '-' + p[0]; return s; }
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// meta, v, installments, opts — same shape as the web LOI.
export function buildLOIHtml(meta, v, installments = [], opts = {}) {
  const fs = opts.formulaSet || 'kalrav';
  const projName = (opts.projectName || meta.project || '').toString();
  const isEOI = meta.plotNo && meta.plotNo.toString().trim().toUpperCase().indexOf('EOI') === 0;
  const isAnkhol = fs === 'ankhol', isIndustrial = fs === 'industrial';
  const isTundav = isIndustrial && projName.trim().toLowerCase() === 'tundav';
  const areaUnit = (isAnkhol || isIndustrial) ? 'sq.ft.' : 'sq.yd.';
  const title = (opts.isRevision ? ('REVISED ' + (isEOI ? 'EOI - R' : 'LOI - R') + (opts.revNo || 1)) : (isEOI ? 'EXPRESSION OF INTEREST' : 'LETTER OF INTENT'));

  const row = (l, val) => `<tr><td class="l">${esc(l)}</td><td class="v">${rs(val)}</td></tr>`;
  const info = (l, val) => `<div class="cell"><div class="k">${esc(l)}</div><div class="d">${esc(val)}</div></div>`;

  // Project & Booking Details
  let details;
  if (isIndustrial) {
    const sqm = v.area > 0 ? (v.area / 10.764).toFixed(2) + ' sq.mtr' : '—';
    details = [['Client Phone', meta.phoneNumber], ['Booking Date', fmtDate(meta.bookingDate)], ['Project', meta.project], ['Plot No', meta.plotNo],
      ['Plot Area (sq.ft)', v.area + ' sq.ft.'], ['Plot Area (sq.mtr)', sqm], ['CP / Channel Partner', meta.cpName || '—'], ['STM Name', meta.loggedInUser || '—'], ['Address', meta.address || '—']];
  } else {
    details = [['Client Phone', meta.phoneNumber], ['Booking Date', fmtDate(meta.bookingDate)], ['Project', meta.project], ['Plot No', meta.plotNo],
      ['Plot Area', v.area + ' ' + areaUnit], ['Construction Area', v.constArea + ' ' + areaUnit],
      [isAnkhol ? 'Bunglow Type' : 'Villa Type', isAnkhol ? (meta.bunglowType || '5B2HK + SR') : (meta.villaType || '—')],
      ['CP / Channel Partner', meta.cpName || '—'], ['STM Name', meta.loggedInUser || '—'], ['Address', meta.address || '—']];
  }

  // Pricing
  let pricing;
  if (isIndustrial) {
    pricing = [['Land Rate', rs(v.landRate) + ' / sq.ft'], ['Sale Deed Rate', rs(v.saleDeedRate) + ' / sq.ft']];
    if (!isTundav) pricing.push(['Dev Agreement Rate', rs(v.devAgreementRate) + ' / sq.ft']);
    pricing.push(['Discount', rs(v.discount)]);
  } else {
    pricing = [['Land Rate', rs(v.landRate)], ['Development Rate', rs(v.devRate)], ['Construction Rate', rs(v.constRate)], ['Discount', rs(v.discount)]];
  }

  // Extra charges
  let extra = '';
  if (isAnkhol) {
    extra += row('Stamp Duty (4.9% of Sale Deed)', v.applyStampDuty === 'No' ? 0 : v.stampDuty);
    extra += row('Registration Fees', v.applyRegFee === 'No' ? 0 : v.regFees);
    extra += row('GST (5% of Sale Deed)', v.applyGst === 'No' ? 0 : v.gst);
    extra += row('Maintenance Deposit', v.maintDeposit) + row('Maintenance Advance', v.maintAdvance) + row('Legal Charges & Others', v.legal);
    if (v.premiumLocation > 0) extra += row('Premium Location Charge', v.premiumLocation);
  } else if (isIndustrial) {
    extra += row('Stamp Duty (4.9% of Sale Deed)', v.stampDuty) + row('Registration Fees', v.applyRegFee === 'No' ? 0 : v.regFees);
    extra += row(isTundav ? 'GST (18% of 67% of Sale Deed)' : 'GST (18% of Dev Agreement)', v.gst);
    extra += row('Maintenance Deposit', v.maintDeposit) + row('Maintenance Advance', v.maintAdvance) + row('Legal Charges & Others', v.legal);
  } else {
    extra += row('Stamp Duty (4.9% of Land Sale Deed)', v.stampDuty) + row('Registration Fees', v.applyRegFee === 'No' ? 0 : v.regFees);
    extra += row('GST (18% of Construction Agreement)', v.gst) + row('Maintenance', v.maint) + row('Legal Charges & Others', v.legal);
  }

  // Payment schedule
  const schedule = installments.filter((i) => !i.isExtra || Math.round(i.amt || 0) > 0).map((i) => {
    const isE = i.isExtra;
    return `<tr class="${isE ? 'extra' : ''}"><td>${isE ? 'Extra' : i.no}</td><td>${fmtDate(i.date)}</td><td>${isE ? 'Extra Charges' : ((i.pct || 0) + '%')}</td><td class="r">${rs(i.amt)}</td></tr>`;
  }).join('');
  const grand = installments.reduce((a, i) => a + Math.round(i.amt || 0), 0);

  const terms = [
    ['Payment Mode', 'All payments via cheque or bank transfer only. No cash accepted.'],
    ['Late Payment', 'Delay >10 days attracts 2% per month penalty on the due installment.'],
    ['Cancellation', 'Delay >15 days allows developer to cancel; refund after 10% deduction within 3 months.'],
    ['Extra Charges', 'Extra charges may vary per Govt. Rules. Developer not liable for variation.'],
    ['Early Payment', '1% per month discount applicable on land cost for early payments.'],
    ['Plot Area', 'Plot area measured from centre line of compound walls.'],
  ];
  (opts.extraTerms || []).forEach((t) => { if (t.title || t.desc) terms.push([t.title || 'Note', t.desc || '']); });

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; margin: 0; padding: 0 14px 30px; font-size: 12px; }
  .hdr { background: linear-gradient(135deg,#0d2f61,#1a73e8); color: #fff; text-align: center; padding: 16px; border-radius: 0 0 8px 8px; margin: 0 -14px 14px; }
  .hdr h1 { margin: 0; font-size: 20px; letter-spacing: 1px; }
  .hdr .proj { color: #c4d6ff; font-size: 13px; margin-top: 2px; }
  .hdr .badge { display: inline-block; background: #c4953c; color: #0d2f61; font-weight: 700; font-size: 10px; padding: 4px 14px; border-radius: 4px; margin-top: 8px; }
  .client { background: #eef4ff; border: 1px solid #1a73e8; border-left: 4px solid #c4953c; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; }
  .client .nm { font-size: 15px; font-weight: 800; color: #0d2f61; }
  .sec { background: #0d2f61; color: #fff; font-weight: 700; font-size: 11px; text-transform: uppercase; padding: 6px 10px; border-radius: 4px; margin: 12px 0 8px; }
  .grid { display: flex; flex-wrap: wrap; }
  .cell { width: 50%; padding: 5px 8px; }
  .cell .k { font-size: 9px; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
  .cell .d { font-size: 12px; color: #1e293b; }
  table { width: 100%; border-collapse: collapse; }
  td.l { padding: 6px 8px; color: #475569; border-bottom: 1px solid #eef0f5; }
  td.v { padding: 6px 8px; text-align: right; font-weight: 700; border-bottom: 1px solid #eef0f5; white-space: nowrap; }
  tr.sub td { background: #eef4ff; color: #1a73e8; font-weight: 800; }
  tr.total td { background: #0d2f61; color: #fff; font-size: 14px; font-weight: 800; }
  .sched th { background: #0d2f61; color: #fff; font-size: 10px; padding: 7px 8px; text-align: left; }
  .sched td { padding: 6px 8px; border-bottom: 1px solid #eef0f5; }
  .sched td.r { text-align: right; font-weight: 700; }
  .sched tr.extra td { background: #fff8e1; color: #92400e; font-weight: 700; }
  .sched .grand td { background: #fdf6e3; color: #0d2f61; font-weight: 800; }
  .term { padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
  .term b { color: #0d2f61; }
  .sign { display: flex; justify-content: space-between; margin-top: 24px; }
  .sign .box { width: 45%; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px; text-align: center; }
  .sign .line { border-top: 1px solid #cbd5e1; margin: 26px 8px 6px; }
  .decl { background: #fdf6e3; border: 1px solid #c4953c; border-radius: 6px; padding: 10px; font-style: italic; text-align: center; color: #64501a; margin-top: 16px; font-size: 11px; }
</style></head><body>
  <div class="hdr"><h1>VISTARA GROUP</h1><div class="proj">${esc(meta.project || '')}</div><div class="badge">${esc(title)}</div></div>
  <div class="client"><div class="nm">${esc(meta.clientName || '—')}</div><div style="font-size:11px;color:#475569">Ph: ${esc(meta.phoneNumber || '')} · ${esc(meta.gender || '')}</div></div>

  <div class="sec">Project &amp; Booking Details</div>
  <div class="grid">${details.map(([k, d]) => info(k, d)).join('')}</div>

  <div class="sec">Pricing Details</div>
  <div class="grid">${pricing.map(([k, d]) => info(k, d)).join('')}</div>

  <div class="sec">Extra Charges</div>
  <table>${extra}<tr class="sub"><td class="l">Total Extra Charges</td><td class="v">${rs(v.totalExtra)}</td></tr></table>

  <div class="sec">Total Deal Summary</div>
  <table>
    ${row('Plot Basic Amount (' + num(v.area) + ' x ' + num(v.landRate) + ')', v.plotBasic)}
    ${!isIndustrial ? row('Plot Development', v.plotDev) + row('Construction Amount', v.constAmt) : ''}
    ${row('Extra Charges', v.totalExtra)}
    ${row('Discount', v.discount)}
    <tr class="total"><td class="l" style="color:#fff">FINAL AMOUNT</td><td class="v" style="color:#fff">${rs(v.finalAmt)}</td></tr>
  </table>

  ${schedule ? `<div class="sec">Payment Schedule</div>
  <table class="sched"><tr><th>#</th><th>Due Date</th><th>%</th><th style="text-align:right">Amount</th></tr>
  ${schedule}<tr class="grand"><td colspan="3">GRAND TOTAL</td><td class="r">${rs(grand)}</td></tr></table>` : ''}

  <div class="sec">Terms &amp; Conditions</div>
  ${terms.map((t) => `<div class="term"><b>${esc(t[0])}:</b> ${esc(t[1])}</div>`).join('')}

  <div class="sign">
    <div class="box"><div style="font-size:10px;color:#94a3b8;font-weight:700">BUYER SIGNATURE</div><div class="line"></div><div>${esc(meta.clientName || '')}</div></div>
    <div class="box"><div style="font-size:10px;color:#94a3b8;font-weight:700">SELLER SIGNATURE</div><div class="line"></div><div>Vistara Group</div></div>
  </div>
  <div class="decl">I hereby declare that I have read, understood, and agreed to all terms and conditions.</div>
</body></html>`;
}
