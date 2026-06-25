import { navigationRef } from './navigationRef';

// Maps a notification `type` to the screen it should open.
const SCREEN_FOR_TYPE = {
  new_lead: 'SalesLeads',
  followup: 'SalesFollowUps',
  sv: 'SalesSiteVisits',
  sv_done: 'SalesSiteVisits',
  booking_approval: 'BookingApprovals',
  booking_approved: 'SalesMyConversions',
  booking_rejected: 'SalesMyConversions',
  closure: 'SalesMyConversions',
};

export function screenForNotifType(type) {
  return SCREEN_FOR_TYPE[type] || null;
}

// Navigate from outside the React tree (OneSignal push click). Handles both the
// regular user tree (Dashboard → Modules → screen) and the flat admin stack.
// Retries until the navigator is ready (covers cold-start from a notification).
export function navigateFromNotif(data, attempt = 0) {
  const screen = screenForNotifType(data && data.type);
  if (!screen) return;
  if (!navigationRef.isReady()) {
    if (attempt < 12) setTimeout(() => navigateFromNotif(data, attempt + 1), 400);
    return;
  }
  try {
    const names = (navigationRef.getRootState() || {}).routeNames || [];
    if (names.includes('Dashboard')) {
      navigationRef.navigate('Dashboard', { screen: 'Modules', params: { screen } });
    } else {
      navigationRef.navigate(screen);
    }
  } catch (e) {}
}
