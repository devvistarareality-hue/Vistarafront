import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, CARD_SHADOW, SHADOWS } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import common from '../../styles/common';
import DashboardRoleFilter from '../../components/DashboardRoleFilter';
import { BASE_URL, SALES_ENDPOINTS } from '../../constants/api';
import { rupee, inrShort } from '../AR/arShared';
import AppLoader from '../../components/AppLoader';
import { apiFetch } from '../../utils/apiFetch';
import { useSelector } from 'react-redux';
import { dashboardFor } from '../../lib/roles';

// Every module opens on its Dashboard — the same tab the website shows.
// Accounts & Finance gets its real one (mirrors the web's _ModuleDashboard): what
// is at the Accounts gate, what it is worth, what has waited longest, six months of
// sign-offs and where each project stands. The modules whose figures are not wired
// yet get a plain card, so the tab sits in the same place everywhere.
export default function ModuleDashboardScreen({ navigation, route }) {
  const { name = 'Module', module = '' } = route?.params || {};
  const user = useSelector((st) => st.auth.user);
  const isAdmin = user?.role === 'Admin' || user?.is_staff;
  const [preview, setPreview] = useState('');
  const [options, setOptions] = useState([]);
  useEffect(() => {
    apiFetch(`${BASE_URL}/api/auth/designations/capabilities/`)
      .then((r) => r.json())
      .then((d) => setOptions((d?.dashboards || [])
        .filter((x) => x.module === module)
        .map((x) => ({ key: x.value, role: x.role, label: x.label }))))
      .catch(() => {});
  }, [module]);
  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      <View style={common.header}>
        <Pressable onPress={() => navigation.goBack()} style={common.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </Pressable>
        <View style={s.flex}>
          <Text style={common.headerTitle}>{name}</Text>
          <Text style={s.sub}>Dashboard</Text>
        </View>
      </View>
      {isAdmin ? (
        <DashboardRoleFilter options={options} value={preview || dashboardFor(user, module)}
          onChange={setPreview} module={module} />
      ) : null}
      {/account|finance/i.test(module) ? <AccountsDashboard navigation={navigation} module={module} name={name} /> : (
        <ScrollView contentContainerStyle={common.scroll}>
          <View style={s.card}>
            <View style={s.emptyIcon}><Ionicons name="grid-outline" size={22} color={COLORS.link} /></View>
            <Text style={s.title}>{name}</Text>
            <Text style={s.body}>Its figures will appear here once they are wired up — everything it does is on the previous screen.</Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// Where a booking stands at the Accounts gate, in the order the bar shows them.
const STATES = [
  { key: 'approved', label: 'Approved', color: COLORS.success },
  { key: 'pending', label: 'Waiting', color: COLORS.warning },
  { key: 'rejected', label: 'Sent back', color: COLORS.error },
];

function AccountsDashboard({ navigation, module, name }) {
  const companyId = useSelector((st) => st.adminFilter?.companyId);
  const [d, setD] = useState(null);
  useEffect(() => {
    setD(null);
    apiFetch(`${SALES_ENDPOINTS.bookingsAll}?summary=true${companyId ? `&company_id=${companyId}` : ''}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((x) => setD(x && typeof x === 'object' ? x : {}))
      .catch(() => setD({}));
  }, [companyId]);
  if (d === null) return <AppLoader label="Adding it up…" />;

  const v = d.values || {};
  const total = d.total || 0;
  const totalValue = (v.pending || 0) + (v.approved || 0) + (v.rejected || 0);
  const approvals = (tab) => navigation.navigate('ModuleApprovals', { module, name, tab });
  const kpis = [
    { key: 'pending', label: 'Waiting for sign-off', n: d.pending || 0, m: v.pending, color: COLORS.warning, bg: COLORS.warningBg, icon: 'clipboard-outline', go: () => approvals('pending') },
    { key: 'approved', label: 'Approved', n: d.approved || 0, m: v.approved, color: COLORS.success, bg: COLORS.successBg, icon: 'checkmark-done-outline', go: () => navigation.navigate('ModuleBookings', { module, name }) },
    { key: 'rejected', label: 'Sent back', n: d.rejected || 0, m: v.rejected, color: COLORS.error, bg: COLORS.errorBg, icon: 'return-down-back-outline', go: () => approvals('rejected') },
    { key: 'total', label: 'All at Accounts', n: total, m: totalValue, color: COLORS.link, bg: COLORS.accentSoft, icon: 'layers-outline', go: () => approvals('all') },
  ];
  const trend = d.trend || [];
  const trendMax = Math.max(1, ...trend.map((t) => t.count));
  const projects = d.by_project || [];
  const projMax = Math.max(1, ...projects.map((p) => p.pending + p.approved + p.rejected));

  return (
    <ScrollView contentContainerStyle={common.scroll}>
      {/* The AR dashboard's hero, for the Accounts gate. */}
      <LinearGradient colors={COLORS.heroScene} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.heroCard}>
        <View style={s.heroGlow} />
        <View style={s.flex}>
          <Text style={s.heroLabel}>AT THE ACCOUNTS GATE</Text>
          <Text style={s.heroValue} numberOfLines={1} adjustsFontSizeToFit>{inrShort(totalValue)}</Text>
          <View style={s.heroSplit}>
            <View><Text style={s.heroSmall}>Approved</Text><Text style={s.heroSub}>{inrShort(v.approved || 0)}</Text></View>
            <View><Text style={s.heroSmall}>Waiting</Text><Text style={s.heroSub}>{inrShort(v.pending || 0)}</Text></View>
            <View><Text style={s.heroSmall}>Bookings</Text><Text style={s.heroSub}>{total}</Text></View>
          </View>
        </View>
        <Ring pct={total ? Math.round(((d.approved || 0) / total) * 100) : 0} />
      </LinearGradient>

      {(d.pending || 0) > 0 ? (
        <Pressable style={s.issue} onPress={() => approvals('pending')}>
          <Ionicons name="hourglass-outline" size={18} color={COLORS.warning} />
          <View style={s.flex}>
            <Text style={s.issueN}>{d.pending} <Text style={s.issueLabel}>waiting for sign-off</Text></Text>
            <Text style={s.issueText}>{inrShort(v.pending || 0)} · oldest waited {(d.oldest_pending || [])[0]?.days ?? 0} days</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.warning} />
        </Pressable>
      ) : null}

      <View style={s.panel}>
        <Text style={s.panelTitle}>Where they stand</Text>
        <Text style={s.panelSub}>Every booking at the Accounts gate</Text>
        <View style={s.bar}>
          {STATES.map((st) => (d[st.key] ? <View key={st.key} style={[s.barSeg, { flexGrow: d[st.key], backgroundColor: st.color }]} /> : null))}{/* inline-ok: share and state colour from data */}
        </View>
        {STATES.map((st) => (
          <View key={st.key} style={s.stateRow}>
            <View style={[s.dot, { backgroundColor: st.color }]} />{/* inline-ok: state colour */}
            <Text style={s.stateLabel}>{st.label}</Text>
            <Text style={s.stateN}>{d[st.key] || 0}</Text>
            <Text style={s.stateMoney}>{v[st.key] ? inrShort(v[st.key]) : '—'}</Text>
            <Text style={s.statePct}>{total ? Math.round(((d[st.key] || 0) / total) * 100) : 0}%</Text>
          </View>
        ))}
      </View>

      <View style={s.kpis}>
        {kpis.map((k) => (
          <Pressable key={k.key} style={s.kpi} onPress={k.go}>
            <View style={s.kpiTop}>
              <View style={[s.kpiIcon, { backgroundColor: k.bg }]}><Ionicons name={k.icon} size={17} color={k.color} /></View>{/* inline-ok: tone colour */}
              <Ionicons name="chevron-forward" size={15} color={COLORS.textTertiary} />
            </View>
            <Text style={s.kpiLabel} numberOfLines={1}>{k.label.toUpperCase()}</Text>
            <Text style={[s.kpiValue, { color: k.key === 'total' || k.key === 'pending' ? COLORS.textPrimary : k.color }]}>{k.n.toLocaleString('en-IN')}</Text>{/* inline-ok: tone colour */}
            <Text style={s.kpiMoney}>{inrShort(k.m || 0)}</Text>
          </Pressable>
        ))}
      </View>

      <View style={s.panel}>
        <View style={s.panelHead}>
          <View style={s.flex}>
            <Text style={s.panelTitle}>Waiting longest</Text>
            <Text style={s.panelSub}>Oldest first — days since Sales or CP approved them</Text>
          </View>
          <Pressable onPress={() => approvals('pending')}><Text style={s.link}>All {d.pending || 0} ›</Text></Pressable>
        </View>
        {(d.oldest_pending || []).length ? (d.oldest_pending || []).map((w, i, arr) => (
          <View key={w.id} style={[s.waitRow, i === arr.length - 1 && s.lastRow]}>
            <Text style={[s.age, w.days >= 7 ? s.ageOld : w.days >= 3 ? s.ageMid : null]}>{w.days ?? '—'}d</Text>
            <View style={s.flex}>
              <Text style={s.waitName} numberOfLines={1}>{w.client || '—'}</Text>
              <Text style={s.waitSub} numberOfLines={1}>{w.project}{w.plots ? ` · Plot ${w.plots}` : ''}{w.stm ? ` · ${w.stm}` : ''}</Text>
            </View>
            <Text style={s.waitAmt}>{inrShort(w.amount)}</Text>
          </View>
        )) : <Text style={s.none}>Nothing is waiting — every booking at Accounts has been decided.</Text>}
      </View>

      <View style={s.panel}>
        <Text style={s.panelTitle}>Signed off — last six months</Text>
        <Text style={s.panelSub}>Bookings Accounts approved each month</Text>
        <View style={s.trend}>
          {trend.map((t, i) => (
            <View key={t.month} style={s.trendCol}>
              <Text style={s.trendVal}>{t.count || '—'}</Text>
              <View style={s.trendTrack}>
                <View style={[s.trendBar, { height: `${(t.count / trendMax) * 100}%` }]} />{/* inline-ok: column height from data */}
              </View>
              <Text style={[s.trendLabel, i === trend.length - 1 && s.trendNow]}>{t.month}</Text>
              <Text style={s.trendMoney} numberOfLines={1}>{t.value ? inrShort(t.value) : ' '}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.panel}>
        <Text style={s.panelTitle}>By project</Text>
        <Text style={s.panelSub}>Where each project stands at Accounts</Text>
        {projects.map((p, i) => {
          const n = p.pending + p.approved + p.rejected;
          return (
            <View key={p.id || p.name} style={[s.projRow, i === projects.length - 1 && s.lastRow]}>
              <View style={s.projHead}>
                <Text style={s.projName} numberOfLines={1}>{p.name}</Text>
                <Text style={s.projValue}>{p.approved_value ? inrShort(p.approved_value) : '—'}</Text>
              </View>
              <View style={[s.miniBar, { width: `${(n / projMax) * 100}%` }]}>{/* inline-ok: bar length from data */}
                {STATES.map((st) => (p[st.key] ? <View key={st.key} style={[s.barSeg, { flexGrow: p[st.key], backgroundColor: st.color }]} /> : null))}{/* inline-ok: share and state colour */}
              </View>
              <Text style={s.projSub}>
                <Text style={p.pending ? s.waitNum : null}>{p.pending} waiting</Text>
                {p.pending_value ? ` (${inrShort(p.pending_value)})` : ''} · {p.approved} approved{p.rejected ? ` · ${p.rejected} sent back` : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function Ring({ pct }) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  const r = 40; const c = 2 * Math.PI * r;
  return (
    <View style={s.ring}>
      <Svg width={100} height={100} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r={r} stroke="rgba(255,255,255,0.15)" strokeWidth={9} fill="none" />
        <Circle cx="50" cy="50" r={r} stroke="#5BE09A" strokeWidth={9} fill="none" strokeLinecap="round"
          strokeDasharray={`${(p / 100) * c} ${c}`} transform="rotate(-90 50 50)" />
      </Svg>
      <View style={s.ringCenter}><Text style={s.ringPct}>{p}%</Text><Text style={s.ringCap}>signed off</Text></View>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  sub: { fontSize: 12.5, color: COLORS.textSecondary },
  card: { alignItems: 'center', gap: 8, padding: 24, marginTop: 8, borderRadius: RADIUS.lg,
          backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.cardBorder, ...CARD_SHADOW },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  body: { fontSize: 12.5, color: COLORS.textSecondary, textAlign: 'center' },
  emptyIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.accentSoft },
  panel: { padding: 16, marginBottom: 12, borderRadius: RADIUS.lg, backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.cardBorder, ...CARD_SHADOW },
  heroCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 24, padding: 20, marginBottom: 12, overflow: 'hidden', ...SHADOWS.md },
  heroGlow: { position: 'absolute', right: -60, bottom: -90, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.05)' },
  heroLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: 'rgba(255,255,255,0.75)' },
  heroValue: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', marginTop: 6, letterSpacing: -0.8 },
  heroSplit: { flexDirection: 'row', gap: 16, marginTop: 14, flexWrap: 'wrap' },
  heroSmall: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  heroSub: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  ring: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringPct: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  ringCap: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  issue: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginBottom: 12, borderRadius: RADIUS.lg,
           backgroundColor: COLORS.warningBg, borderWidth: 1, borderColor: COLORS.warning },
  issueN: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  issueLabel: { fontSize: 13, fontWeight: '700', color: COLORS.warning },
  issueText: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 2 },
  stateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 7 },
  stateLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  stateN: { width: 40, textAlign: 'right', fontSize: 13.5, fontWeight: '800', color: COLORS.textPrimary },
  stateMoney: { width: 82, textAlign: 'right', fontSize: 12.5, fontWeight: '700', color: COLORS.textSecondary },
  statePct: { width: 36, textAlign: 'right', fontSize: 11.5, color: COLORS.textSecondary },
  kpiTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  kpiIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  bar: { flexDirection: 'row', gap: 2, height: 12, borderRadius: 4, overflow: 'hidden', marginTop: 14, backgroundColor: COLORS.surfaceAlt },
  barSeg: { flexBasis: 0, minWidth: 3, height: '100%' },
  dot: { width: 9, height: 9, borderRadius: 3 },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  kpi: { width: '48.4%', padding: 14, borderRadius: RADIUS.lg, backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.cardBorder, ...CARD_SHADOW },
  kpiLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, color: COLORS.textSecondary },
  kpiValue: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginTop: 4 },
  kpiMoney: { fontSize: 12.5, fontWeight: '700', color: COLORS.textSecondary },
  panelHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  panelTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  panelSub: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 2, marginBottom: 6 },
  link: { fontSize: 13, fontWeight: '700', color: COLORS.link },
  waitRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  lastRow: { borderBottomWidth: 0 },
  age: { minWidth: 46, textAlign: 'center', paddingVertical: 4, paddingHorizontal: 6, borderRadius: 999, overflow: 'hidden', fontSize: 12, fontWeight: '800',
         color: COLORS.textSecondary, backgroundColor: COLORS.surfaceAlt },
  ageMid: { color: COLORS.warning, backgroundColor: COLORS.warningBg },
  ageOld: { color: COLORS.error, backgroundColor: COLORS.errorBg },
  waitName: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  waitSub: { fontSize: 11.5, color: COLORS.textSecondary },
  waitAmt: { fontSize: 13.5, fontWeight: '800', color: COLORS.textPrimary },
  none: { fontSize: 12.5, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 18 },
  trend: { flexDirection: 'row', gap: 6, height: 180, marginTop: 8 },
  trendCol: { flex: 1, alignItems: 'center', gap: 3 },
  trendVal: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  trendTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  trendBar: { width: '62%', minHeight: 3, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: COLORS.success },
  trendLabel: { fontSize: 10.5, fontWeight: '700', color: COLORS.textSecondary },
  trendNow: { color: COLORS.textPrimary },
  trendMoney: { fontSize: 9.5, color: COLORS.textSecondary },
  projRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 6 },
  projHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  projName: { flex: 1, fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  projValue: { fontSize: 13.5, fontWeight: '800', color: COLORS.textPrimary },
  miniBar: { flexDirection: 'row', gap: 2, height: 8, borderRadius: 3, overflow: 'hidden', minWidth: 6 },
  projSub: { fontSize: 11.5, color: COLORS.textSecondary },
  waitNum: { color: COLORS.warning, fontWeight: '800' },
});
