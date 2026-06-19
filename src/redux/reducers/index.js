import { combineReducers } from 'redux';
import authReducer          from './authReducer';
import dashboardReducer     from './dashboardReducer';
import requestLeaveReducer  from './requestLeaveReducer';
import leaveBalanceReducer  from './leaveBalanceReducer';
import leaveHistoryReducer  from './leaveHistoryReducer';
import teamLeavesReducer    from './teamLeavesReducer';
import leaveActionReducer   from './leaveActionReducer';
import userManagementReducer from './userManagementReducer';
import companiesReducer      from './companiesReducer';
import adminFilterReducer     from './adminFilterReducer';

const rootReducer = combineReducers({
  auth:           authReducer,
  dashboard:      dashboardReducer,
  requestLeave:   requestLeaveReducer,
  leaveBalance:   leaveBalanceReducer,
  leaveHistory:   leaveHistoryReducer,
  teamLeaves:     teamLeavesReducer,
  leaveAction:    leaveActionReducer,
  userManagement: userManagementReducer,
  companies:      companiesReducer,
  adminFilter:    adminFilterReducer,
});

export default rootReducer;
