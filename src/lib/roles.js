// Who counts as a platform super-admin. Mirrors web/src/lib/moduleAccess.js and
// backend/accounts/views.py::is_platform_admin — keep all three in step.
//
// This used to live inside utils/club1000Access.js, which was fine while Club
// 1000 was the only caller. It is not a Club 1000 rule, so it sits here now and
// that file imports it.

export function isModuleAdmin(user) {
  return !!(user && user.role === 'Admin' && !user.is_staff && (user.modules || []).length === 1);
}

export function isSuperAdmin(user) {
  if (!user) return false;
  if (user.is_staff) return true;
  // VRL company Admin is a platform super-admin UNLESS restricted to a single module.
  if (user.company_code === 'VRL' && user.role === 'Admin') return !isModuleAdmin(user);
  return false;
}
