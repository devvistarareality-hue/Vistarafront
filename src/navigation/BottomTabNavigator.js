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
import SalesMyConversionsScreen from '../screens/Sales/SalesMyConversionsScreen';
import MyTeamScreen from '../screens/Sales/MyTeamScreen';
import ModuleHomeScreen from '../screens/Modulesscreen/ModuleHomeScreen';
import ModuleBookingsScreen from '../screens/Modulesscreen/ModuleBookingsScreen';
import BookingFormScreen from '../screens/Sales/BookingFormScreen';
import BookingApprovalsScreen from '../screens/Sales/BookingApprovalsScreen';
import SalesReportsScreen from '../screens/Sales/SalesReportsScreen';
import ClosureProjectsScreen from '../screens/Sales/ClosureProjectsScreen';
import ClosureViewerScreen from '../screens/Sales/ClosureViewerScreen';
import Club1000HubScreen from '../screens/Club1000/Club1000HubScreen';
import Club1000SchemesScreen from '../screens/Club1000/Club1000SchemesScreen';
import Club1000InvestorsScreen from '../screens/Club1000/Club1000InvestorsScreen';
import Club1000PayoutsScreen from '../screens/Club1000/Club1000PayoutsScreen';
import Club1000ReferralRewardsScreen from '../screens/Club1000/Club1000ReferralRewardsScreen';

const Tab = createBottomTabNavigator();
const ModulesStack = createNativeStackNavigator();

function ModulesNavigator() {
  return (
    <ModulesStack.Navigator initialRouteName="ModulesList" screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <ModulesStack.Screen name="ModulesList"   component={ModulesScreen} />
      <ModulesStack.Screen name="SalesCRM"      component={SalesCRMScreen} />
      <ModulesStack.Screen name="SalesNotifications" component={NotificationsScreen} />
      <ModulesStack.Screen name="SalesLeads"    component={SalesLeadsScreen} />
      <ModulesStack.Screen name="SalesFollowUps" component={SalesFollowUpsScreen} />
      <ModulesStack.Screen name="SalesSiteVisits" component={SalesSiteVisitsScreen} />
      <ModulesStack.Screen name="SalesMyConversions" component={SalesMyConversionsScreen} />
      <ModulesStack.Screen name="MyTeam" component={MyTeamScreen} />
      <ModulesStack.Screen name="ModuleHome" component={ModuleHomeScreen} />
      <ModulesStack.Screen name="ModuleBookings" component={ModuleBookingsScreen} />
      <ModulesStack.Screen name="BookingForm" component={BookingFormScreen} />
      <ModulesStack.Screen name="BookingApprovals" component={BookingApprovalsScreen} />
      <ModulesStack.Screen name="SalesReports"  component={SalesReportsScreen} />
      <ModulesStack.Screen name="ClosureProjects" component={ClosureProjectsScreen} />
      <ModulesStack.Screen name="ClosureViewer" component={ClosureViewerScreen} />
      <ModulesStack.Screen name="Club1000Hub" component={Club1000HubScreen} />
      <ModulesStack.Screen name="Club1000Schemes" component={Club1000SchemesScreen} />
      <ModulesStack.Screen name="Club1000Investors" component={Club1000InvestorsScreen} />
      <ModulesStack.Screen name="Club1000Payouts" component={Club1000PayoutsScreen} />
      <ModulesStack.Screen name="Club1000ReferralRewards" component={Club1000ReferralRewardsScreen} />
    </ModulesStack.Navigator>
  );
}

const BottomTabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
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
        tabBarActiveTintColor: COLORS.link,
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
