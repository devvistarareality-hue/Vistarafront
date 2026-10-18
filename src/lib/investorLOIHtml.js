// Investment Proposal Form (Club 1000 LOI) as HTML → fed to expo-print
// (Print.printToFileAsync) on mobile. Faithful match of the web jsPDF version
// (vistaraweb/src/lib/investorLOI.js) — same header table, same static
// Terms & Conditions text, same signature blocks.

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN');

import { schedulePeriods, maturityWorking, perDayInterest, tenureDays } from './c1Periods';

function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = String(iso).split('-');
  return y && m && d ? `${d}-${m}-${y}` : iso;
}

function tenureLabel(months) {
  if (!months) return '—';
  if (months % 12 === 0) { const y = months / 12; return `${y} YEAR${y > 1 ? 'S' : ''}`; }
  return `${months} MONTH${months > 1 ? 'S' : ''}`;
}

function addMonthsISO(dateStr, months) {
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + Number(months || 0));
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Principal + the scheme's total return, applied once over the whole tenure
// — mirrors backend/club1000/services.py::maturity_value exactly.
// total_return_pct is the total return BY maturity (e.g. a "GROWTH 35"
// scheme pays 35% total over its 2-year tenure, not 35% every year), not an
// annualized rate to be scaled by day-count — scaling it by days/365 was the
// bug that made a 2-year 35% scheme pay out ~70%.
function computeMaturityValue(investor, scheme) {
  const principal = Number(investor.amount_invested) || 0;
  const pct = Number(investor.total_return_pct) || 0;
  return principal + principal * (pct / 100);
}

