import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

const BG    = '#F5F6FA';
const NAVY  = '#182350';
const TEXT  = '#1A1A2E';
const MUTED = '#8492A6';

const CARD = {
  backgroundColor: '#FFFFFF',
  borderRadius: 18,
  shadowColor: '#B8C4D6',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.20,
  shadowRadius: 12,
  elevation: 4,
};

// Maps module names (from backend user.modules array) to display config
const MODULE_CONFIG = {
  Sales: {
    label:     'Sales',
    sub:       'Leads & Pipeline',
    icon:      'business',
    iconBg:    '#FFF8E1',
    iconColor: '#F9A825',
    linkColor: '#F9A825',
    screen:    'SalesCRM',
    getParams: () => ({}),
  },
  HR: {
    label:     'HR',
    sub:       'People & Attendance',
    icon:      'people',
    iconBg:    '#E8EEFF',
    iconColor: '#3D5AFE',
    linkColor: '#3D5AFE',
    screen:    'Placeholder',
    getParams: (user) => ({
      title: user?.manager_modules?.includes('HR') ? 'HR Manager' : 'HR Employee',
    }),
  },
  Execution: {
    label:     'Execution',
    sub:       'Tasks & Progress',
    icon:      'construct',
    iconBg:    '#E8F5E9',
    iconColor: '#2E7D32',
    linkColor: '#2E7D32',
    screen:    'Placeholder',
    getParams: () => ({ title: 'Execution' }),
  },
  Purchase: {
    label:     'Purchase',
    sub:       'Vendors & Orders',
    icon:      'cart',
    iconBg:    '#FFF3E0',
    iconColor: '#E65100',
    linkColor: '#E65100',
    screen:    'Placeholder',
    getParams: () => ({ title: 'Purchase' }),
  },
  Land: {
    label:     'Land',
    sub:       'Properties & Sites',
    icon:      'map',
    iconBg:    '#F3E5F5',
    iconColor: '#6A1B9A',
    linkColor: '#6A1B9A',
    screen:    'Placeholder',
    getParams: () => ({ title: 'Land' }),
  },
};

const ModulesScreen = () => {
  const navigation = useNavigation();
  const user       = useSelector((s) => s.auth.user);

  // Build module list from user.modules (filtered by MODULE_CONFIG)
  const userModules = (user?.modules || [])
    .filter((m) => MODULE_CONFIG[m])
    .map((m) => ({ key: m, ...MODULE_CONFIG[m] }));

  // Auto-navigate when only one module is assigned — skip this screen entirely
  useEffect(() => {
    if (userModules.length === 1) {
      navigation.replace(userModules[0].screen, userModules[0].getParams(user));
    }
  }, [userModules.length]);

  if (userModules.length === 1) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>

        {/* ── Top Bar ── */}
        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>Modules</Text>
          <Text style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>Your assigned ERP modules</Text>
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
          <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT }}>My Modules</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#3D5AFE' }}>
            {userModules.length} {userModules.length === 1 ? 'module' : 'modules'}
          </Text>
        </View>

        {/* ── Modules Grid ── */}
        {userModules.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40, paddingHorizontal: 40 }}>
            <Ionicons name="cube-outline" size={48} color="#DDE3F0" />
            <Text style={{ fontSize: 14, color: MUTED, marginTop: 12, textAlign: 'center' }}>
              No modules assigned yet. Contact your administrator.
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {userModules.map((mod) => (
              <TouchableOpacity
                key={mod.key}
                style={{ width: '47%', ...CARD, padding: 16 }}
                activeOpacity={0.85}
                onPress={() => navigation.navigate(mod.screen, mod.getParams(user))}
              >
                <View style={{
                  width: 48, height: 48, borderRadius: 14,
                  backgroundColor: mod.iconBg,
                  justifyContent: 'center', alignItems: 'center', marginBottom: 12,
                }}>
                  <Ionicons name={mod.icon} size={24} color={mod.iconColor} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT, marginBottom: 3 }}>
                  {mod.label}
                </Text>
                <Text style={{ fontSize: 11, color: MUTED, marginBottom: 10 }}>
                  {mod.sub}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: mod.linkColor }}>
                  Open →
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

export default ModulesScreen;
