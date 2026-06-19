import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import HomeScreen from '../screens/Dashboardscreen/Homescreen/Homescreen';
import ModulesScreen from '../screens/Modulesscreen/ModulesScreen';
import SalesCRMScreen from '../screens/Sales/SalesCRMScreen';
import SalesLeadsScreen from '../screens/Sales/SalesLeadsScreen';
import SalesReportsScreen from '../screens/Sales/SalesReportsScreen';

const Tab = createBottomTabNavigator();
const ModulesStack = createNativeStackNavigator();

function ModulesNavigator() {
  return (
    <ModulesStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <ModulesStack.Screen name="ModulesList"   component={ModulesScreen} />
      <ModulesStack.Screen name="SalesCRM"      component={SalesCRMScreen} />
      <ModulesStack.Screen name="SalesLeads"    component={SalesLeadsScreen} />
      <ModulesStack.Screen name="SalesReports"  component={SalesReportsScreen} />
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
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
