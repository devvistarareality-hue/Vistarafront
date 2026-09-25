import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import HomeScreen from '../screens/Dashboardscreen/Homescreen/Homescreen';
import ModulesScreen from '../screens/Modulesscreen/ModulesScreen';
import SalesCRMScreen from '../screens/Sales/SalesCRMScreen';
import NotificationsScreen from '../screens/Sales/NotificationsScreen';
import SalesLeadsScreen from '../screens/Sales/SalesLeadsScreen';
import SalesFollowUpsScreen from '../screens/Sales/SalesFollowUpsScreen';
import SalesSiteVisitsScreen from '../screens/Sales/SalesSiteVisitsScreen';
import MyTeamScreen from '../screens/Sales/MyTeamScreen';
import ModuleHomeScreen from '../screens/Modulesscreen/ModuleHomeScreen';
import ModuleBookingsScreen from '../screens/Modulesscreen/ModuleBookingsScreen';
import ModuleApprovalsScreen from '../screens/Modulesscreen/ModuleApprovalsScreen';
import BookingFormScreen from '../screens/Sales/BookingFormScreen';
import BookingApprovalsScreen from '../screens/Sales/BookingApprovalsScreen';
import SalesReportsScreen from '../screens/Sales/SalesReportsScreen';
import ChannelPartnerHubScreen from '../screens/Sales/ChannelPartnerHubScreen';
import ChannelPartnersScreen from '../screens/Sales/ChannelPartnersScreen';
import ClosureProjectsScreen from '../screens/Sales/ClosureProjectsScreen';
import ClosureViewerScreen from '../screens/Sales/ClosureViewerScreen';
import Club1000HubScreen from '../screens/Club1000/Club1000HubScreen';
import Club1000SchemesScreen from '../screens/Club1000/Club1000SchemesScreen';
import Club1000InvestorsScreen from '../screens/Club1000/Club1000InvestorsScreen';
import Club1000PayoutsScreen from '../screens/Club1000/Club1000PayoutsScreen';
import Club1000ReferralRewardsScreen from '../screens/Club1000/Club1000ReferralRewardsScreen';
import Club1000LeadsScreen from '../screens/Club1000/Club1000LeadsScreen';
import Club1000FollowUpsScreen from '../screens/Club1000/Club1000FollowUpsScreen';
import Club1000InvestorApprovalsScreen from '../screens/Club1000/Club1000InvestorApprovalsScreen';
import ARDashboardScreen from '../screens/AR/ARDashboardScreen';
import ARRegisterScreen from '../screens/AR/ARRegisterScreen';
import ARLedgerScreen from '../screens/AR/ARLedgerScreen';
import ARImportScreen from '../screens/AR/ARImportScreen';
import ARCollectionsScreen from '../screens/AR/ARCollectionsScreen';
import TaskDashboardScreen from '../screens/Tasks/TaskDashboardScreen';
import TaskListScreen from '../screens/Tasks/TaskListScreen';
import ActivityLogScreen from '../screens/AdminDashboard/ActivityLogScreen';
import DataBackupScreen from '../screens/AdminDashboard/DataBackupScreen';

const Tab = createBottomTabNavigator();
const ModulesStack = createNativeStackNavigator();

