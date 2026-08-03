// Investment Proposal Form (Club 1000 LOI) as HTML → fed to expo-print
// (Print.printToFileAsync) on mobile. Faithful match of the web jsPDF version
// (vistaraweb/src/lib/investorLOI.js) — same header table, same static
// Terms & Conditions text, same signature blocks.

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN');

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

// Principal + full-tenure interest, day-count basis — mirrors
// backend/club1000/services.py::maturity_value exactly. investor.maturity_date
// may not exist yet (e.g. the Add Investor preview, before the row is
// created), so it's derived from investment_date + scheme.tenure_months
// when missing.
function computeMaturityValue(investor, scheme) {
  const principal = Number(investor.amount_invested) || 0;
  const pct = Number(investor.total_return_pct) || 0;
  const maturityDateStr = investor.maturity_date || addMonthsISO(investor.investment_date, scheme.tenure_months);
  if (!investor.investment_date || !maturityDateStr) return principal;
  const start = new Date(`${investor.investment_date}T00:00:00`);
  const end = new Date(`${maturityDateStr}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return principal;
  const days = Math.round((end - start) / 86400000);
  return principal + principal * (pct / 100) * (days / 365);
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
function prorateInstalments(dates, investmentDateStr, principal, totalReturnPct) {
  const dailyRate = (principal * totalReturnPct) / 100 / 365;
  let prev = new Date(`${investmentDateStr}T00:00:00`);
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
    const amounts = prorateInstalments(dates, investor.investment_date, principal, pct);
    entries = dates.map((due_date, i) => ({ due_date, amount_due: amounts[i], payout_type: 'interest' }));
    entries.push({ due_date: maturityDateStr, amount_due: principal, payout_type: 'maturity' });
  } else {
    // Maturity cadence — a single lump-sum instalment (principal + full return).
    entries = [{ due_date: maturityDateStr, amount_due: totalValue, payout_type: 'maturity' }];
  }

  let n = 0;
  return entries.map((e) => {
    const amt = Number(e.amount_due) || 0;
    const isPrincipalRow = e.payout_type === 'maturity' && isRecurring;
    if (!isPrincipalRow) n += 1;
    return { no: isPrincipalRow ? 'P' : n, date: e.due_date, amt };
  });
}

const SECTIONS = [
  { title: '1. PREMATURE EXIT OPTION:', lines: [
    'Rise - No premature redumption can be made during tenure of investment',
    'BuyBack - Premature redumption can be made after completion of 1 year from date of innvestment*',
    'Equity - No premature redumption can be made during tenure of investment',
    '',
    '*Wherever premature redemption is applicable & client excercised the same then ROI is set to 1% per month',
    'receivable to investor from the date of investment till the date of early redumption',
  ] },
  { title: '2. TENURE AND LOCK-IN PERIOD:', lines: [
    '- The tenure of investment shall be as mentioned above from the date of receipt of funds',
    '- The Investment shall be subject to a lock-in period as mentioned above, during which the Investor shall not withdraw the Investment Amount',
    '- Upon completion of tenure as mentioned above, investment may be renewed on mutually agreed terms through written consent of both Parties',
  ] },
  { title: '3. INTEREST AND PAYOUT TERMS:', lines: [
    '- The Borrower agrees to pay interest at the rate as mentioned above on the Investment Amount',
    '- Interest shall be payable at a frequency as mentioned above',
    '- Interest shall be paid within 7 days from the end of frequency period of interest amount as mentioned above',
    '- Principal amount shall be paid within 7 days from the end of frequency period of principal amount as mentioned above',
  ] },
  { title: '4. DEFAULT:', lines: [
    'In case of Failure to pay interest, or Failure to repay principal upon maturity, the Investor shall have the right to Present the Post-Dated Cheque (PDC) for encashment',
  ] },
];

// investor: InvestorListSerializer shape (plus a reserved loi_no). scheme: SchemeSerializer shape.
// opts.revisionNo: when set, stamps a "REVISED LOI · Rn" watermark (this LOI
// proposes changed terms on an already-approved investor).
export function buildInvestorLOIHtml(investor, scheme, opts = {}) {
  const principalFreq = scheme.principal_payout === 'maturity' ? 'AT END OF TENURE' : (scheme.principal_payout || '—').toUpperCase();
  const returnFreq = (investor.interest_payout || '').toUpperCase() || '—';
  const prematureExit = scheme.premature_redemption_allowed
    ? `AFTER ${scheme.premature_redemption_lock_months || 0} MONTHS (${scheme.premature_redemption_rate_pct_per_month}%/MONTH)`
    : 'NA';
  const security = investor.security || 'NA';

  const rows = [
    ['LOI NO', investor.loi_no || '—', 'NAME', investor.name || '—'],
    ['LOI DATE', fmtDate(new Date().toISOString().slice(0, 10)), 'SCHEME', scheme.name || '—'],
    null,
    ['INVESTMENT AMOUNT', money(investor.amount_invested), 'PRICIPAL PAY OUT FREQUENCY', principalFreq],
    ['DATE OF INVESTMENT', fmtDate(investor.investment_date), 'RETURN PAY OUT FREQUENCY', returnFreq],
    ['ROI (PER ANNUM)', `${investor.total_return_pct}%`, '', ''],
    null,
    ['TENURE', tenureLabel(scheme.tenure_months), 'PREMATURE EXIT OPTION', prematureExit],
    ['LOCK IN PERIOD', tenureLabel(scheme.premature_redemption_lock_months), 'SECURITY', security],
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
  const scheduleRowsHtml = scheduleRows.map((r) => `
    <tr>
      <td class="sched-no">${esc(r.no)}</td>
      <td>${esc(fmtDate(r.date))}</td>
      <td class="amt">Rs. ${esc(money(r.amt))}</td>
    </tr>
  `).join('');

  const termsHtml = SECTIONS.map((sec) => `
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
    .rev-badge { text-align: right; font-weight: 700; color: #FF6B2B; font-size: 11px; margin-bottom: 2px; }
  </style></head><body>
    ${opts.renewalNo ? `<div class="rev-badge">RENEWED LOI · R${esc(opts.renewalNo)}</div>` : opts.revisionNo ? `<div class="rev-badge">REVISED LOI · R${esc(opts.revisionNo)}</div>` : ''}
    <div class="title">INVESTMENT PROPOSAL FORM</div>
    <table class="hdr">${rowsHtml}</table>
    <div class="tc-header">Payout Schedule:</div>
    <table class="sched">
      <thead><tr><th>#</th><th>Due Date</th><th style="text-align:right">Amount (Rs.)</th></tr></thead>
      <tbody>
        ${scheduleRowsHtml}
        <tr class="subtotal"><td colspan="2">MATURITY VALUE</td><td class="amt">Rs. ${esc(money(totalValue))}</td></tr>
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
