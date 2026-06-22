import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

// Order siblings: heads/managers first, then STM, CP, telecallers — and keep
// same-designation people contiguous (telecallers next to telecallers).
function sortSiblings(arr) {
  const rank = (d = '') => {
    d = d.toLowerCase();
    if (d.includes('head') || d.includes('manager') || d.includes('coordinator')) return 0;
    if (d.includes('stm') || d.includes('sales'))   return 1;
    if (d.includes('cp')  || d.includes('channel')) return 2;
    if (d.includes('telecaller') || d.includes('pre-sale')) return 3;
    return 4;
  };
  return [...arr].sort((a, b) =>
    rank(a.designation) - rank(b.designation) ||
    (a.designation || '').localeCompare(b.designation || '') ||
    (a.name || '').localeCompare(b.name || ''));
}

// Pick a role/designation accent so each level reads at a glance.
function accentFor(node) {
  const d = (node.designation || '').toLowerCase();
  if (node._root)                                          return COLORS.navy;
  if (d.includes('telecaller') || d.includes('pre-sale'))  return COLORS.info;
  if (d.includes('cp ') || d.includes('channel'))          return COLORS.warning;
  if (d.includes('stm') || d.includes('sales'))            return COLORS.link;
  if (node.role === 'Manager')                             return COLORS.purple;
  return COLORS.textSecondary;
}

const LINE = '#C5CEDC';

