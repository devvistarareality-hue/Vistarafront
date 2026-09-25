import React, { useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, withAlpha } from '../../constants/theme';
import ThemeToggle from '../../components/ThemeToggle';
import AppLoader from '../../components/AppLoader';
import { FadeInUp } from '../../components/ui';

// Each module's card — same titles, descriptions and tones as the website portal.
const MODULE_CONFIG = {
  Sales:                { title: 'Sales',               desc: 'Leads, follow-ups, site visits and bookings', icon: 'trending-up',     tone: 'peach', screen: 'SalesCRM',    getParams: () => ({}) },
  'Channel Partner':    { title: 'Channel Partner',     desc: 'Partner-sourced leads, visits and bookings',  icon: 'people',          tone: 'peach', screen: 'ChannelPartnerHub', getParams: () => ({}) },
  HR:                   { title: 'HR',                  desc: 'People, attendance and team structure',       icon: 'people',          tone: 'blue',  screen: 'ModuleHome',  getParams: () => ({ module: 'HR', name: 'HR' }) },
  'Accounts & Finance': { title: 'Accounts & Finance',  desc: 'Booking approvals and the bookings ledger',   icon: 'wallet',          tone: 'green', screen: 'ModuleHome',  getParams: () => ({ module: 'Accounts & Finance', name: 'Accounts & Finance' }) },
  AR:                   { title: 'Accounts Receivable', desc: 'Collections, dues, ageing and interest',      icon: 'receipt',         tone: 'blue',  screen: 'ARDashboard', getParams: () => ({}) },
  'Task Allocation':    { title: 'Task Allocation',     desc: 'Assign, track and close out tasks across every team', icon: 'construct', tone: 'green', screen: 'TaskDashboard', getParams: () => ({}) },
  Purchase:             { title: 'Purchase',            desc: 'Vendors and purchase orders',                 icon: 'cart',            tone: 'peach', screen: 'ModuleHome',  getParams: () => ({ module: 'Purchase', name: 'Purchase' }) },
  Land:                 { title: 'Land',                desc: 'Land parcels and site portfolio',             icon: 'map',             tone: 'blue',  screen: 'ModuleHome',  getParams: () => ({ module: 'Land', name: 'Land' }) },
  'Club 1000':          { title: 'Club 1000',           desc: 'Investors, schemes and payouts',              icon: 'trending-up',     tone: 'green', screen: 'Club1000Hub', getParams: () => ({}) },
};

