import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, StatusBar, RefreshControl, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { useSelector } from 'react-redux';
import { SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const NAVY = COLORS.navy; const BLUE = COLORS.link; const BG = COLORS.screenBg; const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, ...CARD_SHADOW };

// Designations that can be assigned projects (mirrors the web Team Users page).
const ASSIGN_DESIGS = ['TELECALLER', 'STM'];

const DESIG_COLORS = {
  TELECALLER:         { bg: COLORS.warningBg, text: COLORS.warningAlt },
  STM:                { bg: COLORS.linkBg, text: COLORS.link },
  'MARKETING COORDINATOR': { bg: COLORS.infoBg, text: COLORS.info },
  CMO:                { bg: COLORS.purpleBg, text: COLORS.purple },
  'SALES CLUSTER HEAD': { bg: COLORS.successBg, text: COLORS.success },
  'CP CLUSTER HEAD':  { bg: COLORS.warningBg, text: COLORS.warning },
  'REGIONAL HEAD':    { bg: COLORS.successBg, text: COLORS.success },
};

function DesigBadge({ desig }) {
  const c = DESIG_COLORS[desig?.toUpperCase()] || { bg: COLORS.screenBg, text: MUTED };
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, backgroundColor: c.bg }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: c.text }}>{desig || 'Member'}</Text>
    </View>
  );
}

function initials(name) { return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }

