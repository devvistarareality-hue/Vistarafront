import AsyncStorage from '@react-native-async-storage/async-storage';
import { PRESALES_ENDPOINTS } from '../../constants/api';
import { normalizeLead, normalizeProject, normalizeTeam } from '../../utils/presalesNormalize';
import {
  PRESALES_DASHBOARD_REQUEST, PRESALES_DASHBOARD_SUCCESS, PRESALES_DASHBOARD_FAILURE,
  PRESALES_LEADS_REQUEST,     PRESALES_LEADS_SUCCESS,     PRESALES_LEADS_FAILURE,
  PRESALES_PROJECTS_REQUEST,  PRESALES_PROJECTS_SUCCESS,  PRESALES_PROJECTS_FAILURE,
  PRESALES_TEAM_REQUEST,      PRESALES_TEAM_SUCCESS,      PRESALES_TEAM_FAILURE,
} from '../types/presalesTypes';

const authHeaders = async () => {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
};

export const fetchPresalesDashboard = () => async (dispatch) => {
  dispatch({ type: PRESALES_DASHBOARD_REQUEST });
  try {
    const headers = await authHeaders();
    const res     = await fetch(PRESALES_ENDPOINTS.dashboard, { headers });
    const data    = await res.json();
    if (res.ok) {
      dispatch({
        type:    PRESALES_DASHBOARD_SUCCESS,
        payload: {
          stats:          data.stats,
          recentLeads:    (data.recent_leads    || []).map(normalizeLead),
          teamQueue:      (data.team_queue      || []).map(normalizeTeam),
          activeProjects: (data.active_projects || []).map(normalizeProject),
        },
      });
    } else {
      dispatch({ type: PRESALES_DASHBOARD_FAILURE, payload: data.detail || 'Failed to load.' });
    }
  } catch {
    dispatch({ type: PRESALES_DASHBOARD_FAILURE, payload: 'Network error.' });
  }
};

export const fetchPresalesLeads = () => async (dispatch) => {
  dispatch({ type: PRESALES_LEADS_REQUEST });
  try {
    const headers = await authHeaders();
    const res     = await fetch(PRESALES_ENDPOINTS.leads, { headers });
    const data    = await res.json();
    if (res.ok) {
      dispatch({ type: PRESALES_LEADS_SUCCESS, payload: data.map(normalizeLead) });
    } else {
      dispatch({ type: PRESALES_LEADS_FAILURE, payload: data.detail || 'Failed to load leads.' });
    }
  } catch {
    dispatch({ type: PRESALES_LEADS_FAILURE, payload: 'Network error.' });
  }
};

export const fetchPresalesProjects = () => async (dispatch) => {
  dispatch({ type: PRESALES_PROJECTS_REQUEST });
  try {
    const headers = await authHeaders();
    const res     = await fetch(PRESALES_ENDPOINTS.projects, { headers });
    const data    = await res.json();
    if (res.ok) {
      dispatch({ type: PRESALES_PROJECTS_SUCCESS, payload: data.map(normalizeProject) });
    } else {
      dispatch({ type: PRESALES_PROJECTS_FAILURE, payload: data.detail || 'Failed to load projects.' });
    }
  } catch {
    dispatch({ type: PRESALES_PROJECTS_FAILURE, payload: 'Network error.' });
  }
};

export const fetchPresalesTeam = () => async (dispatch) => {
  dispatch({ type: PRESALES_TEAM_REQUEST });
  try {
    const headers = await authHeaders();
    const res     = await fetch(PRESALES_ENDPOINTS.team, { headers });
    const data    = await res.json();
    if (res.ok) {
      dispatch({ type: PRESALES_TEAM_SUCCESS, payload: data.map(normalizeTeam) });
    } else {
      dispatch({ type: PRESALES_TEAM_FAILURE, payload: data.detail || 'Failed to load team.' });
    }
  } catch {
    dispatch({ type: PRESALES_TEAM_FAILURE, payload: 'Network error.' });
  }
};