const TONES = {
  blue:  { fg: COLORS.link,    bg: COLORS.accentSoft },
  green: { fg: COLORS.success, bg: COLORS.successBg },
  peach: { fg: COLORS.warning, bg: COLORS.warningBg },
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const ModulesScreen = () => {
  const navigation = useNavigation();
  const user       = useSelector((st) => st.auth.user);

  // A company's own full Admin can take an Excel backup of their own company —
  // the same thing the website offers them. Not a module-scoped admin: a
  // Sales-only admin has no business pulling HR, AR and Club 1000 out in one
  // file. Mirrors backend/sales/views.py::_may_back_up.
  const isModuleAdmin = user?.role === 'Admin' && !user?.is_staff && (user?.modules || []).length === 1;
  const mayBackUp = user?.role === 'Admin' && !isModuleAdmin;

  const userModules = (user?.modules || [])
    .filter((m) => MODULE_CONFIG[m])
    .map((m) => ({ key: m, ...MODULE_CONFIG[m] }));

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

  const today = useMemo(() => new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }), []);

  // Never render blank: show a brief loader while the redirect above runs.
  if (userModules.length === 1) {
    return (
      <SafeAreaView style={s.center}>
        <AppLoader size={0.7} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.screenBg} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <View style={s.topBar}>
          <Text style={s.brand}>Nexora</Text>
          <ThemeToggle compact />
        </View>

        <LinearGradient colors={COLORS.heroScene} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
          <View style={s.heroGlow} />
          <Text style={s.hello}>{greeting()},</Text>
          <Text style={s.name} numberOfLines={1} adjustsFontSizeToFit>{user?.name || '—'}</Text>
          <View style={s.meta}>
            <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={s.metaText}>{today}</Text>
            {user?.role ? <View style={s.role}><Text style={s.roleText}>{user.role}</Text></View> : null}
          </View>
          <View style={s.count}>
            <Ionicons name="grid-outline" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={s.countNum}>{userModules.length}</Text>
            <Text style={s.countText}>module{userModules.length === 1 ? '' : 's'} assigned</Text>
          </View>
        </LinearGradient>

        <View style={s.sectionHead}>
          <Text style={s.sectionTitle}>Your modules</Text>
          <Text style={s.sectionSub}>Pick where you want to work</Text>
        </View>

        {userModules.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}><Ionicons name="cube-outline" size={30} color={COLORS.textSecondary} /></View>
            <Text style={s.emptyTitle}>No modules assigned yet</Text>
            <Text style={s.emptyText}>Ask your administrator to give you access to a module.</Text>
          </View>
        ) : userModules.map((mod, idx) => {
          const t = TONES[mod.tone];
          return (
            <FadeInUp key={mod.key} index={idx}>
              <TouchableOpacity activeOpacity={0.85} style={s.card} onPress={() => navigation.navigate(mod.screen, mod.getParams(user))}>
                <View style={[s.icon, { backgroundColor: t.bg, borderColor: withAlpha(t.fg, '30') }]}>{/* inline-ok: module tone */}
                  <Ionicons name={mod.icon} size={24} color={t.fg} />
                </View>
                <View style={s.cardBody}>
                  <Text style={s.cardTitle} numberOfLines={1}>{mod.title}</Text>
                  <Text style={s.cardDesc} numberOfLines={2}>{mod.desc}</Text>
                </View>
                <View style={s.go}><Ionicons name="arrow-forward" size={17} color={t.fg} /></View>
              </TouchableOpacity>
            </FadeInUp>
          );
        })}

        {mayBackUp ? (
          <>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>Your company</Text>
              <Text style={s.sectionSub}>Keep a copy of your own records</Text>
            </View>
            <FadeInUp index={userModules.length}>
              <TouchableOpacity activeOpacity={0.85} style={s.card} onPress={() => navigation.navigate('DataBackup')}>
                <View style={[s.icon, s.adminIcon]}>
                  <Ionicons name="save-outline" size={24} color={COLORS.link} />
                </View>
                <View style={s.cardBody}>
                  <Text style={s.cardTitle} numberOfLines={1}>Data Backup</Text>
                  <Text style={s.cardDesc} numberOfLines={2}>Download your company as Excel, or restore one back</Text>
                </View>
                <View style={s.go}><Ionicons name="arrow-forward" size={17} color={COLORS.link} /></View>
              </TouchableOpacity>
            </FadeInUp>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ModulesScreen;

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 16, paddingBottom: 28 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, paddingBottom: 14 },
  brand: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: -0.4 },
  hero: { borderRadius: 26, padding: 22, marginBottom: 22, overflow: 'hidden', ...SHADOWS.md },
  heroGlow: { position: 'absolute', right: -70, top: -90, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(255,255,255,0.05)' },
  hello: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  name: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.6, marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  metaText: { fontSize: 12.5, color: 'rgba(255,255,255,0.85)' },
  role: { marginLeft: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  roleText: { fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' },
  count: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginTop: 18, paddingHorizontal: 14, paddingVertical: 10,
           borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
  countNum: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  countText: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  sectionSub: { fontSize: 12.5, color: COLORS.textSecondary },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, marginBottom: 12, borderRadius: 22,
          backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.cardBorder, ...SHADOWS.md },
  icon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  adminIcon: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.border },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  cardDesc: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 3, lineHeight: 17 },
  go: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceAlt },
  empty: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 30 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  emptyText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
});
