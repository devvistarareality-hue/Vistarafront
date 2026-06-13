import {
  LEAVE_BALANCE_REQUEST,
  LEAVE_BALANCE_SUCCESS,
  LEAVE_BALANCE_FAILURE,
  LEAVE_BALANCE_REFRESH,
} from '../types/leaveBalanceTypes';

const initialState = {
  balanceLoading:  false,
  balanceLoadingMore: false,
  balanceData:     [],
  balanceError:    null,
  balancePage:     1,
  balanceHasMore:  false,
  refreshTrigger:  0,
};

const leaveBalanceReducer = (state = initialState, action) => {
  switch (action.type) {
    case LEAVE_BALANCE_REQUEST:
      return {
        ...state,
        balanceLoading: action.meta?.page === 1,
        balanceLoadingMore: action.meta?.page > 1,
        balanceError: null,
      };
    case LEAVE_BALANCE_SUCCESS: {
      const page = action.meta?.page ?? 1;
      const isPaginated = !Array.isArray(action.payload);
      const nextData = isPaginated ? action.payload.transactions : action.payload;
      return {
        ...state,
        balanceLoading: false,
        balanceLoadingMore: false,
        balanceData: page === 1 ? nextData : [...state.balanceData, ...nextData],
        balancePage: page,
        balanceHasMore: isPaginated ? Boolean(action.payload.next) : false,
      };
    }
    case LEAVE_BALANCE_FAILURE:
      return { ...state, balanceLoading: false, balanceLoadingMore: false, balanceError: action.payload };
    case LEAVE_BALANCE_REFRESH:
      return { ...state, refreshTrigger: state.refreshTrigger + 1 };
    default:
      return state;
  }
};

export default leaveBalanceReducer;
