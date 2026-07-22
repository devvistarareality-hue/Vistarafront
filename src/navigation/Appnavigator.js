import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { navigationRef } from './navigationRef';
import { useSelector } from 'react-redux';

// Auth screens
import Companyscreen   from '../screens/Companyscreen/Homescreen';
import LoginScreen     from '../screens/Loginscreen/Loginscreen';

// Bottom tab navigator (non-admin)
import BottomTabNavigator from './BottomTabNavigator';

// Shared stack screens
import SignInInternalScreen from '../screens/Dashboardscreen/Homescreen/SignInInternalscreen/SignInInternalScreen';
import LeaveScreen         from '../screens/Dashboardscreen/Leavescreen/LeaveScreen';
import LeaveApprovalsScreen from '../screens/Dashboardscreen/Leavescreen/LeaveApprovalsScreen';
import RequestLeaveScreen  from '../screens/Dashboardscreen/Leavescreen/RequestLeave/RequestLeaveScreen';

// Admin-only screens
import AdminDashboardScreen     from '../screens/AdminDashboard/AdminDashboardScreen';
import UserManagementScreen     from '../screens/UserManagement/UserManagementScreen';
import CreateUserScreen         from '../screens/UserManagement/CreateUserScreen';
import CompanyManagementScreen  from '../screens/AdminDashboard/CompanyManagementScreen';
import EditCompanyScreen        from '../screens/AdminDashboard/EditCompanyScreen';
import DesignationMasterScreen  from '../screens/AdminDashboard/DesignationMasterScreen';

// Sales CRM screens
import SalesCRMScreen          from '../screens/Sales/SalesCRMScreen';
import SalesLeadsScreen        from '../screens/Sales/SalesLeadsScreen';
import SalesFollowUpsScreen    from '../screens/Sales/SalesFollowUpsScreen';
import SalesSiteVisitsScreen   from '../screens/Sales/SalesSiteVisitsScreen';
import SalesMyConversionsScreen from '../screens/Sales/SalesMyConversionsScreen';
import MyTeamScreen             from '../screens/Sales/MyTeamScreen';
import ModuleHomeScreen         from '../screens/Modulesscreen/ModuleHomeScreen';
import ModuleBookingsScreen     from '../screens/Modulesscreen/ModuleBookingsScreen';
import BookingFormScreen        from '../screens/Sales/BookingFormScreen';
import BookingApprovalsScreen   from '../screens/Sales/BookingApprovalsScreen';
import ProjectsScreen          from '../screens/Sales/ProjectsScreen';
import ManagePlotsScreen       from '../screens/Sales/ManagePlotsScreen';
import ClosureProjectsScreen   from '../screens/Sales/ClosureProjectsScreen';
import ClosureViewerScreen     from '../screens/Sales/ClosureViewerScreen';
import SalesSourcesScreen      from '../screens/Sales/SalesSourcesScreen';
import SalesTeamScreen         from '../screens/Sales/SalesTeamScreen';
import SalesDistributionScreen from '../screens/Sales/SalesDistributionScreen';
import SalesReportsScreen      from '../screens/Sales/SalesReportsScreen';
import SalesImportScreen       from '../screens/Sales/SalesImportScreen';
import SalesDataResetScreen    from '../screens/Sales/SalesDataResetScreen';
import NotificationsScreen      from '../screens/Sales/NotificationsScreen';

// Club 1000 screens
import Club1000HubScreen        from '../screens/Club1000/Club1000HubScreen';
import Club1000SchemesScreen    from '../screens/Club1000/Club1000SchemesScreen';
import Club1000InvestorsScreen  from '../screens/Club1000/Club1000InvestorsScreen';
import Club1000PayoutsScreen    from '../screens/Club1000/Club1000PayoutsScreen';
import Club1000ReferralRewardsScreen from '../screens/Club1000/Club1000ReferralRewardsScreen';

// Placeholder & post-sign-out
import PlaceholderScreen  from '../screens/PlaceholderScreen/PlaceholderScreen';
import PostSignOutScreen  from '../screens/PostSignOut/PostSignOutScreen';

