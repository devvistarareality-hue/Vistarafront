import { navigationRef } from './navigationRef';

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
  lead_transfer_requested: { screen: 'BookingApprovals' },
  lead_transfer_approved: { screen: 'SalesLeads' },
  lead_transfer_rejected: { screen: 'SalesLeads' },
  closure: { screen: 'SalesMyConversions' },
  followup_overdue: { screen: 'SalesFollowUps' },
  sv_overdue: { screen: 'SalesSiteVisits' },
  // availability_reminder intentionally unmapped — tapping just opens the app to the
  // dashboard, where the Mark-available toggle already lives.
};

export function routeForNotifType(type) {
  return ROUTE_FOR_TYPE[type] || null;
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
