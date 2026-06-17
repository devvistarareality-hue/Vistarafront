import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import Constants from 'expo-constants';

const PORT = 8000;
const PROBE_PATHS = ['/api/sales/stats/', '/api/attendance/today/'];
const CACHE_KEY = '@vistara_server_url';
const TIMEOUT_MS = 600;

async function probe(ip) {
  for (const path of PROBE_PATHS) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(`http://${ip}:${PORT}${path}`, { signal: controller.signal });
      clearTimeout(id);
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) return true;
    } catch {
      // Continue to next path
    }
  }
  return false;
}

function getExpoHostIp() {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest2?.extra?.expoClient?.hostUri ||
      Constants.manifest?.debuggerHost ||
      '';
    const ip = hostUri.split(':')[0];
    return ip && ip !== 'localhost' && ip !== '127.0.0.1' ? ip : null;
  } catch {
    return null;
  }
}

// Scan IPs in parallel for speed
async function scanIpsParallel(ips) {
  const results = await Promise.all(ips.map(ip => probe(ip)));
  const foundIdx = results.findIndex(r => r === true);
  return foundIdx >= 0 ? ips[foundIdx] : null;
}

export async function discoverServer(fallback) {
  // 1. Try cached URL first (fastest, avoids scanning)
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached && !cached.startsWith('https://')) {
      const ip = cached.replace('http://', '').replace(`:${PORT}`, '');
      if (await probe(ip)) return cached;
      await AsyncStorage.removeItem(CACHE_KEY);
    }
  } catch {}

  // 2. Try Expo Metro host IP (most reliable for dev)
  const expoIp = getExpoHostIp();
  if (expoIp) {
    const ok = await probe(expoIp);
    if (ok) {
      const url = `http://${expoIp}:${PORT}`;
      try { await AsyncStorage.setItem(CACHE_KEY, url); } catch {}
      return url;
    }
  }

  // 3. Get device IP and scan subnet efficiently
  let deviceIp = null;
  try {
    deviceIp = await Network.getIpAddressAsync();
  } catch {}

  if (deviceIp && deviceIp !== '0.0.0.0') {
    const parts = deviceIp.split('.');
    const subnet = parts.slice(0, 3).join('.');
    const deviceLastOctet = parseInt(parts[3], 10);

    // Generate IPs to check - prioritize IPs close to device IP
    // This way we find the server faster
    const ipsToCheck = [];
    
    // Add nearby IPs first (within ±30 of device IP)
    for (let offset = 1; offset <= 30; offset++) {
      if (deviceLastOctet - offset > 0) ipsToCheck.push(`${subnet}.${deviceLastOctet - offset}`);
      if (deviceLastOctet + offset < 255) ipsToCheck.push(`${subnet}.${deviceLastOctet + offset}`);
    }

    // Scan in batches of 20 parallel requests
    const batchSize = 20;
    for (let i = 0; i < ipsToCheck.length; i += batchSize) {
      const batch = ipsToCheck.slice(i, i + batchSize);
      const found = await scanIpsParallel(batch);
      if (found) {
        const url = `http://${found}:${PORT}`;
        try { await AsyncStorage.setItem(CACHE_KEY, url); } catch {}
        return url;
      }
    }
  }

  // 4. No local server found — use Railway
  try { await AsyncStorage.removeItem(CACHE_KEY); } catch {}
  return fallback;
}
