import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, RefreshControl, Modal, TextInput, Switch, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSelector } from 'react-redux';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const NAVY = COLORS.navy; const BLUE = COLORS.link; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, ...CARD_SHADOW };

const STATUS_COLOR = { pending: COLORS.warning, completed: COLORS.success, missed: COLORS.error, rescheduled: COLORS.info };

// Lead-status options a follow-up can set when completed, by the follow-up's role.
// Telecaller updates TC Status; STM updates STM Status. Marking a TC lead "warm"
// auto-transfers it into the STM pipeline (backend handles the transfer).
const TC_STATUS_OPTS  = [['warm', 'Warm'], ['cold', 'Cold'], ['not_interested', 'Not Interested'], ['not_reachable', 'Not Reachable'], ['callback', 'Callback']];
const STM_STATUS_OPTS = [['hot', 'Hot'], ['warm', 'Warm'], ['cold', 'Cold'], ['not_interested', 'Not Interested'], ['sv_scheduled', 'SV Scheduled'], ['sv_done', 'SV Done'], ['closed', 'Closed']];

const TABS = [
  { key: 'today',   label: "Today's" },
  { key: 'overdue', label: 'Overdue' },
  { key: 'pending', label: 'All Pending' },
  { key: 'all',     label: 'All' },
];

function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    + ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const endOfToday   = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; };

