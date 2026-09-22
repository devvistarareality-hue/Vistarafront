import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, SHADOWS, withAlpha } from '../constants/theme';

// Shared dashboard pieces — the AR dashboard's design, reused on the Sales and
// Club 1000 homes (same as components/Dash.js on the website).

export const TONES = {
  info:  { fg: COLORS.link,    bg: COLORS.accentSoft },
  good:  { fg: COLORS.success, bg: COLORS.successBg },
  warn:  { fg: COLORS.warning, bg: COLORS.warningBg },
  bad:   { fg: COLORS.error,   bg: COLORS.errorBg },
  muted: { fg: COLORS.textSecondary, bg: COLORS.surfaceAlt },
};

export function DashHero({ eyebrow, value, splits = [], ring, children }) {
  return (
    <LinearGradient colors={COLORS.heroScene} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
      <View style={s.heroGlow} />
      <View style={s.flex}>
        {eyebrow ? <Text style={s.heroLabel}>{String(eyebrow).toUpperCase()}</Text> : null}
        <Text style={s.heroValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
        {splits.length > 0 && (
          <View style={s.heroSplit}>
            {splits.map((x) => (
              <View key={x.label}><Text style={s.heroSmall}>{x.label}</Text><Text style={s.heroSub}>{x.value}</Text></View>
            ))}
          </View>
        )}
        {children}
      </View>
      {ring ? <DashRing {...ring} /> : null}
    </LinearGradient>
  );
}

export function DashRing({ pct, label }) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  const r = 40; const c = 2 * Math.PI * r;
  return (
    <View style={s.ring}>
      <Svg width={100} height={100} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r={r} stroke="rgba(255,255,255,0.15)" strokeWidth={9} fill="none" />
        <Circle cx="50" cy="50" r={r} stroke="#5BE09A" strokeWidth={9} fill="none" strokeLinecap="round"
          strokeDasharray={`${(p / 100) * c} ${c}`} transform="rotate(-90 50 50)" />
      </Svg>
      <View style={s.ringCenter}><Text style={s.ringPct}>{Math.round(p)}%</Text><Text style={s.ringCap}>{label}</Text></View>
    </View>
  );
}

export function DashKpi({ icon, tone = 'info', label, value, sub, onPress }) {
  const t = TONES[tone] || TONES.info;
  return (
    <TouchableOpacity style={s.kpi} activeOpacity={onPress ? 0.8 : 1} disabled={!onPress} onPress={onPress}>
      <View style={s.kpiTop}>
        <View style={[s.kpiIcon, { backgroundColor: t.bg }]}><Ionicons name={icon} size={17} color={t.fg} /></View>{/* inline-ok: tone colour */}
        {onPress ? <Ionicons name="chevron-forward" size={15} color={COLORS.textTertiary} /> : null}
      </View>
      <Text style={s.kpiLabel} numberOfLines={1}>{label}</Text>
      <Text style={[s.kpiValue, (tone === 'good' || tone === 'bad') && { color: t.fg }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>{/* inline-ok: tone colour */}
      {sub ? <Text style={s.kpiSub} numberOfLines={1}>{sub}</Text> : null}
    </TouchableOpacity>
  );
}

export function DashKpiGrid({ children }) {
  return <View style={s.kpis}>{children}</View>;
}

// "Needs attention" cards — only those with a count are shown.
export function DashAlerts({ items }) {
  return (items || []).filter((i) => i.count > 0).map((i) => {
    const t = TONES[i.tone] || TONES.warn;
    return (
      <TouchableOpacity key={i.label} activeOpacity={0.8} disabled={!i.onPress} onPress={i.onPress}
        style={[s.alert, { backgroundColor: t.bg, borderColor: withAlpha(t.fg, '30') }]}>{/* inline-ok: tone colour */}
        <View style={s.alertIcon}><Ionicons name={i.icon || 'warning-outline'} size={17} color={t.fg} /></View>
        <View style={s.flex}>
          <Text style={s.alertN}>{i.count} <Text style={{ color: t.fg }}>{i.label}</Text></Text>{/* inline-ok: tone colour */}
          {i.text ? <Text style={s.alertText}>{i.text}</Text> : null}
        </View>
        {i.onPress ? <Ionicons name="chevron-forward" size={18} color={t.fg} /> : null}
      </TouchableOpacity>
    );
  });
}

// Horizontal bars — each row's share of the total.
export function DashBars({ rows, empty = 'Nothing to show yet.' }) {
  const total = rows.reduce((a, r) => a + (Number(r.value) || 0), 0);
  if (!total) return <Text style={s.empty}>{empty}</Text>;
  return rows.map((r) => {
    const t = TONES[r.tone] || TONES.info;
    return (
      <View key={r.label} style={[s.barRow, !r.value && s.dim]}>
        <View style={[s.dot, { backgroundColor: t.fg }]} />{/* inline-ok: tone colour */}
        <Text style={s.barLabel} numberOfLines={1}>{r.label}</Text>
        <View style={s.barTrack}><View style={[s.barFill, { backgroundColor: t.fg, width: `${(r.value / total) * 100}%` }]} /></View>{/* inline-ok: bar length from data */}
        <Text style={s.barValue}>{r.display ?? r.value}</Text>
      </View>
    );
  });
}

export function DashCard({ title, sub, total, children }) {
  return (
    <View style={s.card}>
      <View style={s.cardHead}>
        <View style={s.flex}><Text style={s.cardTitle}>{title}</Text>{sub ? <Text style={s.cardSub}>{sub}</Text> : null}</View>
        {total != null ? <Text style={s.cardTotal}>{total}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  dim: { opacity: 0.5 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 24, padding: 20, marginBottom: 12, overflow: 'hidden', ...SHADOWS.md },
  heroGlow: { position: 'absolute', right: -60, bottom: -90, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.05)' },
  heroLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: 'rgba(255,255,255,0.75)' },
  heroValue: { fontSize: 34, fontWeight: '800', color: '#FFFFFF', marginTop: 6, letterSpacing: -0.8 },
  heroSplit: { flexDirection: 'row', flexWrap: 'wrap', gap: 18, marginTop: 14 },
  heroSmall: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  heroSub: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  ring: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringPct: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  ringCap: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  kpi: { width: '48%', flexGrow: 1, padding: 14, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.cardBorder, ...SHADOWS.md },
  kpiTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  kpiIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  kpiLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: COLORS.textSecondary },
  kpiValue: { fontSize: 21, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  kpiSub: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 1 },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  alertIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  alertN: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  alertText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  card: { padding: 16, borderRadius: 22, marginBottom: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.cardBorder, ...SHADOWS.md },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  cardSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cardTotal: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  barLabel: { width: 118, fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  barTrack: { flex: 1, height: 7, borderRadius: 999, backgroundColor: COLORS.surfaceAlt, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  barValue: { minWidth: 44, textAlign: 'right', fontSize: 13.5, fontWeight: '800', color: COLORS.textPrimary },
  empty: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 14 },
});
