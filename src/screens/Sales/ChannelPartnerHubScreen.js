import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { isManagerRole, canSee, dashboardFor } from '../../lib/roles';
import DashboardRoleFilter from '../../components/DashboardRoleFilter';

const NAVY = COLORS.navy; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 22, ...CARD_SHADOW , borderWidth: 1, borderColor: COLORS.cardBorder };

// The Channel Partner module — the same eight destinations the web nav lists, each
// one an existing Sales screen asked for the partner-sourced slice (cpOnly), plus the
// partner directory, which is the module's own record and has no Sales counterpart.
//
// "Booking" is the record-a-closure flow; "Approvals" is the Drafts/Pending/Approved
// list. They are separate items here for the same reason they are on the web: sharing
// one entry only ever opened the approvals list.
const TILES = [
  { screen: 'cp.screen.leads', key: 'ChannelPartners',    label: 'All Partners',  desc: 'The CP directory',            icon: 'people-outline',        color: COLORS.link,    bg: COLORS.linkBg,    params: {} },
  { screen: 'cp.screen.sitevisits', key: 'SalesSiteVisits',    label: 'Site Visits',   desc: 'Partner-sourced visits',      icon: 'location-outline',      color: COLORS.success, bg: COLORS.successBg, params: { cpOnly: true, adminView: true } },
  { screen: 'cp.screen.followups', key: 'SalesFollowUps',     label: 'Follow-Ups',    desc: 'Partner-sourced follow-ups',  icon: 'calendar-outline',      color: COLORS.warning, bg: COLORS.warningBg, params: { cpOnly: true, adminView: true } },
  { screen: 'cp.screen.booking', key: 'ClosureProjects',    label: 'Booking',       desc: 'Record a CP booking',         icon: 'document-text-outline', color: COLORS.link,    bg: COLORS.linkBg,    params: { cpOnly: true } },
  { screen: 'cp.screen.approvals', key: 'BookingApprovals',   label: 'Approvals',     desc: 'CP bookings to sign off',     icon: 'checkmark-done-outline',color: COLORS.success, bg: COLORS.successBg, params: { cpOnly: true, cpMode: true, adminView: true } },
  // Managers only, as in the web menu — a CP Executive has no reports, so the chart
  // would only ever be empty for them.
  { screen: 'cp.screen.myteam', key: 'MyTeam',             label: 'My Team',       desc: 'The CP org chart',            icon: 'people-circle-outline', color: COLORS.purple,  bg: COLORS.purpleBg,  params: { module: 'Sales', title: 'My Team · Channel Partner', cp: true }, managerOnly: true },
  // Who changed what in Channel Partner, and when — real admins only.
  { key: 'ActivityLog',        label: 'Log',           desc: 'Who changed what, and when',  icon: 'time-outline',          color: COLORS.link,    bg: COLORS.linkBg,    params: { modules: ['Channel Partner'], title: 'Channel Partner Log' }, adminOnly: true },
];

// The partner desk's dashboards, one per role level — the same keys the website
// uses. A CP designation pinned to a Sales dashboard maps onto the partner view
// of the same thing, so the pin is never ignored.
const CP_DASHBOARDS = [
  { key: 'cp_exec', role: 'Employee', label: 'CP Executive' },
  { key: 'cp_manager', role: 'Manager', label: 'CP Manager' },
  { key: 'cp_gm', role: 'General Manager', label: 'General Manager' },
  { key: 'cp_director', role: 'Director', label: 'Director' },
];
const SAME_AS = { manager: 'cp_manager', gm: 'cp_gm', director: 'cp_director',
                  stm: 'cp_exec', telecaller: 'cp_exec' };

export default function ChannelPartnerHubScreen({ navigation }) {
  const user = useSelector((s) => s.auth.user);
  const isTrueAdmin = user?.role === 'Admin' || user?.is_staff;
  const [preview, setPreview] = useState('');
  const _pinned = dashboardFor(user, 'Channel Partner');
  const chosen = preview || SAME_AS[_pinned] || _pinned;
  const isManager = isManagerRole(user) || user?.role === 'Admin' || user?.is_staff;
  const isLogAdmin = user?.role === 'Admin' || user?.is_staff;
  // Which of these a designation sees is set per company in Designation Master →
  // Permissions → Menu; unset keeps the old role-based list.
  const tiles = TILES.filter((t) => canSee(user, t.screen) && (!t.managerOnly || isManager) && (!t.adminOnly || isLogAdmin));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14,
                     backgroundColor: 'transparent', borderBottomWidth: 0, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>Channel Partner</Text>
          <Text style={{ fontSize: 13, color: MUTED }}>Partner-sourced pipeline</Text>
        </View>
      </View>

      {isTrueAdmin ? (
        <DashboardRoleFilter options={CP_DASHBOARDS} value={chosen} onChange={setPreview} module="Channel Partner" />
      ) : null}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {tiles.map((t) => (
            <TouchableOpacity key={t.key} onPress={() => navigation.navigate(t.key, t.params)}
              style={[CARD, { width: '47%', paddingVertical: 18, paddingHorizontal: 12, alignItems: 'center', gap: 8 }]} activeOpacity={0.8}>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center', marginBottom: 2 }}>
                <Ionicons name={t.icon} size={22} color={t.color} />
              </View>
              <Text style={{ fontSize: 13.5, fontWeight: '700', color: TEXT, textAlign: 'center', lineHeight: 18 }} numberOfLines={2}>{t.label}</Text>
              <Text style={{ fontSize: 11, color: MUTED, textAlign: 'center' }} numberOfLines={2}>{t.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
