import {
  DASHBOARD_REQUEST,
  DASHBOARD_SUCCESS,
  DASHBOARD_FAILURE,
} from '../types/dashboardTypes';

const initialState = {
  loading: false,
  user: null,
  stats: null,
  weeklyAttendance: [],
  error: null,
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

    default:
      return state;
  }
};

export default dashboardReducer;
