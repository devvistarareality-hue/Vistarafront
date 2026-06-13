import React from 'react';
import { Text, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/Dashboardscreen/Homescreen/Homescreen';
import ModulesScreen from '../screens/Modulesscreen/ModulesScreen';
import { COLORS } from '../constants/theme';

const { width } = Dimensions.get('window');
const Tab = createBottomTabNavigator();

const BottomTabNavigator = () => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          height: tabBarHeight,
          paddingBottom: insets.bottom + 4,
          paddingTop: 6,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#999999',
        tabBarLabelStyle: {
          fontSize: width * 0.028,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: () => (
            <Text style={{ fontSize: width * 0.06 }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Modules"
        component={ModulesScreen}
        options={{
          tabBarIcon: () => (
            <Text style={{ fontSize: width * 0.06 }}>📋</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
