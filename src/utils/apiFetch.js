import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../constants/api';
import store from '../redux/store';
import { LOGOUT } from '../redux/types/authTypes';

async function refreshAccessToken() {
  try {
    const refresh = await AsyncStorage.getItem('refresh_token');
    if (!refresh) return null;
    const res = await fetch(`${getBaseUrl()}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    await AsyncStorage.setItem('access_token', data.access);
    if (data.refresh) await AsyncStorage.setItem('refresh_token', data.refresh);
    return data.access;
  } catch {
    return null;
  }
}

// Drop-in replacement for fetch() — auto-refreshes on 401, logs out if refresh fails.
// Usage: const res = await apiFetch(url, { method: 'POST', body: JSON.stringify(data) });
export async function apiFetch(url, options = {}) {
  const token = await AsyncStorage.getItem('access_token');
  const buildHeaders = (t) => ({
    'Content-Type': 'application/json',
    ...options.headers,
    Authorization: `Bearer ${t}`,
  });

  let res = await fetch(url, { ...options, headers: buildHeaders(token) });

  if (res.status !== 401) return res;

  const newToken = await refreshAccessToken();
  if (newToken) {
    return fetch(url, { ...options, headers: buildHeaders(newToken) });
  }

  // Refresh failed — clear tokens and log out
  await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
  store.dispatch({ type: LOGOUT });
  return res;
}
