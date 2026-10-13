import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { navigationRef } from '../navigation/navigationRef';
import { canUseAI } from '../screens/Sales/AskNexoraScreen';

// Ask Nexora on every screen, like the website's floating button. Shown to people
// who have Ask Nexora (User Management tick, or admins); hidden on the screens
// where it would be in the way (Ask Nexora itself, sign-in, forms being filled).
const HIDE_ON = new Set(['AskNexora', 'Login', 'Kiosk', 'BookingForm', 'SignIn', 'PostSignOut',
  'RequestLeave', 'CreateUser', 'EditCompany']);

export default function AskNexoraFab({ routeName }) {
  const user = useSelector((st) => st.auth.user);
  const insets = useSafeAreaInsets();
  if (!user || !canUseAI(user) || !routeName || HIDE_ON.has(routeName)) return null;
  // Regular users have the bottom tab bar (64 + inset); admins' stacks have none.
  const bottom = insets.bottom + (user?.role === 'Admin' ? 18 : 78);
  return (
    <TouchableOpacity activeOpacity={0.85} style={StyleSheet.compose(s.fab, { bottom })} // inline-ok: safe-area offset
      onPress={() => navigationRef.isReady() && navigationRef.navigate('AskNexora', { module: 'dashboard' })}>
      <Ionicons name="sparkles-outline" size={18} color={COLORS.link} />
      <Text style={s.text}>Ask Nexora</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  fab: { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 16,
         paddingVertical: 11, borderRadius: 24, borderWidth: 1.5, borderColor: COLORS.link, backgroundColor: COLORS.surface,
         shadowColor: COLORS.shadow, shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  text: { fontSize: 14, fontWeight: '800', color: COLORS.link },
});
