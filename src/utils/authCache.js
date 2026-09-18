// The signed-in user, kept locally so a relaunch can render the right screen on
// the first frame. Without it the app starts with `auth.user === null`, paints
// the login stack, and only swaps to the real home once /api/auth/me/ answers —
// the login flash the user sees when reopening the app.
//
// Only the profile is cached here; the tokens it belongs to already live in
// AsyncStorage, and the cache is ignored (and dropped) whenever they are gone.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const USER_CACHE_KEY = 'cached_user';

export const cacheUser = async (user) => {
  try { await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(user)); } catch (_) {}
};

export const clearCachedUser = async () => {
  try { await AsyncStorage.removeItem(USER_CACHE_KEY); } catch (_) {}
};

// Returns the cached user only when an access token is still present, so a
// half-cleared state can never resurrect a signed-out session.
export const readCachedUser = async () => {
  try {
    const [token, raw] = await Promise.all([
      AsyncStorage.getItem('access_token'),
      AsyncStorage.getItem(USER_CACHE_KEY),
    ]);
    if (!token) { if (raw) await clearCachedUser(); return null; }
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user && typeof user === 'object' && user.user_code ? user : null;
  } catch (_) {
    return null;
  }
};
