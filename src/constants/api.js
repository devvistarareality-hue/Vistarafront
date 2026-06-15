// ── Base URL ──────────────────────────────────────────────────────────
// Set PRODUCTION_URL to your Railway backend URL once deployed.
// Leave empty to fall back to local network discovery (dev mode).
const PRODUCTION_URL = 'https://vistararealtybackend-production.up.railway.app';

export let BASE_URL = PRODUCTION_URL || 'http://192.168.1.7:8000';

export const setBaseUrl = (url) => { BASE_URL = url; };
export const getBaseUrl = () => BASE_URL;

// If a production URL is set, skip local network discovery
export const isProductionMode = () => Boolean(PRODUCTION_URL);

export const ATTENDANCE_ENDPOINTS = {
  get dashboard() { return `${BASE_URL}/api/attendance/dashboard/`; },
  get monthly()   { return (year, month) => `${BASE_URL}/api/attendance/monthly/?year=${year}&month=${month}`; },
  get today()     { return `${BASE_URL}/api/attendance/today/`; },
  get signIn()    { return `${BASE_URL}/api/attendance/sign-in/`; },
  get signOut()   { return `${BASE_URL}/api/attendance/sign-out/`; },
};

export const USER_ENDPOINTS = {
  get list()   { return `${BASE_URL}/api/auth/users/`; },
  get detail() { return (id) => `${BASE_URL}/api/auth/users/${id}/`; },
};

export const COMPANY_ENDPOINTS = {
  get list()   { return `${BASE_URL}/api/company/all/`; },
  get detail() { return (id) => `${BASE_URL}/api/company/${id}/`; },
};
