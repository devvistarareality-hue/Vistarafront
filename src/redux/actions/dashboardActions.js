import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../constants/api';
import {
  DASHBOARD_REQUEST,
  DASHBOARD_SUCCESS,
  DASHBOARD_FAILURE,
} from '../types/dashboardTypes';

export const fetchDashboard = () => async (dispatch) => {
  dispatch({ type: DASHBOARD_REQUEST });
  try {
    const token = await AsyncStorage.getItem('access_token');
    const response = await fetch(`${BASE_URL}/api/attendance/dashboard/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (response.ok) {
      dispatch({ type: DASHBOARD_SUCCESS, payload: data });
    } else {
      dispatch({ type: DASHBOARD_FAILURE, payload: data.detail || 'Failed to load dashboard.' });
    }
  } catch (error) {
    dispatch({ type: DASHBOARD_FAILURE, payload: 'Network error. Check your connection.' });
  }
};
