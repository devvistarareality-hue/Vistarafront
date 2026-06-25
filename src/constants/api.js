// ── Base URL ──────────────────────────────────────────────────────────
// Always tries local server first on startup; falls back to Railway
// if no local server is found on the network.
export const RAILWAY_URL = 'https://vistararealtybackend-production.up.railway.app';

export let BASE_URL = RAILWAY_URL;

export const setBaseUrl = (url) => { BASE_URL = url; };
export const getBaseUrl = () => BASE_URL;
// LOI document URL — already absolute when stored in Supabase; otherwise prefix the backend.
export const loiHref = (doc) => (!doc ? '' : (/^https?:\/\//.test(doc) ? doc : getBaseUrl() + doc));

export const ATTENDANCE_ENDPOINTS = {
  get dashboard() { return `${BASE_URL}/api/attendance/dashboard/`; },
  get monthly()   { return (year, month) => `${BASE_URL}/api/attendance/monthly/?year=${year}&month=${month}`; },
  get today()     { return `${BASE_URL}/api/attendance/today/`; },
  get signIn()    { return `${BASE_URL}/api/attendance/sign-in/`; },
  get signOut()   { return `${BASE_URL}/api/attendance/sign-out/`; },
  get modify()    { return `${BASE_URL}/api/attendance/modify/`; },
};

export const USER_ENDPOINTS = {
  get list()   { return `${BASE_URL}/api/auth/users/`; },
  get detail() { return (id) => `${BASE_URL}/api/auth/users/${id}/`; },
};

export const COMPANY_ENDPOINTS = {
  get list()   { return `${BASE_URL}/api/company/all/`; },
  get detail() { return (id) => `${BASE_URL}/api/company/${id}/`; },
};

export const NOTIFICATION_ENDPOINTS = {
  get list()    { return `${BASE_URL}/api/auth/notifications/`; },
  get readAll() { return `${BASE_URL}/api/auth/notifications/read/`; },
};

export const SALES_ENDPOINTS = {
  // Dashboard
  get stats()      { return `${BASE_URL}/api/sales/stats/`; },
  // Leads
  get leads()      { return `${BASE_URL}/api/sales/leads/`; },
  get bulkDelete() { return `${BASE_URL}/api/sales/leads/bulk-delete/`; },
  lead: (id)       => `${BASE_URL}/api/sales/leads/${id}/`,
  get leadsImport(){ return `${BASE_URL}/api/sales/leads/import/`; },
  get leadsImportTemplate(){ return `${BASE_URL}/api/sales/leads/import-template/`; },
  // Projects & Plots
  get projects()   { return `${BASE_URL}/api/sales/projects/`; },
  project: (id)    => `${BASE_URL}/api/sales/projects/${id}/`,
  get sources()    { return `${BASE_URL}/api/sales/sources/`; },
  get followUps()  { return `${BASE_URL}/api/sales/follow-ups/`; },
  followUp: (id)   => `${BASE_URL}/api/sales/follow-ups/${id}/`,
  get siteVisits() { return `${BASE_URL}/api/sales/site-visits/`; },
  siteVisit: (id)  => `${BASE_URL}/api/sales/site-visits/${id}/`,
  get closures()   { return `${BASE_URL}/api/sales/closures/`; },
  closureCancel: (id) => `${BASE_URL}/api/sales/closures/${id}/cancel/`,
  // Team/Users
  get telecallers(){ return `${BASE_URL}/api/sales/users/telecallers/?crm_role=telecaller`; },
  get stms()       { return `${BASE_URL}/api/sales/users/telecallers/?crm_role=stm`; },
  get usersSlim()  { return `${BASE_URL}/api/sales/users/slim/`; },
  get team()       { return `${BASE_URL}/api/sales/team/`; },
  teamMember: (id) => `${BASE_URL}/api/sales/team/${id}/`,
  // Distribution
  get distribute() { return `${BASE_URL}/api/sales/distribute/`; },
  get distLog()    { return `${BASE_URL}/api/sales/distribution-log/`; },
  get import_()    { return `${BASE_URL}/api/sales/leads/import/`; },
  get reports()    { return `${BASE_URL}/api/sales/reports/`; },
  get myTeam()     { return `${BASE_URL}/api/sales/my-team/`; },
  get bookings()   { return `${BASE_URL}/api/sales/bookings/`; },
  bookingLoiUrl: (id) => `${BASE_URL}/api/sales/bookings/${id}/loi-url/`,
  project(id)      { return `${BASE_URL}/api/sales/projects/${id}/`; },
  get distSettings(){ return `${BASE_URL}/api/sales/dist-settings/`; },
  get availability(){ return `${BASE_URL}/api/sales/availability/`; },
  get availabilityMe(){ return `${BASE_URL}/api/sales/availability/me/`; },
  get distWeight() { return `${BASE_URL}/api/sales/dist-weight/`; },
  get plots()           { return `${BASE_URL}/api/sales/plots/`; },
  get plotsBulk()       { return `${BASE_URL}/api/sales/plots/bulk/`; },
  get plotsBulkDelete() { return `${BASE_URL}/api/sales/plots/bulk-delete/`; },
  get plotsRenameType() { return `${BASE_URL}/api/sales/plots/rename-type/`; },
  plot: (id)            => `${BASE_URL}/api/sales/plots/${id}/`,
  get userProjects()    { return `${BASE_URL}/api/sales/user-projects/`; },
  source: (id)          => `${BASE_URL}/api/sales/sources/${id}/`,
  get metaWebhookConfig(){ return `${BASE_URL}/api/sales/webhooks/meta/config/`; },
  get metaMappings()    { return `${BASE_URL}/api/sales/webhooks/meta/mappings/`; },
};
