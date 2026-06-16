// ── Base URL ──────────────────────────────────────────────────────────
// Always tries local server first on startup; falls back to Railway
// if no local server is found on the network.
export const RAILWAY_URL = 'https://vistararealtybackend-production.up.railway.app';

export let BASE_URL = RAILWAY_URL;

export const setBaseUrl = (url) => { BASE_URL = url; };
export const getBaseUrl = () => BASE_URL;

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