// ── Payout schedule date/proration helpers — mirror
// backend/club1000/services.py::default_quarterly_dates / default_monthly_dates
// / generate_payout_schedule exactly (same JS twins already in
// web/src/lib/investorLOI.js and the app's Add/Revise/Renew sheets), so the
// LOI's schedule table always matches what actually gets submitted/paid. ──
const PAYOUT_DAY = 10;
const QUARTER_START_MONTHS = [4, 7, 10, 1];
function quarterIndex(month) { return Math.floor((((month - 4) % 12) + 12) % 12 / 3); }
function nextQuarterPayout(d) {
  const idx = quarterIndex(d.getMonth() + 1);
  const nextIdx = (idx + 1) % 4;
  const targetMonth = QUARTER_START_MONTHS[nextIdx];
  const year = idx === 2 ? d.getFullYear() + 1 : d.getFullYear();
  return new Date(year, targetMonth - 1, PAYOUT_DAY);
}
function computeQuarterlyDates(investmentDateStr, tenureMonths) {
  let current = new Date(`${investmentDateStr}T00:00:00`);
  if (Number.isNaN(current.getTime())) return [];
  const maturity = new Date(current);
  maturity.setMonth(maturity.getMonth() + Number(tenureMonths));
  const dates = [];
  for (;;) {
    const nxt = nextQuarterPayout(current);
    if (nxt >= maturity) { dates.push(toISODateLocal(maturity)); break; }
    dates.push(toISODateLocal(nxt));
    current = nxt;
  }
  return dates;
}
function nextMonth10th(d) {
  const totalMonth = d.getMonth() + 1 + 1;
  const year = d.getFullYear() + Math.floor((totalMonth - 1) / 12);
  const month = ((totalMonth - 1) % 12) + 1;
  return new Date(year, month - 1, PAYOUT_DAY);
}
function computeMonthlyDates(investmentDateStr, tenureMonths) {
  let current = new Date(`${investmentDateStr}T00:00:00`);
  if (Number.isNaN(current.getTime())) return [];
  const maturity = new Date(current);
  maturity.setMonth(maturity.getMonth() + Number(tenureMonths));
  const dates = [];
  for (;;) {
    const nxt = nextMonth10th(current);
    if (nxt >= maturity) { dates.push(toISODateLocal(maturity)); break; }
    dates.push(toISODateLocal(nxt));
    current = nxt;
  }
  return dates;
}
function toISODateLocal(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
// Day-count proration, mirrors backend/club1000/services.py::generate_payout_schedule:
// the investor's FIXED total return over the tenure (principal * pct/100 —
// pct is the total return by maturity, not an annualized rate) is spread
// pro-rata across the tenure's actual days, not across a flat 365 — so
// instalments still sum to exactly computeMaturityValue's total interest
// regardless of tenure length.
function prorateInstalments(dates, investmentDateStr, maturityDateStr, principal, totalReturnPct) {
  const start = new Date(`${investmentDateStr}T00:00:00`);
  const end = new Date(`${maturityDateStr}T00:00:00`);
  const tenureDays = Math.round((end - start) / 86400000);
  const dailyRate = tenureDays > 0 ? (principal * totalReturnPct) / 100 / tenureDays : 0;
  let prev = start;
  return dates.map((due_date) => {
    const cur = new Date(`${due_date}T00:00:00`);
    const days = Math.round((cur - prev) / 86400000);
    prev = cur;
    return +((dailyRate * days).toFixed(2));
  });
}

// Builds the rows the schedule table renders. Uses opts.schedule (the calling
// sheet's live, possibly user-edited preview) when given, so the signed LOI
// always matches what's actually submitted — only falls back to computing the
// default schedule here when no live preview exists yet.
function buildScheduleRows(investor, scheme, providedSchedule) {
  const principal = Number(investor.amount_invested) || 0;
  const pct = Number(investor.total_return_pct) || 0;
  const maturityDateStr = investor.maturity_date || addMonthsISO(investor.investment_date, scheme.tenure_months);
  const totalValue = computeMaturityValue(investor, scheme);
  const isRecurring = investor.interest_payout === 'quarterly' || investor.interest_payout === 'monthly';

  let entries;
  if (Array.isArray(providedSchedule) && providedSchedule.length) {
    entries = providedSchedule;
  } else if (isRecurring) {
    const dates = investor.interest_payout === 'quarterly'
      ? computeQuarterlyDates(investor.investment_date, scheme.tenure_months)
      : computeMonthlyDates(investor.investment_date, scheme.tenure_months);
    // Same day-count working the forms and the server use (c1Periods / services.py).
    const draft = dates.map((due_date) => ({ due_date, payout_type: 'interest' }));
    const pers = schedulePeriods(draft, investor.investment_date, maturityDateStr, principal, pct, investor.interest_payout);
    entries = draft.map((e, i) => ({ ...e, amount_due: pers[i] ? pers[i].computed : 0 })).filter((e) => e.amount_due > 0);
    entries.push({ due_date: maturityDateStr, amount_due: principal, payout_type: 'maturity' });
  } else {
    // Maturity cadence — a single lump-sum instalment (principal + full return).
    entries = [{ due_date: maturityDateStr, amount_due: totalValue, payout_type: 'maturity' }];
  }

  // The working behind each row: the period it pays for, its days, interest a day.
  const periods = isRecurring
    ? schedulePeriods(entries, investor.investment_date, maturityDateStr, principal, pct, investor.interest_payout)
    : entries.map(() => maturityWorking(principal, pct, investor.investment_date, maturityDateStr).periods[0] || null);
  let n = 0;
  return entries.map((e, i) => {
    const amt = Number(e.amount_due) || 0;
    const isPrincipalRow = e.payout_type === 'maturity' && isRecurring;
    if (!isPrincipalRow) n += 1;
    const per = periods[i];
    return {
      no: isPrincipalRow ? 'P' : n, date: e.due_date, amt,
      title: isPrincipalRow ? 'Principal returned' : per ? per.label : (isRecurring ? 'Interest' : 'Principal + interest'),
      working: per ? `${spanLabel(per.from, per.to)} · ${per.days} days × Rs. ${per.perDay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '',
    };
  });
}

// The headline of the working: interest a day and the total interest.
function interestBasis(investor, scheme) {
  const principal = Number(investor.amount_invested) || 0;
  const pct = Number(investor.total_return_pct) || 0;
  const maturityDateStr = investor.maturity_date || addMonthsISO(investor.investment_date, scheme.tenure_months);
  const days = tenureDays(investor.investment_date, maturityDateStr);
  const perDay = perDayInterest(principal, pct, investor.investment_date, maturityDateStr);
  const f2 = (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const f0 = (v) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  return {
    line: `Interest a day: Rs. ${f2(perDay)}  (Rs. ${f0(principal)} × ${pct}% ÷ ${days} days)`,
    total: `Total interest: Rs. ${f0(perDay * days)}`,
  };
}

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// "18 Oct – 31 Dec 2026" (or with both years when the period crosses one).
function spanLabel(from, to) {
  const [ay, am, ad] = String(from).split('-').map(Number);
  const [by, bm, bd] = String(to).split('-').map(Number);
  if (!ay || !by) return '';
  return ay === by ? `${ad} ${MON[am - 1]} – ${bd} ${MON[bm - 1]} ${by}` : `${ad} ${MON[am - 1]} ${ay} – ${bd} ${MON[bm - 1]} ${by}`;
}


// Term 1 — the premature-exit rule for this LOI's scheme only (wording from Vistara).
function exitTerm(scheme) {
  const n = String(scheme?.name || '').toUpperCase();
  const none = 'No premature redemption can be made during the tenure of the investment.';
  const after1y = 'Premature redemption can be made after completion of 1 year from the date of investment. In that case the ROI is set to 1% per month, receivable by the investor from the date of investment till the date of early redemption.';
  if (/BUY\s*-?\s*BACK|GROWTH/.test(n)) return after1y;
  if (/RISE|EQUITY|FORTUNE|LEGACY/.test(n)) return none;
  return scheme?.premature_redemption_allowed ? after1y : none;
}

// The terms for one LOI — term 1 follows its scheme.
function sectionsFor(scheme) {
  return [
    { title: '1. PREMATURE EXIT OPTION:', lines: [exitTerm(scheme)] },
    { title: '2. TENURE AND LOCK-IN PERIOD:', lines: [
      '- The tenure of investment shall be as mentioned above from the date of receipt of funds',
      '- The Investment shall be subject to a lock-in period as mentioned above, during which the Investor shall not withdraw the Investment Amount',
      '- Upon completion of tenure as mentioned above, investment may be renewed on mutually agreed terms through written consent of both Parties',
    ] },
    { title: '3. INTEREST AND PAYOUT TERMS:', lines: [
      '- The Borrower agrees to pay interest at the rate as mentioned above on the Investment Amount',
      '- Interest shall be payable at a frequency as mentioned above',
      '- Interest shall be paid within 10 days from the end of frequency period of interest amount as mentioned above',
      '- Principal amount shall be paid within 10 days from the end of frequency period of principal amount as mentioned above',
    ] },
  ];
}

// investor: InvestorListSerializer shape (plus a reserved loi_no). scheme: SchemeSerializer shape.
// opts.revisionNo: when set, stamps a "REVISED LOI · Rn" watermark (this LOI
// proposes changed terms on an already-approved investor).
export function buildInvestorLOIHtml(investor, scheme, opts = {}) {
  const principalFreq = scheme.principal_payout === 'maturity' ? 'AT END OF TENURE' : (scheme.principal_payout || '—').toUpperCase();
  const returnFreq = (investor.interest_payout || '').toUpperCase() || '—';
  const prematureExit = scheme.premature_redemption_allowed
    ? `AFTER ${scheme.premature_redemption_lock_months || 0} MONTHS (${scheme.premature_redemption_rate_pct_per_month}%/MONTH)`
    : 'NA';

  const rows = [
    ['LOI NO', investor.loi_no || '—', 'NAME', investor.name || '—'],
    ['LOI DATE', fmtDate(new Date().toISOString().slice(0, 10)), 'SCHEME', scheme.name || '—'],
    null,
    ['INVESTMENT AMOUNT', money(investor.amount_invested), 'PRICIPAL PAY OUT FREQUENCY', principalFreq],
    ['DATE OF INVESTMENT', fmtDate(investor.investment_date), 'RETURN PAY OUT FREQUENCY', returnFreq],
    ['ROI (PER ANNUM)', `${investor.total_return_pct}%`, '', ''],
    null,
    ['TENURE', tenureLabel(scheme.tenure_months), 'PREMATURE EXIT OPTION', prematureExit],
    ['LOCK IN PERIOD', tenureLabel(scheme.premature_redemption_lock_months), '', ''],
  ];

  const rowsHtml = rows.map((r) => {
    if (!r) return '<tr class="spacer"><td colspan="4"></td></tr>';
    return `<tr>
      <td class="lbl">${esc(r[0])}</td><td class="val">${esc(r[1])}</td>
      <td class="lbl">${esc(r[2])}</td><td class="val">${esc(r[3])}</td>
    </tr>`;
  }).join('');

  // Payout Schedule — same "#/Due Date/Amount" table + MATURITY VALUE
  // subtotal as the web LOI (which itself mirrors the sales LOI's Payment
  // Schedule format, minus its "%" column — not shown here). Quarterly/
  // monthly cadences get one row per instalment plus a final Principal row;
  // maturity cadence is a single lump-sum instalment — no special-case
  // markup needed, it just renders as a one-row table.
  const scheduleRows = buildScheduleRows(investor, scheme, opts.schedule);
  const totalValue = computeMaturityValue(investor, scheme);
  const basis = interestBasis(investor, scheme);
  const scheduleRowsHtml = scheduleRows.map((r) => `
    <tr>
      <td class="sched-no">${esc(r.no)}</td>
      <td><div class="per">${esc(r.title || '')}</div>${r.working ? `<div class="why">${esc(r.working)}</div>` : ''}</td>
      <td>${esc(fmtDate(r.date))}</td>
      <td class="amt">Rs. ${esc(money(r.amt))}</td>
    </tr>
  `).join('');

  // Investment History (renewal LOIs) — every earlier term and what became of it,
  // the term ending now as the last row. Same as the website's renewal LOI.
  const H = opts.history || [];
  // Each earlier term as a short statement that adds up — same as the website's LOI.
  const R = (n) => Math.round(Number(n) || 0);
  const historyHtml = H.length ? `
    <div class="tc-header">Investment History · ${H.length} earlier term${H.length === 1 ? '' : 's'}:</div>
    ${H.map((t) => {
      const principal = R(t.principal), earned = R(t.interest_earned), toHim = Math.max(R(t.interest_to_investor), 0);
      const back = R(t.principal_returned), fresh = R(t.fresh_money), renewed = R(t.renewed_with);
      const lines = [['', 'Principal invested', principal]];
      if (earned) lines.push(['+', 'Interest earned', earned]);
      const paidOn = t.paid_at_renewal ? ` (paid ${fmtDate(t.paid_at_renewal)})` : '';
      if (toHim) lines.push(['−', (t.paid_at_renewal ? 'Interest paid to him' : 'Interest to be paid to him') + paidOn, toHim]);
      if ((earned || toHim) && (fresh || back)) lines.push(['=', 'With us at the end of the term', principal + earned - toHim, 'sub']);
      if (fresh) lines.push(['+', 'New money added', fresh]);
      if (back) lines.push(['−', (t.paid_at_renewal ? 'Principal paid back to him' : 'Principal to be paid back to him') + paidOn, back]);
      lines.push(['=', 'Renewed with', renewed, 'total']);
      return `<div class="hist-box">
        <div class="hist-title">${esc(String(t.label || '').split(' · ')[0].toUpperCase())} · ${esc(fmtDate(t.start))} to ${esc(fmtDate(t.maturity))}</div>
        <table class="hist-st">${lines.map(([sign, label, val, kind]) => `<tr class="${kind || ''}"><td class="sg ${sign === '+' ? 'plus' : sign === '−' ? 'minus' : ''}">${sign}</td><td>${esc(label)}</td><td class="v">Rs. ${esc(money(val))}</td></tr>`).join('')}</table>
      </div>`;
    }).join('')}
    ${opts.nextTerm ? `<div class="hist-next"><b>This LOI: ${esc(opts.nextTerm.label)} · ${esc(fmtDate(opts.nextTerm.start))} – ${esc(fmtDate(opts.nextTerm.maturity))}</b><b>Rs. ${esc(money(opts.nextTerm.principal))}</b></div>` : ''}` : '';

  const termsHtml = sectionsFor(scheme).map((sec) => `
    <div class="tc-box">
      <div class="tc-title">${esc(sec.title)}</div>
      ${sec.lines.map((l) => l ? `<div class="tc-line">${esc(l)}</div>` : '<div class="tc-gap"></div>').join('')}
    </div>
  `).join('');

  return `<html><head><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    body { font-family: Helvetica, Arial, sans-serif; color: #000; margin: 18px; font-size: 11px; }
    .title { background: #404040; color: #fff; text-align: center; font-weight: 700; font-size: 15px; padding: 8px 0; }
    table.hdr { width: 100%; border-collapse: collapse; }
    table.hdr td { border: 1px solid #000; padding: 5px 8px; width: 25%; }
    table.hdr tr.spacer td { border: none; height: 6px; padding: 0; }
    table.hdr .lbl { font-weight: 700; }
    .tc-header { background: #404040; color: #fff; font-weight: 700; font-size: 13px; padding: 6px 8px; margin-top: 10px; }
    table.sched { width: 100%; border-collapse: collapse; margin-top: 10px; }
    table.sched th { background: #2e4a78; color: #fff; font-size: 10px; text-align: left; padding: 6px 8px; }
    table.sched th:first-child { text-align: center; width: 30px; }
    table.sched td { border: 1px solid #ccc; padding: 5px 8px; font-size: 10px; }
    table.sched td.sched-no { text-align: center; font-weight: 700; color: #2e4a78; width: 30px; }
    table.sched td.amt { text-align: right; font-weight: 700; }
    table.sched .per { font-weight: 700; }
    table.sched .why { font-size: 9px; color: #64708a; margin-top: 2px; }
    .basis { display: flex; justify-content: space-between; gap: 10px; background: #edf2f9; color: #2e4a78; font-size: 10px; padding: 6px 8px; margin-top: 10px; border-radius: 4px; }
    table.sched tr.subtotal td { background: #edf2f9; border: 1px solid #5c7cac; font-weight: 700; color: #2e4a78; font-size: 11px; }
    .tc-box { border: 1px solid #000; border-top: none; padding: 6px 8px 8px; }
    .tc-title { font-weight: 700; margin-bottom: 4px; }
    .tc-line { margin: 2px 0; }
    .tc-gap { height: 6px; }
    .sign { display: flex; justify-content: space-between; margin-top: 26px; }
    .sign .box { width: 46%; }
    .sign .t { font-weight: 700; font-size: 11px; }
    .dateplace { margin-top: 30px; }
    .dateplace div { margin: 4px 0; }
    .hist-box { border: 1px solid #cedaeb; border-left: 4px solid #FF6B2B; background: #edf2f9; border-radius: 4px; padding: 6px 10px; margin-top: 8px; }
    .hist-title { font-weight: 700; color: #2e4a78; font-size: 11px; margin-bottom: 4px; }
    table.hist-st { width: 100%; border-collapse: collapse; font-size: 10px; }
    table.hist-st td { padding: 2px 4px; }
    table.hist-st td.sg { width: 14px; font-weight: 700; color: #2e4a78; }
    table.hist-st td.sg.plus { color: #1b7a45; } table.hist-st td.sg.minus { color: #be3c3c; }
    table.hist-st td.v { text-align: right; }
    table.hist-st tr.sub td { font-weight: 700; border-top: 1px solid #e2e8f0; }
    table.hist-st tr.total td { font-weight: 700; color: #2e4a78; border-top: 1px solid #5c7cac; font-size: 11px; }
    .hist-next { display: flex; justify-content: space-between; background: #edf2f9; color: #2e4a78; padding: 6px 10px; margin-top: 8px; border-radius: 4px; font-size: 11px; }
    .rev-badge { text-align: right; font-weight: 700; color: #FF6B2B; font-size: 11px; margin-bottom: 2px; }
  </style></head><body>
    ${opts.renewalNo ? `<div class="rev-badge">RENEWED LOI · R${esc(opts.renewalNo)}</div>` : opts.revisionNo ? `<div class="rev-badge">REVISED LOI · R${esc(opts.revisionNo)}</div>` : ''}
    <div class="title">INVESTMENT PROPOSAL FORM</div>
    <table class="hdr">${rowsHtml}</table>
    ${historyHtml}
    <div class="tc-header">Payout Schedule:</div>
    <div class="basis"><b>${esc(basis.line)}</b><span>${esc(basis.total)}</span></div>
    <table class="sched">
      <thead><tr><th>#</th><th>Period · working</th><th>Due Date</th><th style="text-align:right">Amount (Rs.)</th></tr></thead>
      <tbody>
        ${scheduleRowsHtml}
        <tr class="subtotal"><td colspan="3">MATURITY VALUE</td><td class="amt">Rs. ${esc(money(totalValue))}</td></tr>
      </tbody>
    </table>
    <div class="tc-header">Terms &amp; Conditions:</div>
    ${termsHtml}
    <div class="sign">
      <div class="box"><div class="t">Investor Name &amp; Signature</div></div>
      <div class="box"><div class="t">Borrower Name &amp; Signature</div></div>
    </div>
    <div class="dateplace">
      <div>Date</div>
      <div>Place</div>
    </div>
  </body></html>`;
}
