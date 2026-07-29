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
export function buildInvestorLOIHtml(investor, scheme) {
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
    ['ROI (PER ANNUM)', `${scheme.total_return_pct}%`, '', ''],
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
    .tc-box { border: 1px solid #000; border-top: none; padding: 6px 8px 8px; }
    .tc-title { font-weight: 700; margin-bottom: 4px; }
    .tc-line { margin: 2px 0; }
    .tc-gap { height: 6px; }
    .sign { display: flex; justify-content: space-between; margin-top: 26px; }
    .sign .box { width: 46%; }
    .sign .t { font-weight: 700; font-size: 11px; }
    .dateplace { margin-top: 30px; }
    .dateplace div { margin: 4px 0; }
  </style></head><body>
    <div class="title">INVESTMENT PROPOSAL FORM</div>
    <table class="hdr">${rowsHtml}</table>
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
