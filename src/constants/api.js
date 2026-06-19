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

export const SALES_ENDPOINTS = {
  // Dashboard
  get stats()      { return `${BASE_URL}/api/sales/stats/`; },
  // Leads
  get leads()      { return `${BASE_URL}/api/sales/leads/`; },
  get bulkDelete() { return `${BASE_URL}/api/sales/leads/bulk-delete/`; },
  lead: (id)       => `${BASE_URL}/api/sales/leads/${id}/`,
  get leadsImport(){ return `${BASE_URL}/api/sales/leads/import/`; },
  // Projects & Plots
  get projects()   { return `${BASE_URL}/api/sales/projects/`; },
  project: (id)    => `${BASE_URL}/api/sales/projects/${id}/`,
  get sources()    { return `${BASE_URL}/api/sales/sources/`; },
  get followUps()  { return `${BASE_URL}/api/sales/follow-ups/`; },
  followUp: (id)   => `${BASE_URL}/api/sales/follow-ups/${id}/`,
  get siteVisits() { return `${BASE_URL}/api/sales/site-visits/`; },
  siteVisit: (id)  => `${BASE_URL}/api/sales/site-visits/${id}/`,
  get closures()   { return `${BASE_URL}/api/sales/closures/`; },
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
  get distSettings(){ return `${BASE_URL}/api/sales/dist-settings/`; },
  get availability(){ return `${BASE_URL}/api/sales/availability/`; },
  get distWeight() { return `${BASE_URL}/api/sales/dist-weight/`; },
  get plots()           { return `${BASE_URL}/api/sales/plots/`; },
  plot: (id)            => `${BASE_URL}/api/sales/plots/${id}/`,
  source: (id)          => `${BASE_URL}/api/sales/sources/${id}/`,
  get metaWebhookConfig(){ return `${BASE_URL}/api/sales/webhooks/meta/config/`; },
  get metaMappings()    { return `${BASE_URL}/api/sales/webhooks/meta/mappings/`; },
};

// ── ERP Master ─────────────────────────────────────────────────────────────
export const ERP_MASTER = {
  get vendors()     { return `${BASE_URL}/api/erp/master/vendors/`; },
  vendor: (id)      => `${BASE_URL}/api/erp/master/vendors/${id}/`,
  get materials()   { return `${BASE_URL}/api/erp/master/materials/`; },
  material: (id)    => `${BASE_URL}/api/erp/master/materials/${id}/`,
  get projects()    { return `${BASE_URL}/api/erp/master/erp-projects/`; },
  project: (id)     => `${BASE_URL}/api/erp/master/erp-projects/${id}/`,
  get wbs()         { return `${BASE_URL}/api/erp/master/wbs/`; },
  wbsTree: (pid)    => `${BASE_URL}/api/erp/master/wbs/tree/${pid}/`,
  get docTrail()    { return `${BASE_URL}/api/erp/master/document-trail/`; },
};

// ── ERP Execution ──────────────────────────────────────────────────────────
export const ERP_EXECUTION = {
  get prs()               { return `${BASE_URL}/api/erp/execution/prs/`; },
  pr: (id)                => `${BASE_URL}/api/erp/execution/prs/${id}/`,
  prTransition: (id)      => `${BASE_URL}/api/erp/execution/prs/${id}/transition/`,
  prApprove: (id)         => `${BASE_URL}/api/erp/execution/prs/${id}/approve/`,
  get issues()            { return `${BASE_URL}/api/erp/execution/issues/`; },
  issue: (id)             => `${BASE_URL}/api/erp/execution/issues/${id}/`,
  get mbs()               { return `${BASE_URL}/api/erp/execution/mbs/`; },
  mb: (id)                => `${BASE_URL}/api/erp/execution/mbs/${id}/`,
  mbSubmit: (id)          => `${BASE_URL}/api/erp/execution/mbs/${id}/submit/`,
  mbCertify: (id)         => `${BASE_URL}/api/erp/execution/mbs/${id}/certify/`,
  get raBills()           { return `${BASE_URL}/api/erp/execution/ra-bills/`; },
  raBill: (id)            => `${BASE_URL}/api/erp/execution/ra-bills/${id}/`,
};

// ── ERP Purchase ───────────────────────────────────────────────────────────
export const ERP_PURCHASE = {
  get pos()         { return `${BASE_URL}/api/erp/purchase/pos/`; },
  po: (id)          => `${BASE_URL}/api/erp/purchase/pos/${id}/`,
  poStatus: (id)    => `${BASE_URL}/api/erp/purchase/pos/${id}/status/`,
};

// ── ERP Inventory ──────────────────────────────────────────────────────────
export const ERP_INVENTORY = {
  get grns()              { return `${BASE_URL}/api/erp/inventory/grns/`; },
  grn: (id)               => `${BASE_URL}/api/erp/inventory/grns/${id}/`,
  grnQC: (id)             => `${BASE_URL}/api/erp/inventory/grns/${id}/qc/`,
  get stockLedger()       { return `${BASE_URL}/api/erp/inventory/stock-ledger/`; },
  stockBalance: (pid)     => `${BASE_URL}/api/erp/inventory/stock-balance/${pid}/`,
};

// ── ERP Finance ────────────────────────────────────────────────────────────
export const ERP_FINANCE = {
  get invoices()          { return `${BASE_URL}/api/erp/finance/invoices/`; },
  invoice: (id)           => `${BASE_URL}/api/erp/finance/invoices/${id}/`,
  invoiceMatch: (id)      => `${BASE_URL}/api/erp/finance/invoices/${id}/run-match/`,
  invoiceApprove: (id)    => `${BASE_URL}/api/erp/finance/invoices/${id}/approve/`,
  get payments()          { return `${BASE_URL}/api/erp/finance/payments/`; },
  payment: (id)           => `${BASE_URL}/api/erp/finance/payments/${id}/`,
  get payables()          { return `${BASE_URL}/api/erp/finance/payables/`; },
};