function ModulesNavigator() {
  return (
    <ModulesStack.Navigator initialRouteName="ModulesList" screenOptions={{ headerShown: false, animation: 'slide_from_right', freezeOnBlur: true, contentStyle: { backgroundColor: 'transparent' } }}>
      <ModulesStack.Screen name="ModulesList"   component={ModulesScreen} />
      <ModulesStack.Screen name="SalesCRM"      component={SalesCRMScreen} />
      <ModulesStack.Screen name="SalesNotifications" component={NotificationsScreen} />
      <ModulesStack.Screen name="SalesLeads"    component={SalesLeadsScreen} />
      <ModulesStack.Screen name="SalesFollowUps" component={SalesFollowUpsScreen} />
      <ModulesStack.Screen name="SalesSiteVisits" component={SalesSiteVisitsScreen} />
      <ModulesStack.Screen name="MyTeam" component={MyTeamScreen} />
      <ModulesStack.Screen name="ModuleHome" component={ModuleHomeScreen} />
      <ModulesStack.Screen name="ModuleBookings" component={ModuleBookingsScreen} />
      <ModulesStack.Screen name="ModuleApprovals" component={ModuleApprovalsScreen} />
      <ModulesStack.Screen name="BookingForm" component={BookingFormScreen} />
      <ModulesStack.Screen name="BookingApprovals" component={BookingApprovalsScreen} />
      <ModulesStack.Screen name="SalesReports"  component={SalesReportsScreen} />
      <ModulesStack.Screen name="ChannelPartnerHub" component={ChannelPartnerHubScreen} />
      <ModulesStack.Screen name="ChannelPartners" component={ChannelPartnersScreen} />
      <ModulesStack.Screen name="ClosureProjects" component={ClosureProjectsScreen} />
      <ModulesStack.Screen name="ClosureViewer" component={ClosureViewerScreen} />
      <ModulesStack.Screen name="Club1000Hub" component={Club1000HubScreen} />
      <ModulesStack.Screen name="Club1000Schemes" component={Club1000SchemesScreen} />
      <ModulesStack.Screen name="Club1000Investors" component={Club1000InvestorsScreen} />
      <ModulesStack.Screen name="Club1000Payouts" component={Club1000PayoutsScreen} />
      <ModulesStack.Screen name="Club1000ReferralRewards" component={Club1000ReferralRewardsScreen} />
      <ModulesStack.Screen name="Club1000Leads" component={Club1000LeadsScreen} />
      <ModulesStack.Screen name="Club1000FollowUps" component={Club1000FollowUpsScreen} />
      <ModulesStack.Screen name="Club1000InvestorApprovals" component={Club1000InvestorApprovalsScreen} />
      <ModulesStack.Screen name="ARDashboard" component={ARDashboardScreen} />
      <ModulesStack.Screen name="ARRegister" component={ARRegisterScreen} />
      <ModulesStack.Screen name="ARLedger" component={ARLedgerScreen} />
      <ModulesStack.Screen name="ARImport" component={ARImportScreen} />
      <ModulesStack.Screen name="ARCollections" component={ARCollectionsScreen} />
      <ModulesStack.Screen name="TaskDashboard" component={TaskDashboardScreen} />
      <ModulesStack.Screen name="TaskList" component={TaskListScreen} />
      <ModulesStack.Screen name="ActivityLog" component={ActivityLogScreen} />
      <ModulesStack.Screen name="DataBackup" component={DataBackupScreen} />
    </ModulesStack.Navigator>
  );
}

const BottomTabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        freezeOnBlur: true,
        lazy: true,
        tabBarStyle: {
          backgroundColor: COLORS.cardBg,
          borderTopWidth: 0,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom + 10,
          paddingTop: 6,
          shadowColor: COLORS.textTertiary,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 16,
        },
        tabBarActiveTintColor: COLORS.textPrimary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Modules') {
            iconName = focused ? 'grid' : 'grid-outline';
          }
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Dashboard' }}
      />
      <Tab.Screen
        name="Modules"
        component={ModulesNavigator}
        options={{ tabBarLabel: 'Modules' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            try {
              const tab = (navigation.getState().routes || []).find((r) => r.name === 'Modules');
              const nested = tab && tab.state;
              if (nested && typeof nested.index === 'number' && nested.index > 0) {
                e.preventDefault();
                // Reset the Modules stack (not just navigate) so the back button
                // on ModulesList has nothing behind it.
                navigation.dispatch({
                  ...CommonActions.reset({ index: 0, routes: [{ name: 'ModulesList' }] }),
                  target: nested.key,
                });
              }
            } catch (_) {}
          },
        })}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
