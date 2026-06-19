import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BottomTabNavigator from './BottomTabNavigator';
import AdminScreen from '../screens/Dashboardscreen/Adminscreen/Adminscreen';
import InventoryScreen from '../screens/Drawerscreen/Inventoryscreen/Inventoryscreen';
import PaymentScreen from '../screens/Drawerscreen/Paymentscreen/Paymentscreen';
import ReportScreen from '../screens/Drawerscreen/Reportscreen/Reportscreen';
import ClientScreen from '../screens/Drawerscreen/Clientscreen/Clientscreen';
import SettingScreen from '../screens/Drawerscreen/Settingscreen/Settingscreen';
import ProjectsScreen from '../screens/Dashboardscreen/Projectscreen/Projectscreen';
import SitesScreen from '../screens/Dashboardscreen/Sitescreen/Sitescreen';
import ContractorsScreen from '../screens/Dashboardscreen/Contractorscreen/Contractorscreen';
import PurchaseScreen from '../screens/Dashboardscreen/Purchasescreen/Purchasescreen';
import { COLORS } from '../constants/theme';

const Drawer = createDrawerNavigator();

const DRAWER_ITEMS = [
  { label: 'Dashboard', icon: 'home-outline', screen: 'Dashboard', params: { screen: 'Home' } },
  { label: 'Home', icon: 'apps-outline', screen: 'Dashboard', params: { screen: 'Modules' } },
  { label: 'Admin', icon: 'shield-checkmark-outline', screen: 'Admin' },
  { label: 'Projects', icon: 'folder-open-outline', screen: 'Projects' },
  { label: 'Sites', icon: 'location-outline', screen: 'Sites' },
  { label: 'Contractors', icon: 'construct-outline', screen: 'Contractors' },
  { label: 'Purchase', icon: 'cart-outline', screen: 'Purchase' },
  { label: 'Inventory', icon: 'cube-outline', screen: 'Inventory' },
  { label: 'Payments', icon: 'card-outline', screen: 'Payments' },
  { label: 'Reports', icon: 'bar-chart-outline', screen: 'Reports' },
  { label: 'Clients', icon: 'people-outline', screen: 'Clients' },
  { label: 'Settings', icon: 'settings-outline', screen: 'Settings' },
];

const CustomDrawerContent = (props) => {
  const { navigation } = props;
  const insets = useSafeAreaInsets();
  return (
    <DrawerContentScrollView {...props} contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}>
      <View style={s.drawerHeader}>
        <View style={s.drawerLogo}>
          <Ionicons name="grid" size={24} color={COLORS.powderBlue} />
        </View>
        <Text style={s.drawerHeaderText}>StrategicERP</Text>
        <Text style={s.drawerHeaderSub}>Vistara Realty</Text>
      </View>

      <View style={s.menuSection}>
        {DRAWER_ITEMS.map((item) => (
          <DrawerItem
            key={item.label}
            label={item.label}
            labelStyle={s.label}
            icon={() => (
              <Ionicons name={item.icon} size={20} color="#B0C4DE" style={{ marginRight: -16 }} />
            )}
            onPress={() => navigation.navigate(item.screen, item.params)}
          />
        ))}
      </View>
    </DrawerContentScrollView>
  );
};

const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: COLORS.navy },
        headerTintColor: COLORS.white,
        drawerStyle: {
          backgroundColor: COLORS.navy,
          width: 280,
        },
      }}
    >
      <Drawer.Screen name="Dashboard" component={BottomTabNavigator} options={{ title: 'StrategicERP' }} />
      <Drawer.Screen name="Admin" component={AdminScreen} options={{ title: 'Admin' }} />
      <Drawer.Screen name="Inventory" component={InventoryScreen} options={{ title: 'Inventory' }} />
      <Drawer.Screen name="Payments" component={PaymentScreen} options={{ title: 'Payments' }} />
      <Drawer.Screen name="Reports" component={ReportScreen} options={{ title: 'Reports' }} />
      <Drawer.Screen name="Clients" component={ClientScreen} options={{ title: 'Clients' }} />
      <Drawer.Screen name="Settings" component={SettingScreen} options={{ title: 'Settings' }} />
      <Drawer.Screen name="Projects" component={ProjectsScreen} options={{ title: 'Projects' }} />
      <Drawer.Screen name="Sites" component={SitesScreen} options={{ title: 'Sites' }} />
      <Drawer.Screen name="Contractors" component={ContractorsScreen} options={{ title: 'Contractors' }} />
      <Drawer.Screen name="Purchase" component={PurchaseScreen} options={{ title: 'Purchase' }} />
    </Drawer.Navigator>
  );
};

const s = StyleSheet.create({
  drawerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 8,
  },
  drawerLogo: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(175,210,250,0.12)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  drawerHeaderText: { color: COLORS.white, fontSize: 20, fontWeight: '800' },
  drawerHeaderSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '500', marginTop: 2 },
  menuSection: { paddingLeft: 8 },
  label: { color: '#B0C4DE', fontSize: 15, fontWeight: '500' },
});

export default DrawerNavigator;
