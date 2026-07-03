// LOI / EOI as HTML → fed to expo-print (Print.printAsync) on mobile.
// Faithful match of the web jsPDF LOI (vistaraweb/src/lib/bookingLOI.js):
// same sections, labels, colours and layout, rendered via the OS print engine.

import { COMPANY_LOGO } from './companyLogo';

const num = (n) => Number(n || 0).toLocaleString('en-IN');
const money = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN');
function fmtDate(s) { if (!s) return '—'; const p = String(s).split('-'); if (p.length === 3 && p[0].length === 4) return p[2] + '-' + p[1] + '-' + p[0]; return s; }
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// meta, v, installments, opts — same shape as the web LOI.
export function buildLOIHtml(meta, v, installments = [], opts = {}) {
  const fs = opts.formulaSet || 'kalrav';
  const projName = (opts.projectName || meta.project || '').toString();
  const isEOI = meta.plotNo && meta.plotNo.toString().trim().toUpperCase().indexOf('EOI') === 0;
  const isAnkhol = fs === 'ankhol', isIndustrial = fs === 'industrial';
  const isTundav = isIndustrial && projName.trim().toLowerCase() === 'tundav';
  // Honour the booking form's unit toggle; fall back to the formula default.
  const chosenUnit = opts.areaUnit || meta.areaUnit || '';
  const areaUnit = chosenUnit === 'sq.m' ? 'sq.mtr'
    : chosenUnit ? chosenUnit + '.'
    : (isAnkhol || isIndustrial) ? 'sq.ft.' : 'sq.yd.';
  const rateUnit = areaUnit.replace('.', '');  // sqft. / sqyd.
  const docType = isEOI ? 'Expression of Interest' : 'Letter of Intent';
  let title = isEOI ? 'EXPRESSION OF INTEREST' : 'LETTER OF INTENT';
  if (opts.isRevision) title = isEOI ? ('REVISED EOI - R' + (opts.revNo || 1)) : ('REVISED LOI - R' + (opts.revNo || 1));
  const extraWorkInst = opts.extraWorkInst || [];

  // helpers
  const info = (l, d) => `<div class="cell"><div class="k">${esc(l)}</div><div class="d">${esc(d == null || d === '' ? '—' : d)}</div></div>`;
  const grid = (rows) => `<div class="grid">${rows.map(([k, d]) => info(k, d)).join('')}</div>`;
  const sec = (t) => `<div class="sec">${esc(t)}</div>`;
  // money row: cls = sub|total ; green for discount
  const mrow = (l, n, o = {}) =>
    `<tr class="${o.total ? 'total' : o.sub ? 'sub' : ''}"><td class="l">${esc(l)}${o.subline ? `<div class="sl">${esc(o.subline)}</div>` : ''}</td><td class="rs">Rs.</td><td class="amt ${o.green ? 'green' : ''}">${money(n)}</td></tr>`;

  // ── Project & Booking Details ──
  let details;
  if (isIndustrial) {
    const sqm = v.area > 0 ? (v.area / 10.764).toFixed(2) + ' sq.mtr' : '—';
    details = [['Client Phone', meta.phoneNumber], ['Booking Date', fmtDate(meta.bookingDate)], ['Project', meta.project], ['Plot No', meta.plotNo],
      ...((chosenUnit && chosenUnit !== 'sq.ft') ? [['Plot Area', v.area + ' ' + areaUnit]] : [['Plot Area (sq.ft)', v.area + ' sq.ft.'], ['Plot Area (sq.mtr)', sqm]]),
      ['CP / Channel Partner', meta.cpName || '—'], ['STM Name', meta.loggedInUser || '—'], ['Address', meta.address || '—']];
  } else {
    details = [['Client Phone', meta.phoneNumber], ['Booking Date', fmtDate(meta.bookingDate)], ['Project', meta.project], ['Plot No', meta.plotNo],
      ['Plot Area', v.area + ' ' + areaUnit], ['Construction Area', v.constArea + ' ' + areaUnit],
      [isAnkhol ? 'Bunglow Type' : 'Villa Type', isAnkhol ? (meta.bunglowType || '5B2HK + SR') : (meta.villaType || '—')],
      ['CP / Channel Partner', meta.cpName || '—'], ['STM Name', meta.loggedInUser || '—'], ['Address', meta.address || '—']];
  }

  // ── Pricing ──
  let pricing;
  if (isIndustrial) {
    const landUnit = (chosenUnit && chosenUnit !== 'sq.ft') ? rateUnit : 'sq.ft';
    pricing = [['Land Rate', 'Rs. ' + num(v.landRate) + ' / ' + landUnit], ['Sale Deed Rate', 'Rs. ' + num(v.saleDeedRate) + ' / sq.ft']];
    if (!isTundav) pricing.push(['Dev Agreement Rate', 'Rs. ' + num(v.devAgreementRate) + ' / sq.ft']);
    pricing.push(['Discount', 'Rs. ' + num(v.discount)]);
  } else {
    pricing = [['Land Rate', 'Rs. ' + num(v.landRate) + ' / ' + rateUnit], ['Development Rate', 'Rs. ' + num(v.devRate) + ' / ' + rateUnit],
      ['Construction Rate', 'Rs. ' + num(v.constRate) + ' / ' + rateUnit], ['Discount', 'Rs. ' + num(v.discount)]];
  }

  // ── Agreement Amount ──
  let agreement;
  if (isAnkhol) agreement = sec(`Sale Deed  (${v.saleDeedPct != null ? v.saleDeedPct : 60}% x Base + Premium - Discount)`, '#475569') + grid([['Sale Deed Amount', 'Rs. ' + num(v.saleDeed)]]);
  else if (isIndustrial) {
    const rows = [['Sale Deed', 'Rs. ' + num(v.saleDeed) + ' (SD Rate x Plot Area)']];
    if (!isTundav) rows.push(['Development Agreement', 'Rs. ' + num(v.devAgreement) + ' (Dev Rate x Plot Area)']);
    agreement = sec('Agreement Amount', '#475569') + grid(rows);
  } else agreement = sec('Agreement Amount', '#475569') + grid([['Land Sale Deed', 'Rs. ' + num(v.lsd)], ['Construction Agreement', 'Rs. ' + num(v.constAgr)]]);

  // ── Extra Charges ──
  let extra = '';
  if (isAnkhol) {
    extra += mrow(v.applyStampDuty === 'No' ? 'Stamp Duty (Not Applicable)' : 'Stamp Duty (4.9% of Sale Deed)', v.applyStampDuty === 'No' ? 0 : v.stampDuty);
    extra += mrow(v.applyRegFee === 'No' ? 'Registration Fees (Not Applicable)' : 'Registration Fees (1% of Sale Deed + Rs.1,500)', v.applyRegFee === 'No' ? 0 : v.regFees);
    extra += mrow(v.applyGst === 'No' ? 'GST (Not Applicable)' : 'GST (5% of Sale Deed)', v.applyGst === 'No' ? 0 : v.gst);
    extra += mrow('Maintenance Deposit', v.maintDeposit) + mrow('Maintenance Advance', v.maintAdvance) + mrow('Legal Charges & Others', v.legal);
    if (v.premiumLocation > 0) extra += mrow('Premium Location Charge', v.premiumLocation);
  } else if (isIndustrial) {
    extra += mrow('Stamp Duty (4.9% of Sale Deed)', v.stampDuty);
    extra += mrow(v.applyRegFee === 'No' ? 'Registration Fees (Not Applicable)' : ('Registration Fees (' + (v.gender === 'Female' ? 'Female - Rs.1,500' : 'Male - 1% Sale Deed + Rs.1,500') + ')'), v.applyRegFee === 'No' ? 0 : v.regFees);
    extra += mrow(isTundav ? 'GST on Sale Deed (18% of 67% of Sale Deed)' : 'GST on Developed Plot (18% of Development Agreement)', v.gst);
    extra += mrow('Maintenance Deposit', v.maintDeposit) + mrow('Maintenance Advance', v.maintAdvance) + mrow('Legal Charges & Others', v.legal);
  } else {
    extra += mrow('Stamp Duty (4.9% of Land Sale Deed)', v.stampDuty);
    extra += mrow(v.applyRegFee === 'No' ? 'Registration Fees (Not Applicable)' : ('Registration Fees (' + (v.gender === 'Female' ? 'Female - Rs.1,500' : 'Male - 1% LSD + Rs.1,500') + ')'), v.applyRegFee === 'No' ? 0 : v.regFees);
    extra += mrow('GST (18% of Construction Agreement)', v.gst) + mrow('Maintenance', v.maint) + mrow('Legal Charges & Others', v.legal);
  }
  extra += mrow('Total Extra Charges', v.totalExtra, { sub: true });

  const extraWork = (v.extraWorkAmt > 0)
    ? sec('Extra Work', '#16a34a') + `<table class="money">${mrow(v.extraWorkDesc || 'Extra Work Charges', v.extraWorkAmt)}</table>`
    : '';

  // ── Total Deal Summary ──
  let deal = mrow('Plot Basic Amount  (Plot Area x Land Rate)', v.plotBasic, { subline: num(v.area) + ' x ' + num(v.landRate) });
  if (!isIndustrial) {
    deal += mrow('Plot Development Amount  (' + (isAnkhol ? 'Const Area' : 'Plot Area') + ' x Dev Rate)', v.plotDev, { subline: (isAnkhol ? num(v.constArea) : num(v.area)) + ' x ' + num(v.devRate) });
    deal += mrow('Construction Amount  (Const Area x Const Rate)', v.constAmt, { subline: num(v.constArea) + ' x ' + num(v.constRate) });
    deal += mrow('Total Basic Amount', (v.plotBasic || 0) + (v.plotDev || 0) + (v.constAmt || 0), { sub: true });
  }
  deal += mrow((isAnkhol && v.premiumLocation > 0) ? 'Extra Charges  (incl. Premium Location Charge)' : 'Extra Charges', v.totalExtra);
  if (v.extraWorkAmt > 0) deal += mrow('Extra Work', v.extraWorkAmt);
  deal += mrow('Discount', v.discount, { green: true });
  deal += mrow('FINAL AMOUNT', v.finalAmt, { total: true });

  // ── Payment Schedule ── (normal, then extra-work, then extra charges)
  const ordered = [];
  installments.forEach((i) => { if (!i.isExtra && !i.isExtraWork) ordered.push(i); });
  extraWorkInst.forEach((r) => ordered.push({ no: 'W' + r.no, date: r.date, pct: r.pct, amt: r.amt, isExtraWork: true, desc: v.extraWorkDesc }));
  installments.forEach((i) => { if (i.isExtra && Math.round(i.amt || 0) > 0) ordered.push(i); });
  let grand = 0;
  const schedRows = ordered.map((i) => {
    const amt = Math.round(i.amt || 0); grand += amt;
    if (i.isExtra) return `<tr class="extra"><td class="bdg">EXTRA</td><td>${fmtDate(i.date) || '—'}</td><td>Extra Charges</td><td class="r">Rs. ${money(amt)}</td></tr>`;
    if (i.isExtraWork) return `<tr class="work"><td class="bdg">WORK</td><td>${fmtDate(i.date) || '—'}</td><td>${esc((i.desc || 'Extra Work').slice(0, 20))}</td><td class="r">Rs. ${money(amt)}</td></tr>`;
    return `<tr><td class="no"><span class="circ">${esc(i.no)}</span></td><td>${fmtDate(i.date) || '—'}</td><td>${(i.pct || 0)}%</td><td class="r">Rs. ${money(amt)}</td></tr>`;
  }).join('');
  const schedule = ordered.length ? sec('Payment Schedule', '#0f766e') +
    `<table class="sched"><tr><th>#</th><th>Due Date</th><th>%</th><th class="r">Amount (Rs.)</th></tr>${schedRows}` +
    `<tr class="grand"><td colspan="3">GRAND TOTAL</td><td class="r">Rs. ${money(grand)}</td></tr></table>` : '';

  // ── Terms ──
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
  @page { margin: 0; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; margin: 0; padding: 0 14px 46px; font-size: 11px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .hdr { background: linear-gradient(180deg, #edf2f9 0%, #ffffff 74%); color: #2e4a78; text-align: center; padding: 16px 16px 14px; margin: 0 -14px 14px; position: relative; border-top: 3px solid #2e4a78; border-bottom: 1px solid #d5deee; box-shadow: inset 0 -3px 0 -2px #ff6b2b; }
  .hdr h1 { margin: 0; font-size: 17px; font-weight: 800; letter-spacing: 0.3px; }
  .hdr .proj { color: #78869c; font-size: 12px; margin-top: 3px; }
  .hdr .title { color: #5c7cac; font-weight: 700; font-size: 10px; letter-spacing: 2.5px; text-indent: 2.5px; margin-top: 9px; }
  .hdr .titlebar { width: 26px; height: 2px; background: #ff6b2b; border-radius: 2px; margin: 4px auto 0; }
  .hdr .clogo, .hdr .plogo { position: absolute; top: 50%; transform: translateY(-50%); width: 84px; height: 46px; object-fit: contain; }
  .hdr .clogo { left: 14px; }
  .hdr .plogo { right: 14px; }
  .datebelow { text-align: right; color: #475569; font-size: 9px; margin: 0 0 8px; }
  .client { background: #eef3fb; border: 1px solid #c9d7ee; border-radius: 6px; padding: 9px 12px 9px 16px; margin-bottom: 12px; position: relative; }
  .client::before { content: ''; position: absolute; left: 5px; top: 8px; bottom: 8px; width: 3px; background: #ff6b2b; border-radius: 2px; }
  .client .nm { font-size: 14px; font-weight: 800; color: #2e4a78; }
  .client .ph { font-size: 10px; color: #475569; margin-top: 1px; }
  .client .sub { display: flex; margin-top: 7px; }
  .client .sub .c { flex: 1; border-left: 1px solid #d7e3f5; padding-left: 8px; }
  .client .sub .c:first-child { border-left: 0; padding-left: 0; }
  .client .sub .k { font-size: 8px; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
  .client .sub .d { font-size: 10px; color: #1e293b; }
  .sec { color: #fff; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: .4px; padding: 6px 10px 6px 15px; border-radius: 5px; margin: 12px 0 7px; background: #2e4a78; position: relative; }
  .sec::before { content: ''; position: absolute; left: 5px; top: 5px; bottom: 5px; width: 3px; background: #ff6b2b; border-radius: 2px; }
  .grid { display: flex; flex-wrap: wrap; }
  .cell { width: 50%; padding: 4px 8px; }
  .cell:nth-child(4n+1), .cell:nth-child(4n+2) { background: #f8fafe; }
  .cell .k { font-size: 8px; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
  .cell .d { font-size: 11px; color: #1e293b; }
  table { width: 100%; border-collapse: collapse; }
  table.money td, .moneyt td { font-size: 11px; }
  td.l { padding: 5px 8px; color: #475569; border-bottom: 1px solid #eef0f5; }
  td.rs { padding: 5px 2px; text-align: right; color: #475569; border-bottom: 1px solid #eef0f5; width: 26px; }
  td.amt { padding: 5px 8px 5px 0; text-align: right; font-weight: 700; color: #1e293b; border-bottom: 1px solid #eef0f5; white-space: nowrap; width: 92px; }
  td.amt.green { color: #16a34a; }
  td.l .sl { font-size: 9px; color: #94a3b8; font-weight: 400; margin-top: 1px; }
  tr:nth-child(even) td.l, tr:nth-child(even) td.rs, tr:nth-child(even) td.amt { background: #f8fafe; }
  tr.sub td { background: #eef3fb !important; color: #2e4a78; font-weight: 800; border-bottom: none; }
  tr.sub td.amt { color: #2e4a78; }
  tr.total td { background: #2e4a78 !important; color: #fff; font-size: 13px; font-weight: 800; padding-top: 8px; padding-bottom: 8px; border: none; }
  tr.total td:first-child { border-left: 3px solid #ff6b2b; border-top-left-radius: 5px; border-bottom-left-radius: 5px; }
  tr.total td:last-child { border-top-right-radius: 5px; border-bottom-right-radius: 5px; }
  tr.total td.amt, tr.total td.rs { color: #fff; }
  .sched th { background: #2e4a78; color: #fff; font-size: 9px; padding: 7px 8px; text-align: left; }
  .sched th:first-child { border-top-left-radius: 5px; }
  .sched th:last-child { border-top-right-radius: 5px; }
  .sched th.r, .sched td.r { text-align: right; }
  .sched td { padding: 6px 8px; border-bottom: 1px solid #eef0f5; font-size: 11px; }
  .sched td.r { font-weight: 700; white-space: nowrap; }
  .sched td.no, .sched td.bdg { text-align: center; width: 30px; }
  .circ { display: inline-block; width: 16px; height: 16px; line-height: 16px; border-radius: 50%; background: #2e4a78; color: #fff; font-size: 8px; font-weight: 700; text-align: center; }
  .sched tr:nth-child(odd) td { background: #f8fafe; }
  .sched tr.extra td { background: #fff1e8 !important; color: #9a3c16; font-weight: 700; }
  .sched tr.work td { background: #f0fdf4 !important; color: #15803d; font-weight: 700; }
  .sched td.bdg { font-size: 7px; font-weight: 800; color: #fff; border-radius: 3px; padding: 3px 2px; }
  .sched tr.extra td.bdg { background: #ff6b2b !important; }
  .sched tr.work td.bdg { background: #16a34a !important; }
  .sched tr.grand td { background: #eef3fb !important; color: #2e4a78; font-weight: 800; font-size: 12px; padding: 9px 8px; border-top: 1px solid #cdd8ea; border-bottom: 1px solid #cdd8ea; }
  .sched tr.grand td:first-child { border-left: 3px solid #ff6b2b; }
  .term { padding: 6px 0 6px 16px; border-bottom: 1px solid #f1f5f9; position: relative; font-size: 10px; }
  .term::before { content: ""; position: absolute; left: 3px; top: 9px; width: 6px; height: 6px; border-radius: 50%; background: #ff6b2b; }
  .term b { color: #2e4a78; }
  .sign { display: flex; justify-content: space-between; margin-top: 22px; }
  .sign .box { width: 46%; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px 10px 10px; text-align: center; }
  .sign .t { font-size: 9px; color: #94a3b8; font-weight: 700; letter-spacing: .5px; }
  .sign .line { border-top: 1px solid #cbd5e1; margin: 24px 10px 6px; }
  .sign .nm { font-size: 11px; color: #1e293b; }
  .dateline { text-align: center; color: #475569; font-size: 10px; margin-top: 10px; }
  .decl { background: #eef3fb; border: 1px solid #c9d7ee; border-radius: 6px; padding: 9px 14px; font-style: italic; text-align: center; color: #2e4a78; margin-top: 14px; font-size: 10px; position: relative; }
  .decl::before { content: ''; position: absolute; left: 5px; top: 6px; bottom: 6px; width: 3px; background: #ff6b2b; border-radius: 2px; }
  .foot { position: fixed; bottom: 0; left: 0; right: 0; background: #2e4a78; border-top: 2px solid #ff6b2b; color: #fff; font-size: 8px; text-align: center; padding: 5px 0; }
  /* keep each section (header + its body) together so nothing is cut across pages */
  .block { page-break-inside: avoid; break-inside: avoid; }
  .sec { page-break-after: avoid; break-after: avoid; }
</style></head><body>
  <div class="hdr">
    <img class="clogo" src="${COMPANY_LOGO}" />
    ${opts.projectLogoUrl ? `<img class="plogo" src="${esc(opts.projectLogoUrl)}" />` : ''}
    <h1>${esc(meta.project || '')}</h1>
    <div class="title">${esc(title)}</div>
    <div class="titlebar"></div>
  </div>
  <div class="datebelow">Date: ${esc(fmtDate(meta.bookingDate))}</div>

  <div class="client">
    <div class="nm">${esc(meta.clientName || '—')}</div>
    ${meta.phoneNumber ? `<div class="ph">Ph: ${esc(meta.phoneNumber)}</div>` : ''}
    <div class="sub">
      <div class="c"><div class="k">Gender</div><div class="d">${esc(meta.gender || '—')}</div></div>
      <div class="c"><div class="k">Project</div><div class="d">${esc(meta.project || '—')}</div></div>
      <div class="c"><div class="k">Plot No</div><div class="d">${esc(meta.plotNo || '—')}</div></div>
    </div>
  </div>

  <div class="block">${sec('Project & Booking Details', '#0d2f61')}${grid(details)}</div>

  <div class="block">${sec('Pricing Details', '#336699')}${grid(pricing)}</div>

  <div class="block">${agreement}</div>

  <div class="block">${sec('Extra Charges', '#7c3aed')}<table class="money">${extra}</table></div>

  ${extraWork ? `<div class="block">${extraWork}</div>` : ''}

  <div class="block">${sec('Total Deal Summary', '#0d2f61')}<table class="money">${deal}</table></div>

  ${schedule ? `<div class="block">${schedule}</div>` : ''}

  <div class="block">${sec('Terms & Conditions', '#475569')}${terms.map((t) => `<div class="term"><b>${esc(t[0])}:</b> ${esc(t[1])}</div>`).join('')}</div>

  <div class="block">
    <div class="sign">
      <div class="box"><div class="t">BUYER SIGNATURE</div><div class="line"></div><div class="nm">${esc(meta.clientName || '—')}</div></div>
      <div class="box"><div class="t">SELLER SIGNATURE</div><div class="line"></div><div class="nm">Vistara Group</div></div>
    </div>
    <div class="dateline">Date: ________________________</div>
    <div class="decl">I hereby declare that I have read, understood, and agreed to all terms and conditions.</div>
  </div>

  <div class="foot">Vistara Group • ${esc(docType)} • ${esc(new Date().toLocaleDateString('en-IN'))}</div>
</body></html>`;
}
