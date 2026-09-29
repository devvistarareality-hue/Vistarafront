import { navigationRef } from './navigationRef';
import store from '../redux/store';
import { can, canSee, isManagerRole } from '../lib/roles';

// Maps a notification `type` to the screen (+ params) it should open.
// booking_approved/rejected go to the booker's My Bookings (Booking → My Bookings),
// not My Conversions.
const ROUTE_FOR_TYPE = {
  new_lead: { screen: 'SalesLeads' },
  followup: { screen: 'SalesFollowUps' },
  sv: { screen: 'SalesSiteVisits' },
  sv_done: { screen: 'SalesSiteVisits' },
  booking_approval: { screen: 'BookingApprovals' },
  booking_approved: { screen: 'ClosureProjects', params: { initialView: 'mybookings' } },
  booking_rejected: { screen: 'ClosureProjects', params: { initialView: 'mybookings' } },
  booking_submitted: { screen: 'ClosureProjects', params: { initialView: 'mybookings' } },
  booking_update: { screen: 'BookingApprovals' },
  booking_cancelled: { screen: 'BookingApprovals' },
  accounts_booking_approved: { screen: 'ClosureProjects', params: { initialView: 'mybookings' } },
  accounts_booking_rejected: { screen: 'ClosureProjects', params: { initialView: 'mybookings' } },
  // Accounts & Finance: the approvals gate, and the bookings ledger for cancellations.
  accounts_booking_approval: { screen: 'ModuleApprovals', params: { module: 'Accounts & Finance', name: 'Accounts & Finance' } },
  accounts_booking_update: { screen: 'ModuleApprovals', params: { module: 'Accounts & Finance', name: 'Accounts & Finance' } },
  accounts_booking_cancelled: { screen: 'ModuleBookings', params: { module: 'Accounts & Finance', name: 'Accounts & Finance' } },
  // Accounts Receivable collections: follow-ups and the morning digest.
  ar_followup_assigned: { screen: 'ARCollections', params: { tab: 'followups' } },
  ar_followup_due: { screen: 'ARCollections', params: { tab: 'followups' } },
  ar_followup_overdue: { screen: 'ARCollections', params: { tab: 'followups' } },
  ar_collections_digest: { screen: 'ARCollections', params: { tab: 'overdue' } },
  ar_due_soon: { screen: 'ARCollections', params: { tab: 'upcoming' } },
  lead_transfer_requested: { screen: 'BookingApprovals' },
  lead_transfer_approved: { screen: 'SalesLeads' },
  lead_transfer_rejected: { screen: 'SalesLeads' },
  closure: { screen: 'ClosureProjects', params: { initialView: 'mybookings', initialTab: 'sold' } },
  followup_overdue: { screen: 'SalesFollowUps' },
  sv_overdue: { screen: 'SalesSiteVisits' },
  // availability_reminder intentionally unmapped — tapping just opens the app to the
  // dashboard, where the Mark-available toggle already lives.
  // Task Allocation: detail is a bottom sheet, not its own route, so all three
  // land on My Tasks (matching how the AR notifications pass a `tab` param
  // rather than a distinct screen).
  task_assigned: { screen: 'TaskList', params: { tab: 'my_tasks' } },
  task_comment: { screen: 'TaskList', params: { tab: 'my_tasks' } },
  task_due_soon: { screen: 'TaskList', params: { tab: 'my_tasks' } },
};

// Where a notification opens for THIS person. ROUTE_FOR_TYPE is the screen for
// someone who has it; a role without that screen (a telecaller has no Site Visits
// or Booking, a non-manager no Approvals) goes to its own equivalent instead —
// never to a screen its menu doesn't offer. Mirrors the website's bell.
export function routeForNotifType(type, user = store.getState()?.auth?.user) {
  const route = ROUTE_FOR_TYPE[type] || null;
  if (!route || !user) return route;
  const admin = user.role === 'Admin' || user.is_staff || (user.admin_modules || []).includes('Sales');
  const manager = admin || isManagerRole(user);
  const stmSide = manager || can(user, 'sales.pipeline.stm') || can(user, 'sales.pipeline.cp');
  const conversions = canSee(user, 'sales.screen.conversions')
    && (admin || can(user, 'sales.pipeline.telecalling') || stmSide);
  const visits = stmSide && canSee(user, 'sales.screen.sitevisits');
  const booking = stmSide && canSee(user, 'sales.screen.booking');
  const approvals = manager && canSee(user, 'sales.screen.approvals');
  const conv = (tab) => ({ screen: 'MyConversions', params: { initialTab: tab } });
  if (['sv', 'sv_overdue'].includes(type)) return visits ? route : conversions ? conv('upcoming') : null;
  if (type === 'sv_done') return visits ? route : conversions ? conv('sv') : null;
  if (type === 'closure') return conversions ? conv('closures') : booking ? route : null;
  if (route.screen === 'BookingApprovals') {
    return approvals ? route : booking ? { screen: 'ClosureProjects', params: { initialView: 'mybookings' } }
      : conversions ? conv('closures') : null;
  }
  if (route.screen === 'ClosureProjects') return booking ? route : conversions ? conv('closures') : null;
  return route;
}

// Navigate from outside the React tree (OneSignal push click). Handles both the
// regular user tree (Dashboard → Modules → screen) and the flat admin stack.
// Retries until the navigator is ready (covers cold-start from a notification).
function dispatchToRoute(route) {
  const names = (navigationRef.getRootState() || {}).routeNames || [];
  if (names.includes('Dashboard')) {
    // initial: false keeps ModulesList at the base of the Modules stack, so Back
    // (and tapping the Modules tab) pops target → ModulesList instead of leaving
    // the tab stuck on the target or showing a blank stack.
    navigationRef.navigate('Dashboard', {
      screen: 'Modules',
      params: { screen: route.screen, params: route.params, initial: false },
    });
  } else {
    navigationRef.navigate(route.screen, route.params);
  }
}

// Re-assert the deep-link until the target screen is actually focused. On a cold
// start (app launched by tapping a push), navigationRef becomes ready before the
// lazy Modules tab has mounted, so the first nested navigate gets dropped and we
// land on the Modules list. Re-checking the current route and re-dispatching wins
// that race; it stops as soon as we're on the target (or after ~4s).
function deepLink(route, attempt) {
  if (!navigationRef.isReady()) {
    if (attempt < 25) setTimeout(() => deepLink(route, attempt + 1), 250);
    return;
  }
  try { dispatchToRoute(route); } catch (e) {}
  if (attempt < 12) {
    setTimeout(() => {
      let cur = null;
      try { cur = navigationRef.getCurrentRoute(); } catch (e) {}
      if (!cur || cur.name !== route.screen) deepLink(route, attempt + 1);
    }, 300);
  }
}

export function navigateFromNotif(data) {
  const route = routeForNotifType(data && data.type);
  if (!route) return;
  deepLink(route, 0);
}
