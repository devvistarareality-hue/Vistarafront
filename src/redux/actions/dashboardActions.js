import AsyncStorage from '@react-native-async-storage/async-storage';
import { ATTENDANCE_ENDPOINTS } from '../../constants/api';
import {
  DASHBOARD_REQUEST,
  DASHBOARD_SUCCESS,
  DASHBOARD_FAILURE,
  MONTHLY_ATTENDANCE_REQUEST,
  MONTHLY_ATTENDANCE_SUCCESS,
  MONTHLY_ATTENDANCE_FAILURE,
} from '../types/dashboardTypes';

const authHeaders = async () => {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
};

export const fetchDashboard = () => async (dispatch) => {
  dispatch({ type: DASHBOARD_REQUEST });
  try {
    const response = await fetch(ATTENDANCE_ENDPOINTS.dashboard, {
      method: 'GET',
      headers: await authHeaders(),
    });
    const data = await response.json();
    if (response.ok) {
      dispatch({ type: DASHBOARD_SUCCESS, payload: data });
    } else {
      dispatch({ type: DASHBOARD_FAILURE, payload: data.detail || 'Failed to load dashboard.' });
    }
  } catch {
    dispatch({ type: DASHBOARD_FAILURE, payload: 'Network error. Check your connection.' });
  }
};

export const fetchMonthlyAttendance = (year, month) => async (dispatch) => {
  dispatch({ type: MONTHLY_ATTENDANCE_REQUEST });
  try {
    const response = await fetch(ATTENDANCE_ENDPOINTS.monthly(year, month), {
      method: 'GET',
      headers: await authHeaders(),
    });
    const data = await response.json();
    if (response.ok) {
      dispatch({ type: MONTHLY_ATTENDANCE_SUCCESS, payload: data });
    } else {
      dispatch({ type: MONTHLY_ATTENDANCE_FAILURE, payload: data.detail || 'Failed to load monthly data.' });
    }
  } catch {
    dispatch({ type: MONTHLY_ATTENDANCE_FAILURE, payload: 'Network error. Check your connection.' });
  }
};
