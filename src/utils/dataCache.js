// In-memory cache for list screens, mirroring the website's sc_* cache.
//
// 23 screens call load() from useFocusEffect, so every back-navigation refetched
// everything and showed a spinner. Screens can now paint the last result at once
// and refresh behind it — instant on return, still correct within seconds.
//
// Memory only, on purpose: it dies with the process, so a cold start is always a
// real fetch, and nothing user-scoped is written to disk. Keys must include the
// company/filter they belong to (see key()), or one user's data can surface under
// another's filters.

const TTLS = {
  visits: 60 * 1000,
  closures: 60 * 1000,
  followups: 45 * 1000,
  bookings: 45 * 1000,
  projects: 5 * 60 * 1000,
  plots: 60 * 1000,
  team: 2 * 60 * 1000,
};
const DEFAULT_TTL = 30 * 1000;

const store = new Map();

const ttlFor = (key) => TTLS[key] ?? TTLS[String(key).split(':')[0]] ?? DEFAULT_TTL;

// Build a cache key from a name plus whatever scopes the request (company id,
// filters, tab). Anything that changes the response must be in here.
export const key = (name, ...parts) => [name, ...parts.filter((p) => p !== undefined && p !== null && p !== '')].join(':');

// Cached value only while fresh.
export function getCache(k) {
  const hit = store.get(k);
  if (!hit) return null;
  if (Date.now() - hit.ts > ttlFor(k)) { store.delete(k); return null; }
  return hit.data;
}

// Cached value even when stale, plus whether it is still fresh — lets a screen
// paint immediately and decide whether it still needs to refetch.
export function getCacheWithStatus(k) {
  const hit = store.get(k);
  if (!hit) return { data: null, fresh: false };
  return { data: hit.data, fresh: Date.now() - hit.ts <= ttlFor(k) };
}

export function setCache(k, data) {
  store.set(k, { ts: Date.now(), data });
}

export function bustCache(...keys) {
  keys.forEach((k) => {
    store.delete(k);
    // also drop scoped variants, e.g. bustCache('visits') clears visits:12:cp
    for (const existing of store.keys()) {
      if (existing === k || existing.startsWith(`${k}:`)) store.delete(existing);
    }
  });
}

// Every key is scoped by company and filters, never by user, so a sign-out must
// wipe the lot — otherwise the next person signing in on this device could see
// the previous session's lists.
export function clearAllCache() {
  store.clear();
}
