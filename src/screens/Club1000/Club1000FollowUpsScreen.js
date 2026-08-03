import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StatusBar, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiFetch } from '../../utils/apiFetch';
import { CLUB1000_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import FormSheet from '../../components/FormSheet';
import { TextField, inputStyle } from '../../components/Field';

const NAVY = COLORS.navy; const TEAL = '#00838F'; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, ...CARD_SHADOW };

const STATUS_COLOR = { pending: COLORS.warning, completed: COLORS.success, missed: COLORS.error, rescheduled: COLORS.info };
const STATUS_OPTIONS = ['new', 'contacted', 'interested', 'not_interested', 'converted', 'lost'];
// A lead in one of these has nothing left to follow up on — matches the backend's
// terminal-status handling in LeadDetailView.patch (clears next_follow_up_date).
const TERMINAL_STATUSES = ['not_interested', 'lost', 'converted'];

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

/* ── Complete follow-up sheet: lead status + remarks + optional next follow-up ── */
function CompleteFollowUpSheet({ followUp, onClose, onDone }) {
  const [leadStatus, setLeadStatus] = useState('new');
  const [statusOpen, setStatusOpen] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [schedNext, setSchedNext] = useState(false);
  const [nextAt, setNextAt] = useState(() => { const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1); return d; });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (followUp) {
      setLeadStatus(followUp.lead_status || 'new');
      setOutcome('');
      setSchedNext(false);
    }
  }, [followUp]);

  if (!followUp) return null;
  const isTerminal = TERMINAL_STATUSES.includes(leadStatus);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await apiFetch(CLUB1000_ENDPOINTS.followUp(followUp.id), {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed', completed_at: new Date().toISOString(), outcome: outcome.trim() }),
      });
      const updated = res.ok ? await res.json() : null;
      await apiFetch(CLUB1000_ENDPOINTS.lead(followUp.lead), {
        method: 'PATCH',
        body: JSON.stringify({ status: leadStatus }),
      });
      if (schedNext && !isTerminal) {
        await apiFetch(CLUB1000_ENDPOINTS.followUps, {
          method: 'POST',
          body: JSON.stringify({ lead: followUp.lead, scheduled_at: nextAt.toISOString() }),
        });
      }
      onDone(updated);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormSheet visible={!!followUp} onClose={onClose}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT }}>Complete Follow-up</Text>
          <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{followUp.lead_name} · {fmtDateTime(followUp.scheduled_at)}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={18} color={TEXT} />
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6 }}>Lead Status</Text>
        <TouchableOpacity onPress={() => setStatusOpen((v) => !v)} style={[inputStyle, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: statusOpen ? 0 : 16 }]}>
          <Text style={{ fontSize: 15, color: TEXT, textTransform: 'capitalize' }}>{leadStatus.replace(/_/g, ' ')}</Text>
          <Ionicons name={statusOpen ? 'chevron-up' : 'chevron-down'} size={16} color={MUTED} />
        </TouchableOpacity>
        {statusOpen && (
          <View style={{ borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, marginTop: 6, marginBottom: 16, overflow: 'hidden' }}>
            {STATUS_OPTIONS.map((s, i) => (
              <TouchableOpacity key={s} onPress={() => { setLeadStatus(s); setStatusOpen(false); }}
                style={{ padding: 12, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: COLORS.surfaceAlt }}>
                <Text style={{ fontSize: 14, color: TEXT, textTransform: 'capitalize' }}>{s.replace(/_/g, ' ')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TextField label="Remarks" value={outcome} onChangeText={setOutcome} placeholder="Outcome of this follow-up…" multiline />

        {!isTerminal && (
          <View style={{ marginTop: 4 }}>
            <TouchableOpacity onPress={() => setSchedNext((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: schedNext ? 12 : 0 }}>
              <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: schedNext ? TEAL : COLORS.border, backgroundColor: schedNext ? TEAL : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                {schedNext && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={{ fontSize: 13, fontWeight: '600', color: TEXT }}>Schedule next follow-up</Text>
            </TouchableOpacity>
            {schedNext && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: MUTED, marginBottom: 6 }}>Next follow-up date &amp; time</Text>
                {/* mode="datetime" isn't actually supported by the Android native
                    picker (only "date"/"time" are) — it throws exactly this kind
                    of crash. Two separate pickers, chained on Android after the
                    date is picked, is the standard cross-platform workaround
                    (mirrors Sales' equivalent follow-up scheduler). */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[inputStyle, { flex: 1 }]}>
                    <Text style={{ fontSize: 14, color: TEXT }}>{nextAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[inputStyle, { flex: 1 }]}>
                    <Text style={{ fontSize: 14, color: TEXT }}>{nextAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</Text>
                  </TouchableOpacity>
                </View>
                {showDatePicker && (
                  <DateTimePicker value={nextAt} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={(e, d) => {
                      setShowDatePicker(false);
                      if (e.type === 'dismissed' || !d) return;
                      const merged = new Date(nextAt); merged.setFullYear(d.getFullYear(), d.getMonth(), d.getDate());
                      setNextAt(merged);
                      if (Platform.OS === 'android') setShowTimePicker(true);
                    }} />
                )}
                {showTimePicker && (
                  <DateTimePicker value={nextAt} mode="time" display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={(e, d) => {
                      setShowTimePicker(false);
                      if (e.type === 'dismissed' || !d) return;
                      const merged = new Date(nextAt); merged.setHours(d.getHours(), d.getMinutes(), 0, 0);
                      setNextAt(merged);
                    }} />
                )}
              </View>
            )}
          </View>
        )}

        <TouchableOpacity onPress={submit} disabled={submitting}
          style={{ backgroundColor: '#2E7D32', borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: submitting ? 0.7 : 1, marginTop: 16 }}>
          {submitting ? <ActivityIndicator color={COLORS.white} /> : <Ionicons name="checkmark-done-outline" size={17} color={COLORS.white} />}
          <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: '800' }}>{submitting ? 'Saving…' : 'Mark Done'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </FormSheet>
  );
}

export default function Club1000FollowUpsScreen({ navigation }) {
  const user = useSelector((s) => s.auth.user);

  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState('today');
  const [completing, setCompleting] = useState(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await apiFetch(CLUB1000_ENDPOINTS.followUps);
      if (res.ok) setItems(await res.json());
    } catch (e) {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onFollowUpDone(updated) {
    if (updated) setItems((list) => list.map((f) => (f.id === updated.id ? updated : f)));
    setCompleting(null);
    load();
  }

  const now = new Date();
  const visible = items.filter((fu) => {
    const at = new Date(fu.scheduled_at);
    if (filter === 'all')     return true;
    if (filter === 'pending') return fu.status === 'pending';
    if (filter === 'today')   return fu.status === 'pending' && at >= startOfToday() && at <= endOfToday();
    if (filter === 'overdue') return fu.status === 'pending' && at < now;
    return true;
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />
      <CompleteFollowUpSheet followUp={completing} onClose={() => setCompleting(null)} onDone={onFollowUpDone} />

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

      <View style={{ flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        {TABS.map((t) => {
          const active = filter === t.key;
          return (
            <TouchableOpacity key={t.key} onPress={() => setFilter(t.key)}
              style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: active ? TEAL : 'transparent' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: active ? TEAL : MUTED }}>{t.label}</Text>
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
              <Text style={{ fontSize: 13, color: COLORS.textTertiary || MUTED, marginTop: 4 }}>Schedule follow-ups from a lead's details</Text>
            </View>
          ) : visible.map((fu) => {
            const overdue = fu.status === 'pending' && new Date(fu.scheduled_at) < now;
            return (
              <View key={fu.id} style={[CARD, { padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: overdue ? COLORS.errorBg : COLORS.border, backgroundColor: overdue ? COLORS.errorBg : COLORS.cardBg }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>{fu.lead_name || 'Lead'}</Text>
                      <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: (STATUS_COLOR[fu.status] || MUTED) + '22' }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: STATUS_COLOR[fu.status] || MUTED }}>{fu.status}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: overdue ? COLORS.error : MUTED, marginTop: 6 }}>{fmtDateTime(fu.scheduled_at)}</Text>
                    {!!fu.assigned_to_name && <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Assigned to: {fu.assigned_to_name}</Text>}
                    {!!fu.remarks && <Text style={{ fontSize: 12, color: COLORS.textPrimary, marginTop: 6, fontStyle: 'italic' }}>"{fu.remarks}"</Text>}
                    {!!fu.outcome && <Text style={{ fontSize: 12, color: COLORS.success, marginTop: 6 }}><Text style={{ fontWeight: '700' }}>Remarks: </Text>{fu.outcome}</Text>}
                  </View>
                  {fu.status === 'pending' && (
                    <TouchableOpacity onPress={() => setCompleting(fu)}
                      style={{ borderWidth: 1.5, borderColor: COLORS.success, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.success }}>Mark Done</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
