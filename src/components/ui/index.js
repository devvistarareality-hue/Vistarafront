import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Animated, Easing } from 'react-native';
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
const tint = (c, a) => `rgba(${parseInt(c.slice(1,3),16)},${parseInt(c.slice(3,5),16)},${parseInt(c.slice(5,7),16)},${a})`;
// Accent buttons are tinted glass with a glowing edge — same design as the web.
const VARIANTS = {
  primary:   { bg: tint(COLORS.primaryButton, 0.16), border: tint(COLORS.primaryButton, 0.42), fg: COLORS.link, shadow: glow(COLORS.glow) },
  success:   { bg: tint(COLORS.successSolid, 0.16), border: tint(COLORS.successSolid, 0.42), fg: COLORS.success, shadow: glow(COLORS.successSolid) },
  danger:    { bg: tint(COLORS.errorSolid, 0.16), border: tint(COLORS.errorSolid, 0.42), fg: COLORS.error, shadow: glow(COLORS.errorSolid) },
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

// Entrance animation: fades and rises in, staggered by index.
export function FadeInUp({ children, index = 0, delay = 45, style }) {
  const v = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 420, delay: Math.min(index, 10) * delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

// ── CarePulse-style building blocks ────────────────────────────────
// Metric tile: round tinted icon badge above a centred label.
export function MetricTile({ icon, label, sub, tone = 'info', onPress, style, width = '47%' }) {
  const [bg, fg] = BADGE[tone] || BADGE.info;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [st2.tile, { width }, pressed && { transform: [{ scale: 0.98 }] }, style]}>
      <View style={[st2.tileBadge, { backgroundColor: bg }]}>
        <AppIcon name={icon} size={22} color={fg} />
      </View>
      <Text style={st2.tileLabel} numberOfLines={2}>{label}</Text>
      {sub ? <Text style={st2.tileSub} numberOfLines={2}>{sub}</Text> : null}
    </Pressable>
  );
}

// List row: icon, title, and a quiet right-hand meta value.
export function ListRow({ icon, title, meta, tone = 'neutral', onPress, right, style }) {
  const [bg, fg] = BADGE[tone] || BADGE.neutral;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [st2.row, pressed && onPress && { opacity: 0.85 }, style]}>
      {icon ? <View style={[st2.rowIcon, { backgroundColor: bg }]}><AppIcon name={icon} size={16} color={fg} /></View> : null}
      <Text style={st2.rowTitle} numberOfLines={1}>{title}</Text>
      {right || (meta ? <Text style={st2.rowMeta} numberOfLines={1}>{meta}</Text> : null)}
    </Pressable>
  );
}

// Segmented control: pill track with a tinted active segment.
export function Segmented({ options, value, onChange, style }) {
  return (
    <View style={[st2.seg, style]}>
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        const on = val === value;
        return (
          <Pressable key={val} onPress={() => onChange(val)} style={[st2.segItem, on && st2.segItemOn]}>
            <Text style={[st2.segText, on && st2.segTextOn]} numberOfLines={1}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Highlight stat: gradient card with a big value (like the Blood Pressure card).
export function StatCard({ label, value, unit, note, onPress, style }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [{ borderRadius: 22, overflow: 'hidden' }, pressed && onPress && { opacity: 0.92 }, style]}>
      <LinearGradient colors={[COLORS.primaryTop, COLORS.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st2.stat}>
        <View style={st2.statTop}>
          <Text style={st2.statLabel}>{label}</Text>
          {note ? <Text style={st2.statNote}>{note}</Text> : null}
        </View>
        <Text style={st2.statValue}>{value}{unit ? <Text style={st2.statUnit}> {unit}</Text> : null}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const st2 = StyleSheet.create({
  tile: { backgroundColor: COLORS.surface, borderRadius: 22, paddingVertical: 18, paddingHorizontal: 12, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: COLORS.cardBorder, ...SHADOWS.md },
  tileBadge: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  tileLabel: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  tileSub: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', marginTop: -4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.surface, borderRadius: 18, paddingVertical: 13, paddingHorizontal: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.cardBorder, ...SHADOWS.sm },
  rowIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  rowMeta: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  seg: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: 999, padding: 4, borderWidth: 1, borderColor: COLORS.cardBorder, ...SHADOWS.sm },
  segItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 999 },
  segItemOn: { backgroundColor: COLORS.accentSoft },
  segText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  segTextOn: { color: COLORS.link },
  stat: { padding: 16, minHeight: 92, justifyContent: 'space-between' },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statLabel: { color: '#fff', fontSize: 13.5, fontWeight: '700', opacity: 0.92 },
  statNote: { color: '#fff', fontSize: 12, fontWeight: '600', opacity: 0.8 },
  statValue: { color: '#fff', fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  statUnit: { fontSize: 13, fontWeight: '600', opacity: 0.85 },
});
