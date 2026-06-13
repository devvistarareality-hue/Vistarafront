import {
  LEAVE_ACTION_REQUEST,
  LEAVE_ACTION_SUCCESS,
  LEAVE_ACTION_FAILURE,
  LEAVE_ACTION_RESET,
} from '../types/leaveActionTypes';

const initialState = {
  actionLoading: false,
  actionSuccess: null,
  actionError:   null,
};

const leaveActionReducer = (state = initialState, action) => {
  switch (action.type) {
    case LEAVE_ACTION_REQUEST:
      return { ...state, actionLoading: true, actionError: null, actionSuccess: null };
    case LEAVE_ACTION_SUCCESS:
      return { ...state, actionLoading: false, actionSuccess: action.payload };
    case LEAVE_ACTION_FAILURE:
      return { ...state, actionLoading: false, actionError: action.payload };
    case LEAVE_ACTION_RESET:
      return initialState;
    default:
      return state;
  }
};

export default leaveActionReducer;
