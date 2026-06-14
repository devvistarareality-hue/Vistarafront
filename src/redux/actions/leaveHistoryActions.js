import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../../constants/api';
import {
  LEAVE_HISTORY_REQUEST,
  LEAVE_HISTORY_SUCCESS,
  LEAVE_HISTORY_FAILURE,
} from '../types/leaveHistoryTypes';

const PAGE_SIZE = 20;

export const fetchLeaveHistory = (page = 1) => async (dispatch) => {
  dispatch({ type: LEAVE_HISTORY_REQUEST, meta: { page } });
  try {
    const token = await AsyncStorage.getItem('access_token');
    const response = await fetch(`${getBaseUrl()}/api/attendance/leave-history/?page=${page}&page_size=${PAGE_SIZE}`, {
      method:  'GET',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (response.ok) {
      console.log('✅ Leave History Fetch Success');
      console.log('📥 Response received:', JSON.stringify(data, null, 2));
      dispatch({ type: LEAVE_HISTORY_SUCCESS, payload: data, meta: { page } });
    } else {
      dispatch({ type: LEAVE_HISTORY_FAILURE, payload: data.detail || JSON.stringify(data) });
    }
  } catch {
    dispatch({ type: LEAVE_HISTORY_FAILURE, payload: 'Network error. Check your connection.' });
  }
};
