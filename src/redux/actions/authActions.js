import AsyncStorage from '@react-native-async-storage/async-storage';
import OneSignal from 'react-native-onesignal';
import { getBaseUrl } from '../../constants/api';
import {
  COMPANY_VERIFY_REQUEST,
  COMPANY_VERIFY_SUCCESS,
  COMPANY_VERIFY_FAILURE,
  LOGIN_REQUEST,
  LOGIN_SUCCESS,
  LOGIN_FAILURE,
  LOGOUT,
} from '../types/authTypes';

export const loadUser = () => async (dispatch) => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) return;
    const res = await fetch(`${getBaseUrl()}/api/auth/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      dispatch({ type: LOGIN_SUCCESS, payload: await res.json() });
      return;
    }
    if (res.status !== 401) return;

    // Access token expired — try to refresh
    const refresh = await AsyncStorage.getItem('refresh_token');
    if (!refresh) { dispatch({ type: LOGOUT }); return; }

    const refreshRes = await fetch(`${getBaseUrl()}/api/auth/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });

    if (refreshRes.ok) {
      const tokens = await refreshRes.json();
      await AsyncStorage.setItem('access_token', tokens.access);
      if (tokens.refresh) await AsyncStorage.setItem('refresh_token', tokens.refresh);
      const retryRes = await fetch(`${getBaseUrl()}/api/auth/me/`, {
        headers: { Authorization: `Bearer ${tokens.access}` },
      });
      if (retryRes.ok) dispatch({ type: LOGIN_SUCCESS, payload: await retryRes.json() });
      else dispatch({ type: LOGOUT });
    } else {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
      dispatch({ type: LOGOUT });
    }
  } catch (_) {}
};

// ── Company Verify ────────────────────────────────────────────────
export const verifyCompany = (companyCode) => async (dispatch) => {
  dispatch({ type: COMPANY_VERIFY_REQUEST });
  try {
    const response = await fetch(`${getBaseUrl()}/api/company/verify/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_code: companyCode }),
    });
    const data = await response.json();
    if (response.ok) {
      dispatch({ type: COMPANY_VERIFY_SUCCESS, payload: data.company });
    } else {
      dispatch({ type: COMPANY_VERIFY_FAILURE, payload: data.detail || 'Invalid company code.' });
    }
  } catch (error) {
    dispatch({ type: COMPANY_VERIFY_FAILURE, payload: 'Network error. Check your connection.' });
  }
};

// ── Login ─────────────────────────────────────────────────────────
export const login = (companyCode, userCode, password) => async (dispatch) => {
  dispatch({ type: LOGIN_REQUEST });
  try {
    const response = await fetch(`${getBaseUrl()}/api/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_code: companyCode,
        user_code: userCode,
        password: password,
      }),
    });
    const data = await response.json();
    if (response.ok) {
      await AsyncStorage.setItem('access_token', data.tokens.access);
      await AsyncStorage.setItem('refresh_token', data.tokens.refresh);
      dispatch({ type: LOGIN_SUCCESS, payload: data.user });
      OneSignal.login(data.user.user_code);
    } else {
      dispatch({ type: LOGIN_FAILURE, payload: data.detail || 'Invalid credentials.' });
    }
  } catch (error) {
    dispatch({ type: LOGIN_FAILURE, payload: 'Network error. Check your connection.' });
  }
};

// ── Logout ────────────────────────────────────────────────────────
export const logout = () => async (dispatch) => {
  await AsyncStorage.removeItem('access_token');
  await AsyncStorage.removeItem('refresh_token');
  OneSignal.logout();
  dispatch({ type: LOGOUT });
};
