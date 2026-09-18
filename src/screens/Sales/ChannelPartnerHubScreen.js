import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { isManagerRole } from '../../lib/roles';

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
  { key: 'ChannelPartners',    label: 'All Partners',  desc: 'The CP directory',            icon: 'people-outline',        color: COLORS.link,    bg: COLORS.linkBg,    params: {} },
  { key: 'SalesSiteVisits',    label: 'Site Visits',   desc: 'Partner-sourced visits',      icon: 'location-outline',      color: COLORS.success, bg: COLORS.successBg, params: { cpOnly: true, adminView: true } },
  { key: 'SalesFollowUps',     label: 'Follow-Ups',    desc: 'Partner-sourced follow-ups',  icon: 'calendar-outline',      color: COLORS.warning, bg: COLORS.warningBg, params: { cpOnly: true, adminView: true } },
  { key: 'SalesMyConversions', label: 'Closures',      desc: 'Partner-sourced conversions', icon: 'trending-up-outline',   color: COLORS.success, bg: COLORS.successBg, params: { cpOnly: true, adminView: true } },
  { key: 'ClosureProjects',    label: 'Booking',       desc: 'Record a CP booking',         icon: 'document-text-outline', color: COLORS.link,    bg: COLORS.linkBg,    params: { cpOnly: true } },
  { key: 'BookingApprovals',   label: 'Approvals',     desc: 'CP bookings to sign off',     icon: 'checkmark-done-outline',color: COLORS.success, bg: COLORS.successBg, params: { cpOnly: true, cpMode: true, adminView: true } },
  // Managers only, as in the web menu — a CP Executive has no reports, so the chart
  // would only ever be empty for them.
  { key: 'MyTeam',             label: 'My Team',       desc: 'The CP org chart',            icon: 'people-circle-outline', color: COLORS.purple,  bg: COLORS.purpleBg,  params: { module: 'Sales', title: 'My Team · Channel Partner', cp: true }, managerOnly: true },
];

export default function ChannelPartnerHubScreen({ navigation }) {
  const user = useSelector((s) => s.auth.user);
  const isManager = isManagerRole(user) || user?.role === 'Admin' || user?.is_staff;
  const tiles = TILES.filter((t) => !t.managerOnly || isManager);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14,
                     backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()}
          style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>Channel Partner</Text>
          <Text style={{ fontSize: 13, color: MUTED }}>Partner-sourced pipeline</Text>
        </View>
      </View>

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
