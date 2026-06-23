import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CARD_SHADOW, MODULE_ACCENT } from '../../constants/theme';

const MODULE_CONFIG = {
  Sales: {
    label:     'Sales',
    sub:       'Leads & Pipeline',
    icon:      'business',
    screen:    'SalesCRM',
    getParams: () => ({}),
  },
  HR: {
    label:     'HR',
    sub:       'People & Attendance',
    icon:      'people',
    screen:    'ModuleHome',
    getParams: () => ({ module: 'HR', name: 'HR' }),
  },
  'Accounts & Finance': {
    label:     'Accounts & Finance',
    sub:       'Accounting & Finance',
    icon:      'wallet',
    screen:    'ModuleHome',
    getParams: () => ({ module: 'Accounts & Finance', name: 'Accounts & Finance' }),
  },
  Execution: {
    label:     'Execution',
    sub:       'Tasks & Progress',
    icon:      'construct',
    screen:    'ModuleHome',
    getParams: () => ({ module: 'Execution', name: 'Execution' }),
  },
  Purchase: {
    label:     'Purchase',
    sub:       'Vendors & Orders',
    icon:      'cart',
    screen:    'ModuleHome',
    getParams: () => ({ module: 'Purchase', name: 'Purchase' }),
  },
  Land: {
    label:     'Land',
    sub:       'Properties & Sites',
    icon:      'map',
    screen:    'ModuleHome',
    getParams: () => ({ module: 'Land', name: 'Land' }),
  },
};

const ModulesScreen = () => {
  const navigation = useNavigation();
  const user       = useSelector((s) => s.auth.user);

  const userModules = (user?.modules || [])
    .filter((m) => MODULE_CONFIG[m])
    .map((m) => ({ key: m, ...MODULE_CONFIG[m], accent: MODULE_ACCENT[m] || MODULE_ACCENT.HR }));

  useEffect(() => {
    if (userModules.length === 1) {
      navigation.replace(userModules[0].screen, userModules[0].getParams(user));
    }
  }, [userModules.length]);

  if (userModules.length === 1) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.screenBg }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>

        {/* ── Top Bar ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: 14, paddingBottom: 22,
        }}>
          <View>
            <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' }}>Welcome back</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.textPrimary }}>{user?.name || '—'}</Text>
          </View>
        </View>

        {/* ── Module Manager Banner ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View style={{
            backgroundColor: COLORS.navy, borderRadius: 18, padding: 18,
            flexDirection: 'row', alignItems: 'center',
          }}>
            <View style={{
              width: 48, height: 48, borderRadius: 14,
              backgroundColor: 'rgba(175,210,250,0.18)',
              justifyContent: 'center', alignItems: 'center', marginRight: 14,
            }}>
              <Ionicons name="grid" size={24} color={COLORS.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.white, marginBottom: 3 }}>
                Module Manager
              </Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.50)' }}>
                Configure each module independently
              </Text>
            </View>
            <View style={{
              backgroundColor: COLORS.gold, borderRadius: 8,
              paddingHorizontal: 10, paddingVertical: 5,
            }}>
              <Text style={{
                color: COLORS.white, fontSize: 10, fontWeight: '800',
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
          <Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.textPrimary }}>My Modules</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.link }}>
            {userModules.length} {userModules.length === 1 ? 'module' : 'modules'}
          </Text>
        </View>

        {/* ── Modules Grid ── */}
        {userModules.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 40, paddingHorizontal: 40 }}>
            <Ionicons name="cube-outline" size={48} color={COLORS.divider} />
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 12, textAlign: 'center' }}>
              No modules assigned yet. Contact your administrator.
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {userModules.map((mod) => {
              const accent = mod.accent || { bg: COLORS.linkBg, icon: COLORS.link };
              return (
                <TouchableOpacity
                  key={mod.key}
                  style={{
                    width: '47%',
                    backgroundColor: COLORS.cardBg,
                    borderRadius: 18,
                    padding: 16,
                    ...CARD_SHADOW,
                  }}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate(mod.screen, mod.getParams(user))}
                >
                  <View style={{
                    width: 48, height: 48, borderRadius: 14,
                    backgroundColor: accent.bg,
                    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
                  }}>
                    <Ionicons name={mod.icon} size={24} color={accent.icon} />
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 3 }}>
                    {mod.label}
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 10 }}>
                    {mod.sub}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: accent.icon }}>
                    Open →
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

export default ModulesScreen;
