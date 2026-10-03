import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { canSee, isManagerRole, dashboardFor } from '../../lib/roles';
import DashboardRoleFilter from '../../components/DashboardRoleFilter';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, RADIUS, SHADOWS, withAlpha } from '../../constants/theme';
import {AR_ENDPOINTS, BASE_URL} from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import common from '../../styles/common';
import AppLoader from '../../components/AppLoader';
import LoadError from '../../components/LoadError';
import MultiFilterSelect from '../../components/MultiFilterSelect';
import { inrShort, AGE_LABELS, ISSUES, today, withCompany, DateField } from './arShared';
import { Segmented, Button } from '../../components/ui';
import { hasBankMaster } from '../../lib/moduleGroups';

const ISSUE_TEXT = {
  no_schedule: 'No installment schedule — Sales needs to add one',
  plan_mismatch: "LOI schedule doesn't add up to the deal",
  bad_dates: 'An installment date has an impossible year — Sales needs to correct it',
};
// Ageing shades run from amber (just late) to deep red (over 180 days).
const AGE_COLORS = ['#E8C27A', '#DDA24B', COLORS.warningSolid, '#CF6A33', '#C9502F', '#A8322A', COLORS.error];

// AR landing: the receivables book at a glance — same layout as the website.
export default function ARDashboardScreen({ navigation }) {
  const companyId = useSelector((st) => st.adminFilter?.companyId);
  const me = useSelector((st) => st.auth.user);
  const _isAdmin = me?.role === 'Admin' || me?.is_staff;
  const [_preview, _setPreview] = useState('');
  const [_dashOptions, _setDashOptions] = useState([]);
  const [project, setProject] = useState([]);   // project ids; empty = all
  const [asOf, setAsOf] = useState(today());
  const [data, setData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState('overall');   // 'overall' | 'projects' — as on the web

  useEffect(() => {
    apiFetch(`${BASE_URL}/api/auth/designations/capabilities/`)
      .then((r) => r.json())
      .then((d) => _setDashOptions((d?.dashboards || [])
        .filter((x) => x.module === 'AR')
        .map((x) => ({ key: x.value, role: x.role, label: x.label }))))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setErr('');
    try {
      const extra = [`as_of=${asOf}`];
      if (project.length) extra.push(`project=${project.join(',')}`);
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
  // The AR Log (who changed what) is for real admins only.
  const isLogAdmin = me?.role === 'Admin' || me?.is_staff;

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
        {isLogAdmin ? (
          <TouchableOpacity onPress={() => go('ActivityLog', { modules: ['AR'], title: 'Accounts Receivable Log' })} style={common.iconBtn} accessibilityLabel="Log">
            <Ionicons name="time-outline" size={19} color={COLORS.textPrimary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {_isAdmin ? (
        <DashboardRoleFilter options={_dashOptions} value={_preview || dashboardFor(me, 'AR')}
          onChange={_setPreview} module="AR" />
      ) : null}
      <ScrollView contentContainerStyle={common.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.link} />}>
        <View style={s.toolbar}>
          <MultiFilterSelect label="All projects" noun="projects" value={project} onChange={setProject}
            options={projects.map((p) => ({ value: String(p.id), label: p.name }))} />
          <DateField compact maxToday value={asOf} onChange={(d) => setAsOf(d || today())} style={s.asOf} />
        </View>
        <Segmented options={[{ value: 'overall', label: 'Overall' }, { value: 'projects', label: 'Project-wise' }]}
          value={view} onChange={setView} style={s.viewSeg} />
        <View style={s.quick}>
          {canSee(me, 'ar.screen.collections') ? <Quick icon="notifications-outline" label="Collections" onPress={() => go('ARCollections', { project })} /> : null}
          {canSee(me, 'ar.screen.register') ? <Quick icon="book-outline" label="Register" onPress={() => go('ARRegister', { project })} /> : null}
          {canSee(me, 'ar.screen.import') ? <Quick icon="cloud-upload-outline" label="Import receipts" onPress={() => go('ARImport', { project: project.length === 1 ? project[0] : '' })} /> : null}
          {canSee(me, 'ar.screen.cancellations') ? <Quick icon="close-circle-outline" label="Cancellations" onPress={() => go('ARCancellations')} /> : null}
          {/* Bank Master is its own module — only for people it is ticked for. */}
          {hasBankMaster(me) ? <Quick icon="business-outline" label="Bank Master" onPress={() => go('ARBanks')} /> : null}
          {canSee(me, 'ar.screen.myteam') && (isManagerRole(me) || me?.role === 'Admin' || me?.is_staff)
            ? <Quick icon="people-circle-outline" label="My Team" onPress={() => go('MyTeam', { module: 'AR', title: 'My Team · AR' })} /> : null}
        </View>

        {data === null && !err ? <AppLoader label="Calculating the receivables book…" /> : err && !data ? <LoadError message={err} onRetry={load} /> : view === 'projects' ? (
          <ProjectWise data={data} onOpen={(id) => { setProject([String(id)]); setView('overall'); }}
            onRegister={(id) => go('ARRegister', { project: [String(id)] })} />
        ) : (
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
      <Text style={s.quickText} numberOfLines={1} adjustsFontSizeToFit>{label}</Text>
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

// Project-wise: every project's receivables side by side (mirrors the web).
function ProjectWise({ data, onOpen, onRegister }) {
  const rows = data.by_project || [];
  if (!rows.length) return <Text style={s.pwEmpty}>No active accounts.</Text>;
  return (
    <View>
      <ProjectCharts rows={rows} data={data} onOpen={onOpen} />
      <ProjectTable rows={rows} data={data} onOpen={onOpen} />
    </View>
  );
}

// "All projects at a glance" — the web's table under the charts: every project's
// figures in one place, with the totals. Scrolls sideways; tap a project to open it.
const PT_COLS = [
  ['Accounts', (p) => `${p.accounts} · ${p.overdue_accounts} od`, (d) => String(d.accounts)],
  ['Collectable', (p) => inrShort(p.totals.collectable), (d) => inrShort(d.totals.collectable)],
  ['Received', (p) => `${inrShort(p.totals.received)} · ${p.pct_realised}%`, (d) => `${inrShort(d.totals.received)} · ${d.pct_realised}%`],
  ['Overdue', (p) => inrShort(p.totals.overdue), (d) => inrShort(d.totals.overdue), 'bad'],
  ['>180 days', (p) => (p.ageing?.['>180'] ? inrShort(p.ageing['>180']) : '—'), (d) => (d.ageing?.['>180'] ? inrShort(d.ageing['>180']) : '—')],
  ['Not yet due', (p) => inrShort(p.totals.not_due), (d) => inrShort(d.totals.not_due)],
  ['Interest', (p) => inrShort(p.totals.net_interest), (d) => inrShort(d.totals.net_interest)],
  ['Total receivable', (p) => inrShort(p.totals.os_with_interest), (d) => inrShort(d.totals.os_with_interest), 'strong'],
];

function ProjectTable({ rows, data, onOpen }) {
  const cell = (tone) => StyleSheet.compose(s.ptCell, tone === 'bad' ? s.ptBad : tone === 'strong' ? s.ptStrong : null);
  return (
    <View style={[common.card, s.pcCard]}>
      <Text style={s.cardTitle}>All projects at a glance</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.ptScroll}>
        <View>
          <View style={[s.ptRow, s.ptHead]}>
            <Text style={[s.ptName, s.ptHeadText]}>Project</Text>
            {PT_COLS.map(([h]) => <Text key={h} style={[s.ptCell, s.ptHeadText]}>{h}</Text>)}
          </View>
          {rows.map((p) => (
            <TouchableOpacity key={p.id} style={s.ptRow} activeOpacity={0.7} onPress={() => onOpen(p.id)}>
              <Text style={[s.ptName, s.ptLink]} numberOfLines={1}>{p.name}</Text>
              {PT_COLS.map(([h, v, , tone]) => <Text key={h} style={cell(tone)}>{v(p)}</Text>)}
            </TouchableOpacity>
          ))}
          <View style={[s.ptRow, s.ptFoot]}>
            <Text style={[s.ptName, s.ptStrong]}>Total</Text>
            {PT_COLS.map(([h, , t, tone]) => <Text key={h} style={[cell(tone), s.ptStrong]}>{t(data)}</Text>)}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Project-wise charts — mirrors the web: a stacked bar per project (Not yet due +
// Overdue + Interest = Total receivable) and a projects × ageing heatmap on a
// square-root scale, then what falls due this month and the next three (blue, so
// it never reads like the red overdue). Tap a bar or a cell for its figures.
const OWES = [['not_due', 'Not yet due'], ['overdue', 'Overdue'], ['net_interest', 'Interest']];

function ProjectCharts({ rows, data, onOpen }) {
  const [sel, setSel] = useState(null);   // { id, text } — the tapped bar / cell
  const sorted = [...rows].sort((a, b) => b.totals.os_with_interest - a.totals.os_with_interest);
  const max = Math.max(1, ...sorted.map((p) => OWES.reduce((a, [k]) => a + Math.max(0, p.totals[k] || 0), 0)));
  const ageMax = Math.max(1, ...rows.flatMap((p) => AGE_LABELS.map((a) => p.ageing?.[a] || 0)));
  const step = (v) => (v > 0 ? Math.min(7, 1 + Math.floor(Math.sqrt(v / ageMax) * 7)) : 0);
  // Coming due: the months are charted on their own scale; "After …" (and "No date"
  // when there is any) sit to the side as plain totals so they don't flatten them.
  const cLabels = data?.coming_labels || [];
  const cTot = data?.coming || [];
  const cN = Math.max(0, cLabels.length - 2);
  const cMonths = [...Array(cN).keys()];
  const cLater = [cN, cN + 1].filter((i) => i < cLabels.length && (i === cN || (cTot[i] || 0) > 0));
  const cMax = Math.max(1, ...cMonths.map((i) => cTot[i] || 0));
  const cCellMax = Math.max(1, ...rows.flatMap((p) => cMonths.map((i) => p.coming?.[i] || 0)));
  const cStep = (v) => (v > 0 ? Math.min(7, 1 + Math.floor(Math.sqrt(v / cCellMax) * 7)) : 0);
  const cRows = [...rows].filter((p) => (p.coming || []).some((v) => v > 0))
    .sort((a, b) => (b.coming || []).reduce((t, v) => t + v, 0) - (a.coming || []).reduce((t, v) => t + v, 0));
  const cSum = cMonths.reduce((t, i) => t + (cTot[i] || 0), 0);
  const cPick = (i) => {
    const by = rows.map((p) => [p, p.coming?.[i] || 0]).filter(([, x]) => x > 0).sort((a, b) => b[1] - a[1]);
    setSel({ id: by[0]?.[0].id, text: `Due ${cLabels[i]} · ${inrShort(cTot[i] || 0)}${by.length ? '\n' + by.slice(0, 6).map(([p, x]) => `${p.name} ${inrShort(x)}`).join(' · ') : ''}` });
  };
  return (
    <View>
      <View style={[common.card, s.pcCard]}>
        <Text style={s.cardTitle}>What each project owes</Text>
        <Text style={s.cardSub}>Total receivable = overdue + not yet due + interest</Text>
        <View style={s.pcLegend}>
          {OWES.map(([k, label], i) => (
            <View key={k} style={s.pcLegendItem}>
              <View style={[s.pcSwatch, { backgroundColor: COLORS.viz[i] }]} />{/* inline-ok: series colour */}
              <Text style={s.pcLegendText}>{label}</Text>
            </View>
          ))}
        </View>
        {sorted.map((p) => (
          <TouchableOpacity key={p.id} style={[s.pcRow, p === sorted[sorted.length - 1] && s.pcRowLast]} activeOpacity={0.7}
            onPress={() => setSel({ id: p.id, text: `${p.name} · not yet due ${inrShort(p.totals.not_due)} · overdue ${inrShort(p.totals.overdue)} · interest ${inrShort(p.totals.net_interest)}` })}>
            <Text style={s.pcName} numberOfLines={1}>{p.name}</Text>
            {/* Bar as long as the project's total (relative to the largest), its
                parts splitting it, and the total written right where it ends. */}
            <View style={s.pcTrack}>
              {(() => {
                const tot = OWES.reduce((t, [k]) => t + Math.max(0, p.totals[k] || 0), 0) || 1;
                return (
                  <View style={[s.pcStack, { width: `${(tot / max) * 72}%` }]}>{/* inline-ok: bar length from data */}
                    {/* A part under ~0.5% of the longest bar is left out — only a sliver. */}
                    {OWES.map(([k], i) => {
                      const v = Math.max(0, p.totals[k] || 0);
                      return v / max >= 0.005 ? <View key={k} style={[s.pcSeg, { flexGrow: v, backgroundColor: COLORS.viz[i] }]} /> : null; // inline-ok: part of the bar and series colour from data
                    })}
                  </View>
                );
              })()}
              <Text style={s.pcTotal}>{inrShort(p.totals.os_with_interest)}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[common.card, s.pcCard]}>
        <Text style={s.cardTitle}>Where the overdue sits</Text>
        <Text style={s.cardSub}>By project and days past due — stronger colour is more</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            <View style={s.hmRow}>
              <View style={s.hmName} />
              {AGE_LABELS.map((a) => <Text key={a} style={s.hmCol}>{a}</Text>)}
            </View>
            {sorted.map((p) => (
              <View key={p.id} style={s.hmRow}>
                <Text style={[s.pcName, s.hmName]} numberOfLines={1}>{p.name}</Text>
                {AGE_LABELS.map((a) => {
                  const v = p.ageing?.[a] || 0;
                  const st = step(v);
                  return (
                    <TouchableOpacity key={a} activeOpacity={0.7} onPress={() => setSel({ id: p.id, text: `${p.name} · ${a} days overdue · ${v ? inrShort(v) : 'nothing'}` })}
                      style={[s.hmCell, st ? { backgroundColor: COLORS.vizSeq[st] } : s.hmZero]}>{/* inline-ok: heatmap step colour */}
                      <Text style={[s.hmText, { color: st === 0 ? COLORS.textTertiary : COLORS.vizSeqInk[st] }]}>{v ? inrShort(v) : '—'}</Text>{/* inline-ok: ink for the step */}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            {/* Column totals across every project, and the grand total under "Total". */}
            <View style={[s.hmRow, s.hmTotalRow]}>
              <View style={s.hmName}>
                <Text style={s.hmTotalName}>Total</Text>
                <Text style={s.hmTotalSum}>{inrShort(rows.reduce((t, p) => t + AGE_LABELS.reduce((u, a) => u + (p.ageing?.[a] || 0), 0), 0))}</Text>
              </View>
              {AGE_LABELS.map((a) => {
                const v = rows.reduce((t, p) => t + (p.ageing?.[a] || 0), 0);
                return <View key={a} style={[s.hmCell, s.hmTotalCell]}><Text style={s.hmTotalText}>{v ? inrShort(v) : '—'}</Text></View>;
              })}
            </View>
          </View>
        </ScrollView>
      </View>
      {cN > 0 ? (
        <View style={[common.card, s.pcCard]}>
          <Text style={s.cardTitle}>Coming due — this month and the next three</Text>
          <Text style={s.cardSub}>Not yet due, by the month it falls due · {inrShort(cSum)} in these {cN} months</Text>
          {/* One scrolling grid for the chart and the table: each month's column sits
              right above that month's figures. Later amounts are plain totals. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.cdGrid}>
            <View>
              <View style={s.cdChartRow}>
                <View style={s.hmName} />
                {cMonths.map((i) => {
                  const v = cTot[i] || 0;
                  return (
                    <TouchableOpacity key={i} style={s.cdCol} activeOpacity={0.7} onPress={() => cPick(i)}>
                      <Text style={s.cdVal} numberOfLines={1}>{v ? inrShort(v) : '—'}</Text>
                      <View style={s.cdTrack}>
                        <View style={[s.cdBar, { height: `${(v / cMax) * 100}%` }]} />{/* inline-ok: column height from data */}
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {cLater.map((i) => (
                  <TouchableOpacity key={i} style={s.cdLaterCol} activeOpacity={0.7} onPress={() => cPick(i)}>
                    <View style={s.cdLaterItem}>
                      <Text style={s.cdLaterLabel}>{i === cN ? 'Later' : 'Undated'}</Text>
                      <Text style={s.cdLaterVal} numberOfLines={1}>{inrShort(cTot[i] || 0)}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.hmRow}>
                <View style={s.hmName} />
                {cMonths.concat(cLater).map((i) => <Text key={i} style={[s.hmCol, i === 0 && s.cdNow]} numberOfLines={1}>{cLabels[i]}</Text>)}
              </View>
              {cRows.map((p) => (
                <View key={p.id} style={s.hmRow}>
                  <Text style={[s.pcName, s.hmName]} numberOfLines={1}>{p.name}</Text>
                  {cMonths.concat(cLater).map((i) => {
                    const v = p.coming?.[i] || 0;
                    const st = i >= cN ? 0 : cStep(v);
                    return (
                      <TouchableOpacity key={i} activeOpacity={0.7} onPress={() => setSel({ id: p.id, text: `${p.name} · due ${cLabels[i]} · ${v ? inrShort(v) : 'nothing'}` })}
                        style={[s.hmCell, i >= cN ? s.cdLaterCell : st ? { backgroundColor: COLORS.vizDue[st] } : s.hmZero]}>{/* inline-ok: grid step colour */}
                        <Text style={[s.hmText, { color: i >= cN ? COLORS.textPrimary : st === 0 ? COLORS.textTertiary : COLORS.vizDueInk[st] }]}>{v ? inrShort(v) : '—'}</Text>{/* inline-ok: ink for the step */}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
              <View style={[s.hmRow, s.hmTotalRow]}>
                <View style={s.hmName}>
                  <Text style={s.hmTotalName}>Total</Text>
                  <Text style={s.hmTotalSum}>{inrShort(cMonths.concat(cLater).reduce((t, i) => t + (cTot[i] || 0), 0))}</Text>
                </View>
                {cMonths.concat(cLater).map((i) => (
                  <View key={i} style={[s.hmCell, s.hmTotalCell]}><Text style={s.hmTotalText}>{cTot[i] ? inrShort(cTot[i]) : '—'}</Text></View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      ) : null}
      {sel ? (
        <View style={s.pcSel}>
          <Text style={s.pcSelText}>{sel.text}</Text>
          {sel.id ? <TouchableOpacity onPress={() => onOpen(sel.id)}><Text style={s.pcSelOpen}>Open dashboard ›</Text></TouchableOpacity> : null}
        </View>
      ) : null}
    </View>
  );
}


const s = StyleSheet.create({
  viewSeg: { marginBottom: 12 },
  pcCard: { padding: 16, marginBottom: 12 },
  pcLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10, marginBottom: 12 },
  pcLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pcSwatch: { width: 10, height: 10, borderRadius: 3 },
  pcLegendText: { fontSize: 11.5, color: COLORS.textSecondary },
  pcRow: { flexDirection: 'row', alignItems: 'center', height: 42, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pcRowLast: { borderBottomWidth: 0 },
  pcName: { width: 100, paddingRight: 8, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  pcTrack: { flex: 1, height: '100%', flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: COLORS.border },
  pcStack: { flexDirection: 'row', gap: 2, height: 14, borderRadius: 4, overflow: 'hidden', minWidth: 6 },
  pcSeg: { flexBasis: 0, height: '100%', minWidth: 2 },
  pcTotal: { fontSize: 12.5, fontWeight: '800', color: COLORS.textPrimary },
  pcSel: { backgroundColor: COLORS.surfaceAlt, borderRadius: 12, padding: 10, marginBottom: 12, gap: 6 },
  pcSelText: { fontSize: 12.5, color: COLORS.textPrimary },
  pcSelOpen: { fontSize: 13, fontWeight: '700', color: COLORS.link },
  hmRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  hmName: { width: 104 },
  hmCol: { width: 72, textAlign: 'center', fontSize: 11, fontWeight: '700', color: COLORS.textSecondary },
  hmCell: { width: 72, height: 38, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  hmZero: { backgroundColor: COLORS.surfaceAlt },
  hmText: { fontSize: 12, fontWeight: '700' },
  ptScroll: { marginTop: 10 },
  ptRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  ptHead: { paddingVertical: 8 },
  ptFoot: { borderBottomWidth: 0, borderTopWidth: 1, borderTopColor: COLORS.border },
  ptHeadText: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary },
  ptName: { width: 130, paddingRight: 8, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  ptLink: { color: COLORS.link },
  ptCell: { width: 108, textAlign: 'right', paddingHorizontal: 6, fontSize: 12.5, color: COLORS.textPrimary },
  ptBad: { color: COLORS.error, fontWeight: '700' },
  ptStrong: { fontWeight: '800', color: COLORS.textPrimary },
  hmTotalRow: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border },
  hmTotalName: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  hmTotalSum: { fontSize: 11.5, fontWeight: '700', color: COLORS.textSecondary },
  hmTotalCell: { backgroundColor: COLORS.surfaceAlt },
  hmTotalText: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  cdVal: { fontSize: 12, fontWeight: '800', color: COLORS.textPrimary },
  cdTrack: { flex: 1, width: '100%', justifyContent: 'flex-end', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cdBar: { width: '62%', minHeight: 3, borderTopLeftRadius: 5, borderTopRightRadius: 5, backgroundColor: COLORS.vizDue[4] },
  cdGrid: { marginTop: 14 },
  cdChartRow: { flexDirection: 'row', gap: 3, height: 170, marginBottom: 2 },
  cdCol: { width: 72, alignItems: 'center', gap: 4 },
  cdLaterCol: { width: 72, justifyContent: 'flex-end', paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  cdLaterItem: { backgroundColor: COLORS.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 8, alignItems: 'center' },
  cdLaterLabel: { fontSize: 10.5, fontWeight: '700', color: COLORS.textSecondary },
  cdLaterVal: { fontSize: 12.5, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  cdNow: { color: COLORS.textPrimary },
  cdLaterCell: { borderWidth: 1, borderColor: COLORS.border },
  pwEmpty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 30 },
  pwCard: { padding: 16, marginBottom: 12 },
  pwHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  pwName: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  pwSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  pwTotal: { alignItems: 'flex-end' },
  pwTotalLabel: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6, color: COLORS.textSecondary },
  pwTotalValue: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  pwTrack: { height: 7, borderRadius: 999, backgroundColor: COLORS.surfaceAlt, overflow: 'hidden' },
  pwFill: { height: '100%', borderRadius: 999, backgroundColor: COLORS.success },
  pwCollected: { fontSize: 12, color: COLORS.textSecondary, marginTop: 5 },
  pwStats: { flexDirection: 'row', gap: 8, paddingVertical: 12, marginVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.surfaceAlt },
  pwStatK: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },
  pwStatV: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginTop: 3 },
  pwBad: { color: COLORS.error },
  pwLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  pwLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pwLegendText: { fontSize: 11.5, color: COLORS.textSecondary },
  pwActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 12 },
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
