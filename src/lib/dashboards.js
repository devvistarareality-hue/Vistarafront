import { dashboardFor } from './roles';

// Which dashboard a person opens is pinned on their designation (Designation
// Master → Permissions → Dashboard), the same values the website reads. A screen
// keeps a map of the views it has built, keyed by the value declared in
// accounts/capabilities.py → DASHBOARDS:
//
//   const VIEWS = { club_manager: ManagerHub, club_employee: MyInvestorsHub };
//   const Pinned = pinnedDashboard(user, VIEWS);
//   if (Pinned) return <Pinned />;
//
// A key with no view yet falls through to the screen's own default, so an admin
// can pin a dashboard before it is written and nothing breaks.
export function pinnedDashboard(user, views) {
  const key = dashboardFor(user);
  return (key && views && views[key]) || null;
}

export default pinnedDashboard;
