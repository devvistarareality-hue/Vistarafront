import AsyncStorage from '@react-native-async-storage/async-storage';
import { COMPANY_ENDPOINTS } from '../../constants/api';
import { setAdminCompany } from '../reducers/adminFilterReducer';

// A saved "Viewing company" that is not in the company list (deleted, or saved on
// this device against a different database) filtered every screen down to nothing.
// Once the real list is in, such a choice is dropped back to All Companies — as on
// the web.
export const dropMissingAdminCompany = () => (dispatch, getState) => {
  const { companyId } = getState().adminFilter || {};
  const list = getState().companies?.companies;
  if (companyId == null || !Array.isArray(list) || !list.length) return;
  if (!list.some((c) => String(c.id) === String(companyId))) dispatch(setAdminCompany(null));
};
import {
  COMPANIES_FETCH_REQUEST, COMPANIES_FETCH_SUCCESS, COMPANIES_FETCH_FAILURE,
  COMPANY_UPDATE_REQUEST, COMPANY_UPDATE_SUCCESS, COMPANY_UPDATE_FAILURE, COMPANY_UPDATE_RESET,
  COMPANY_CREATE_REQUEST, COMPANY_CREATE_SUCCESS, COMPANY_CREATE_FAILURE, COMPANY_CREATE_RESET,
  COMPANY_DELETE_SUCCESS,
} from '../types/companiesTypes';
import { errText } from '../../lib/apiError';

const authHeaders = async () => {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
};

export const fetchCompanies = () => async (dispatch) => {
  dispatch({ type: COMPANIES_FETCH_REQUEST });
  try {
    const headers = await authHeaders();
    const res     = await fetch(COMPANY_ENDPOINTS.list, { headers });
    const data    = await res.json();
    if (res.ok) {
      dispatch({ type: COMPANIES_FETCH_SUCCESS, payload: data });
      dispatch(dropMissingAdminCompany());
    } else {
      dispatch({ type: COMPANIES_FETCH_FAILURE, payload: errText(data, 'Failed to load companies.') });
    }
  } catch {
    dispatch({ type: COMPANIES_FETCH_FAILURE, payload: 'Network error.' });
  }
};

export const updateCompany = (id, payload) => async (dispatch) => {
  dispatch({ type: COMPANY_UPDATE_REQUEST });
  try {
    const headers = await authHeaders();
    const res     = await fetch(COMPANY_ENDPOINTS.detail(id), {
      method:  'PATCH',
      headers,
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      dispatch({ type: COMPANY_UPDATE_SUCCESS, payload: data });
    } else {
      const msg = data.code?.[0] || errText(data, 'Something went wrong — please try again.');
      dispatch({ type: COMPANY_UPDATE_FAILURE, payload: msg });
    }
  } catch {
    dispatch({ type: COMPANY_UPDATE_FAILURE, payload: 'Network error.' });
  }
};

export const resetUpdateCompany = () => ({ type: COMPANY_UPDATE_RESET });

export const createCompany = (payload) => async (dispatch) => {
  dispatch({ type: COMPANY_CREATE_REQUEST });
  try {
    const headers = await authHeaders();
    const res     = await fetch(COMPANY_ENDPOINTS.list, {
      method:  'POST',
      headers,
      body:    JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      dispatch({ type: COMPANY_CREATE_SUCCESS, payload: data });
      dispatch(fetchCompanies());
    } else {
      const msg = data.code?.[0] || errText(data, 'Something went wrong — please try again.');
      dispatch({ type: COMPANY_CREATE_FAILURE, payload: msg });
    }
  } catch {
    dispatch({ type: COMPANY_CREATE_FAILURE, payload: 'Network error.' });
  }
};

export const resetCreateCompany = () => ({ type: COMPANY_CREATE_RESET });

export const deleteCompany = (id) => async (dispatch) => {
  try {
    const headers = await authHeaders();
    const res     = await fetch(COMPANY_ENDPOINTS.detail(id), { method: 'DELETE', headers });
    if (res.ok || res.status === 204) {
      dispatch({ type: COMPANY_DELETE_SUCCESS, payload: id });
      return { success: true };
    } else {
      let msg = 'Failed to delete company.';
      try { const d = await res.json(); msg = d.detail || msg; } catch {}
      return { success: false, error: msg };
    }
  } catch {
    return { success: false, error: 'Network error. Please try again.' };
  }
};
