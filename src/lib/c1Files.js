// Club 1000 PDFs leave the phone with a name that says what they are:
// LOI_RISE-043_Prince_Test_2_Renewal_2.pdf, Statement_RISE-043_Prince_Test_2.pdf.
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { apiFetch } from '../utils/apiFetch';
import { CLUB1000_ENDPOINTS } from '../constants/api';
import { loiPurpose } from './c1LoiLabel';

const clean = (parts) => parts.filter(Boolean).map((x) => String(x).trim()).join('_')
  .replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '_');

// What the LOI is for: the renewal it starts, a revision, or a new investment.
export function loiFileName(investor, opts = {}) {
  return `LOI_${clean([investor.loi_no, investor.name, loiPurpose(opts)])}.pdf`;
}

// Share a printed PDF under `name` (expo-print gives it a random one).
export async function sharePdfNamed(uri, name) {
  let out = uri;
  try {
    const dest = `${FileSystem.cacheDirectory}${name}`;
    await FileSystem.deleteAsync(dest, { idempotent: true });
    await FileSystem.copyAsync({ from: uri, to: dest });
    out = dest;
  } catch (_) {}
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(out, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: name });
  } else {
    await Print.printAsync({ uri: out });
  }
}

// The investor statement (the Ledger, term by term) — the server's page, as a PDF.
export async function shareInvestorStatement(investor) {
  try {
    const r = await apiFetch(CLUB1000_ENDPOINTS.investorStatement(investor.id));
    if (!r.ok) return 'Could not prepare the statement.';
    const { uri } = await Print.printToFileAsync({ html: await r.text() });
    await sharePdfNamed(uri, `Statement_${clean([investor.loi_no, investor.name])}.pdf`);
    return '';
  } catch (_) {
    return 'Could not prepare the statement. Check your connection.';
  }
}
