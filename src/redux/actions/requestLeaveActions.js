import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../../constants/api';
import {
  REQUEST_LEAVE_REQUEST,
  REQUEST_LEAVE_SUCCESS,
  REQUEST_LEAVE_FAILURE,
  REQUEST_LEAVE_RESET,
} from '../types/requestLeaveTypes';

export const requestLeave = (payload) => async (dispatch) => {
  dispatch({ type: REQUEST_LEAVE_REQUEST });
  try {
    const token = await AsyncStorage.getItem('access_token');
    const response = await fetch(`${getBaseUrl()}/api/attendance/apply-leave/`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (response.ok) {
      dispatch({ type: REQUEST_LEAVE_SUCCESS, payload: data });
    } else {
      dispatch({ type: REQUEST_LEAVE_FAILURE, payload: data.detail || JSON.stringify(data) });
    }
  } catch {
    dispatch({ type: REQUEST_LEAVE_FAILURE, payload: 'Network error. Check your connection.' });
  }
};

export const resetRequestLeave = () => ({ type: REQUEST_LEAVE_RESET });