// Bottom-sheet modal to assign projects to a telecaller / STM.
function AssignProjectsModal({ member, projects, onClose }) {
  const [selected, setSelected] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`${SALES_ENDPOINTS.userProjects}?user_id=${member.id}`);
        if (res.ok) { const ids = await res.json(); setSelected(Array.isArray(ids) ? ids : []); }
      } catch (_) {}
      setLoading(false);
    })();
  }, [member.id]);

  const toggle = (pid) => setSelected(prev => (prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]));

  async function save() {
    setSaving(true);
    try {
      await apiFetch(SALES_ENDPOINTS.userProjects, { method: 'POST', body: JSON.stringify({ user_id: member.id, project_ids: selected }) });
    } catch (_) {}
    setSaving(false);
    onClose(selected);
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => onClose(null)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '82%' }}>
          <View style={{ backgroundColor: NAVY, paddingHorizontal: 20, paddingVertical: 18, borderTopLeftRadius: 22, borderTopRightRadius: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Assign Projects</Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 }}>{member.name} · {member.designation}</Text>
            </View>
            <TouchableOpacity onPress={() => onClose(null)} style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 15 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={NAVY} style={{ margin: 36 }} />
          ) : (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {projects.length === 0 ? (
                <Text style={{ textAlign: 'center', color: MUTED, paddingVertical: 30 }}>No projects found.</Text>
              ) : projects.map((p) => {
                const checked = selected.includes(p.id);
                return (
                  <TouchableOpacity key={p.id} onPress={() => toggle(p.id)} activeOpacity={0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1.5, borderColor: checked ? BLUE : COLORS.border, backgroundColor: checked ? '#F0F3FF' : '#FAFAFA' }}>
                    <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: checked ? BLUE : '#C8D0E0', backgroundColor: checked ? BLUE : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                      {checked && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>{p.name}</Text>
                      {!!p.location && <Text style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>{p.location}</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: COLORS.surfaceAlt }}>
            <TouchableOpacity onPress={save} disabled={saving} style={{ backgroundColor: NAVY, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: saving ? 0.6 : 1 }}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Save ({selected.length} project{selected.length === 1 ? '' : 's'})</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Small filter chip
function Chip({ label, active, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 8, backgroundColor: active ? NAVY : COLORS.surfaceAlt, borderWidth: 1, borderColor: active ? NAVY : COLORS.border }}>
      <Text style={{ fontSize: 11.5, fontWeight: '700', color: active ? '#fff' : MUTED }}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function SalesTeamScreen({ navigation }) {
  const me = useSelector((s) => s.auth.user);
  const companyId = useSelector((s) => s.adminFilter?.companyId);
  const canAssign = me?.role === 'Admin' || me?.is_staff || me?.role === 'Manager';

  const [members,    setMembers]    = useState([]);
  const [projects,   setProjects]   = useState([]);
  const [projectCounts, setProjectCounts] = useState({}); // {user_id: count}
  const [assignMember, setAssignMember]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [desigFilter, setDesigFilter] = useState(null);
  const [roleFilter,  setRoleFilter]  = useState(null);
  const [fetchError, setFetchError] = useState('');

  async function load(refresh = false) {
    if (refresh) setRefreshing(true); else setLoading(true);
    setFetchError('');
    try {
      const cq = companyId ? `?company_id=${companyId}` : '';
      const res = await apiFetch(SALES_ENDPOINTS.usersSlim + cq);
      if (res.ok) {
        const d = await res.json();
        const list = Array.isArray(d) ? d : (d.results || []);
        setMembers(list);
        // projects (for the assign modal)
        apiFetch(SALES_ENDPOINTS.projects + cq).then(r => (r.ok ? r.json() : [])).then(pd => setProjects(Array.isArray(pd) ? pd : (pd.results || []))).catch(() => {});
        // assigned-project counts for assignable members (best-effort)
        const assignable = list.filter(m => ASSIGN_DESIGS.includes((m.designation || '').toUpperCase()));
        const counts = {};
        await Promise.allSettled(assignable.map(async (m) => {
          try { const r = await apiFetch(`${SALES_ENDPOINTS.userProjects}?user_id=${m.id}`); if (r.ok) { const ids = await r.json(); counts[m.id] = Array.isArray(ids) ? ids.length : 0; } } catch (_) {}
        }));
        setProjectCounts(counts);
      } else {
        setFetchError(`${res.status}: ${(await res.text()).slice(0, 160)}`);
      }
    } catch (e) {
      setFetchError(e.message);
    }
    setLoading(false); setRefreshing(false);
  }

  useEffect(() => { load(); }, [companyId]);

  function onAssignClose(newIds) {
    if (newIds !== null && assignMember) setProjectCounts(prev => ({ ...prev, [assignMember.id]: newIds.length }));
    setAssignMember(null);
  }

  const desigs = [...new Set(members.map(m => (m.designation || '').toUpperCase()).filter(Boolean))].sort();
  const roles  = [...new Set(members.map(m => m.role).filter(Boolean))].sort();

  const filtered = members.filter((m) => {
    if (search.trim() && ![m.name, m.user_code, m.designation, m.role].join(' ').toLowerCase().includes(search.toLowerCase())) return false;
    if (desigFilter && (m.designation || '').toUpperCase() !== desigFilter) return false;
    if (roleFilter && (m.role || '') !== roleFilter) return false;
    return true;
  });

  const isAssignable = (m) => canAssign && ASSIGN_DESIGS.includes((m.designation || '').toUpperCase());

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="arrow-back" size={20} color={NAVY} /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT }}>Sales Team</Text>
          <Text style={{ fontSize: 13, color: MUTED }}>{filtered.length} of {members.length} members</Text>
        </View>
        <TouchableOpacity onPress={() => load(true)} disabled={refreshing} style={{ padding: 6, backgroundColor: BG, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
          <Ionicons name="refresh-outline" size={20} color={NAVY} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingTop: 10, backgroundColor: COLORS.white }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: BG, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
          <Ionicons name="search-outline" size={16} color={MUTED} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search by name, user code, designation…" style={{ flex: 1, fontSize: 14, color: TEXT }} />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={16} color={MUTED} /></TouchableOpacity> : null}
        </View>
      </View>

      {/* Filters: role + designation */}
      {!loading && (
        <View style={{ backgroundColor: COLORS.white, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#9CA3AF', marginRight: 8 }}>ROLE</Text>
            <Chip label="All" active={!roleFilter} onPress={() => setRoleFilter(null)} />
            {roles.map(r => <Chip key={r} label={r} active={roleFilter === r} onPress={() => setRoleFilter(roleFilter === r ? null : r)} />)}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#9CA3AF', marginRight: 8 }}>DESIG</Text>
            <Chip label="All" active={!desigFilter} onPress={() => setDesigFilter(null)} />
            {desigs.map(d => <Chip key={d} label={`${d} (${members.filter(m => (m.designation || '').toUpperCase() === d).length})`} active={desigFilter === d} onPress={() => setDesigFilter(desigFilter === d ? null : d)} />)}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={NAVY} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={m => String(m.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}
          renderItem={({ item: m }) => (
            <View style={[CARD, { padding: 14, marginBottom: 10 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 15 }}>{initials(m.name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT }}>{m.name}</Text>
                    <DesigBadge desig={m.designation} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: MUTED }}>{m.user_code}</Text>
                    {m.role ? <Text style={{ fontSize: 12, color: MUTED }}>· {m.role}</Text> : null}
                  </View>
                  {m.email ? <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{m.email}</Text> : null}
                </View>
              </View>
              {isAssignable(m) && (
                <TouchableOpacity onPress={() => setAssignMember(m)}
                  style={{ marginTop: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9, borderWidth: 1.5, borderColor: BLUE, backgroundColor: COLORS.linkBg }}>
                  <Ionicons name="briefcase-outline" size={14} color={BLUE} />
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: BLUE }}>{projectCounts[m.id] > 0 ? `${projectCounts[m.id]} project${projectCounts[m.id] === 1 ? '' : 's'} assigned` : 'Assign projects'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 20 }}>
              <Ionicons name="people-outline" size={48} color={COLORS.divider} />
              <Text style={{ fontSize: 15, fontWeight: '700', color: MUTED, marginTop: 12 }}>No team members found</Text>
              {fetchError ? <Text style={{ fontSize: 11, color: COLORS.error, marginTop: 8, textAlign: 'center' }}>{fetchError}</Text> : null}
            </View>
          }
        />
      )}

      {assignMember && <AssignProjectsModal member={assignMember} projects={projects} onClose={onAssignClose} />}
    </SafeAreaView>
  );
}
