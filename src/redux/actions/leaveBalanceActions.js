import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../../constants/api';
import {
  LEAVE_BALANCE_REQUEST,
  LEAVE_BALANCE_SUCCESS,
  LEAVE_BALANCE_FAILURE,
  LEAVE_BALANCE_REFRESH,
} from '../types/leaveBalanceTypes';

export const triggerBalanceRefresh = () => ({ type: LEAVE_BALANCE_REFRESH });

const PAGE_SIZE = 20;

export const fetchLeaveBalance = (page = 1) => async (dispatch) => {
  dispatch({ type: LEAVE_BALANCE_REQUEST, meta: { page } });
  try {
    const token = await AsyncStorage.getItem('access_token');
    const response = await fetch(`${getBaseUrl()}/api/attendance/leave-balance/?page=${page}&page_size=${PAGE_SIZE}`, {
      method:  'GET',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (response.ok) {
      console.log('✅ Leave Balance Fetch Success');
      console.log('📥 Response received:', JSON.stringify(data, null, 2));
      dispatch({ type: LEAVE_BALANCE_SUCCESS, payload: data, meta: { page } });
    } else {
      dispatch({ type: LEAVE_BALANCE_FAILURE, payload: data.detail || JSON.stringify(data) });
    }
  } catch {
    dispatch({ type: LEAVE_BALANCE_FAILURE, payload: 'Network error. Check your connection.' });
  }
};
