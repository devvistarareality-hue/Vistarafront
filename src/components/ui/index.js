import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS } from '../../constants/theme';
import AppIcon from '../AppIcon';

// Nexora shared UI components — same look as the website's ui.css.

const SIZES = {
  sm: { h: 34, px: 12, fs: 13, r: 11 },
  md: { h: 44, px: 16, fs: 14.5, r: 14 },
  lg: { h: 52, px: 20, fs: 16, r: 16 },
};

export function Button({ title, onPress, variant = 'primary', size = 'md', icon, loading, disabled, style, textStyle, full }) {
  const sz = SIZES[size] || SIZES.md;
  const off = disabled || loading;
  const v = VARIANTS[variant] || VARIANTS.primary;
  const content = (
    <View style={[st.row, { height: sz.h, paddingHorizontal: sz.px }]}>
      {loading ? <ActivityIndicator size="small" color={v.fg} /> : (
        <>
          {icon ? <AppIcon name={icon} size={sz.fs + 2} color={v.fg} /> : null}
          {title ? <Text style={[st.text, { fontSize: sz.fs, color: v.fg }, textStyle]} numberOfLines={1}>{title}</Text> : null}
        </>
      )}
    </View>
  );
  return (
    <Pressable onPress={onPress} disabled={off} accessibilityRole="button" accessibilityState={{ disabled: off }}
      style={({ pressed }) => [
        { borderRadius: sz.r, opacity: off ? 0.55 : 1, transform: [{ scale: pressed ? 0.97 : 1 }], alignSelf: full ? 'stretch' : 'auto' },
        v.shadow, style,
      ]}>
      {v.gradient ? (
        <LinearGradient colors={v.gradient} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={{ borderRadius: sz.r }}>{content}</LinearGradient>
      ) : (
        <View style={{ borderRadius: sz.r, backgroundColor: v.bg, borderWidth: v.border ? 1 : 0, borderColor: v.border }}>{content}</View>
      )}
    </Pressable>
  );
}

const glow = (c) => ({ shadowColor: c, shadowOpacity: COLORS.isDark ? 0.5 : 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 5 });
const VARIANTS = {
  primary:   { gradient: [COLORS.primaryTop, COLORS.primaryButton], fg: '#FFFFFF', shadow: glow(COLORS.glow) },
  success:   { gradient: ['#34A65F', '#23874A'], fg: '#FFFFFF', shadow: glow('#23874A') },
  danger:    { gradient: ['#E4575F', '#C9363F'], fg: '#FFFFFF', shadow: glow('#D9434B') },
  secondary: { bg: COLORS.isDark ? 'rgba(255,255,255,0.04)' : COLORS.surface, border: COLORS.borderStrong, fg: COLORS.textPrimary },
  soft:      { bg: COLORS.accentSoft, border: COLORS.blue2, fg: COLORS.link },
  ghost:     { bg: 'transparent', fg: COLORS.textSecondary },
  dangerSoft: { bg: COLORS.errorBg, border: COLORS.error2, fg: COLORS.error },
};

export function Card({ children, style, onPress, padded = true }) {
  const body = <View style={[st.card, padded && { padding: 16 }, style]}>{children}</View>;
  if (!onPress) return body;
  return <Pressable onPress={onPress} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.985 : 1 }] })}>{body}</Pressable>;
}

const BADGE = {
  info:    [COLORS.accentSoft, COLORS.link],
  success: [COLORS.successBg, COLORS.success],
  warning: [COLORS.warningBg, COLORS.warning],
  danger:  [COLORS.errorBg, COLORS.error],
  neutral: [COLORS.surface3, COLORS.textSecondary],
};
export function Badge({ label, tone = 'info', icon, style }) {
  const [bg, fg] = BADGE[tone] || BADGE.info;
  return (
    <View style={[st.badge, { backgroundColor: bg }, style]}>
      {icon ? <AppIcon name={icon} size={12} color={fg} /> : null}
      <Text style={[st.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ children, style }) {
  return <Text style={[st.section, style]}>{children}</Text>;
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  text: { fontWeight: '700', letterSpacing: 0.1 },
  card: { backgroundColor: COLORS.surface, borderRadius: 22, borderWidth: 1, borderColor: COLORS.cardBorder, ...SHADOWS.md },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.2 },
  section: { fontSize: 12, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 1, textTransform: 'uppercase' },
});
