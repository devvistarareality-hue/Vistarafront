import { navigationRef } from '../navigation/navigationRef';
import { getBaseUrl } from '../constants/api';

// The Channel Partner desk opens the same Sales screens, which call the same
// /api/sales/ endpoints as the Sales module. While the Channel Partner hub is in the
// screen stack, every call to our server says so (X-Nexora-Module: cp), and the
// server logs the change under Channel Partner (backend activity/recorder.py).
// Mirrors the web's moduleHeader() in constants/api.js.
function inStack(state, name) {
  if (!state || !state.routes) return false;
  return state.routes.some((r) => r.name === name || inStack(r.state, name));
}

export function moduleHeader() {
  try {
    if (navigationRef.isReady() && inStack(navigationRef.getRootState(), 'ChannelPartnerHub')) {
      return { 'X-Nexora-Module': 'cp' };
    }
  } catch (e) { /* navigation not ready — no module */ }
  return {};
}

// Screens build their own headers in many places, so the header is added once,
// here, for every request to our backend rather than in each of them.
export function installModuleHeader() {
  if (global.__nexoraModuleHeader) return;
  global.__nexoraModuleHeader = true;
  const original = global.fetch;
  global.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    const extra = moduleHeader();
    if (!extra['X-Nexora-Module'] || !url.startsWith(getBaseUrl())) return original(input, init);
    const h = init.headers;
    let headers;
    if (h && typeof h.set === 'function') { h.set('X-Nexora-Module', 'cp'); headers = h; }
    else headers = { ...(h || {}), ...extra };
    return original(input, { ...init, headers });
  };
}
