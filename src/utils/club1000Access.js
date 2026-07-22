// Club 1000 manager/access gating — mirrors web/src/lib/moduleAccess.js exactly
// so both clients agree on who counts as a "manager" for this module.

function isModuleAdmin(user) {
  return !!(user && user.role === 'Admin' && !user.is_staff && (user.modules || []).length === 1);
}

function isSuperAdmin(user) {
  if (!user) return false;
  if (user.is_staff) return true;
  // VRL company Admin is a platform super-admin UNLESS restricted to a single module.
  if (user.company_code === 'VRL' && user.role === 'Admin') return !isModuleAdmin(user);
  return false;
}

// Manager-level Club 1000 access: platform admins, company Admins, or anyone
// explicitly granted Club 1000 in their manager_modules or admin_modules.
export function isClub1000Manager(user) {
  if (!user) return false;
  return !!(
    user.is_staff || isSuperAdmin(user) || user.role === 'Admin'
    || (user.manager_modules || []).includes('Club 1000')
    || (user.admin_modules || []).includes('Club 1000')
  );
}

// Any Club 1000 access at all: manager-level, or plain module access.
export function hasClub1000Access(user) {
  if (!user) return false;
  return isClub1000Manager(user) || (user.modules || []).includes('Club 1000');
}
