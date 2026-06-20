import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../../constants/api';
import {
  TEAM_LEAVES_REQUEST,
  TEAM_LEAVES_SUCCESS,
  TEAM_LEAVES_FAILURE,
} from '../types/teamLeavesTypes';

const PAGE_SIZE = 20;

// Leave requests the current user can action (direct reports / company / all).
export const fetchTeamLeaves = (page = 1) => async (dispatch) => {
  dispatch({ type: TEAM_LEAVES_REQUEST, meta: { page } });
  try {
    const token = await AsyncStorage.getItem('access_token');
    const response = await fetch(
      `${getBaseUrl()}/api/attendance/team-leaves/?page=${page}&page_size=${PAGE_SIZE}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } },
    );
    const data = await response.json();
    if (response.ok) {
      dispatch({ type: TEAM_LEAVES_SUCCESS, payload: data, meta: { page } });
    } else {
      dispatch({ type: TEAM_LEAVES_FAILURE, payload: data.detail || JSON.stringify(data) });
    }
  } catch {
    dispatch({ type: TEAM_LEAVES_FAILURE, payload: 'Network error. Check your connection.' });
  }
};
