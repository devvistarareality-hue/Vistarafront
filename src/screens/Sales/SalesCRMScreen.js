import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl, Platform, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiFetch } from '../../utils/apiFetch';
import { useSelector, useDispatch } from 'react-redux';
import { setAdminCompany } from '../../redux/reducers/adminFilterReducer';
import { SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { isManagerRole, can, canSee, dashboardFor } from '../../lib/roles';
import DashboardRoleFilter from '../../components/DashboardRoleFilter';
import { ThemeIconButton } from '../../components/ThemeToggle';
import AppLoader from '../../components/AppLoader';

const NAVY  = COLORS.navy;
const BLUE  = COLORS.link;
const BG    = COLORS.screenBg;
const TEXT  = COLORS.textPrimary;
const MUTED = COLORS.textSecondary;
const CARD  = { backgroundColor: COLORS.cardBg, borderRadius: 22, ...CARD_SHADOW , borderWidth: 1, borderColor: COLORS.cardBorder };
// Tiles sit inside a section panel, so they lose the white card + shadow the
// panel already provides and go flat on the subtle surface colour instead.
const TILE  = { flexGrow: 1, minWidth: 0, paddingVertical: 11, paddingHorizontal: 8, alignItems: 'center',
                backgroundColor: COLORS.screenBg, borderRadius: 16, borderWidth: 1, borderColor: COLORS.surfaceAlt };

// How wide each tile is, given how many the group holds. Two and three share the
// row; four splits 2+2 rather than 3+1, so no tile is ever left alone on a row
// looking twice the size of its neighbours. Four across would fit, but on a phone
// it squeezes labels like "Follow-ups Overdue" into three lines.
const tileBasis = (n) => (n === 1 ? '100%' : n === 2 || n === 4 ? '48%' : '31%');

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

const MENU = [
  { key: 'SalesLeads',        label: 'All Leads',    icon: 'people-outline',         color: COLORS.link, bg: COLORS.linkBg,  adminOnly: false , screen: 'sales.screen.leads' },
  { key: 'SalesFollowUps',    label: 'Follow-Ups',   icon: 'calendar-outline',        color: COLORS.warning, bg: COLORS.warningBg,  adminOnly: false , screen: 'sales.screen.followups' },
  { key: 'SalesSiteVisits',   label: 'Site Visits',  icon: 'location-outline',        color: COLORS.success, bg: COLORS.successBg,  adminOnly: false, stmOnly: true , screen: 'sales.screen.sitevisits' },
  { key: 'ClosureProjects',   label: 'Booking',      icon: 'document-text-outline',   color: COLORS.link, bg: COLORS.linkBg,  adminOnly: false, stmOnly: true , screen: 'sales.screen.booking' },
  { key: 'MyConversions',     label: 'My Conversions', icon: 'trending-up-outline',    color: COLORS.success, bg: COLORS.successBg,  adminOnly: false, tcStmOnly: true, hideForStm: true, screen: 'sales.screen.conversions' },
  // Not for an STM: their site visits and closures are reached from Site Visits
  // and Booking -> My Bookings, which the dashboard tiles now link to directly.
  { key: 'MyTeam',            label: 'My Team',      icon: 'people-circle-outline',   color: COLORS.purple, bg: COLORS.purpleBg,  adminOnly: false, managerOnly: true, navParams: { module: 'Sales', title: 'My Team' } , screen: 'sales.screen.myteam' },
  { key: 'BookingApprovals',  label: 'Approvals',    icon: 'checkmark-done-outline',  color: COLORS.success, bg: COLORS.successBg, adminOnly: false, managerOnly: true , screen: 'sales.screen.approvals' },
  { key: 'SalesProjects',     label: 'Projects',      icon: 'business-outline',        color: COLORS.success, bg: COLORS.successBg,  adminOnly: true  , screen: 'sales.screen.projects' },
  { key: 'SalesSources',      label: 'Lead Setup',    icon: 'git-network-outline',     color: COLORS.info, bg: COLORS.infoBg,  adminOnly: true  , screen: 'sales.screen.leadsetup' },
  { key: 'SalesTeam',         label: 'Team Users',    icon: 'person-circle-outline',   color: COLORS.purple, bg: COLORS.purpleBg,  adminOnly: true  , screen: 'sales.screen.teamusers' },
  // The Channel Partner module — its own pipeline over the partner-sourced slice
  // of Sales, the same eight destinations the web nav lists. Admin-only, as there.
  { key: 'SalesDistribution', label: 'Distribution',  icon: 'shuffle-outline',         color: COLORS.warning, bg: COLORS.warningBg,  adminOnly: true  , screen: 'sales.screen.distribution' },
  { key: 'SalesImport',       label: 'Import Leads',  icon: 'cloud-upload-outline',    color: COLORS.info, bg: COLORS.infoBg,  adminOnly: false , screen: 'sales.screen.import' },
  { key: 'SalesDataReset',    label: 'Data Reset',    icon: 'trash-outline',           color: COLORS.error, bg: COLORS.errorBg,  adminOnly: true  , screen: 'sales.screen.datareset' },
  // Who changed what in Sales, and when — real admins only.
  { key: 'ActivityLog',       label: 'Log',           icon: 'time-outline',            color: COLORS.link, bg: COLORS.linkBg,  adminOnly: true, trueAdminOnly: true, navParams: { modules: ['Sales', 'Channel Partner'], title: 'Sales Log' } , screen: 'sales.screen.datareset' },
  { key: 'SalesReports',      label: 'Reports',       icon: 'bar-chart-outline',       color: COLORS.linkPressed, bg: COLORS.infoBg,  adminOnly: false , screen: 'sales.screen.reports' },
];

function getDesignationLabel(user) {
  const des = (user?.designation || '').toLowerCase();
  if (can(user, 'sales.pipeline.telecalling')) return { title: 'Telecaller Portal', sub: 'Your call queue & leads' };
  if (des.includes('cp cluster head')) return { title: 'Channel Partner', sub: 'Your CP team' };
  if (can(user, 'sales.pipeline.cp')) return { title: 'Channel Partner', sub: 'Your pipeline & site visits' };
  if (can(user, 'sales.pipeline.stm')) return { title: 'Sales Executive', sub: 'Your pipeline & site visits' };
  return { title: 'Sales CRM', sub: 'Nexora' };
}

// The dashboards this module has, one per role level — the same keys the
// website uses, and the ones Designation → Permissions pins.
const SALES_DASHBOARDS = [
  { key: 'telecaller', role: 'Employee', label: 'Telecaller' },
  { key: 'stm', role: 'Employee', label: 'Sales Executive' },
  { key: 'manager', role: 'Manager', label: 'Manager' },
  { key: 'gm', role: 'General Manager', label: 'General Manager' },
  { key: 'director', role: 'Director', label: 'Director' },
];

export default function SalesCRMScreen({ navigation, route }) {
  const user      = useSelector((s) => s.auth.user);
  const companyId = useSelector((s) => s.adminFilter?.companyId);
  const dispatch  = useDispatch();
  // Pushed as a second instance of this same screen when a Sales Admin-Modules
  // user taps "Admin" — mirrors web's /sales/admin: full company data, full menu,
  // and the stack's own back button returns to the normal (team-scoped) dashboard.
  const adminView = !!route?.params?.adminView;
  // True/hardcoded admins (Chinmay, Prince, platform staff) keep the flat,
  // always-visible menu exactly as before. The collapsible "Admin" tile is only for
  // module-scoped admins (e.g. a Manager granted Sales in Admin Modules) — it never
  // changes behavior for real admins.
  const isTrueAdmin = user?.role === 'Admin' || user?.is_staff;
  const [_preview, _setPreview] = useState('');
  const isSalesModuleAdmin = !isTrueAdmin && (user?.admin_modules || []).includes('Sales');
  const isAdmin   = isTrueAdmin || isSalesModuleAdmin;
  // A module (Sales) admin is locked to their own company — clear any stale company
  // filter a previous super-admin session may have persisted on this device.
  const isModuleAdmin = user?.role === 'Admin' && !user?.is_staff && (user?.modules || []).length === 1;
  useEffect(() => { if (isModuleAdmin && companyId != null) dispatch(setAdminCompany(null)); }, [isModuleAdmin, companyId]);
  const _des = (user?.designation || '').toLowerCase();
  // A company can pin which dashboard a designation opens (Designation Master →
  // Permissions); '' keeps deciding from their permissions, as before.
  // An admin can look at any role's dashboard from here — that is how you see
  // what each role gets before pinning it to a designation.
  const _pinned = _preview || dashboardFor(user, 'Sales');
  const isStm = _pinned ? _pinned === 'stm' : can(user, 'sales.pipeline.stm');
  const isTelecaller = _pinned ? _pinned === 'telecaller' : can(user, 'sales.pipeline.telecalling');
  // Managers also get the STM-portal modules (Site Visits, Booking, My Conversions).
  const isManager = isManagerRole(user);
  // CP Executive works their own leads like an STM (no Meta) → same modules.
  // Anyone on the Channel Partner side. The designation prefix is the same test the
  // backend uses to decide who gets into the module at all (is_cp_manager / is_cp),
  // and it is the only one that catches a CP Cluster Head — whose designation names
  // no module, so looking for "channel partner" in it silently misses them.
  const isCp = _des.startsWith('cp') || _des.includes('channel partner');
  // Their org chart is the Channel Partner one — same tile, but it asks for (and is
  // headed by) the CP side rather than Sales.
  const teamParams = (m) => (m.key === 'MyTeam' && isCp
    ? { ...m, navParams: { cp: true, title: 'My Team' } } : m);
  const baseFilter = m => canSee(user, m.screen) && (!m.trueAdminOnly || isTrueAdmin) && (!m.managerOnly || isAdmin || isManager) && (!m.stmOnly || isAdmin || isStm || isManager || isCp) && (!m.tcOnly || isAdmin || isTelecaller) && (!m.tcStmOnly || isAdmin || isTelecaller || isStm || isManager || isCp) && !(m.hideForStm && isStm && !isAdmin && !isManager);
  // Tiles that pull hierarchy-scoped data need adminView threaded into their own
  // params so THEY request full company data too (see backend's admin_view=1).
  const withAdminParams = (m) => ({ ...m, navParams: { ...(m.navParams || {}), adminView: true } });
  // Real admins get the exact original flat menu (every admin-only tile inline, in
  // MENU's own order) — unchanged, never affected by adminView.
  let visibleMenu;
  if (isTrueAdmin) {
    visibleMenu = MENU.filter(baseFilter);
  } else if (adminView) {
    // Inside the pushed Admin-section instance — full menu (mirrors a real admin's),
    // every tile passing adminView through so its own screen requests full data.
    visibleMenu = MENU.filter(baseFilter).map(withAdminParams);
  } else {
    const nonAdminMenu = MENU.filter(m => !m.adminOnly && baseFilter(m));
    visibleMenu = nonAdminMenu;
    if (isSalesModuleAdmin) {
      const approvalsIdx = nonAdminMenu.findIndex(m => m.key === 'BookingApprovals');
      const adminTile = { key: '__ADMIN__', label: 'Admin', icon: 'shield-checkmark-outline', color: COLORS.navy, bg: COLORS.surfaceAlt };
      visibleMenu = [...nonAdminMenu];
      visibleMenu.splice(approvalsIdx + 1, 0, adminTile);
    }
  }
  visibleMenu = visibleMenu.map(teamParams);
  const { title: screenTitle, sub: screenSub } = getDesignationLabel(user);

  const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const fmtLabel = (d) => d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'All';
  const today = new Date(); today.setHours(0,0,0,0);
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(0,0,0,0); return d; };

  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  // Applied filter (triggers fetch)
  const [dateFrom,     setDateFrom]     = useState(null);
  const [dateTo,       setDateTo]       = useState(null);
  // Filter sheet state (pending = not yet applied)
  const [showFilter,   setShowFilter]   = useState(false);
  const [pendingFrom,  setPendingFrom]  = useState(null);
  const [pendingTo,    setPendingTo]    = useState(null);
  const [showFromPick, setShowFromPick] = useState(false);
  const [showToPick,   setShowToPick]   = useState(false);

  const openFilter = () => { setPendingFrom(dateFrom); setPendingTo(dateTo); setShowFilter(true); };
  const applyFilter = () => { setDateFrom(pendingFrom); setDateTo(pendingTo); setShowFilter(false); };
  const clearFilter = () => { setPendingFrom(null); setPendingTo(null); };
  const filterActive = !!(dateFrom || dateTo);

  useEffect(() => {
    let cancelled = false;
    setStats(null);
    setLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams();
        if (dateFrom) params.set('date_from', fmtDate(dateFrom));
        if (dateTo)   params.set('date_to',   fmtDate(dateTo));
        if (companyId) params.set('company_id', companyId);
        if (adminView) params.set('admin_view', '1');
        const qs = params.toString() ? `?${params}` : '';
        const res = await apiFetch(`${SALES_ENDPOINTS.stats}${qs}`);
        if (cancelled) return;
        if (res.ok) { const data = await res.json(); if (!cancelled) setStats(data); }
      } catch (_) {}
      if (!cancelled) { setLoading(false); setRefreshing(false); }
    })();
    return () => { cancelled = true; };
  }, [companyId, dateFrom, dateTo, adminView]);

  async function loadStats(refresh = false) {
    if (refresh) {
      setStats(null); setRefreshing(true); setLoading(true);
      try {
        const params = new URLSearchParams();
        if (dateFrom) params.set('date_from', fmtDate(dateFrom));
        if (dateTo)   params.set('date_to',   fmtDate(dateTo));
        if (companyId) params.set('company_id', companyId);
        if (adminView) params.set('admin_view', '1');
        const qs = params.toString() ? `?${params}` : '';
        const res = await apiFetch(`${SALES_ENDPOINTS.stats}${qs}`);
        if (res.ok) { const data = await res.json(); setStats(data); }
      } catch (_) {}
      setLoading(false); setRefreshing(false);
    }
  }

  const isActiveRange = (from, to) => {
    if (!dateFrom || !dateTo) return false;
    return fmtDate(dateFrom) === fmtDate(from) && fmtDate(dateTo) === fmtDate(to);
  };

  const _called  = stats?.called_count ?? 0;
  // A completed follow-up is a call that was made, so it counts toward the day's
  // calling. Both honour the same date filter as every other tile.
  const _fuCalls = stats?.followup_call_count ?? 0;
  const _totCall = stats?.total_called_count  ?? (_called + _fuCalls);
  const _svDone  = stats?.sv_done      ?? 0;
  // MQLs per completed site visit, e.g. "4.0 : 1" = four dispositioned leads for
  // every visit. Divides by SV, so it needs _svDone (not _called) to be non-zero.
  const _mqlToSv = _svDone > 0 ? (_called / _svDone).toFixed(1) + ' : 1' : '—';
  // Backlog tiles: what is still waiting to be worked, as opposed to what was done.
  const _toCall    = stats?.to_call_count          ?? 0;
  const _fuPending = stats?.followup_pending_count ?? 0;
  const _fuOverdue = stats?.followup_overdue_count ?? 0;

  // Telecallers (and admins/managers) see call-queue metrics; STM/CP see their
  // pipeline (stm_status based) — mirrors the web's per-role dashboards.
  // Today's date, local — what New Today counts, whatever range the screen is set to.
  // Pending from Accounts opens My Bookings on that tab — Channel Partner's own when in CP.
  const PENDING_ACCOUNTS_PARAMS = isCp ? { cpOnly: true, initialView: 'mybookings', initialTab: 'accounts' }
    : { initialView: 'mybookings', initialTab: 'accounts', initialScope: 'visible' };
  const _today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const TELECALLER_CARDS = [
    { group: 'My Pipeline', label: 'My Leads',      value: stats?.total_leads    ?? '—', color: BLUE,           bg: COLORS.linkBg,    target: 'SalesLeads', params: { initialWorkTab: 'all' } },
    { group: 'My Pipeline', label: 'New Today',     value: stats?.leads_today    ?? '—', color: COLORS.success,  bg: COLORS.successBg, target: 'SalesLeads', params: { initialWorkTab: 'all', initialFilter: { date_from: _today, date_to: _today } } },
    { group: 'My Pipeline', label: 'To Call',       value: _toCall,                      color: COLORS.warning,  bg: COLORS.warningBg, target: 'SalesLeads' },
    { group: 'Calling Activity', label: 'Called/MQL',    value: _called,                      color: COLORS.success,  bg: COLORS.successBg, target: 'SalesLeads', params: { initialWorkTab: 'called' } },
    { group: 'Calling Activity', label: 'Follow-up Calls', value: _fuCalls,                   color: COLORS.purple,   bg: COLORS.purpleBg,  target: 'SalesFollowUps', params: { initialFilter: 'completed' } },
    { group: 'Calling Activity', label: 'Total Called',  value: _totCall,                     color: COLORS.success,  bg: COLORS.successBg },  // view only — no list behind it
    { group: 'Conversions', label: 'Warm/SQL',      value: stats?.warm_count     ?? '—', color: COLORS.warning,  bg: COLORS.warningBg, target: 'SalesLeads', params: { initialWorkTab: 'called', initialFilter: { tc_status: 'warm' } } },
    { group: 'Conversions', label: 'SV Done',       value: _svDone,                      color: COLORS.purple,   bg: COLORS.purpleBg,  target: 'SalesSiteVisits', params: { initialTab: 'completed' } },
    // Visits booked from my leads that haven't happened yet (telecallers only — see STAT_CARDS).
    ...(!(isAdmin || isManager) ? [{ group: 'Conversions', label: 'Upcoming SV', value: stats?.stm_sv_scheduled_count ?? '—', color: COLORS.warning, bg: COLORS.warningBg, target: 'SalesSiteVisits', params: { initialTab: 'scheduled' } }] : []),
    { group: 'Conversions', label: 'MQL→SV Ratio',  value: _mqlToSv,                     color: BLUE,            bg: COLORS.linkBg },  // view only — no list behind it
    { group: 'Follow-ups Due', label: 'Callback Due',  value: stats?.callback_count ?? '—', color: COLORS.purple,   bg: COLORS.purpleBg,  target: 'SalesLeads', params: { initialWorkTab: 'called', initialFilter: { tc_status: 'callback' } } },
    { group: 'Follow-ups Due', label: 'Follow-ups Pending', value: _fuPending,              color: COLORS.warning,  bg: COLORS.warningBg, target: 'SalesFollowUps', params: { initialFilter: 'pending' } },
    { group: 'Follow-ups Due', label: 'Follow-ups Overdue', value: _fuOverdue,              color: COLORS.error,    bg: COLORS.errorBg,   target: 'SalesFollowUps', params: { initialFilter: 'overdue' } },
    { group: 'Conversions', label: 'Closures',      value: stats?.closures       ?? '—', color: COLORS.error,    bg: COLORS.errorBg,
      // In Channel Partner a closure is a booking, so the card opens Booking →
      // My Bookings with Approved chosen, instead of the Conversions screen.
      target: 'ClosureProjects',
      params: isCp ? { cpOnly: true, initialView: 'mybookings', initialTab: 'sold' }
                   : { initialView: 'mybookings', initialTab: 'sold', initialScope: 'visible' } },
    // Closed and approved here, but not yet signed off by Accounts. Not counted
    // as a closure until they are — they join that tile the moment it happens.
    { group: 'Conversions', label: 'Pending from Accounts', value: stats?.accounts_pending ?? '—',
      color: COLORS.warning, bg: COLORS.warningBg, target: 'ClosureProjects', params: PENDING_ACCOUNTS_PARAMS },
  ];

  const STM_CARDS = [
    { group: 'My Pipeline', label: 'My Pipeline',   value: stats?.total_leads            ?? '—', color: BLUE,           bg: COLORS.linkBg,    target: 'SalesLeads', params: { initialWorkTab: 'all' } },
    { group: 'My Pipeline', label: 'To Work',       value: _toCall,                              color: COLORS.warning, bg: COLORS.warningBg, target: 'SalesLeads' },
    { group: 'Lead Temperature', label: 'Hot Leads',     value: stats?.stm_hot_count          ?? '—', color: COLORS.error,   bg: COLORS.errorBg,   target: 'SalesLeads', params: { initialWorkTab: 'called', initialFilter: { stm_status: 'hot' } } },
    { group: 'Lead Temperature', label: 'Warm Leads',    value: stats?.stm_warm_count         ?? '—', color: COLORS.warning, bg: COLORS.warningBg, target: 'SalesLeads', params: { initialWorkTab: 'called', initialFilter: { stm_status: 'warm' } } },
    { group: 'Lead Temperature', label: 'Cold Leads',    value: stats?.stm_cold_count         ?? '—', color: BLUE,           bg: COLORS.linkBg,    target: 'SalesLeads', params: { initialWorkTab: 'called', initialFilter: { stm_status: 'cold' } } },
    { group: 'Site Visits & Closures', label: 'SV Scheduled',  value: stats?.stm_sv_scheduled_count ?? '—', color: COLORS.warning, bg: COLORS.warningBg, target: 'SalesSiteVisits', params: { initialTab: 'scheduled' } },
    { group: 'Calling Activity', label: 'Follow-up Calls', value: _fuCalls,                   color: COLORS.purple,  bg: COLORS.purpleBg,  target: 'SalesFollowUps', params: { initialFilter: 'completed' } },
    { group: 'Follow-ups Due', label: 'Follow-ups Pending', value: _fuPending,              color: COLORS.warning, bg: COLORS.warningBg, target: 'SalesFollowUps', params: { initialFilter: 'pending' } },
    { group: 'Follow-ups Due', label: 'Follow-ups Overdue', value: _fuOverdue,              color: COLORS.error,   bg: COLORS.errorBg,   target: 'SalesFollowUps', params: { initialFilter: 'overdue' } },
    { group: 'Calling Activity', label: 'Total Called',  value: _totCall,                     color: COLORS.success, bg: COLORS.successBg },  // view only — no list behind it
    { group: 'Site Visits & Closures', label: 'SV Done', value: _svDone,              color: COLORS.success, bg: COLORS.successBg, target: 'SalesSiteVisits', params: { initialTab: 'completed' } },
    { group: 'Site Visits & Closures', label: 'Closures',      value: stats?.closures               ?? '—', color: COLORS.purple,  bg: COLORS.purpleBg,  target: 'ClosureProjects',
      params: isCp ? { cpOnly: true, initialView: 'mybookings', initialTab: 'sold' }
                   : { initialView: 'mybookings', initialTab: 'sold', initialScope: 'visible' } },
    // Waiting at the Accounts gate — not a closure until Accounts signs off.
    { group: 'Site Visits & Closures', label: 'Pending from Accounts', value: stats?.accounts_pending ?? '—',
      color: COLORS.warning, bg: COLORS.warningBg, target: 'ClosureProjects', params: PENDING_ACCOUNTS_PARAMS },
  ];

  // "Unassigned" only means anything to someone who sees the whole company's leads.
  // A telecaller's or STM's stats are scoped to leads already assigned to them, so
  // the count would sit at zero forever. Mirrors the web dashboard, which shows the
  // tile to admins/managers and hides it from the CP portal. Deep-links to the same
  // Unassigned Only filter the leads list gained alongside it.
  const UNASSIGNED_CARD = {
    group: 'My Pipeline', label: 'Unassigned',
    value: stats?.unassigned_leads ?? '—',
    color: COLORS.gold, bg: COLORS.goldBg,
    target: 'SalesLeads', params: { initialFilter: { unassigned: true } },
  };
  const STAT_CARDS = (isStm || isCp) ? STM_CARDS
    : (isAdmin || isManager)
      // After My Leads / New Today, as on the web.
      ? [...TELECALLER_CARDS.slice(0, 2), UNASSIGNED_CARD, ...TELECALLER_CARDS.slice(2)]
      : TELECALLER_CARDS;
  // Club the tiles under the question each block answers, so the row a number
  // sits in already says how to read it. Order is fixed; a group with no cards
  // for this role simply drops out.
  const GROUP_ORDER = ['My Pipeline', 'Lead Temperature', 'Calling Activity',
                       'Follow-ups Due', 'Site Visits & Closures', 'Conversions',
                       'Conversion Rates'];
  const STAT_SECTIONS = GROUP_ORDER
    .map((title) => ({ title, cards: STAT_CARDS.filter((c) => c.group === title) }))
    .filter((s) => s.cards.length);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.screenBg} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: 'transparent', borderBottomWidth: 0, borderBottomColor: COLORS.surfaceAlt }}>
        {navigation.canGoBack() && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>{adminView ? 'Admin' : screenTitle}</Text>
          <Text style={{ fontSize: 13, color: MUTED }}>{adminView ? 'Full company data' : screenSub}</Text>
        </View>
        <ThemeIconButton />
      </View>

      {/* Filter Bottom Sheet */}
      <Modal visible={showFilter} transparent animationType="slide" onRequestClose={() => setShowFilter(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: COLORS.overlay }} activeOpacity={1} onPress={() => setShowFilter(false)} />
        <View style={{ backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT }}>Filter by Date</Text>
            <TouchableOpacity onPress={() => setShowFilter(false)}>
              <Ionicons name="close" size={22} color={MUTED} />
            </TouchableOpacity>
          </View>

          {/* Quick buttons */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Quick Select</Text>
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
            {[
              { label: 'Today', from: today,       to: today },
              { label: 'Week',  from: daysAgo(6),  to: today },
              { label: 'Month', from: daysAgo(29), to: today },
            ].map(({ label, from, to }) => {
              const active = pendingFrom && pendingTo && fmtDate(pendingFrom) === fmtDate(from) && fmtDate(pendingTo) === fmtDate(to);
              return (
                <TouchableOpacity key={label} onPress={() => { setPendingFrom(from); setPendingTo(to); }}
                  style={{ height: 36, paddingHorizontal: 20, borderRadius: 8, backgroundColor: active ? NAVY : COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: active ? COLORS.white : MUTED }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity onPress={clearFilter}
              style={{ height: 36, paddingHorizontal: 20, borderRadius: 8, backgroundColor: !pendingFrom && !pendingTo ? NAVY : COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: !pendingFrom && !pendingTo ? COLORS.white : MUTED }}>All</Text>
            </TouchableOpacity>
          </View>

          {/* Custom date range */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Custom Range</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <TouchableOpacity onPress={() => setShowFromPick(true)}
              style={{ flex: 1, height: 42, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: pendingFrom ? TEXT : MUTED }}>{pendingFrom ? fmtLabel(pendingFrom) : 'From date'}</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 14, color: MUTED }}>→</Text>
            <TouchableOpacity onPress={() => setShowToPick(true)}
              style={{ flex: 1, height: 42, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: pendingTo ? TEXT : MUTED }}>{pendingTo ? fmtLabel(pendingTo) : 'To date'}</Text>
            </TouchableOpacity>
          </View>

          {/* Apply button */}
          <TouchableOpacity onPress={applyFilter}
            style={SalesCRMScreenS.btn}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.btnText }}>Apply Filter</Text>
          </TouchableOpacity>
        </View>

        {showFromPick && (
          <DateTimePicker value={pendingFrom || new Date()} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'}
            maximumDate={pendingTo || new Date()}
            onChange={(_, d) => { setShowFromPick(false); if (d) setPendingFrom(d); }} />
        )}
        {showToPick && (
          <DateTimePicker value={pendingTo || new Date()} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={pendingFrom || undefined} maximumDate={new Date()}
            onChange={(_, d) => { setShowToPick(false); if (d) setPendingTo(d); }} />
        )}
      </Modal>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36, paddingTop: 12 }}>
        {isTrueAdmin ? (
          <DashboardRoleFilter options={SALES_DASHBOARDS} value={_pinned} onChange={_setPreview} module="Sales" />
        ) : null}

        {/* The Sales home is the module menu only — the headline, alerts, tiles and
            charts all live in the Reports tab. */}

        {/* Menu */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 12 }}>
            {adminView ? 'Admin — All Modules' : 'Modules'}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {visibleMenu.map(m => (
              <TouchableOpacity key={m.key}
                onPress={() => m.key === '__ADMIN__' ? navigation.push('SalesCRM', { adminView: true }) : navigation.navigate(m.key, m.navParams)}
                style={[CARD, { width: '47%', paddingVertical: 18, paddingHorizontal: 12, alignItems: 'center', gap: 8 }]} activeOpacity={0.8}>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: m.bg, justifyContent: 'center', alignItems: 'center', marginBottom: 2 }}>
                  <Ionicons name={m.icon} size={22} color={m.color} />
                </View>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: TEXT, textAlign: 'center', lineHeight: 18 }} numberOfLines={2}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// Styles moved out of JSX (see AGENTS.md: no inline styles).
const SalesCRMScreenS = StyleSheet.create({
  dash: { paddingHorizontal: 16, paddingTop: 4, marginBottom: 4 },
  btn: { backgroundColor: COLORS.btnTint, borderRadius: 16, height: 48, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.btnBorder },
});
