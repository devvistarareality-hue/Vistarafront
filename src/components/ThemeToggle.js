import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import { setAppTheme } from '../lib/appTheme';

// Light / Dark pill. Switching reloads the app so every screen re-themes.
export default function ThemeToggle({ compact = false, style }) {
  const dark = COLORS.isDark;
  const opt = (mode, icon, label) => {
    const on = (mode === 'dark') === dark;
    return (
      <Pressable key={mode} onPress={() => setAppTheme(mode)} accessibilityRole="radio" accessibilityState={{ checked: on }}
        style={[st.opt, on && st.on]}>
        <Ionicons name={icon} size={14} color={on ? COLORS.textPrimary : COLORS.textSecondary} />
        {!compact && <Text style={[st.label, { color: on ? COLORS.textPrimary : COLORS.textSecondary }]}>{label}</Text>}
      </Pressable>
    );
  };
  return (
    <View style={[st.wrap, style]} accessibilityRole="radiogroup">
      {opt('light', dark ? 'sunny-outline' : 'sunny', 'Light')}
      {opt('dark', dark ? 'moon' : 'moon-outline', 'Dark')}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flexDirection: 'row', padding: 3, borderRadius: 999, backgroundColor: COLORS.surface3, borderWidth: 1, borderColor: COLORS.border, alignSelf: 'flex-start' },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999 },
  on: { backgroundColor: COLORS.isDark ? '#221D1B' : COLORS.surface, shadowColor: '#000', shadowOpacity: COLORS.isDark ? 0.4 : 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  label: { fontSize: 12, fontWeight: '700' },
});

// Round icon button for crowded headers: tap to flip theme.
export function ThemeIconButton({ style, size = 20 }) {
  const dark = COLORS.isDark;
  return (
    <Pressable onPress={() => setAppTheme(dark ? 'light' : 'dark')} accessibilityLabel={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      style={({ pressed }) => [{ padding: 6, borderRadius: 12, backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border, opacity: pressed ? 0.8 : 1 }, style]}>
      <Ionicons name={dark ? 'sunny-outline' : 'moon-outline'} size={size} color={COLORS.textPrimary} />
    </Pressable>
  );
}
