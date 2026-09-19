import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../constants/api';
import store from '../redux/store';
import { LOGOUT } from '../redux/types/authTypes';
import { clearAllCache } from './dataCache';

// A request that never comes back is worse than one that fails: the screen spins
// for ever with nothing to retry. Field staff are on 4G, so give every call a
// hard ceiling and surface a normal network error instead.
export const REQUEST_TIMEOUT_MS = 25000;

function fetchWithTimeout(url, options, ms = REQUEST_TIMEOUT_MS) {
  // AbortController exists in RN's fetch; the timer is cleared either way.
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => ctrl?.abort(), options?.timeout || ms);
  return fetch(url, { ...options, signal: ctrl?.signal })
    .catch((err) => {
      // An abort reads as a network failure to the caller, which is what it is.
      if (err?.name === 'AbortError') {
        const e = new Error('Request timed out. Check your connection and try again.');
        e.name = 'TimeoutError';
        throw e;
      }
      throw err;
    })
    .finally(() => clearTimeout(timer));
}

// Exactly one refresh at a time. Several requests 401ing together used to fire
// several refreshes; the server rotates the refresh token, so every loser of
// that race was left holding a dead token and the user was signed out at random.
let refreshInFlight = null;

function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const refresh = await AsyncStorage.getItem('refresh_token');
      if (!refresh) return null;
      const res = await fetchWithTimeout(`${getBaseUrl()}/api/auth/token/refresh/`, {
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
    } finally {
      // Cleared on the next tick so callers awaiting this promise all see the
      // same result before a new refresh can start.
      setTimeout(() => { refreshInFlight = null; }, 0);
    }
  })();
  return refreshInFlight;
}

// Drop-in replacement for fetch() — adds a timeout, auto-refreshes on 401 (once,
// however many requests fail together) and logs out if the refresh fails.
// Usage: const res = await apiFetch(url, { method: 'POST', body: JSON.stringify(data) });
export async function apiFetch(url, options = {}) {
  const token = await AsyncStorage.getItem('access_token');
  const buildHeaders = (t) => ({
    'Content-Type': 'application/json',
    ...options.headers,
    Authorization: `Bearer ${t}`,
  });

  let res = await fetchWithTimeout(url, { ...options, headers: buildHeaders(token) });

  // Any write invalidates the cached lists. Doing it here — rather than asking
  // every screen to remember — is why a stale list can't survive an approval,
  // a status change or a new booking.
  const method = (options.method || 'GET').toUpperCase();
  if (method !== 'GET' && res.ok) clearAllCache();

  if (res.status !== 401) return res;

  const newToken = await refreshAccessToken();
  if (newToken) {
    return fetchWithTimeout(url, { ...options, headers: buildHeaders(newToken) });
  }

  // Refresh failed — clear tokens and log out
  await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
  store.dispatch({ type: LOGOUT });
  return res;
}
