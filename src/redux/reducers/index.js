import { combineReducers } from 'redux';
import authReducer          from './authReducer';
import dashboardReducer     from './dashboardReducer';
import requestLeaveReducer  from './requestLeaveReducer';
import leaveBalanceReducer  from './leaveBalanceReducer';
import leaveHistoryReducer  from './leaveHistoryReducer';
import leaveActionReducer   from './leaveActionReducer';
import presalesReducer      from './presalesReducer';
import userManagementReducer from './userManagementReducer';

const rootReducer = combineReducers({
  auth:         authReducer,
  dashboard:    dashboardReducer,
  requestLeave: requestLeaveReducer,
  leaveBalance: leaveBalanceReducer,
  leaveHistory: leaveHistoryReducer,
  leaveAction:  leaveActionReducer,
  presales:       presalesReducer,
  userManagement: userManagementReducer,
});

export default rootReducer;
