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
export function navigateFromNotif(data, attempt = 0) {
  const route = routeForNotifType(data && data.type);
  if (!route) return;
  if (!navigationRef.isReady()) {
    if (attempt < 12) setTimeout(() => navigateFromNotif(data, attempt + 1), 400);
    return;
  }
  try {
    const names = (navigationRef.getRootState() || {}).routeNames || [];
    if (names.includes('Dashboard')) {
      // initial: false keeps ModulesList at the base of the Modules stack, so Back
      // pops target → ModulesList instead of leaving the tab stuck on the target.
      navigationRef.navigate('Dashboard', {
        screen: 'Modules',
        params: { screen: route.screen, params: route.params, initial: false },
      });
    } else {
      navigationRef.navigate(route.screen, route.params);
    }
  } catch (e) {}
}
