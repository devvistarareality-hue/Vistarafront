import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../../constants/api';
import {
  LEAVE_ACTION_REQUEST,
  LEAVE_ACTION_SUCCESS,
  LEAVE_ACTION_FAILURE,
  LEAVE_ACTION_RESET,
} from '../types/leaveActionTypes';

export const updateLeaveStatus = (id, leaveStatus) => async (dispatch) => {
  dispatch({ type: LEAVE_ACTION_REQUEST });
  try {
    const token = await AsyncStorage.getItem('access_token');
    const response = await fetch(`${BASE_URL}/api/attendance/leave-action/${id}/`, {
      method:  'PATCH',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status: leaveStatus }),
    });
    const data = await response.json();
    if (response.ok) {
      console.log(`✅ Leave ${leaveStatus} successfully`);
      dispatch({ type: LEAVE_ACTION_SUCCESS, payload: { id, status: leaveStatus } });
    } else {
      dispatch({ type: LEAVE_ACTION_FAILURE, payload: data.detail || JSON.stringify(data) });
    }
  } catch {
    dispatch({ type: LEAVE_ACTION_FAILURE, payload: 'Network error. Check your connection.' });
  }
};

export const resetLeaveAction = () => ({ type: LEAVE_ACTION_RESET });