// Kiosk — client-facing self-booking (role=Kiosk)
import KioskScreen        from '../screens/Kiosk/KioskScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const user        = useSelector((state) => state.auth.user);
  const _mods        = user?.modules || [];
  // Departmental / module admin: role=Admin restricted to exactly one module (holds
  // even inside VRL). A Sales module admin gets a Sales-only app that lands on the
  // Sales CRM admin home, with no other modules or platform-admin screens.
  const _isModuleAdmin = user?.role === 'Admin' && !user?.is_staff && _mods.length === 1;
  const isSalesAdmin = _isModuleAdmin && _mods[0] === 'Sales';
  // VRL platform super-admin (full module access) — excludes single-module admins.
  const isVRLAdmin  = user?.role === 'Admin' && user?.company_code === 'VRL' && !_isModuleAdmin;
  // Kiosk device — client-facing self-booking only, no other screens.
  const isKiosk     = user?.role === 'Kiosk';

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>

        {!user ? (
          // ── Unauthenticated ──────────────────────────────────────
          <>
            <Stack.Screen name="Home"  component={Companyscreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </>

        ) : isKiosk ? (
          // ── Kiosk device — client-facing self-booking only ──────
          <>
            <Stack.Screen name="Kiosk"       component={KioskScreen} />
            <Stack.Screen name="BookingForm" component={BookingFormScreen} />
          </>

        ) : isVRLAdmin ? (
          // ── VRL Admin — platform super admin, full module access ─
          <>
            <Stack.Screen name="AdminDashboard"     component={AdminDashboardScreen} />
            <Stack.Screen name="UserManagement"     component={UserManagementScreen} />
            <Stack.Screen name="CreateUser"         component={CreateUserScreen} />
            <Stack.Screen name="CompanyManagement"  component={CompanyManagementScreen} />
            <Stack.Screen name="EditCompany"        component={EditCompanyScreen} />
            <Stack.Screen name="DesignationMaster"    component={DesignationMasterScreen} />
            <Stack.Screen name="SalesCRM"            component={SalesCRMScreen} />
            <Stack.Screen name="SalesLeads"          component={SalesLeadsScreen} />
            <Stack.Screen name="SalesFollowUps"      component={SalesFollowUpsScreen} />
            <Stack.Screen name="SalesSiteVisits"     component={SalesSiteVisitsScreen} />
            <Stack.Screen name="SalesMyConversions"  component={SalesMyConversionsScreen} />
            <Stack.Screen name="MyTeam"              component={MyTeamScreen} />
            <Stack.Screen name="ModuleHome"          component={ModuleHomeScreen} />
            <Stack.Screen name="ModuleBookings"      component={ModuleBookingsScreen} />
            <Stack.Screen name="BookingForm"         component={BookingFormScreen} />
            <Stack.Screen name="BookingApprovals"    component={BookingApprovalsScreen} />
            <Stack.Screen name="SalesProjects"       component={ProjectsScreen} />
            <Stack.Screen name="ManagePlots"         component={ManagePlotsScreen} />
            <Stack.Screen name="ClosureProjects"     component={ClosureProjectsScreen} />
            <Stack.Screen name="ClosureViewer"       component={ClosureViewerScreen} />
            <Stack.Screen name="SalesSources"        component={SalesSourcesScreen} />
            <Stack.Screen name="SalesTeam"           component={SalesTeamScreen} />
            <Stack.Screen name="SalesDistribution"   component={SalesDistributionScreen} />
            <Stack.Screen name="SalesReports"        component={SalesReportsScreen} />
            <Stack.Screen name="SalesImport"         component={SalesImportScreen} />
            <Stack.Screen name="SalesDataReset"      component={SalesDataResetScreen} />
            <Stack.Screen name="SalesNotifications"  component={NotificationsScreen} />
            <Stack.Screen name="Club1000Hub"         component={Club1000HubScreen} />
            <Stack.Screen name="Club1000Schemes"     component={Club1000SchemesScreen} />
            <Stack.Screen name="Club1000Investors"   component={Club1000InvestorsScreen} />
            <Stack.Screen name="Club1000Payouts"     component={Club1000PayoutsScreen} />
            <Stack.Screen name="Club1000ReferralRewards" component={Club1000ReferralRewardsScreen} />
            <Stack.Screen name="Placeholder"         component={PlaceholderScreen} />
          </>

        ) : isSalesAdmin ? (
          // ── Sales module admin — Sales-only, lands on the Sales CRM admin home ─
          <>
            <Stack.Screen name="SalesCRM"            component={SalesCRMScreen} />
            <Stack.Screen name="SalesLeads"          component={SalesLeadsScreen} />
            <Stack.Screen name="SalesFollowUps"      component={SalesFollowUpsScreen} />
            <Stack.Screen name="SalesSiteVisits"     component={SalesSiteVisitsScreen} />
            <Stack.Screen name="SalesMyConversions"  component={SalesMyConversionsScreen} />
            <Stack.Screen name="MyTeam"              component={MyTeamScreen} />
            <Stack.Screen name="BookingForm"         component={BookingFormScreen} />
            <Stack.Screen name="BookingApprovals"    component={BookingApprovalsScreen} />
            <Stack.Screen name="SalesProjects"       component={ProjectsScreen} />
            <Stack.Screen name="ManagePlots"         component={ManagePlotsScreen} />
            <Stack.Screen name="ClosureProjects"     component={ClosureProjectsScreen} />
            <Stack.Screen name="ClosureViewer"       component={ClosureViewerScreen} />
            <Stack.Screen name="SalesSources"        component={SalesSourcesScreen} />
            <Stack.Screen name="SalesTeam"           component={SalesTeamScreen} />
            <Stack.Screen name="SalesDistribution"   component={SalesDistributionScreen} />
            <Stack.Screen name="SalesReports"        component={SalesReportsScreen} />
            <Stack.Screen name="SalesImport"         component={SalesImportScreen} />
            <Stack.Screen name="SalesDataReset"      component={SalesDataResetScreen} />
            <Stack.Screen name="SalesNotifications"  component={NotificationsScreen} />
            <Stack.Screen name="Placeholder"         component={PlaceholderScreen} />
          </>

        ) : (
          // ── Regular users — bottom nav with attendance home ──────
          <>
            <Stack.Screen name="Dashboard"    component={BottomTabNavigator} />
            <Stack.Screen name="SignIn"        component={SignInInternalScreen} />
            <Stack.Screen name="PostSignOut"   component={PostSignOutScreen} />
            <Stack.Screen name="Leave"         component={LeaveScreen} />
            <Stack.Screen name="LeaveApprovals" component={LeaveApprovalsScreen} options={{ animation: 'none' }} />
            <Stack.Screen name="RequestLeave"  component={RequestLeaveScreen} />
            <Stack.Screen name="Placeholder"   component={PlaceholderScreen} />
          </>
        )}

      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
