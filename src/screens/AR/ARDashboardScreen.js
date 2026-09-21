import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, RADIUS, SHADOWS, withAlpha } from '../../constants/theme';
import { AR_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import common from '../../styles/common';
import AppLoader from '../../components/AppLoader';
import LoadError from '../../components/LoadError';
import FilterSelect from '../../components/FilterSelect';
import { inrShort, AGE_LABELS, ISSUES, today, withCompany, DateField } from './arShared';

const ISSUE_TEXT = {
  no_schedule: 'No installment schedule — Sales needs to add one',
  plan_mismatch: "LOI schedule doesn't add up to the deal",
  suspect_amount: 'Deal amount looks mistyped',
};
// Ageing shades run from amber (just late) to deep red (over 180 days).
const AGE_COLORS = ['#E8C27A', '#DDA24B', COLORS.warningSolid, '#CF6A33', '#C9502F', '#A8322A', COLORS.error];

// AR landing: the receivables book at a glance — same layout as the website.
export default function ARDashboardScreen({ navigation }) {
  const companyId = useSelector((st) => st.adminFilter?.companyId);
  const [project, setProject] = useState('');
  const [asOf, setAsOf] = useState(today());
  const [data, setData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setErr('');
    try {
      const extra = [`as_of=${asOf}`];
      if (project) extra.push(`project=${project}`);
      const r = await apiFetch(withCompany(AR_ENDPOINTS.dashboard, companyId, extra));
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.detail || 'Could not load the dashboard.'); return; }
      setData(d);
      if (d.projects) setProjects(d.projects);
    } catch (e) { setErr('Check your connection and try again.'); }
  }, [project, companyId, asOf]);

  useEffect(() => { setData(null); load(); }, [load]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const t = data?.totals;
  const issues = data?.issues ? ISSUES.filter((i) => data.issues[i.value]) : [];
  const go = (screen, params) => navigation.navigate(screen, params);

  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      <View style={common.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={common.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={s.flex}>
          <Text style={common.headerTitle}>Receivables</Text>
          <Text style={common.headerSub}>{data?.accounts != null ? `${data.accounts} active accounts` : 'Accounts receivable'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={common.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.link} />}>
        <View style={s.toolbar}>
          <FilterSelect label="Project" value={project} onChange={setProject}
            options={[{ value: '', label: 'All projects' }, ...projects.map((p) => ({ value: String(p.id), label: p.name }))]} />
          <DateField compact maxToday value={asOf} onChange={(d) => setAsOf(d || today())} style={s.asOf} />
        </View>
        <View style={s.quick}>
          <Quick icon="book-outline" label="Register" onPress={() => go('ARRegister', { project })} />
          <Quick icon="cloud-upload-outline" label="Import receipts" onPress={() => go('ARImport', { project })} />
        </View>

        {data === null && !err ? <AppLoader label="Calculating the receivables book…" /> : err && !data ? <LoadError message={err} onRetry={load} /> : (
          <>
            <LinearGradient colors={COLORS.heroScene} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
              <View style={s.heroGlow} />
              <View style={s.flex}>
                <Text style={s.heroLabel}>TOTAL RECEIVABLE</Text>
                <Text style={s.heroValue} numberOfLines={1} adjustsFontSizeToFit>{inrShort(t.os_with_interest)}</Text>
                <View style={s.heroSplit}>
                  <View><Text style={s.heroSmall}>Principal</Text><Text style={s.heroSub}>{inrShort(t.outstanding)}</Text></View>
                  <View><Text style={s.heroSmall}>Interest</Text><Text style={s.heroSub}>{inrShort(t.net_interest)}</Text></View>
                </View>
              </View>
              <Ring pct={data.pct_realised} />
            </LinearGradient>

            <View style={s.kpis}>
              <Kpi icon="wallet-outline" tone="info" label="Collectable" value={t.collectable} sub="Less stamp & reg." />
              <Kpi icon="checkmark-done-outline" tone="good" label="Received" value={t.received} sub={`${data.pct_realised}% realised`} />
              <Kpi icon="alarm-outline" tone="bad" label="Overdue" value={t.overdue}
                sub={`${data.overdue_accounts} account${data.overdue_accounts === 1 ? '' : 's'}`} onPress={() => go('ARRegister', { project, overdue: true })} />
              <Kpi icon="hourglass-outline" tone="warn" label="Not yet due" value={t.not_due} sub="Scheduled for later" />
            </View>

            {issues.map((i) => (
              <TouchableOpacity key={i.value} activeOpacity={0.8} onPress={() => go('ARRegister', { project, issue: i.value })}
                style={[s.issue, i.tone === 'danger' ? s.issueBad : i.tone === 'info' ? s.issueInfo : s.issueWarn]}>
                <View style={s.issueIcon}><Ionicons name={i.tone === 'info' ? 'git-branch-outline' : 'warning-outline'} size={17} color={i.tone === 'danger' ? COLORS.error : i.tone === 'info' ? COLORS.link : COLORS.warning} /></View>
                <View style={s.flex}>
                  <Text style={s.issueN}>{data.issues[i.value]} <Text style={i.tone === 'danger' ? s.bad : i.tone === 'info' ? s.info : s.warn}>{i.label}</Text></Text>
                  <Text style={s.issueText}>{ISSUE_TEXT[i.value]}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={i.tone === 'danger' ? COLORS.error : i.tone === 'info' ? COLORS.link : COLORS.warning} />
              </TouchableOpacity>
            ))}

            <View style={[common.card, s.card]}>
              <View style={s.cardHead}>
                <View style={s.flex}><Text style={s.cardTitle}>Overdue by age</Text><Text style={s.cardSub}>Days past the due date</Text></View>
                <Text style={s.cardTotal}>{inrShort(t.overdue)}</Text>
              </View>
              <View style={s.stack}>
                {AGE_LABELS.map((a, i) => data.ageing[a] > 0 && <View key={a} style={[s.seg, { flex: data.ageing[a], backgroundColor: AGE_COLORS[i] }]} />)}{/* inline-ok: segment share and colour from data */}
              </View>
              {AGE_LABELS.map((a, i) => (
                <View key={a} style={[s.ageRow, !data.ageing[a] && s.dim]}>
                  <View style={[s.dot, { backgroundColor: AGE_COLORS[i] }]} />{/* inline-ok: bucket colour */}
                  <Text style={s.ageLabel}>{a} days</Text>
                  <Text style={s.ageValue}>{data.ageing[a] ? inrShort(data.ageing[a]) : '—'}</Text>
                  <Text style={s.agePct}>{data.ageing[a] && t.overdue ? `${Math.round((data.ageing[a] / t.overdue) * 100)}%` : ''}</Text>
                </View>
              ))}
            </View>

            <View style={[common.card, s.card]}>
              <View style={s.cardHead}>
                <View style={s.flex}><Text style={s.cardTitle}>Falling due</Text><Text style={s.cardSub}>Not yet due, by month</Text></View>
                <Text style={s.cardTotal}>{inrShort(t.not_due)}</Text>
              </View>
              <Columns rows={data.month_forecast} />
            </View>

            <TopList title="Most overdue" rows={data.top_overdue} empty="Nothing is overdue." go={go} />
            <TopList title="Overdue over 180 days" rows={data.top_over_180} empty="Nothing is more than 180 days overdue." go={go} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Quick({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={s.quickBtn} activeOpacity={0.8} onPress={onPress}>
      <Ionicons name={icon} size={17} color={COLORS.link} />
      <Text style={s.quickText}>{label}</Text>
    </TouchableOpacity>
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
      <View style={s.ringCenter}><Text style={s.ringPct}>{Math.round(p)}%</Text><Text style={s.ringCap}>collected</Text></View>
    </View>
  );
}

const TONE = {
  info: [COLORS.accentSoft, COLORS.link], good: [COLORS.successBg, COLORS.success],
  bad: [COLORS.errorBg, COLORS.error], warn: [COLORS.warningBg, COLORS.warning],
};
function Kpi({ icon, tone, label, value, sub, onPress }) {
  const [bg, fg] = TONE[tone];
  return (
    <TouchableOpacity style={[common.card, s.kpi]} activeOpacity={onPress ? 0.8 : 1} disabled={!onPress} onPress={onPress}>
      <View style={s.kpiTop}>
        <View style={[s.kpiIcon, { backgroundColor: bg }]}><Ionicons name={icon} size={17} color={fg} /></View>{/* inline-ok: tone colour */}
        {onPress ? <Ionicons name="chevron-forward" size={15} color={COLORS.textTertiary} /> : null}
      </View>
      <Text style={s.kpiLabel}>{label}</Text>
      <Text style={[s.kpiValue, (tone === 'good' || tone === 'bad') && { color: fg }]} numberOfLines={1} adjustsFontSizeToFit>{inrShort(value)}</Text>{/* inline-ok: tone colour */}
      <Text style={s.kpiSub} numberOfLines={1}>{sub}</Text>
    </TouchableOpacity>
  );
}

function Columns({ rows }) {
  const max = Math.max(1, ...rows.map((m) => m.amount));
  return (
    <View style={s.cols}>
      {rows.map((m) => (
        <View key={m.label} style={s.col}>
          <Text style={s.colValue} numberOfLines={1} adjustsFontSizeToFit>{m.amount ? inrShort(m.amount) : '—'}</Text>
          <View style={s.colTrack}>
            {m.amount > 0 && <View style={[s.colBar, m.label === 'No date' && s.colMuted, { height: `${Math.max(4, (m.amount / max) * 100)}%` }]} />}{/* inline-ok: column height from data */}
          </View>
          <Text style={s.colLabel} numberOfLines={2}>{m.label}</Text>
        </View>
      ))}
    </View>
  );
}

function TopList({ title, rows, empty, go }) {
  const max = Math.max(1, ...rows.map((r) => r.amount));
  return (
    <View style={[common.card, s.card]}>
      <Text style={s.cardTitle}>{title}</Text>
      {rows.length === 0 ? <Text style={s.empty}>{empty}</Text> : rows.map((r, i) => (
        <TouchableOpacity key={r.id} style={s.topRow} activeOpacity={0.75} onPress={() => go('ARLedger', { id: r.id })}>
          <Text style={s.rank}>{i + 1}</Text>
          <View style={s.avatar}><Text style={s.avatarText}>{initials(r.client)}</Text></View>
          <View style={s.flex}>
            <Text style={s.topName} numberOfLines={1}>{r.client}</Text>
            <Text style={s.topSub} numberOfLines={1}>{r.project} · Plot {r.plots}</Text>
            <View style={s.topTrack}><View style={[s.topBar, { width: `${(r.amount / max) * 100}%` }]} /></View>{/* inline-ok: bar length from data */}
          </View>
          <Text style={s.topAmt}>{inrShort(r.amount)}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function initials(name) {
  const parts = String(name || '').replace(/^(mr|mrs|ms|dr)\.?\s+/i, '').split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '—';
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  bad: { color: COLORS.error },
  warn: { color: COLORS.warning },
  info: { color: COLORS.link },
  dim: { opacity: 0.5 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  asOf: { marginLeft: 'auto', minWidth: 132 },
  quick: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  quickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 11, borderRadius: RADIUS.md,
              backgroundColor: COLORS.accentSoft, borderWidth: 1, borderColor: withAlpha(COLORS.link, '30') },
  quickText: { fontSize: 13.5, fontWeight: '700', color: COLORS.link },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 24, padding: 20, marginBottom: 12, overflow: 'hidden', ...SHADOWS.md },
  heroGlow: { position: 'absolute', right: -60, bottom: -90, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.05)' },
  heroLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, color: 'rgba(255,255,255,0.75)' },
  heroValue: { fontSize: 34, fontWeight: '800', color: '#FFFFFF', marginTop: 6, letterSpacing: -0.8 },
  heroSplit: { flexDirection: 'row', gap: 22, marginTop: 14 },
  heroSmall: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  heroSub: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  ring: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringPct: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  ringCap: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  kpi: { width: '48%', flexGrow: 1, padding: 14 },
  kpiTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  kpiIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  kpiLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', color: COLORS.textSecondary },
  kpiValue: { fontSize: 21, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  kpiSub: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 1 },
  issue: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  issueWarn: { backgroundColor: COLORS.warningBg, borderColor: withAlpha(COLORS.warning, '30') },
  issueBad: { backgroundColor: COLORS.errorBg, borderColor: withAlpha(COLORS.error, '30') },
  issueInfo: { backgroundColor: COLORS.accentSoft, borderColor: withAlpha(COLORS.link, '30') },
  issueIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  issueN: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  issueText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  card: { marginBottom: 12 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  cardSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  cardTotal: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  stack: { flexDirection: 'row', height: 12, borderRadius: 999, overflow: 'hidden', backgroundColor: COLORS.surfaceAlt, gap: 2, marginBottom: 10 },
  seg: { height: '100%' },
  ageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  ageLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  ageValue: { fontSize: 13.5, fontWeight: '800', color: COLORS.textPrimary },
  agePct: { width: 38, textAlign: 'right', fontSize: 11.5, color: COLORS.textSecondary },
  cols: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 190 },
  col: { flex: 1, height: '100%', alignItems: 'center', gap: 6 },
  colValue: { fontSize: 11, fontWeight: '800', color: COLORS.textPrimary },
  colTrack: { flex: 1, width: '100%', maxWidth: 46, justifyContent: 'flex-end', borderRadius: 10, backgroundColor: COLORS.surfaceAlt, overflow: 'hidden' },
  colBar: { width: '100%', borderRadius: 10, backgroundColor: COLORS.primaryTop },
  colMuted: { backgroundColor: COLORS.textTertiary },
  colLabel: { fontSize: 10.5, fontWeight: '700', color: COLORS.textSecondary, textAlign: 'center' },
  empty: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  rank: { width: 16, fontSize: 12, fontWeight: '800', color: COLORS.textTertiary, textAlign: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12.5, fontWeight: '800', color: COLORS.link },
  topName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  topSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  topTrack: { height: 4, borderRadius: 999, backgroundColor: COLORS.surfaceAlt, overflow: 'hidden', marginTop: 5 },
  topBar: { height: '100%', borderRadius: 999, backgroundColor: COLORS.error, opacity: 0.75 },
  topAmt: { fontSize: 14, fontWeight: '800', color: COLORS.error },
});
