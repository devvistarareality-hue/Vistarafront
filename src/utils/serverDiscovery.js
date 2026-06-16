import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

const PORT = 8000;
const PROBE_PATH = '/api/attendance/today/';
const CACHE_KEY = '@vistara_server_url';
const TIMEOUT_MS = 1200;

// Returns true only if the server responds with JSON (Django DRF signature)
async function probe(ip) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(`http://${ip}:${PORT}${PROBE_PATH}`, { signal: controller.signal });
    clearTimeout(id);
    const ct = res.headers.get('content-type') || '';
    return ct.includes('application/json');
  } catch {
    return false;
  }
}

async function scanSubnet(subnet) {
  return new Promise((resolve) => {
    let settled = false;
    let remaining = 254;

    for (let i = 1; i <= 254; i++) {
      const ip = `${subnet}.${i}`;
      probe(ip).then((ok) => {
        remaining--;
        if (ok && !settled) {
          settled = true;
          resolve(`http://${ip}:${PORT}`);
        } else if (remaining === 0 && !settled) {
          settled = true;
          resolve(null);
        }
      });
    }
  });
}

export async function discoverServer(fallback) {
  // 1. Try cached local URL first (avoids full scan when WiFi hasn't changed)
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached && !cached.startsWith('https://')) {
      const ip = cached.replace('http://', '').replace(`:${PORT}`, '');
      if (await probe(ip)) return cached;
      // Cache is stale — clear it and continue
      await AsyncStorage.removeItem(CACHE_KEY);
    }
  } catch {}

  // 2. Scan local subnet for a running Django server
  let subnet = null;
  try {
    const deviceIp = await Network.getIpAddressAsync();
    if (deviceIp && deviceIp !== '0.0.0.0') {
      subnet = deviceIp.split('.').slice(0, 3).join('.');
    }
  } catch {}

  if (subnet) {
    const found = await scanSubnet(subnet);
    if (found) {
      try { await AsyncStorage.setItem(CACHE_KEY, found); } catch {}
      return found;
    }
  }

  // 3. No local server found — use Railway (production fallback)
  return fallback;
}
