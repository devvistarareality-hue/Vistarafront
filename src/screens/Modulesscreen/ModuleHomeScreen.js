import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const NAVY = COLORS.navy; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 16, ...CARD_SHADOW };

// Generic module landing — for now each module surfaces a "My Team" card
// (department org chart). More cards can be added as modules grow.
export default function ModuleHomeScreen({ navigation, route }) {
  const { module = '', name = 'Module' } = route?.params || {};
  const user = useSelector((s) => s.auth.user);
  const canSeeTeam = user?.role === 'Manager' || user?.role === 'Admin' || user?.is_staff;

  const isAccounts = /account|finance/i.test(module);
  const cards = [
    // My Team is a management view — only managers/admins see it.
    ...(canSeeTeam ? [{ key: 'MyTeam', label: 'My Team', desc: `${name} department org chart`, icon: 'people-circle-outline',
      color: COLORS.link, bg: COLORS.linkBg, params: { module, title: `My Team · ${name}` } }] : []),
    // Accounts & Finance: read-only view of all sales bookings (LOI / EOI).
    ...(isAccounts ? [{ key: 'ModuleBookings', label: 'Bookings', desc: 'All sales bookings — LOI & EOI', icon: 'document-text-outline',
      color: '#0D9488', bg: '#CCFBF1', params: { module, name } }] : []),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
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
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {cards.map((c) => (
            <TouchableOpacity key={c.key} onPress={() => navigation.navigate(c.key, c.params)}
              style={[CARD, { width: '47%', padding: 16 }]} activeOpacity={0.8}>
              <View style={{ width: 46, height: 46, borderRadius: 13, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name={c.icon} size={22} color={c.color} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 6 }}>{c.label}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: c.color }}>Open →</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
