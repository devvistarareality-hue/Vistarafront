import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const BG    = '#F5F6FA';
const NAVY  = '#182350';
const TEXT  = '#1A1A2E';
const MUTED = '#8492A6';
const LINK  = '#3D5AFE';

const CARD = {
  backgroundColor: '#FFFFFF',
  borderRadius: 18,
  shadowColor: '#B8C4D6',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.20,
  shadowRadius: 12,
  elevation: 4,
};

const MODULES = [
  {
    name: 'Pre Sales',
    sub: 'Leads & Follow-ups',
    screen: 'PreSales',
    icon: 'funnel',
    iconBg: '#E0F7FA',
    iconColor: '#0097A7',
    linkColor: '#0097A7',
  },
  {
    name: 'User Management',
    sub: 'Users & Permissions',
    screen: 'UserManagement',
    icon: 'people',
    iconBg: '#E8EEFF',
    iconColor: '#3D5AFE',
    linkColor: '#3D5AFE',
  },
  {
    name: 'Projects',
    sub: 'Tasks & Progress',
    screen: 'Projects',
    icon: 'construct',
    iconBg: '#E8F5E9',
    iconColor: '#2E7D32',
    linkColor: '#2E7D32',
  },
  {
    name: 'Sites',
    sub: 'Locations & Maps',
    screen: 'Sites',
    icon: 'location',
    iconBg: '#E0F7FA',
    iconColor: '#0097A7',
    linkColor: '#0097A7',
  },
  {
    name: 'Contractors',
    sub: 'Vendors & Teams',
    screen: 'Contractors',
    icon: 'hammer',
    iconBg: '#FFF3E0',
    iconColor: '#E65100',
    linkColor: '#E65100',
  },
  {
    name: 'Purchase',
    sub: 'Vendors & Orders',
    screen: 'Purchase',
    icon: 'cart',
    iconBg: '#FFF3E0',
    iconColor: '#E65100',
    linkColor: '#E65100',
  },
  {
    name: 'Inventory',
    sub: 'Stock & Materials',
    screen: 'Inventory',
    icon: 'cube',
    iconBg: '#FFF8E1',
    iconColor: '#F9A825',
    linkColor: '#F9A825',
  },
  {
    name: 'Payments',
    sub: 'Invoices & Finance',
    screen: 'Payments',
    icon: 'card',
    iconBg: '#E8F5E9',
    iconColor: '#2E7D32',
    linkColor: '#2E7D32',
  },
  {
    name: 'Reports',
    sub: 'Analytics & Insights',
    screen: 'Reports',
    icon: 'bar-chart',
    iconBg: '#E8F5E9',
    iconColor: '#2E7D32',
    linkColor: '#2E7D32',
  },
  {
    name: 'Clients',
    sub: 'CRM & Contacts',
    screen: 'Clients',
    icon: 'people-circle',
    iconBg: '#E8EEFF',
    iconColor: '#3D5AFE',
    linkColor: '#3D5AFE',
  },
  {
    name: 'Settings',
    sub: 'Config & Preferences',
    screen: 'Settings',
    icon: 'settings',
    iconBg: '#F3E5F5',
    iconColor: '#7B1FA2',
    linkColor: '#7B1FA2',
  },
];

const ModulesScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>

        {/* ── Top Bar ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>Modules</Text>
          <Text style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>Access all ERP features</Text>
        </View>

        {/* ── Module Manager Banner ── */}
        <View style={{ paddingHorizontal: 20, marginTop: 16, marginBottom: 24 }}>
          <View style={{
            backgroundColor: NAVY, borderRadius: 18, padding: 18,
            flexDirection: 'row', alignItems: 'center',
          }}>
            <View style={{
              width: 48, height: 48, borderRadius: 14,
              backgroundColor: 'rgba(175,210,250,0.18)',
              justifyContent: 'center', alignItems: 'center', marginRight: 14,
            }}>
              <Ionicons name="grid" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginBottom: 3 }}>
                Module Manager
              </Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)' }}>
                Configure each module independently
              </Text>
            </View>
            <View style={{
              backgroundColor: '#B9915E', borderRadius: 8,
              paddingHorizontal: 10, paddingVertical: 5,
            }}>
              <Text style={{
                color: '#FFFFFF', fontSize: 10, fontWeight: '800',
                textTransform: 'uppercase', letterSpacing: 0.8,
              }}>SOON</Text>
            </View>
          </View>
        </View>

        {/* ── Section Header ── */}
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          paddingHorizontal: 20, marginBottom: 14,
        }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT }}>All Modules</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: LINK }}>{MODULES.length} total</Text>
        </View>

        {/* ── Modules Grid ── */}
        <View style={{ paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {MODULES.map((mod) => (
            <TouchableOpacity
              key={mod.screen}
              style={{ width: '47%', ...CARD, padding: 16 }}
              activeOpacity={0.85}
              onPress={() => navigation.navigate(mod.screen)}
            >
              <View style={{
                width: 48, height: 48, borderRadius: 14,
                backgroundColor: mod.iconBg,
                justifyContent: 'center', alignItems: 'center', marginBottom: 12,
              }}>
                <Ionicons name={mod.icon} size={24} color={mod.iconColor} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT, marginBottom: 3 }}>
                {mod.name}
              </Text>
              <Text style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>
                {mod.sub}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: mod.linkColor }}>
                Configure →
              </Text>
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default ModulesScreen;
