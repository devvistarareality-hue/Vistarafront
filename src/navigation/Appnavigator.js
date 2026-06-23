import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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

// Placeholder & post-sign-out
import PlaceholderScreen  from '../screens/PlaceholderScreen/PlaceholderScreen';
import PostSignOutScreen  from '../screens/PostSignOut/PostSignOutScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const user        = useSelector((state) => state.auth.user);
  const isVRLAdmin  = user?.role === 'Admin' && user?.company_code === 'VRL';

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>

        {!user ? (
          // ── Unauthenticated ──────────────────────────────────────
          <>
            <Stack.Screen name="Home"  component={Companyscreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
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
