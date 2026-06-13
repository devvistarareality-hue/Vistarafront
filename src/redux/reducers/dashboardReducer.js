import {
  DASHBOARD_REQUEST,
  DASHBOARD_SUCCESS,
  DASHBOARD_FAILURE,
  MONTHLY_ATTENDANCE_REQUEST,
  MONTHLY_ATTENDANCE_SUCCESS,
  MONTHLY_ATTENDANCE_FAILURE,
} from '../types/dashboardTypes';

const initialState = {
  loading:           false,
  user:              null,
  stats:             null,
  weeklyAttendance:  [],
  monthlyAttendance: null,
  monthlyLoading:    false,
  error:             null,
};

const dashboardReducer = (state = initialState, action) => {
  switch (action.type) {
    case DASHBOARD_REQUEST:
      return { ...state, loading: true, error: null };

    case DASHBOARD_SUCCESS:
      return {
        ...state,
        loading:          false,
        user:             action.payload.user,
        stats:            action.payload.stats,
        weeklyAttendance: action.payload.weekly_attendance,
      };

    case DASHBOARD_FAILURE:
      return { ...state, loading: false, error: action.payload };

    case MONTHLY_ATTENDANCE_REQUEST:
      return { ...state, monthlyLoading: true };

    case MONTHLY_ATTENDANCE_SUCCESS:
      return { ...state, monthlyLoading: false, monthlyAttendance: action.payload };

    case MONTHLY_ATTENDANCE_FAILURE:
      return { ...state, monthlyLoading: false };

    default:
      return state;
  }
};

export default dashboardReducer;
