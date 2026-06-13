import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomTabNavigator from './BottomTabNavigator';
import AdminScreen from '../screens/Dashboardscreen/Adminscreen/Adminscreen';
import InventoryScreen from '../screens/Drawerscreen/Inventoryscreen/Inventoryscreen';
import PaymentScreen from '../screens/Drawerscreen/Paymentscreen/Paymentscreen';
import ReportScreen from '../screens/Drawerscreen/Reportscreen/Reportscreen';
import ClientScreen from '../screens/Drawerscreen/Clientscreen/Clientscreen';
import SettingScreen from '../screens/Drawerscreen/Settingscreen/Settingscreen';

const Drawer = createDrawerNavigator();

const CustomDrawerContent = (props) => {
  const { navigation } = props;
  const insets = useSafeAreaInsets();
  return (
    <DrawerContentScrollView {...props} contentContainerStyle={[styles.drawerContent, { paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerHeaderText}>StrategicERP</Text>
      </View>

      {/* Bottom Tab screens — reuse existing tabs */}
      <DrawerItem label="Dashboard" labelStyle={styles.label}
        onPress={() => navigation.navigate('Dashboard')} />
      <DrawerItem label="Home" labelStyle={styles.label}
        onPress={() => navigation.navigate('Dashboard', { screen: 'Home' })} />
      <DrawerItem label="Admin" labelStyle={styles.label}
        onPress={() => navigation.navigate('Admin')} />
      <DrawerItem label="Projects" labelStyle={styles.label}
        onPress={() => navigation.navigate('Dashboard', { screen: 'Projects' })} />
      <DrawerItem label="Sites" labelStyle={styles.label}
        onPress={() => navigation.navigate('Dashboard', { screen: 'Sites' })} />
      <DrawerItem label="Contractors" labelStyle={styles.label}
        onPress={() => navigation.navigate('Dashboard', { screen: 'Contractors' })} />
      <DrawerItem label="Purchase" labelStyle={styles.label}
        onPress={() => navigation.navigate('Dashboard', { screen: 'Purchase' })} />

      {/* Drawer-only screens */}
      <DrawerItem label="Inventory" labelStyle={styles.label}
        onPress={() => navigation.navigate('Inventory')} />
      <DrawerItem label="Payments" labelStyle={styles.label}
        onPress={() => navigation.navigate('Payments')} />
      <DrawerItem label="Reports" labelStyle={styles.label}
        onPress={() => navigation.navigate('Reports')} />
      <DrawerItem label="Clients" labelStyle={styles.label}
        onPress={() => navigation.navigate('Clients')} />
      <DrawerItem label="Settings" labelStyle={styles.label}
        onPress={() => navigation.navigate('Settings')} />
    </DrawerContentScrollView>
  );
};

const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#1E4080' },
        headerTintColor: '#fff',
        drawerStyle: {
          backgroundColor: '#1E4080',
          width: 280,
        },
      }}
    >
      <Drawer.Screen
        name="Dashboard"
        component={BottomTabNavigator}
        options={{ title: 'StrategicERP' }}
      />
      <Drawer.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin' }} />
      <Drawer.Screen name="Inventory" component={InventoryScreen} options={{ title: 'Inventory' }} />
      <Drawer.Screen name="Payments" component={PaymentScreen} options={{ title: 'Payments' }} />
      <Drawer.Screen name="Reports" component={ReportScreen} options={{ title: 'Reports' }} />
      <Drawer.Screen name="Clients" component={ClientScreen} options={{ title: 'Clients' }} />
      <Drawer.Screen name="Settings" component={SettingScreen} options={{ title: 'Settings' }} />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerContent: {
    flex: 1,
  },
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1a3a5c',
    marginBottom: 8,
  },
  drawerHeaderText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  label: {
    color: '#B0C4DE',
    fontSize: 15,
    fontWeight: '500',
  },
});

export default DrawerNavigator;
