// ── Staff hierarchy ───────────────────────────────────────────────────────────
// Seniority order, most senior first. Everything down to Manager carries manager
// authority, so a Director is never able to do less than a Manager reporting to
// them. Mirrors MANAGER_ROLES in the backend — keep the two in step.
// Kiosk is not a rank: it is the unattended self-booking account.
export const ROLE_HIERARCHY = ['Director', 'General Manager', 'Manager', 'Employee', 'Intern'];
export const MANAGER_ROLES = ['Director', 'General Manager', 'Manager'];

/** Manager or more senior (not Admin/staff — check those separately). */
export function isManagerRole(user) {
  return MANAGER_ROLES.includes(user?.role);
}

// ── What a person may do ─────────────────────────────────────────────────────
// Resolved by the server from their company's designation settings and sent with
// the login (`capabilities`). Same helper as the website's lib/moduleAccess.js.
// Falls back to the old designation text for a session signed in before this
// shipped, so nothing changes mid-session.
export function can(user, key) {
  const caps = user?.capabilities;
  if (Array.isArray(caps)) return caps.includes(key);
  const d = (user?.designation || '').toLowerCase();
  switch (key) {
    case 'sales.pipeline.telecalling': return d.includes('telecaller') || d.includes('tele caller');
    case 'sales.pipeline.stm': return d.includes('stm') || d.includes('sales team') || d.includes('sales executive');
    case 'sales.pipeline.cp': return d.includes('cp executive') || d.includes('channel partner');
    case 'sales.pipeline.cp_manager': return d.trim().startsWith('cp');
    case 'sales.lead.assign':
      return !(can(user, 'sales.pipeline.telecalling') || can(user, 'sales.pipeline.stm') || can(user, 'sales.pipeline.cp'));
    default: return true;   // module actions everyone could already do
  }
}

export const isTelecallerUser = (user) => can(user, 'sales.pipeline.telecalling');
export const isStmUser = (user) => can(user, 'sales.pipeline.stm');
export const isCpUser = (user) => can(user, 'sales.pipeline.cp');
