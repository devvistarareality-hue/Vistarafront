import {
  REQUEST_LEAVE_REQUEST,
  REQUEST_LEAVE_SUCCESS,
  REQUEST_LEAVE_FAILURE,
  REQUEST_LEAVE_RESET,
} from '../types/requestLeaveTypes';

const initialState = {
  requestLoading: false,
  requestSuccess: false,
  requestError:   null,
};

const requestLeaveReducer = (state = initialState, action) => {
  switch (action.type) {
    case REQUEST_LEAVE_REQUEST:
      return { ...state, requestLoading: true, requestSuccess: false, requestError: null };
    case REQUEST_LEAVE_SUCCESS:
      return { ...state, requestLoading: false, requestSuccess: true };
    case REQUEST_LEAVE_FAILURE:
      return { ...state, requestLoading: false, requestError: action.payload };
    case REQUEST_LEAVE_RESET:
      return { ...initialState };
    default:
      return state;
  }
};

export default requestLeaveReducer;
