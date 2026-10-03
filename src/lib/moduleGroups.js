// Departments: how the modules are grouped on the home screen — the app's copy of
// vistaraweb/src/lib/moduleGroups.js (same departments and parts; screens instead
// of web links).
//
// Underneath, every module stays exactly what it was — 'AR', 'Accounts & Finance',
// 'Task Allocation' keep their own access, menus, permissions and data. This only
// decides presentation: a handful of departments on the home screen, and a new
// module (Accounts Payable, say) becomes one more part inside one of them.

import { canSee } from './roles';

const hasAny = (mods, list) => list.some((m) => mods.includes(m));

export const GROUPS = [
  {
    key: 'admin', title: 'Administration', icon: 'shield-account-outline', tone: 'blue', adminOnly: true,
    desc: 'Users, companies, designations, backup and the activity log',
    parts: [
      { key: 'users', title: 'User Management', desc: 'Employees, roles and module access', screen: 'UserManagement', icon: 'account-cog-outline' },
      { key: 'companies', title: 'Company Management', desc: 'Workspaces, settings and company data', screen: 'CompanyManagement', icon: 'domain' },
      { key: 'designations', title: 'Designation Master', desc: 'Designations, menus and permissions', screen: 'DesignationMaster', icon: 'tag-multiple-outline' },
      { key: 'backup', title: 'Data Backup & Reset', desc: 'Excel snapshots, automatic backups, restore', screen: 'DataBackup', icon: 'database-export' },
      { key: 'activity', title: 'Activity Log', desc: 'Who changed what, and when', screen: 'ActivityLog', icon: 'history' },
    ],
  },
  {
    key: 'sales', title: 'Sales', icon: 'storefront-outline', tone: 'peach',
    desc: 'Leads, site visits, bookings and channel partners',
    parts: [
      { key: 'sales', module: 'Sales', title: 'Sales CRM', desc: 'Leads, follow-ups, site visits and bookings', screen: 'SalesCRM', icon: 'trending-up' },
      { key: 'cp', module: 'Channel Partner', title: 'Channel Partner', desc: 'Partner-sourced leads, visits and bookings', screen: 'ChannelPartnerHub', icon: 'handshake-outline' },
    ],
  },
  {
    key: 'finance', title: 'Accounts & Finance', icon: 'wallet-outline', tone: 'green',
    desc: 'Booking approvals, receivables and banks — payables next',
    parts: [
      { key: 'accounts', module: 'Accounts & Finance', title: 'Approvals & Bookings', desc: 'Sign off bookings and the bookings ledger',
        screen: 'ModuleHome', params: { module: 'Accounts & Finance', name: 'Accounts & Finance' }, icon: 'wallet-outline' },
      { key: 'ar', module: 'AR', title: 'Accounts Receivable', desc: 'Collections, dues, ageing, cancellations', screen: 'ARDashboard', icon: 'cash-multiple' },
      // Its own module — ticked per person in User Management; AR users still pick a
      // bank in Record Payment, but only those ticked open Bank Master.
      { key: 'banks', module: 'Bank Master', screen: 'bank.screen.list', title: 'Bank Master', desc: 'Your banks, balances and statements', screen: 'ARBanks', icon: 'bank-outline' },
      { key: 'ap', title: 'Accounts Payable', desc: 'Vendor bills and payments', soon: true, icon: 'receipt' },
    ],
  },
  {
    key: 'hr', title: 'HR', icon: 'account-group-outline', tone: 'blue',
    desc: 'People, attendance and tasks',
    parts: [
      { key: 'hr', module: 'HR', title: 'People & Attendance', desc: 'People, org chart, attendance and leave',
        screen: 'ModuleHome', params: { module: 'HR', name: 'HR' }, icon: 'account-group-outline' },
      { key: 'execution', module: 'Task Allocation', title: 'Task Allocation', desc: 'Assign, track and close out tasks across every team', screen: 'TaskDashboard', icon: 'clipboard-check-outline' },
    ],
  },
  { key: 'purchase', title: 'Purchase', icon: 'cart-outline', tone: 'peach', desc: 'Vendors and purchase orders',
    parts: [{ key: 'purchase', module: 'Purchase', title: 'Purchase', desc: 'Vendors and purchase orders', screen: 'ModuleHome', params: { module: 'Purchase', name: 'Purchase' }, icon: 'cart-outline' }] },
  { key: 'land', title: 'Land', icon: 'terrain', tone: 'blue', desc: 'Land parcels and site portfolio',
    parts: [{ key: 'land', module: 'Land', title: 'Land', desc: 'Land parcels and site portfolio', screen: 'ModuleHome', params: { module: 'Land', name: 'Land' }, icon: 'terrain' }] },
  { key: 'club1000', title: 'Club 1000', icon: 'trending-up', tone: 'green', desc: 'Investors, schemes and payouts',
    parts: [{ key: 'club1000', module: 'Club 1000', title: 'Club 1000', desc: 'Investors, schemes and payouts', screen: 'Club1000Hub', icon: 'trending-up' }] },
];

// Every module, in department order — what User Management and Designation Master
// offer. A new module only has to be added to GROUPS above to appear in both.
export const ALL_MODULES = GROUPS.flatMap((g) => g.parts.map((p) => p.module)).filter(Boolean);


// Whether this person may open Bank Master: admins always; others when it is ticked
// for them in User Management. Mirrors receivables/permissions.has_bank_master_access.
export function hasBankMaster(user) {
  if (!user) return false;
  if (user.role === 'Admin' || user.is_staff) return true;
  return ['modules', 'manager_modules', 'admin_modules'].some((k) => (user[k] || []).includes('Bank Master'));
}

// asAdmin: the platform admin home, which has always offered every module. Otherwise
// the person's own modules (the employee home).
export function groupsFor(user, asAdmin) {
  const mods = asAdmin ? GROUPS.flatMap((g) => g.parts.map((p) => p.module)).filter(Boolean) : (user?.modules || []);
  return GROUPS.map((g) => {
    const parts = g.parts.filter((p) => (g.adminOnly ? asAdmin : p.soon || ((p.module ? mods.includes(p.module) : hasAny(mods, p.anyOf || [])) && canSee(user, p.screen))));
    const open = parts.filter((p) => !p.soon);
    // `modules`: the real modules among them — what decides whether a department has
    // one thing to open or several.
    return { ...g, parts, open, modules: g.adminOnly ? open : open.filter((p) => p.module) };
  }).filter((g) => g.open.length);
}

// Tapping a department: straight into its only module, or its own screen.
export function openGroup(navigation, g, asAdmin) {
  if (g.modules.length === 1) navigation.navigate(g.modules[0].screen, g.modules[0].params);
  else navigation.navigate('Department', { key: g.key, asAdmin: !!asAdmin });
}