export default function SalesFollowUpsScreen({ navigation, route }) {
  const user      = useSelector((s) => s.auth.user);
  const companyId = useSelector((s) => s.adminFilter?.companyId);
  // Pushed from the Admin section (see SalesCRMScreen) — request full company data.
  const adminView = !!route?.params?.adminView;

  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState('today');
  const [dateFrom,   setDateFrom]   = useState(null);   // Date | null
  const [dateTo,     setDateTo]     = useState(null);   // Date | null
  const [showFrom,   setShowFrom]   = useState(false);
  const [showTo,     setShowTo]     = useState(false);
  // Completion modal: remarks + optional next follow-up.
  const [done,       setDone]       = useState(null);
  const [outcome,    setOutcome]    = useState('');
  const [schedNext,  setSchedNext]  = useState(false);
  const [nextAt,     setNextAt]     = useState(null);   // Date | null
  const [showDate,   setShowDate]   = useState(false);
  const [showTime,   setShowTime]   = useState(false);
  const [nextRemarks, setNextRemarks] = useState('');
  const [newStatus,  setNewStatus]  = useState('');    // optional lead status to set on completion
  const [submitting, setSubmitting] = useState(false);
  const defaultNext = () => { const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); return d; };

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const params = [];
      if (companyId) params.push(`company_id=${companyId}`);
      if (adminView) params.push('admin_view=1');
      const url = params.length ? `${SALES_ENDPOINTS.followUps}?${params.join('&')}` : SALES_ENDPOINTS.followUps;
      const res = await apiFetch(url);
      if (res.ok) setItems(await res.json());
    } catch (e) {}
    setLoading(false);
    setRefreshing(false);
  }, [companyId, adminView]);

  useFocusEffect(useCallback(() => { load(); }, [load, companyId]));

  function openDone(fu) {
    // Pre-select the lead's current TC/STM status so the caller sees where it stands.
    const cur = (fu.role_context === 'stm' ? fu.lead_stm_status : fu.lead_telecaller_status) || '';
    setDone(fu); setOutcome(''); setSchedNext(false); setNextAt(null); setNextRemarks(''); setNewStatus(cur);
  }

  async function completeFollowUp() {
    if (!done) return;
    if (schedNext && !(nextAt instanceof Date)) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(SALES_ENDPOINTS.followUp(done.id), {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed', completed_at: new Date().toISOString(), outcome: outcome.trim() }),
      });
      if (res.ok) { const updated = await res.json(); setItems((list) => list.map((f) => (f.id === done.id ? updated : f))); }
      // Update the lead's status (TC or STM, per the follow-up's role) — only if changed.
      const origStatus = (done.role_context === 'stm' ? done.lead_stm_status : done.lead_telecaller_status) || '';
      if (newStatus && newStatus !== origStatus && done.lead) {
        const field = done.role_context === 'stm' ? 'stm_status' : 'telecaller_status';
        await apiFetch(SALES_ENDPOINTS.lead(done.lead), {
          method: 'PATCH', body: JSON.stringify({ [field]: newStatus }),
        });
      }
      if (schedNext && nextAt instanceof Date) {
        const r2 = await apiFetch(SALES_ENDPOINTS.followUps, {
          method: 'POST',
          body: JSON.stringify({
            lead: done.lead, assigned_to: done.assigned_to, role_context: done.role_context,
            scheduled_at: nextAt.toISOString(), remarks: nextRemarks.trim(), status: 'pending',
          }),
        });
        if (r2.ok) { const created = await r2.json(); setItems((list) => [...list, created]); }
      }
      setDone(null);
      load();
    } catch (e) {}
    setSubmitting(false);
  }

  const now = new Date();
  // Date-range filter on the scheduled date (applies before the tab filter).
  const inDateRange = (fu) => {
    if (!dateFrom && !dateTo) return true;
    const d = new Date(fu.scheduled_at);
    if (dateFrom) { const s = new Date(dateFrom); s.setHours(0, 0, 0, 0); if (d < s) return false; }
    if (dateTo)   { const e = new Date(dateTo);   e.setHours(23, 59, 59, 999); if (d > e) return false; }
    return true;
  };
  const dateItems = items.filter(inDateRange);

  // Status-wise counts for the selected date range (independent of the tab).
  const counts = {
    total:     dateItems.length,
    pending:   dateItems.filter((f) => f.status === 'pending').length,
    completed: dateItems.filter((f) => f.status === 'completed').length,
    overdue:   dateItems.filter((f) => f.status === 'pending' && new Date(f.scheduled_at) < now).length,
  };

  const visible = dateItems.filter((fu) => {
    const at = new Date(fu.scheduled_at);
    if (filter === 'all')     return true;
    if (filter === 'pending') return fu.status === 'pending';
    if (filter === 'today')   return fu.status === 'pending' && at >= startOfToday() && at <= endOfToday();
    if (filter === 'overdue') return fu.status === 'pending' && at < now;
    return true;
  });
  const fmtD = (d) => d instanceof Date ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        {navigation.canGoBack() && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={20} color={NAVY} />
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>Follow-Ups</Text>
          <Text style={{ fontSize: 13, color: MUTED }}>{visible.length} item{visible.length === 1 ? '' : 's'} · {user?.name || ''}</Text>
        </View>
        <TouchableOpacity onPress={() => load(true)} disabled={refreshing} style={{ padding: 6, backgroundColor: BG, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8 }}>
          <Ionicons name="refresh-outline" size={20} color={NAVY} />
        </TouchableOpacity>
      </View>

      {/* Date range filter + status-wise counts */}
      <View style={{ backgroundColor: COLORS.white, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 }}>Date</Text>
          <TouchableOpacity onPress={() => setShowFrom(true)} style={{ flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 }}>
            <Text style={{ fontSize: 12.5, color: dateFrom ? TEXT : MUTED }}>{fmtD(dateFrom) || 'From'}</Text>
          </TouchableOpacity>
          <Text style={{ color: COLORS.textTertiary }}>→</Text>
          <TouchableOpacity onPress={() => setShowTo(true)} style={{ flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 }}>
            <Text style={{ fontSize: 12.5, color: dateTo ? TEXT : MUTED }}>{fmtD(dateTo) || 'To'}</Text>
          </TouchableOpacity>
          {(dateFrom || dateTo) && (
            <TouchableOpacity onPress={() => { setDateFrom(null); setDateTo(null); }} style={{ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 9, borderWidth: 1.5, borderColor: COLORS.border }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED }}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
          {[
            { label: 'Total',     n: counts.total,     c: BLUE,          bg: COLORS.linkBg },
            { label: 'Pending',   n: counts.pending,   c: COLORS.warning, bg: COLORS.warningBg },
            { label: 'Overdue',   n: counts.overdue,   c: COLORS.error,   bg: COLORS.errorBg },
            { label: 'Completed', n: counts.completed, c: COLORS.success, bg: COLORS.successBg },
          ].map((s) => (
            <View key={s.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, backgroundColor: s.bg }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: s.c }}>{s.n}</Text>
              <Text style={{ fontSize: 10.5, fontWeight: '700', color: s.c, textTransform: 'uppercase', letterSpacing: 0.3 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>
      {showFrom && (
        <DateTimePicker value={dateFrom instanceof Date ? dateFrom : new Date()} mode="date" display="default"
          onChange={(e, d) => { setShowFrom(false); if (e.type === 'dismissed') return; if (d) setDateFrom(d); }} />
      )}
      {showTo && (
        <DateTimePicker value={dateTo instanceof Date ? dateTo : new Date()} mode="date" display="default"
          onChange={(e, d) => { setShowTo(false); if (e.type === 'dismissed') return; if (d) setDateTo(d); }} />
      )}

      {/* Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        {TABS.map((t) => {
          const active = filter === t.key;
          return (
            <TouchableOpacity key={t.key} onPress={() => setFilter(t.key)}
              style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: active ? BLUE : 'transparent' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: active ? BLUE : MUTED }}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={NAVY} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 36 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}>
          {visible.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 48 }}>
              <Ionicons name="calendar-outline" size={40} color={COLORS.border} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: MUTED, marginTop: 12 }}>No follow-ups</Text>
              <Text style={{ fontSize: 13, color: COLORS.textTertiary || MUTED, marginTop: 4 }}>Schedule follow-ups from lead details</Text>
            </View>
          ) : visible.map((fu) => {
            const overdue = fu.status === 'pending' && new Date(fu.scheduled_at) < now;
            return (
              <View key={fu.id} style={[CARD, { padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: overdue ? COLORS.errorBg : COLORS.border, backgroundColor: overdue ? COLORS.errorBg : COLORS.cardBg }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>{fu.lead_name || 'Lead'}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase', color: fu.role_context === 'stm' ? COLORS.error : COLORS.info }}>{fu.role_context}</Text>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: (STATUS_COLOR[fu.status] || MUTED) + '22' }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: STATUS_COLOR[fu.status] || MUTED }}>{fu.status}</Text>
                      </View>
                    </View>
                    {!!fu.lead_phone && <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{fu.lead_phone}</Text>}
                    <Text style={{ fontSize: 13, fontWeight: '600', color: overdue ? COLORS.error : MUTED, marginTop: 6 }}>{fmtDateTime(fu.scheduled_at)}</Text>
                    {!!fu.assigned_to_name && <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Assigned to: {fu.assigned_to_name}</Text>}
                    {!!fu.remarks && <Text style={{ fontSize: 12, color: COLORS.textPrimary, marginTop: 6, fontStyle: 'italic' }}>“{fu.remarks}”</Text>}
                    {!!fu.outcome && <Text style={{ fontSize: 12, color: COLORS.success, marginTop: 6 }}><Text style={{ fontWeight: '700' }}>Remarks: </Text>{fu.outcome}</Text>}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 8 }}>
                    {fu.status === 'pending' && (
                      <TouchableOpacity onPress={() => openDone(fu)}
                        style={{ borderWidth: 1.5, borderColor: COLORS.success, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.success }}>Mark Done</Text>
                      </TouchableOpacity>
                    )}
                    {!!fu.lead_phone && (
                      <TouchableOpacity
                        onPress={() => Linking.openURL(`tel:${fu.lead_phone}`)}
                        style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: COLORS.successBg, justifyContent: 'center', alignItems: 'center' }}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons name="call" size={13} color={COLORS.success} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Complete follow-up: remarks + optional next follow-up */}
      <Modal visible={!!done} transparent animationType="slide" onRequestClose={() => !submitting && setDone(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(10,18,30,0.45)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT }}>Complete follow-up</Text>
            {!!done && <Text style={{ fontSize: 12, color: MUTED, marginTop: 2, marginBottom: 14 }}>{done.lead_name} · {fmtDateTime(done.scheduled_at)}</Text>}

            {/* Update the lead's status after this call (TC or STM, per the follow-up's role). */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: MUTED, marginBottom: 6 }}>
              {done?.role_context === 'stm' ? 'Update STM Status' : 'Update TC Status'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
              {(done?.role_context === 'stm' ? STM_STATUS_OPTS : TC_STATUS_OPTS).map(([v, l]) => {
                const sel = newStatus === v;
                return (
                  <TouchableOpacity key={v} onPress={() => setNewStatus(sel ? '' : v)}
                    style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5,
                      borderColor: sel ? BLUE : COLORS.border, backgroundColor: sel ? BLUE : COLORS.white }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: sel ? '#fff' : MUTED }}>{l}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {newStatus === 'warm' && done?.role_context !== 'stm' && (done?.lead_telecaller_status || '') !== 'warm' && (
              <Text style={{ fontSize: 11, color: COLORS.warning, marginBottom: 6 }}>Marking warm will transfer this lead to the STM pipeline.</Text>
            )}

            <Text style={{ fontSize: 12, fontWeight: '700', color: MUTED, marginBottom: 6, marginTop: 14 }}>Remarks</Text>
            <TextInput value={outcome} onChangeText={setOutcome} multiline placeholder="Outcome of this follow-up…" placeholderTextColor="#AEB6C7"
              style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, padding: 10, fontSize: 13, minHeight: 64, textAlignVertical: 'top', color: TEXT }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: TEXT }}>Schedule next follow-up</Text>
              <Switch value={schedNext} onValueChange={(v) => { setSchedNext(v); if (v && !nextAt) setNextAt(defaultNext()); }} trackColor={{ false: COLORS.border, true: BLUE }} />
            </View>

            {schedNext && (
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity onPress={() => setShowDate(true)} style={{ flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: BLUE, fontWeight: '600' }}>{nextAt instanceof Date ? nextAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pick Date'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowTime(true)} style={{ flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: BLUE, fontWeight: '600' }}>{nextAt instanceof Date ? nextAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Pick Time'}</Text>
                  </TouchableOpacity>
                </View>
                <TextInput value={nextRemarks} onChangeText={setNextRemarks} multiline placeholder="What to discuss next…" placeholderTextColor="#AEB6C7"
                  style={{ borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, padding: 10, fontSize: 13, minHeight: 48, textAlignVertical: 'top', marginTop: 10, color: TEXT }} />
                {showDate && (
                  <DateTimePicker value={nextAt instanceof Date ? nextAt : defaultNext()} mode="date" display="default"
                    onChange={(e, d) => { setShowDate(false); if (e.type === 'dismissed') return; if (d) { const cur = nextAt instanceof Date ? nextAt : defaultNext(); const m = new Date(d); m.setHours(cur.getHours(), cur.getMinutes(), 0, 0); setNextAt(m); if (Platform.OS === 'android') setShowTime(true); } }} />
                )}
                {showTime && (
                  <DateTimePicker value={nextAt instanceof Date ? nextAt : defaultNext()} mode="time" display="default" is24Hour={false}
                    onChange={(e, d) => { setShowTime(false); if (e.type === 'dismissed') return; if (d) { const cur = nextAt instanceof Date ? nextAt : defaultNext(); const m = new Date(cur); m.setHours(d.getHours(), d.getMinutes(), 0, 0); setNextAt(m); } }} />
                )}
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity onPress={() => setDone(null)} disabled={submitting} style={{ flex: 1, backgroundColor: COLORS.screenBg, borderRadius: 10, padding: 13, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: MUTED }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={completeFollowUp} disabled={submitting || (schedNext && !(nextAt instanceof Date))}
                style={{ flex: 1, backgroundColor: COLORS.success, borderRadius: 10, padding: 13, alignItems: 'center', opacity: (submitting || (schedNext && !(nextAt instanceof Date))) ? 0.6 : 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>{submitting ? 'Saving…' : 'Mark Done'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
