import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { isManagerRole, canSee } from '../../lib/roles';

// Display name → the prefix its screen keys use.
const MODULE_SLUG = { 'Accounts & Finance': 'accounts', HR: 'hr', 'Task Allocation': 'execution',
                      Purchase: 'purchase', Land: 'land', AR: 'ar' };

const NAVY = COLORS.navy; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 22, ...CARD_SHADOW , borderWidth: 1, borderColor: COLORS.cardBorder };

// Generic module landing — for now each module surfaces a "My Team" card
// (department org chart). More cards can be added as modules grow.
export default function ModuleHomeScreen({ navigation, route }) {
  const { module = '', name = 'Module' } = route?.params || {};
  const user = useSelector((s) => s.auth.user);
  const canSeeTeam = isManagerRole(user) || user?.role === 'Admin' || user?.is_staff;

  const isAccounts = /account|finance/i.test(module);
  const isLogAdmin = user?.role === 'Admin' || user?.is_staff;
  // The key prefix this module's screens are declared under (accounts/capabilities.py).
  const slug = MODULE_SLUG[module] || module.toLowerCase().replace(/[^a-z]+/g, '');
  const cards = [
    // Every module has the same three: a Dashboard, My Team, and — for admins —
    // the Log. AR has its own dashboard screen; the rest open the plain one.
    ...(canSee(user, `${slug}.screen.dashboard`) ? [{ key: module === 'AR' ? 'ARDashboard' : 'ModuleDashboard',
      label: 'Dashboard', desc: `${name} at a glance`, icon: 'bar-chart-outline',
      color: COLORS.link, bg: COLORS.linkBg, params: { module, name } }] : []),
    // My Team is a management view — only managers/admins see it.
    ...(canSeeTeam && canSee(user, `${slug}.screen.myteam`) ? [{ key: 'MyTeam', label: 'My Team', desc: `${name} department org chart`, icon: 'people-circle-outline',
      color: COLORS.link, bg: COLORS.linkBg, params: { module, title: `My Team · ${name}` } }] : []),
    // Accounts & Finance: read-only view of all sales bookings (LOI / EOI).
    ...(isAccounts && canSee(user, 'accounts.screen.bookings') ? [{ key: 'ModuleBookings', label: 'Bookings', desc: 'All sales bookings — LOI & EOI', icon: 'document-text-outline',
      color: COLORS.success, bg: COLORS.success2, params: { module, name } }] : []),
    // The second approval gate. Sales/CP puts a deal on the books; a unit does not
    // actually turn sold until Accounts signs off here — which, until now, could only
    // be done from a desktop.
    ...(isAccounts && canSee(user, 'accounts.screen.approvals') ? [{ key: 'ModuleApprovals', label: 'Approvals', desc: 'Sign off bookings — the Accounts gate', icon: 'checkmark-done-outline',
      color: COLORS.success, bg: COLORS.success2, params: { module, name } }] : []),
    // Who changed what in this module, and when — real admins only.
    ...(isLogAdmin ? [{ key: 'ActivityLog', label: 'Log', desc: 'Who changed what, and when', icon: 'time-outline',
      color: COLORS.link, bg: COLORS.linkBg, params: { modules: [module], title: `${name} Log` } }] : []),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'transparent', borderBottomWidth: 0, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>{name}</Text>
          <Text style={{ fontSize: 13, color: MUTED }}>Module</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 12 }}>Modules</Text>
        {cards.length === 0 && (
          <View style={[CARD, { padding: 28, alignItems: 'center' }]}>
            <Text style={{ fontSize: 13, color: MUTED, textAlign: 'center' }}>No tools available in this module yet.</Text>
          </View>
        )}
        <View style={s.grid}>
          {cards.map((c) => (
            <TouchableOpacity key={c.key} onPress={() => navigation.navigate(c.key, c.params)}
              style={[CARD, s.card]} activeOpacity={0.8}>
              <View style={[s.cardIcon, { backgroundColor: c.bg }]}>{/* inline-ok: per-card accent tint */}
                <Ionicons name={c.icon} size={22} color={c.color} />
              </View>
              <Text style={s.cardLabel} numberOfLines={2}>{c.label}</Text>
              <Text style={s.cardDesc} numberOfLines={2}>{c.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// One card shape for every module tile: the row stretches its items, so two
// cards side by side keep the same height whatever their label and description.
const s = StyleSheet.create({
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'stretch' },
  card:      { width: '47%', minHeight: 150, paddingVertical: 18, paddingHorizontal: 12, alignItems: 'center', gap: 6 },
  cardIcon:  { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  cardLabel: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', lineHeight: 18 },
  cardDesc:  { fontSize: 11.5, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 16 },
});
