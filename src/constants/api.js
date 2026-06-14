export let BASE_URL = 'http://192.168.1.7:8000';

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
  get list()        { return `${BASE_URL}/api/auth/users/`; },
  get detail()      { return (id) => `${BASE_URL}/api/auth/users/${id}/`; },
};

export const PRESALES_ENDPOINTS = {
  get dashboard()           { return `${BASE_URL}/api/presales/dashboard/`; },
  get team()                { return `${BASE_URL}/api/presales/team/`; },

  get projects()            { return `${BASE_URL}/api/presales/projects/`; },
  get projectDetail()       { return (id) => `${BASE_URL}/api/presales/projects/${id}/`; },

  get leads()               { return `${BASE_URL}/api/presales/leads/`; },
  get leadDetail()          { return (id) => `${BASE_URL}/api/presales/leads/${id}/`; },
  get leadStatus()          { return (id) => `${BASE_URL}/api/presales/leads/${id}/status/`; },
  get leadTransfer()        { return (id) => `${BASE_URL}/api/presales/leads/${id}/transfer/`; },
  get leadFollowup()        { return (id) => `${BASE_URL}/api/presales/leads/${id}/followup/`; },
  get leadBulkUpload()      { return `${BASE_URL}/api/presales/leads/bulk-upload/`; },
  get leadUploadTemplate()  { return `${BASE_URL}/api/presales/leads/upload-template/`; },
};
