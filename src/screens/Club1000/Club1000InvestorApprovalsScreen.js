import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StatusBar, ActivityIndicator, Linking, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch } from '../../utils/apiFetch';
import { CLUB1000_ENDPOINTS, SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import { isManagerRole } from '../../lib/roles';

const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary; const TEAL = '#00838F'; const PURPLE = '#7C3AED'; const AMBER = '#D97706';

function fmtMoney(n) {
  const num = Number(n || 0);
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, padding: 14, ...CARD_SHADOW };
const TABS = [['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['all', 'All']];
const APPROVAL_BADGE_COLOR = {
  pending: { bg: COLORS.warningBg, fg: COLORS.warning },
  approved: { bg: COLORS.successBg, fg: COLORS.success },
  rejected: { bg: COLORS.errorBg, fg: COLORS.error },
};

export default function Club1000InvestorApprovalsScreen({ navigation }) {
  const [tab, setTab] = useState('pending');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(null);
  const [managers, setManagers] = useState([]);
  const [schemes, setSchemes] = useState([]);
  const [cfgOpen, setCfgOpen] = useState(false);
  const [openScheme, setOpenScheme] = useState(null);
  const [search, setSearch] = useState('');
  const [searchText, setSearchText] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchText), 400);
    return () => clearTimeout(t);
  }, [searchText]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ approval_status: tab });
      if (search) params.set('search', search);
      const res = await apiFetch(`${CLUB1000_ENDPOINTS.investors}?${params.toString()}`);
      if (res.ok) { const d = await res.json(); setRows(Array.isArray(d) ? d : []); }
    } catch (_) {}
    setLoading(false); setRefreshing(false);
  }, [tab, search]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    apiFetch(SALES_ENDPOINTS.usersSlim).then((r) => (r.ok ? r.json() : []))
      .then((d) => setManagers(Array.isArray(d) ? d.filter((u) => isManagerRole(u) || u.role === 'Admin') : []))
      .catch(() => {});
    apiFetch(CLUB1000_ENDPOINTS.schemes).then((r) => (r.ok ? r.json() : []))
      .then((d) => setSchemes(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  async function act(id, action) {
    setBusy(id);
    try {
      const res = await apiFetch(CLUB1000_ENDPOINTS.investorAction(id), { method: 'POST', body: JSON.stringify({ action }) });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d?.detail || `Could not ${action} this investor.`);
      }
    } finally {
      setBusy(null);
      load();
    }
  }

  async function toggleApprover(schemeId, mgrId) {
    let next = [];
    setSchemes((ss) => ss.map((s) => {
      if (s.id !== schemeId) return s;
      const arr = s.investor_approvers || [];
      next = arr.includes(mgrId) ? arr.filter((x) => x !== mgrId) : [...arr, mgrId];
      return { ...s, investor_approvers: next };
    }));
    await apiFetch(CLUB1000_ENDPOINTS.scheme(schemeId), { method: 'PATCH', body: JSON.stringify({ investor_approvers: next }) }).catch(() => {});
  }

  async function viewLoi(id, pending) {
    try {
      const res = await apiFetch(`${CLUB1000_ENDPOINTS.investorLoiUrl(id)}${pending ? '?pending=1' : ''}`);
      const d = await res.json();
      if (res.ok && d.url) Linking.openURL(d.url);
      else alert(d?.detail || 'Could not open the LOI.');
    } catch (e) { alert(e.message); }
  }

  const FIELD_LABELS = { amount_invested: 'Amount', total_return_pct: 'Return %', interest_payout: 'Payout', security: 'Security', notes: 'Notes', investment_date: 'Renewal Date' };
  function revisionSummary(inv) {
    const pr = inv.pending_revision;
    if (!pr) return null;
    return Object.entries(pr).filter(([k]) => k !== 'payout_schedule').map(([k, v]) => `${FIELD_LABELS[k] || k}: ${v}`).join(' · ');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.screenBg }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.screenBg, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={COLORS.navy} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT }}>Investor Approvals</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
        <View style={[CARD, { marginBottom: 12 }]}>
          <TouchableOpacity onPress={() => setCfgOpen((o) => !o)}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: TEAL }}>⚙ Investor Approvers — by scheme {cfgOpen ? '▴' : '▾'}</Text>
          </TouchableOpacity>
          {cfgOpen && schemes.map((s) => {
            const exp = openScheme === s.id; const sel = s.investor_approvers || [];
            const names = managers.filter((m) => sel.includes(m.id)).map((m) => m.name).join(', ');
            return (
              <View key={s.id} style={{ borderTopWidth: 1, borderTopColor: COLORS.surfaceAlt, paddingVertical: 10 }}>
                <TouchableOpacity onPress={() => setOpenScheme(exp ? null : s.id)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT }}>{s.name}</Text>
                    <Text style={{ fontSize: 11, color: names ? MUTED : '#9CA3AF' }} numberOfLines={1}>{names || 'No approvers'}</Text>
                  </View>
                  <Ionicons name={exp ? 'chevron-up' : 'chevron-down'} size={18} color={MUTED} />
                </TouchableOpacity>
                {exp && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {managers.map((m) => {
                      const on = sel.includes(m.id);
                      return (
                        <TouchableOpacity key={m.id} onPress={() => toggleApprover(s.id, m.id)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: on ? TEAL : COLORS.border, backgroundColor: on ? TEAL : COLORS.white }}>
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

        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceAlt, borderRadius: 10, paddingHorizontal: 12, height: 40, marginBottom: 12 }}>
          <Ionicons name="search-outline" size={16} color={MUTED} />
          <TextInput value={searchText} onChangeText={setSearchText} placeholder="Search name, phone, email, investor no.…" placeholderTextColor="#666666"
            style={{ flex: 1, marginLeft: 8, fontSize: 14, color: TEXT }} returnKeyType="search" />
          {searchText ? <TouchableOpacity onPress={() => setSearchText('')}><Ionicons name="close-circle" size={16} color={MUTED} /></TouchableOpacity> : null}
        </View>

        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
          {TABS.map(([k, label]) => (
            <TouchableOpacity key={k} onPress={() => setTab(k)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: tab === k ? TEAL : COLORS.surfaceAlt }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: tab === k ? '#fff' : MUTED }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? <ActivityIndicator color={TEAL} style={{ marginTop: 30 }} /> : rows.length === 0 ? (
          <View style={[CARD, { alignItems: 'center', padding: 30 }]}><Text style={{ color: MUTED }}>{search ? 'No investors match your search.' : 'No investors here.'}</Text></View>
        ) : rows.map((inv) => {
          const ac = APPROVAL_BADGE_COLOR[inv.approval_status] || { bg: COLORS.surfaceAlt, fg: MUTED };
          const isRevision = !!inv.pending_revision;
          const isRenewal = isRevision && inv.pending_revision_type === 'renew';
          const accent = isRenewal ? AMBER : PURPLE;
          return (
            <View key={inv.id} style={[CARD, { marginBottom: 12 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT }}>{inv.name}</Text>
                    {inv.revision_no > 0 && (
                      <View style={{ paddingHorizontal: 7, paddingVertical: 1, borderRadius: 20, backgroundColor: isRenewal ? '#FEF3C7' : '#F3E8FF' }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: accent }}>{isRenewal ? 'RENEW' : `R${inv.revision_no}`}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{inv.phone || '—'} · {inv.scheme_name} · Added by {inv.added_by_name || '—'}</Text>
                  {isRevision && <Text style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>Proposed: {revisionSummary(inv)}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0D47A1' }}>{fmtMoney(inv.amount_invested)}</Text>
                  <View style={{ marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, backgroundColor: ac.bg }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: ac.fg, textTransform: 'uppercase' }}>{inv.approval_status}</Text>
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                {isRevision
                  ? (!!inv.pending_loi_document_url && <TouchableOpacity onPress={() => viewLoi(inv.id, true)} style={[btn, { backgroundColor: isRenewal ? '#FEF3C7' : '#F3E8FF' }]}><Text style={{ color: accent, fontWeight: '700', fontSize: 13 }}>📄 {isRenewal ? 'Renewed' : 'Revised'} LOI</Text></TouchableOpacity>)
                  : (!!inv.loi_document_url && <TouchableOpacity onPress={() => viewLoi(inv.id)} style={[btn, { backgroundColor: COLORS.linkBg }]}><Text style={{ color: COLORS.link, fontWeight: '700', fontSize: 13 }}>📄 Signed LOI</Text></TouchableOpacity>)}
                {inv.approval_status === 'pending' && (
                  <>
                    <TouchableOpacity onPress={() => act(inv.id, 'approve')} disabled={busy === inv.id} style={[btn, { backgroundColor: COLORS.success }]}><Text style={btnT}>✓ Approve</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => act(inv.id, 'reject')} disabled={busy === inv.id} style={[btn, { backgroundColor: COLORS.error }]}><Text style={btnT}>✕ Reject</Text></TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
const btn = { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 };
const btnT = { color: '#fff', fontWeight: '700', fontSize: 13 };
