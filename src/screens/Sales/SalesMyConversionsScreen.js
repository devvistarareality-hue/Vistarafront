import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const HISTORY_LABEL = {
  created: 'Lead Created', status: 'Overall Status', telecaller_status: 'TC Status',
  stm_status: 'STM Status', telecaller: 'Telecaller Assigned', stm: 'STM Assigned',
  warm_transfer: 'Transferred to STM', site_visit: 'Site Visit', closure: 'Closure',
};
const HISTORY_COLOR = {
  created: '#64748B', status: COLORS.link, telecaller_status: '#0097A7', stm_status: COLORS.warning,
  telecaller: COLORS.purple, stm: COLORS.success, warm_transfer: COLORS.error, site_visit: '#F9A825', closure: '#15803D',
};

const NAVY = COLORS.navy; const BLUE = COLORS.link; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, ...CARD_SHADOW };

const SV_COLOR = {
  scheduled: { bg: COLORS.warningBg, text: COLORS.warning },
  completed: { bg: COLORS.successBg, text: COLORS.success },
  no_show: { bg: COLORS.errorBg, text: COLORS.error },
  cancelled: { bg: COLORS.surfaceAlt, text: MUTED },
};

const CLOSURE_COLOR = {
  booked: { bg: COLORS.successBg, text: COLORS.success },
  cancelled: { bg: COLORS.errorBg, text: COLORS.error },
  refunded: { bg: COLORS.warningBg, text: COLORS.warning },
};

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Read-only lead detail + full history. Opens instantly with the row data we
// already have, then loads the timeline from a single lead-detail fetch — no
// navigation, no leads-list mount.
function LeadHistoryModal({ lead, onClose }) {
  const [detail, setDetail] = useState(null);
  useEffect(() => {
    if (!lead) return;
    let alive = true;
    setDetail(null);
    (async () => {
      try {
        const res = await apiFetch(SALES_ENDPOINTS.lead(lead.id));
        if (res.ok && alive) setDetail(await res.json());
      } catch (_) {}
    })();
    return () => { alive = false; };
  }, [lead?.id]);

  const d = detail || {};
  const rows = [
    ['Phone', d.phone || lead?.phone],
    ['Project', d.project_name || lead?.project_name],
    ['Source', d.source_name],
    ['Telecaller', d.telecaller_name],
    ['STM', d.stm_name],
    ['Status', (d.status || '').replace(/_/g, ' ')],
  ];
  const events = (d.history || []).filter(h => h.field_changed !== 'created');

  return (
    <Modal visible={!!lead} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%', overflow: 'hidden' }}>
          {/* Header */}
          <View style={{ backgroundColor: NAVY, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: COLORS.white }}>{lead?.name || '—'}</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{d.phone || lead?.phone || ''}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            {/* Quick detail */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {rows.map(([k, v]) => (
                <View key={k} style={{ width: '50%', marginBottom: 12 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase', letterSpacing: 0.4 }}>{k}</Text>
                  <Text style={{ fontSize: 13, color: TEXT, marginTop: 2, textTransform: k === 'Status' ? 'capitalize' : 'none' }}>{v || '—'}</Text>
                </View>
              ))}
            </View>

            <Text style={{ fontSize: 12, fontWeight: '800', color: NAVY, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4, marginBottom: 14 }}>History</Text>

            {/* Lead received */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.link + '18', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16 }}>📥</Text>
                </View>
                <View style={{ width: 2, flex: 1, backgroundColor: COLORS.surfaceAlt, marginTop: 4 }} />
              </View>
              <View style={{ flex: 1, paddingBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT }}>Lead Received</Text>
                <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Source: {d.source_name || '—'} · Project: {d.project_name || lead?.project_name || '—'}</Text>
                <Text style={{ fontSize: 11, color: COLORS.textTertiary, marginTop: 2 }}>{fmtDateTime(d.created_at)}</Text>
              </View>
            </View>

            {!detail && <ActivityIndicator size="small" color={MUTED} style={{ marginTop: 8 }} />}
            {detail && events.length === 0 && (
              <Text style={{ fontSize: 13, color: COLORS.textTertiary, textAlign: 'center', marginTop: 8 }}>No changes recorded yet.</Text>
            )}
            {events.map((h, idx, arr) => {
              const isLast = idx === arr.length - 1;
              const color  = HISTORY_COLOR[h.field_changed] || MUTED;
              const icon   = h.field_changed === 'warm_transfer' ? '🔥'
                           : h.field_changed === 'telecaller'    ? '👤'
                           : h.field_changed === 'stm'           ? '🏢'
                           : h.field_changed === 'site_visit'    ? '🏠'
                           : h.field_changed === 'closure'       ? '✅'
                           : h.field_changed.includes('status')  ? '🔄' : '✏️';
              const singleValue = ['created', 'warm_transfer', 'closure'].includes(h.field_changed) || !h.old_value;
              const byLabel = h.changed_by_name || (['created', 'telecaller', 'stm'].includes(h.field_changed) ? 'System (auto)' : null);
              return (
                <View key={h.id} style={{ flexDirection: 'row', gap: 12, marginBottom: isLast ? 0 : 16 }}>
                  <View style={{ alignItems: 'center' }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 16 }}>{icon}</Text>
                    </View>
                    {!isLast && <View style={{ width: 2, flex: 1, backgroundColor: COLORS.surfaceAlt, marginTop: 4 }} />}
                  </View>
                  <View style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: TEXT }}>{HISTORY_LABEL[h.field_changed] || h.field_changed}</Text>
                    <Text style={{ fontSize: 12, color: TEXT, marginTop: 2 }}>
                      {singleValue ? (
                        <Text style={{ color, fontWeight: '700' }}>{h.new_value || '—'}</Text>
                      ) : (
                        <>
                          <Text style={{ color: MUTED }}>{h.old_value || '—'}</Text>
                          <Text> → </Text>
                          <Text style={{ color, fontWeight: '700' }}>{h.new_value || '—'}</Text>
                        </>
                      )}
                    </Text>
                    {!!byLabel && <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>by {byLabel}</Text>}
                    <Text style={{ fontSize: 11, color: COLORS.textTertiary, marginTop: 2 }}>{fmtDateTime(h.created_at)}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function StatusBadge({ status, colors }) {
  const c = colors[status] || { bg: COLORS.surfaceAlt, text: MUTED };
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: c.bg }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: c.text }}>{(status || '').replace(/_/g, ' ').toUpperCase()}</Text>
    </View>
  );
}

function StatCard({ label, value, color, bg }) {
  return (
    <View style={[CARD, { flex: 1, padding: 14, alignItems: 'center', backgroundColor: bg }]}>
      <Text style={{ fontSize: 24, fontWeight: '800', color }}>{value ?? '—'}</Text>
      <Text style={{ fontSize: 10, color, marginTop: 3, textAlign: 'center', fontWeight: '600', opacity: 0.8 }}>{label}</Text>
    </View>
  );
}

export default function SalesMyConversionsScreen({ navigation, route }) {
  const user = useSelector((s) => s.auth.user);
  const des = (user?.designation || '').toLowerCase();
  const isStm = des.includes('stm') || des.includes('sales team') || des.includes('sales executive');
  // Only an approver (admin/manager) may cancel a booking.
  const isApprover = !!user && (user.role === 'Admin' || user.role === 'Manager' || user.is_staff);
  const [tab, setTab] = useState(route?.params?.initialTab === 'closures' ? 'closures' : 'sv');
  const [visits, setVisits] = useState([]);
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openLead, setOpenLead] = useState(null); // { id, name, phone } | null

  const showHistory = (leadId, name, phone) => {
    if (leadId) setOpenLead({ id: leadId, name, phone });
  };

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const [svRes, clRes] = await Promise.all([
        apiFetch(SALES_ENDPOINTS.siteVisits),
        apiFetch(SALES_ENDPOINTS.closures),
      ]);
      if (svRes.ok) setVisits(await svRes.json());
      if (clRes.ok) setClosures(await clRes.json());
    } catch (e) {}
    setLoading(false); setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const cancelClosure = useCallback((id) => {
    Alert.alert('Cancel Closure', 'This frees the unit and permanently deletes its signed LOI from storage. This cannot be undone.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Closure', style: 'destructive', onPress: async () => {
        try {
          const r = await apiFetch(SALES_ENDPOINTS.closureCancel(id), { method: 'POST' });
          if (r.ok) load(); else Alert.alert('Failed', ((await r.json().catch(() => ({}))).detail) || 'Could not cancel.');
        } catch (e) { Alert.alert('Error', e.message); }
      } },
    ]);
  }, [load]);

  const svCompleted = visits.filter(v => v.status === 'completed');
  const svScheduled = visits.filter(v => v.status === 'scheduled');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>My Conversions</Text>
          <Text style={{ fontSize: 13, color: MUTED }}>{isStm ? 'Track all your SV & closures' : 'Track SV & closures from your leads'}</Text>
        </View>
        <TouchableOpacity onPress={() => load(true)} disabled={refreshing} style={{ padding: 6, backgroundColor: BG, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
          <Ionicons name="refresh-outline" size={20} color={NAVY} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={NAVY} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}>

          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 16, marginBottom: 12 }}>
            <StatCard label="Site Visits Done" value={svCompleted.length} color={COLORS.success} bg={COLORS.successBg} />
            <StatCard label="Closures" value={closures.length} color={COLORS.link} bg={COLORS.linkBg} />
            <StatCard label="Upcoming Visits" value={svScheduled.length} color={COLORS.warning} bg={COLORS.warningBg} />
          </View>

          {/* Tabs */}
          <View style={{ flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, borderBottomWidth: 2, borderBottomColor: COLORS.surfaceAlt }}>
            {[
              { key: 'sv', label: 'Site Visits' },
              { key: 'closures', label: 'Closures' },
            ].map(t => (
              <TouchableOpacity key={t.key} onPress={() => setTab(t.key)}
                style={{ paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: tab === t.key ? COLORS.warning : 'transparent', marginBottom: -2 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: tab === t.key ? COLORS.warning : MUTED }}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          {tab === 'sv' ? (
            visits.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Ionicons name="location-outline" size={40} color={MUTED} />
                <Text style={{ fontSize: 14, color: MUTED, marginTop: 12, textAlign: 'center' }}>{isStm ? 'No site visits recorded yet.' : 'No site visits from your referred leads yet.'}</Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 16 }}>
                {visits.map(v => (
                  <TouchableOpacity key={v.id} activeOpacity={0.7}
                    onPress={() => showHistory(v.lead, v.lead_name, v.lead_phone)}
                    style={[CARD, { padding: 14, marginBottom: 10 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>{v.lead_name || '—'}</Text>
                        <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{v.lead_phone || '—'}</Text>
                      </View>
                      <StatusBadge status={v.status} colors={SV_COLOR} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase' }}>Project</Text>
                        <Text style={{ fontSize: 13, color: TEXT, marginTop: 2 }}>{v.project_name || '—'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase' }}>Visit Date</Text>
                        <Text style={{ fontSize: 13, color: TEXT, marginTop: 2 }}>{fmtDate(v.visited_at || v.scheduled_at)}</Text>
                      </View>
                    </View>
                    {(isStm ? v.referred_by_telecaller_name : v.stm_name) ? (
                      <View style={{ marginTop: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase' }}>{isStm ? 'Telecaller' : 'STM'}</Text>
                        <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{isStm ? v.referred_by_telecaller_name : v.stm_name}</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            )
          ) : (
            closures.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Ionicons name="checkmark-circle-outline" size={40} color={MUTED} />
                <Text style={{ fontSize: 14, color: MUTED, marginTop: 12, textAlign: 'center' }}>{isStm ? 'No closures recorded yet.' : 'No closures from your referred leads yet.'}</Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 16 }}>
                {closures.map(c => (
                  <TouchableOpacity key={c.id} activeOpacity={0.7}
                    onPress={() => showHistory(c.lead, c.lead_name, c.lead_phone)}
                    style={[CARD, { padding: 14, marginBottom: 10 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>{c.lead_name || '—'}</Text>
                      </View>
                      <StatusBadge status={c.status} colors={CLOSURE_COLOR} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 16, marginBottom: 6 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase' }}>Project</Text>
                        <Text style={{ fontSize: 13, color: TEXT, marginTop: 2 }}>{c.project_name || '—'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase' }}>Date</Text>
                        <Text style={{ fontSize: 13, color: TEXT, marginTop: 2 }}>{fmtDate(c.closure_date)}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 16, marginBottom: 6 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase' }}>Unit</Text>
                        <Text style={{ fontSize: 13, color: TEXT, marginTop: 2 }}>{(c.unit_type || '') + ' ' + (c.unit_no || '')}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase' }}>Amount</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.success, marginTop: 2 }}>
                          {c.total_amount ? '₹' + Number(c.total_amount).toLocaleString('en-IN') : '—'}
                        </Text>
                      </View>
                    </View>
                    {isApprover && (
                      <TouchableOpacity onPress={() => cancelClosure(c.id)} style={{ alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: COLORS.error, backgroundColor: COLORS.errorBg }}>
                        <Text style={{ color: COLORS.error, fontWeight: '700', fontSize: 12 }}>Cancel Closure</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )
          )}
        </ScrollView>
      )}

      <LeadHistoryModal lead={openLead} onClose={() => setOpenLead(null)} />
    </SafeAreaView>
  );
}
