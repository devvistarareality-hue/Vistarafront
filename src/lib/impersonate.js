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

const OWN = ['access_token', 'refresh_token', 'user'];
const key = (k) => `admin_${k}`;

/** The admin behind the current session, or null when this is an ordinary one. */
export async function impersonating() {
  try { return JSON.parse((await AsyncStorage.getItem('impersonated_by')) || 'null'); }
  catch { return null; }
}

export const startImpersonation = (userId) => async (dispatch) => {
  const res = await apiFetch(USER_ENDPOINTS.impersonate, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, platform: 'app' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Could not open that user’s view.');

  for (const k of OWN) {
    const v = await AsyncStorage.getItem(k);
    if (v !== null) await AsyncStorage.setItem(key(k), v);
    else await AsyncStorage.removeItem(key(k));
  }

  await AsyncStorage.setItem('access_token',  data.tokens.access);
  await AsyncStorage.setItem('refresh_token', data.tokens.refresh);
  await AsyncStorage.setItem('user', JSON.stringify(data.user));
  await AsyncStorage.setItem('impersonated_by', JSON.stringify(data.impersonated_by));
  dispatch({ type: LOGIN_SUCCESS, payload: data.user });
  return data;
};

/** Put the admin back in their own account. */
export const stopImpersonation = () => async (dispatch) => {
  let own = null;
  for (const k of OWN) {
    const v = await AsyncStorage.getItem(key(k));
    if (v !== null) await AsyncStorage.setItem(k, v); else await AsyncStorage.removeItem(k);
    await AsyncStorage.removeItem(key(k));
    if (k === 'user' && v) { try { own = JSON.parse(v); } catch {} }
  }
  await AsyncStorage.removeItem('impersonated_by');
  if (own) dispatch({ type: LOGIN_SUCCESS, payload: own });
  return own;
};
