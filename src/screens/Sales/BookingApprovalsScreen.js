import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Linking, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { openLoi } from '../../utils/openLoi';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary; const BLUE = COLORS.link;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 14, ...CARD_SHADOW };
const TABS = [['pending', 'Pending'], ['sold', 'Approved'], ['rejected', 'Rejected'], ['', 'All']];
const rupee = (n) => '₹ ' + Math.round(Number(n) || 0).toLocaleString('en-IN');

export default function BookingApprovalsScreen({ navigation }) {
  const me = useSelector((s) => s.auth.user);
  const companyId = useSelector((s) => s.adminFilter?.companyId);
  const cq = (sep) => (companyId ? `${sep}company_id=${companyId}` : '');
  const isApprover = me?.role === 'Admin' || me?.role === 'Manager' || me?.is_staff;
  const isAdmin = me?.role === 'Admin' || me?.is_staff || (me?.admin_modules || []).includes('Sales');
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(null);
  const [managers, setManagers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [openProj, setOpenProj] = useState(null);

  const load = useCallback(async () => {
    try {
      const q = '?' + [tab ? `status=${tab}` : '', companyId ? `company_id=${companyId}` : ''].filter(Boolean).join('&');
      const res = await apiFetch(SALES_ENDPOINTS.bookings + q);
      if (res.ok) { const d = await res.json(); setRows(Array.isArray(d) ? d : []); }
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }, [tab, companyId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (!isAdmin) return;
    apiFetch(SALES_ENDPOINTS.distSettings + cq('?')).then(r => r.json()).then((d) => setManagers(d.managers || [])).catch(() => {});
    apiFetch(SALES_ENDPOINTS.projects + cq('?')).then(r => r.json()).then((d) => setProjects(Array.isArray(d) ? d : [])).catch(() => {});
  }, [isAdmin, companyId]);

  async function act(id, action) { setBusy(id); await apiFetch(`${SALES_ENDPOINTS.bookings}${id}/action/${cq('?')}`, { method: 'POST', body: JSON.stringify({ action }) }).catch(() => {}); setBusy(null); load(); }

  async function toggleApprover(projId, mgrId) {
    let next = [];
    setProjects((ps) => ps.map((p) => {
      if (p.id !== projId) return p;
      const arr = p.booking_approvers || [];
      next = arr.includes(mgrId) ? arr.filter((x) => x !== mgrId) : [...arr, mgrId];
      return { ...p, booking_approvers: next };
    }));
    await apiFetch(SALES_ENDPOINTS.project(projId) + cq('?'), { method: 'PATCH', body: JSON.stringify({ booking_approvers: next }) }).catch(() => {});
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.screenBg }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT }}>Bookings & Approvals</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        {isAdmin && (
          <View style={[CARD, { marginBottom: 12 }]}>
            <TouchableOpacity onPress={() => setCfgOpen((o) => !o)}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: BLUE }}>⚙ Booking Approvers — by project {cfgOpen ? '▴' : '▾'}</Text>
            </TouchableOpacity>
            {cfgOpen && projects.map((p) => {
              const exp = openProj === p.id; const sel = p.booking_approvers || [];
              const names = managers.filter((m) => sel.includes(m.id)).map((m) => m.name).join(', ');
              return (
                <View key={p.id} style={{ borderTopWidth: 1, borderTopColor: COLORS.surfaceAlt, paddingVertical: 10 }}>
                  <TouchableOpacity onPress={() => setOpenProj(exp ? null : p.id)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT }}>{p.name}</Text>
                      <Text style={{ fontSize: 11, color: names ? MUTED : '#9CA3AF' }} numberOfLines={1}>{names || 'No approvers'}</Text>
                    </View>
                    <Ionicons name={exp ? 'chevron-up' : 'chevron-down'} size={18} color={MUTED} />
                  </TouchableOpacity>
                  {exp && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                      {managers.map((m) => {
                        const on = sel.includes(m.id);
                        return (
                          <TouchableOpacity key={m.id} onPress={() => toggleApprover(p.id, m.id)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: on ? BLUE : COLORS.border, backgroundColor: on ? BLUE : COLORS.white }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: on ? '#fff' : MUTED }}>{on ? '✓ ' : ''}{m.name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
          {TABS.map(([k, label]) => (
            <TouchableOpacity key={k} onPress={() => setTab(k)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: tab === k ? BLUE : COLORS.surfaceAlt }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: tab === k ? '#fff' : MUTED }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? <ActivityIndicator color={BLUE} style={{ marginTop: 30 }} /> : rows.length === 0 ? (
          <View style={[CARD, { alignItems: 'center', padding: 30 }]}><Text style={{ color: MUTED }}>No bookings here.</Text></View>
        ) : rows.map((b) => (
          <View key={b.id} style={[CARD, { marginBottom: 12 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT }}>{b.client_name || '—'}{b.revision_no > 0 ? `  R${b.revision_no}` : ''}</Text>
                <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{b.phone} · {b.project_name} · Unit {b.plot_numbers || b.plot_number || b.area}</Text>
                <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 3 }}>STM: {b.stm_name || '—'} · {b.booking_date || '—'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: '#0D47A1' }}>{rupee(b.final_amount)}</Text>
                <Text style={{ fontSize: 10, fontWeight: '800', color: MUTED, marginTop: 4 }}>{(b.approval_status || b.status || '').toUpperCase()}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {b.loi_document && <TouchableOpacity onPress={() => openLoi(b.id)} style={[btn, { backgroundColor: COLORS.linkBg }]}><Text style={{ color: BLUE, fontWeight: '700', fontSize: 13 }}>📄 LOI</Text></TouchableOpacity>}
              {b.status === 'pending' && isApprover && (
                <>
                  <TouchableOpacity onPress={() => act(b.id, 'approve')} disabled={busy === b.id} style={[btn, { backgroundColor: COLORS.success }]}><Text style={btnT}>✓ Approve</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => act(b.id, 'reject')} disabled={busy === b.id} style={[btn, { backgroundColor: COLORS.error }]}><Text style={btnT}>✕ Reject</Text></TouchableOpacity>
                </>
              )}
              {b.status === 'sold' && (() => {
                const isEoi = String(b.plot_numbers || '').toUpperCase().startsWith('EOI');
                return (
                  <>
                    {isEoi && <TouchableOpacity onPress={() => navigation.navigate('ClosureViewer', { projectId: b.project, convertEoi: b.id })} style={[btn, { backgroundColor: '#E4571A' }]}><Text style={btnT}>→ Convert to LOI</Text></TouchableOpacity>}
                    <TouchableOpacity onPress={() => navigation.navigate('BookingForm', isEoi ? { revise: b.id, eoi: '1' } : { revise: b.id })} style={[btn, { backgroundColor: COLORS.purple }]}><Text style={btnT}>↻ {isEoi ? 'Revise EOI' : 'Revise'}</Text></TouchableOpacity>
                  </>
                );
              })()}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
const btn = { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 };
const btnT = { color: '#fff', fontWeight: '700', fontSize: 13 };
