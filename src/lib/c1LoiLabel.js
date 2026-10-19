// Same as the website's lib/investorLOI.js loiBadge / loiPurpose.
// The stamp at the top right: which renewal this LOI starts ("RENEWAL 2 LOI"), or which
// revision of which term it is ("RENEWAL 2 · REVISION 1" — counted within that term).
export function loiBadge(opts = {}) {
  if (opts.redemption) {
    return opts.redemption.is_full ? 'REDEMPTION LOI' : 'PARTIAL REDEMPTION LOI';
  }
  if (opts.renewalNo) return `${(opts.nextTerm?.label || `Renewal ${opts.renewalNo}`).toUpperCase()} LOI`;
  if (opts.revisionNo) {
    const n = opts.termRevision || opts.revisionNo;
    return opts.termLabel ? `${opts.termLabel.toUpperCase()} · REVISION ${n}` : `REVISED LOI · REVISION ${n}`;
  }
  return '';
}

// What this LOI is for, for its file name.
export function loiPurpose(opts = {}) {
  if (opts.redemption) return opts.redemption.is_full ? 'Redemption' : 'Partial redemption';
  if (opts.renewalNo) return opts.nextTerm?.label || `Renewal ${opts.renewalNo}`;
  if (opts.revisionNo) return `${opts.termLabel ? `${opts.termLabel} ` : ''}Revision ${opts.termRevision || opts.revisionNo}`;
  return 'New investment';
}
