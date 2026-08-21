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
