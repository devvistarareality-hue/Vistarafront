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

// Which menu items this person sees. `screens` is null unless their company set the
// menu for their designation, in which case the old role-based rules still decide.
export function canSee(user, key) {
  // A tile with no screen key isn't something an admin can switch off (the Log
  // tile), so it always shows.
  if (!key) return true;
  const screens = user?.screens;
  if (!Array.isArray(screens)) return true;
  // A designation belongs to one module, but its people may hold others — a CFO
  // with Sales and Land. The saved menu answers only for the modules it was
  // configured for; the rest keep their default menu. Same rule the server
  // applies in can_see_screen, so the app and the API agree.
  const named = user?.screen_modules;
  if (Array.isArray(named) && !named.includes(moduleOfScreen(key))) return true;
  return screens.includes(key);
}

// Which module a menu key belongs to, read off its prefix. Mirrors SCREEN_MODULE
// in the backend's capabilities.py.
const SCREEN_PREFIX = {
  sales: 'Sales', cp: 'Channel Partner', hr: 'HR', accounts: 'Accounts & Finance',
  ar: 'AR', execution: 'Task Allocation', purchase: 'Purchase', land: 'Land', club: 'Club 1000',
};
export function moduleOfScreen(key) {
  return SCREEN_PREFIX[String(key || '').split('.')[0]] || '';
}

// Which dashboard opens: '' means decide from their permissions, as before.
// `module` also honours what their ROLE opens there — what an admin set with
// "Copy to role" on that module's Dashboard. The designation's own pin wins.
export const dashboardFor = (user, module) =>
  user?.dashboard || (module && user?.role_dashboards?.[module]) || '';
