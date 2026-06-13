// Returns status info for a follow-up date string ('YYYY-MM-DD')
export const getFollowupInfo = (dateStr) => {
  if (!dateStr) return null;

  const today   = new Date();
  today.setHours(0, 0, 0, 0);

  const followup = new Date(dateStr);
  followup.setHours(0, 0, 0, 0);

  const diff = Math.round((followup - today) / (1000 * 60 * 60 * 24));

  if (diff < 0)   return { status: 'overdue',  color: '#C62828', bg: '#FFEBEE', label: `Overdue ${Math.abs(diff)}d` };
  if (diff === 0) return { status: 'today',    color: '#E65100', bg: '#FFF3E0', label: 'Follow-up Today' };
  if (diff <= 3)  return { status: 'soon',     color: '#F57F17', bg: '#FFF8E1', label: `In ${diff} day${diff > 1 ? 's' : ''}` };
  return               { status: 'upcoming', color: '#2E7D32', bg: '#E8F5E9', label: `In ${diff} days` };
};

// Format 'YYYY-MM-DD' → '12 Jun 2026'
export const formatFollowupDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Date object → 'YYYY-MM-DD' string for API
export const toApiDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
