/**
 * Viewing the app as another user, for a platform admin. Mirrors
 * web/src/lib/impersonate.js.
 *
 * The admin's own tokens are set aside under `admin_*` keys rather than thrown
 * away, so "Exit" is a local swap back — no second login, and no way to get
 * stranded in someone else's account if the network drops mid-exit.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { USER_ENDPOINTS } from '../constants/api';
import { apiFetch } from '../utils/apiFetch';
import { LOGIN_SUCCESS } from '../redux/types/authTypes';
import { errText } from './apiError';
import { loadUser } from '../redux/actions/authActions';

const OWN = ['access_token', 'refresh_token', 'user'];
const key = (k) => `admin_${k}`;

/** The admin behind the current session, or null when this is an ordinary one. */
export async function impersonating() {
  try { return JSON.parse((await AsyncStorage.getItem('impersonated_by')) || 'null'); }
  catch { return null; }
}

export const startImpersonation = (userId) => async (dispatch, getState) => {
  const res = await apiFetch(USER_ENDPOINTS.impersonate, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, platform: 'app' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errText(data, 'Could not open that user’s view.'));

  // Set the admin's own session aside. Their profile comes from the store: a normal
  // login keeps it in redux (and `cached_user`), never under a `user` key, so reading
  // that key stashed nothing and Exit had no one to switch back to.
  const me = getState()?.auth?.user;
  const [access, refresh] = await Promise.all([AsyncStorage.getItem('access_token'), AsyncStorage.getItem('refresh_token')]);
  await AsyncStorage.multiSet([
    [key('access_token'), access || ''], [key('refresh_token'), refresh || ''],
    [key('user'), me ? JSON.stringify(me) : ''],
  ]);

  await AsyncStorage.multiSet([
    ['access_token', data.tokens.access], ['refresh_token', data.tokens.refresh],
    ['impersonated_by', JSON.stringify(data.impersonated_by)],
  ]);
  dispatch({ type: LOGIN_SUCCESS, payload: data.user });
  return data;
};

/** Put the admin back in their own account. */
export const stopImpersonation = () => async (dispatch) => {
  const [[, access], [, refresh], [, rawUser]] = await AsyncStorage.multiGet(
    [key('access_token'), key('refresh_token'), key('user')]);
  await AsyncStorage.multiRemove(['impersonated_by', key('access_token'), key('refresh_token'), key('user')]);

  // Nothing set aside (a session from an older build, or Exit tapped twice): never
  // wipe the tokens in use — that is what signed the admin out. The session they are
  // in carries on as a normal one, and the profile is re-read from the server.
  if (!access) { dispatch(loadUser()); return null; }

  await AsyncStorage.multiSet([['access_token', access], ['refresh_token', refresh || '']]);
  let own = null;
  try { own = rawUser ? JSON.parse(rawUser) : null; } catch { own = null; }
  // Switch the screens back straight away from the saved profile; then confirm it
  // with the server (the profile is re-read with the restored token).
  if (own) dispatch({ type: LOGIN_SUCCESS, payload: own });
  dispatch(loadUser());
  return own;
};
