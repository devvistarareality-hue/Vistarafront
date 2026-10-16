// Sign-in tokens live in the phone's secure storage (Android Keystore / iOS Keychain),
// not in plain AsyncStorage. About 60 places across the app read and write them through
// AsyncStorage, so rather than change each one, this routes just those keys to
// SecureStore from one place — imported first thing in index.js, before anything reads
// a token. Every other key stays in AsyncStorage exactly as before.
//
// A token saved by an older version is moved across the first time it is read, so
// nobody is signed out by the update. If secure storage ever fails, the token falls back
// to AsyncStorage so sign-in keeps working.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// access_token / refresh_token, and the admin_ copies kept while viewing as someone.
const TOKEN = /^(admin_)?(access|refresh)_token$/;
const isToken = (k) => typeof k === 'string' && TOKEN.test(k);

const orig = {
  getItem: AsyncStorage.getItem.bind(AsyncStorage),
  setItem: AsyncStorage.setItem.bind(AsyncStorage),
  removeItem: AsyncStorage.removeItem.bind(AsyncStorage),
  multiGet: AsyncStorage.multiGet.bind(AsyncStorage),
  multiSet: AsyncStorage.multiSet.bind(AsyncStorage),
  multiRemove: AsyncStorage.multiRemove.bind(AsyncStorage),
};

// Every API call reads the access token; the keystore is slower than AsyncStorage, so
// what has been read or written once is kept in memory.
const memo = new Map();

async function getToken(k) {
  if (memo.has(k)) return memo.get(k);
  let v = null;
  try {
    v = await SecureStore.getItemAsync(k);
    if (v == null) {
      const legacy = await orig.getItem(k);
      if (legacy != null) {
        if (legacy) await SecureStore.setItemAsync(k, legacy);
        await orig.removeItem(k);
        v = legacy;
      }
    }
  } catch (_) {
    v = await orig.getItem(k);
  }
  memo.set(k, v);
  return v;
}

async function setToken(k, v) {
  const val = v == null ? null : String(v);
  memo.set(k, val || null);
  try {
    if (val) await SecureStore.setItemAsync(k, val);
    else await SecureStore.deleteItemAsync(k);
    await orig.removeItem(k);
  } catch (_) {
    memo.delete(k);
    if (val) await orig.setItem(k, val); else await orig.removeItem(k);
  }
}

async function removeToken(k) {
  memo.set(k, null);
  try { await SecureStore.deleteItemAsync(k); } catch (_) { memo.delete(k); }
  await orig.removeItem(k);
}

AsyncStorage.getItem = (k, ...rest) => (isToken(k) ? getToken(k) : orig.getItem(k, ...rest));
AsyncStorage.setItem = (k, v, ...rest) => (isToken(k) ? setToken(k, v) : orig.setItem(k, v, ...rest));
AsyncStorage.removeItem = (k, ...rest) => (isToken(k) ? removeToken(k) : orig.removeItem(k, ...rest));

AsyncStorage.multiGet = async (keys, ...rest) => {
  const plain = keys.filter((k) => !isToken(k));
  const got = new Map(plain.length ? await orig.multiGet(plain, ...rest) : []);
  for (const k of keys) if (isToken(k)) got.set(k, await getToken(k));
  return keys.map((k) => [k, got.has(k) ? got.get(k) : null]);
};
AsyncStorage.multiSet = async (pairs, ...rest) => {
  const plain = pairs.filter(([k]) => !isToken(k));
  if (plain.length) await orig.multiSet(plain, ...rest);
  for (const [k, v] of pairs) if (isToken(k)) await setToken(k, v);
};
AsyncStorage.multiRemove = async (keys, ...rest) => {
  const plain = keys.filter((k) => !isToken(k));
  if (plain.length) await orig.multiRemove(plain, ...rest);
  for (const k of keys) if (isToken(k)) await removeToken(k);
};
