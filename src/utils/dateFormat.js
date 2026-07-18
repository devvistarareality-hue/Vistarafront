// Display-only formatting for ISO 'YYYY-MM-DD' strings coming from the API.
export function formatDMY(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = String(isoDate).split('-');
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}
