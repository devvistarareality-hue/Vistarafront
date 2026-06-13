export const BASE_URL = 'http://192.168.1.9:8000';

export const ATTENDANCE_ENDPOINTS = {
  dashboard: `${BASE_URL}/api/attendance/dashboard/`,
  monthly:   (year, month) => `${BASE_URL}/api/attendance/monthly/?year=${year}&month=${month}`,
};

export const PRESALES_ENDPOINTS = {
  dashboard: `${BASE_URL}/api/presales/dashboard/`,
  team:      `${BASE_URL}/api/presales/team/`,

  projects:       `${BASE_URL}/api/presales/projects/`,
  projectDetail:  (id) => `${BASE_URL}/api/presales/projects/${id}/`,

  leads:          `${BASE_URL}/api/presales/leads/`,
  leadDetail:     (id) => `${BASE_URL}/api/presales/leads/${id}/`,
  leadStatus:     (id) => `${BASE_URL}/api/presales/leads/${id}/status/`,
  leadTransfer:   (id) => `${BASE_URL}/api/presales/leads/${id}/transfer/`,
  leadFollowup:       (id) => `${BASE_URL}/api/presales/leads/${id}/followup/`,
  leadBulkUpload:     `${BASE_URL}/api/presales/leads/bulk-upload/`,
  leadUploadTemplate: `${BASE_URL}/api/presales/leads/upload-template/`,
};
