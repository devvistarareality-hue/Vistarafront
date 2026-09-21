import React, { useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CARD_SHADOW, MODULE_ACCENT } from '../../constants/theme';
import ThemeToggle from '../../components/ThemeToggle';
import AppLoader from '../../components/AppLoader';
import { FadeInUp } from '../../components/ui';

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
  AR: {
    label:     'Accounts Receivable',
    sub:       'Dues, Receipts & Interest',
    icon:      'cash',
    screen:    'ARDashboard',
    getParams: () => ({}),
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
  'Club 1000': {
    label:     'Club 1000',
    sub:       'Investment Schemes',
    icon:      'trending-up',
    screen:    'Club1000Hub',
    getParams: () => ({}),
  },
};

const ModulesScreen = () => {
  const navigation = useNavigation();
  const user       = useSelector((s) => s.auth.user);

  const userModules = (user?.modules || [])
    .filter((m) => MODULE_CONFIG[m])
    .map((m) => ({ key: m, ...MODULE_CONFIG[m], accent: MODULE_ACCENT[m] || MODULE_ACCENT.HR }));

  // Single-module users (e.g. Sales-only) skip this list and go straight to their
  // module. useFocusEffect (not useEffect) so it re-fires every time the screen is
  // focused — including when navigating BACK to it — instead of leaving a blank
  // screen because the mount-only effect never re-ran.
  useFocusEffect(
    useCallback(() => {
      if (userModules.length === 1) {
        navigation.replace(userModules[0].screen, userModules[0].getParams(user));
      }
    }, [userModules.length])
  );

  // Never render blank: show a brief loader while the redirect above runs.
  if (userModules.length === 1) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }}>
        <AppLoader size={0.7} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.screenBg} />
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
          <ThemeToggle compact />
        </View>

        {/* ── Module Manager Banner ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View style={{
            backgroundColor: COLORS.panel, borderRadius: 28, padding: 18,
            flexDirection: 'row', alignItems: 'center',
           shadowColor: COLORS.glow, shadowOpacity: COLORS.isDark ? 0.45 : 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 }}>
            <View style={{
              width: 48, height: 48, borderRadius: 18,
              backgroundColor: 'rgba(162,210,255,0.18)',
              justifyContent: 'center', alignItems: 'center', marginRight: 14,
            }}>
              <Ionicons name="grid" size={24} color={COLORS.blue} />
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
              backgroundColor: COLORS.peach, borderRadius: 999,
              paddingHorizontal: 10, paddingVertical: 5,
            }}>
              <Text style={{
                color: COLORS.ink, fontSize: 10, fontWeight: '800',
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
            {userModules.map((mod, idx) => {
              const accent = mod.accent || { bg: COLORS.linkBg, icon: COLORS.link };
              return (
                <FadeInUp key={mod.key} index={idx} style={{ width: '47%' }}>
                  <TouchableOpacity activeOpacity={0.85} style={s.tile}
                    onPress={() => navigation.navigate(mod.screen, mod.getParams(user))}>
                    <View style={[s.tileBadge, { backgroundColor: accent.bg }]}>
                      <Ionicons name={mod.icon} size={22} color={accent.icon} />
                    </View>
                    <Text style={s.tileLabel} numberOfLines={2}>{mod.label}</Text>
                    <Text style={s.tileSub} numberOfLines={2}>{mod.sub}</Text>
                  </TouchableOpacity>
                </FadeInUp>
              );
            })}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
};

export default ModulesScreen;

const s = StyleSheet.create({
  tile: {
    width: '100%', backgroundColor: COLORS.surface, borderRadius: 22,
    paddingVertical: 18, paddingHorizontal: 12, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.cardBorder, ...CARD_SHADOW,
  },
  tileBadge: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  tileLabel: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  tileSub: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
});
