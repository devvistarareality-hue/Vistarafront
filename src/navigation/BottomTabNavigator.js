import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
import BookingFormScreen from '../screens/Sales/BookingFormScreen';
import BookingApprovalsScreen from '../screens/Sales/BookingApprovalsScreen';
import SalesReportsScreen from '../screens/Sales/SalesReportsScreen';
import ClosureProjectsScreen from '../screens/Sales/ClosureProjectsScreen';
import ClosureViewerScreen from '../screens/Sales/ClosureViewerScreen';

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
      <ModulesStack.Screen name="BookingForm" component={BookingFormScreen} />
      <ModulesStack.Screen name="BookingApprovals" component={BookingApprovalsScreen} />
      <ModulesStack.Screen name="SalesReports"  component={SalesReportsScreen} />
      <ModulesStack.Screen name="ClosureProjects" component={ClosureProjectsScreen} />
      <ModulesStack.Screen name="ClosureViewer" component={ClosureViewerScreen} />
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
          // Tapping the Modules tab always returns to the Modules list — even if a
          // notification deep-linked into a child screen and left the stack deep
          // (which otherwise showed a stale screen or a blank stack).
          tabPress: (e) => {
            try {
              const tab = (navigation.getState().routes || []).find((r) => r.name === 'Modules');
              const nested = tab && tab.state;
              if (nested && typeof nested.index === 'number' && nested.index > 0) {
                e.preventDefault();
                navigation.navigate('Modules', { screen: 'ModulesList' });
              }
            } catch (_) {}
          },
        })}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