// One org-chart card (fixed width so the branching layout computes cleanly).
function ChartCard({ node }) {
  const root = node._root;
  const color = accentFor(node);
  return (
    <View style={{ width: 150, borderRadius: 12, backgroundColor: root ? COLORS.navy : COLORS.cardBg,
      borderWidth: root ? 0 : 1, borderColor: color + '33', overflow: 'hidden', ...CARD_SHADOW }}>
      {!root && <View style={{ height: 3, backgroundColor: color }} />}
      <View style={{ padding: 10, alignItems: 'center', gap: 4 }}>
        <View style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center',
          backgroundColor: root ? 'rgba(255,255,255,0.2)' : color + '18' }}>
          <Text style={{ fontWeight: '800', fontSize: 15, color: root ? COLORS.white : color }}>{(node.name || '?')[0].toUpperCase()}</Text>
        </View>
        <Text style={{ fontSize: 13, fontWeight: '700', color: root ? COLORS.white : COLORS.textPrimary, textAlign: 'center' }} numberOfLines={1}>{node.name || '—'}</Text>
        <Text style={{ fontSize: 9, fontWeight: '700', letterSpacing: 0.3, textTransform: 'uppercase', textAlign: 'center',
          color: root ? 'rgba(255,255,255,0.85)' : color }} numberOfLines={2}>{node.designation || node.role || '—'}</Text>
        {node._isMe && (
          <View style={{ backgroundColor: root ? 'rgba(255,255,255,0.18)' : BLUE, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 20, marginTop: 1 }}>
            <Text style={{ fontSize: 8, fontWeight: '800', color: root ? 'rgba(255,255,255,0.9)' : COLORS.white }}>YOU</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const CHILD_GAP = 11; // horizontal padding per child column

// Recursive branching org-chart node (top-to-bottom, with connector lines).
function ChartNode({ node }) {
  const kids = node.children || [];
  const last = kids.length - 1;
  return (
    <View style={{ alignItems: 'center' }}>
      <ChartCard node={node} />
      {kids.length > 0 && (
        <>
          <View style={{ width: 2, height: 18, backgroundColor: LINE }} />
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            {kids.map((c, i) => (
              <View key={c.id} style={{ alignItems: 'center', paddingHorizontal: CHILD_GAP }}>
                {/* connector: horizontal bus (extends into the gaps so segments meet) + vertical drop */}
                <View style={{ height: 18, alignSelf: 'stretch' }}>
                  <View style={{ position: 'absolute', top: 0, height: 2, backgroundColor: LINE,
                    left:  i === 0    ? '50%' : -CHILD_GAP,
                    right: i === last ? '50%' : -CHILD_GAP }} />
                  <View style={{ position: 'absolute', top: 0, height: 18, width: 2, left: '50%', marginLeft: -1, backgroundColor: LINE }} />
                </View>
                <ChartNode node={c} />
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const NAVY = COLORS.navy; const BLUE = COLORS.link; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, ...CARD_SHADOW };

// "My Team" — everyone reporting under the logged-in manager (their org subtree).
export default function MyTeamScreen({ navigation }) {
  const me = useSelector((s) => s.auth.user);
  const [team,    setTeam]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q,       setQ]       = useState('');
  const [view,    setView]    = useState('tree'); // 'tree' | 'list'

  const load = useCallback(async () => {
    try {
      const res = await apiFetch(SALES_ENDPOINTS.myTeam);
      if (res.ok) { const d = await res.json(); setTeam(Array.isArray(d) ? d : []); }
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const ql = q.trim().toLowerCase();
  const visible = ql
    ? team.filter((m) => [m.name, m.user_code, m.designation].some((v) => (v || '').toLowerCase().includes(ql)))
    : team;
  const directs = team.filter((m) => m.is_direct_report).length;

  // Build the org tree. Managers root at themselves; admins/viewers (not in the
  // reporting tree) root at the org top — the same chart the CMO sees.
  const tree = (() => {
    if (!team.length) return null;
    const byId = {}; team.forEach((m) => { byId[m.id] = m; });
    const byParent = {};
    team.forEach((m) => { (byParent[m.reporting_manager_id] = byParent[m.reporting_manager_id] || []).push(m); });
    const build = (u) => ({ ...u, _isMe: u.id === me?.id, children: sortSiblings(byParent[u.id] || []).map(build) });
    if ((byParent[me?.id] || []).length > 0) {
      return build({ id: me?.id, name: me?.name, designation: me?.designation, role: me?.role, _root: true });
    }
    const roots = sortSiblings(team.filter((m) => !m.reporting_manager_id || !byId[m.reporting_manager_id]));
    if (roots.length === 1) return { ...build(roots[0]), _root: true };
    return { name: 'Organisation', designation: 'Company', _root: true, children: roots.map(build) };
  })();
  const orgView = !!(tree && !tree._isMe);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT }}>My Team</Text>
          <Text style={{ fontSize: 12, color: MUTED }}>
            {orgView
              ? `${team.length} across the organisation`
              : `${team.length} reporting under you${team.length ? ` · ${directs} direct` : ''}`}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', backgroundColor: COLORS.surfaceAlt, borderRadius: 9, padding: 3 }}>
          {[['tree', 'git-network-outline'], ['list', 'list-outline']].map(([k, icon]) => (
            <TouchableOpacity key={k} onPress={() => setView(k)}
              style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 7, backgroundColor: view === k ? COLORS.white : 'transparent' }}>
              <Ionicons name={icon} size={18} color={view === k ? BLUE : MUTED} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={BLUE} style={{ marginTop: 40 }} />
      ) : team.length === 0 ? (
        <View style={[CARD, { padding: 32, alignItems: 'center', margin: 16 }]}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 4 }}>No one reports to you yet.</Text>
          <Text style={{ fontSize: 13, color: MUTED, textAlign: 'center' }}>Set their Reporting Manager to you and they’ll appear here.</Text>
        </View>
      ) : view === 'tree' ? (
        <ScrollView contentContainerStyle={{ padding: 16, minHeight: '100%' }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 12, paddingBottom: 24 }}>
            <ChartNode node={tree} />
          </ScrollView>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
          <TextInput value={q} onChangeText={setQ} placeholder="Search name, code or designation…"
            style={{ backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: TEXT, marginBottom: 6 }} />

          {visible.map((m) => (
            <View key={m.id} style={[CARD, { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
              <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.linkBg, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: BLUE }}>{(m.name || '?')[0].toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT }}>{m.name}</Text>
                  {m.is_direct_report && (
                    <View style={{ backgroundColor: COLORS.successBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20 }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: COLORS.success }}>DIRECT</Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{m.designation || m.role}{m.user_code ? ` · ${m.user_code}` : ''}</Text>
                <Text style={{ fontSize: 11, color: COLORS.textTertiary, marginTop: 1 }}>
                  {m.leads} leads · {m.closures} closures{m.reporting_manager ? ` · ↑ ${m.reporting_manager}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
