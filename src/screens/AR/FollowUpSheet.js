import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { can } from '../../lib/roles';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../../constants/theme';
import { AR_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import FormSheet from '../../components/FormSheet';
import FilterSelect from '../../components/FilterSelect';
import { Button, Badge } from '../../components/ui';
import { fmtWhen } from '../../components/ActivityHistory';
import { rupee, DateField, toISO, withCompany } from './arShared';

// One account's collection follow-ups — same as _FollowUpModal.js on the website:
// what is scheduled, what was said last time, book the next one, close the open one.
export const CHANNELS = [
  { value: 'call', label: 'Call', icon: 'call-outline' },
  { value: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
  { value: 'visit', label: 'Visit', icon: 'location-outline' },
  { value: 'email', label: 'Email', icon: 'mail-outline' },
  { value: 'other', label: 'Other', icon: 'ellipse-outline' },
];
const ICON = Object.fromEntries(CHANNELS.map((c) => [c.value, c.icon]));
const TIMES = [['10:00', '10 AM'], ['12:00', '12 PM'], ['15:00', '3 PM'], ['18:00', '6 PM']];
const dmy = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

function tomorrow() { const d = new Date(); d.setDate(d.getDate() + 1); return toISO(d); }
const blank = (me) => ({ date: tomorrow(), time: '10:00', channel: 'call', note: '', assigned_to: me ? String(me) : '' });

function Chip({ on, label, icon, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[s.chip, on && s.chipOn]}>
      {icon ? <Ionicons name={icon} size={14} color={on ? COLORS.link : COLORS.textSecondary} /> : null}
      <Text style={[s.chipText, on && s.chipTextOn]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function FollowUpSheet({ row, visible, onClose, onChanged }) {
  const companyId = useSelector((st) => st.adminFilter?.companyId);
  const me = useSelector((st) => st.auth.user?.id);
  // Reading the history is fine without the capability; booking, closing or
  // cancelling a follow-up is not (Designation Master → Permissions).
  const mayManage = can(useSelector((st) => st.auth.user), 'ar.followup.manage');
  const [items, setItems] = useState(null);
  const [people, setPeople] = useState([]);
  const [draft, setDraft] = useState(() => blank(me));
  const [closing, setClosing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const load = async () => {
    try {
      const r = await apiFetch(withCompany(AR_ENDPOINTS.followUps(row.id), companyId));
      const d = await r.json().catch(() => ({}));
      setItems(r.ok ? d.results || [] : []);
      if (!r.ok) setErr(d.detail || 'Could not load follow-ups.');
    } catch (e) { setItems([]); setErr('Check your connection and try again.'); }
  };

  useEffect(() => {
    if (!visible || !row) return;
    setItems(null); setErr(''); setOk(''); setClosing(null); setDraft(blank(me));
    load();
    apiFetch(withCompany(AR_ENDPOINTS.assignees, companyId)).then((r) => r.json()).then((d) => setPeople(d.results || [])).catch(() => {});
  }, [visible, row?.id]);

  const send = async (url, method, body, okMsg) => {
    setBusy(true); setErr(''); setOk('');
    try {
      const r = await apiFetch(withCompany(url, companyId), { method, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.detail || 'Could not save.'); return false; }
      setOk(okMsg);
      await load();
      onChanged?.();
      return true;
    } catch (e) {
      setErr('Could not save. Check your connection.');
      return false;
    } finally { setBusy(false); }
  };

  const schedule = async () => {
    const ok = await send(AR_ENDPOINTS.followUps(row.id), 'POST', {
      scheduled_at: `${draft.date}T${draft.time}`, channel: draft.channel, note: draft.note,
      assigned_to: draft.assigned_to || undefined,
    }, 'Follow-up scheduled');
    if (ok) setDraft(blank(me));
  };

  const close = async () => {
    const ok = await send(AR_ENDPOINTS.followUp(closing.id), 'PATCH', {
      status: 'done', outcome: closing.outcome, promised_amount: closing.promised_amount || null,
      promised_on: closing.promised_on || null, next_at: closing.next_date ? `${closing.next_date}T11:00` : null,
    }, 'Follow-up closed');
    if (ok) setClosing(null);
  };

  if (!row) return null;
  const pending = (items || []).filter((f) => f.status === 'pending');
  const past = (items || []).filter((f) => f.status !== 'pending');

  return (
    <FormSheet visible={visible} onClose={onClose}>
      <View style={s.head}>
        <Text style={s.title} numberOfLines={1}>Follow-ups · {row.client_name || '—'}</Text>
        <Text style={s.sub} numberOfLines={2}>
          {row.project} · Plot {row.plots}{row.phone ? ` · ${row.phone}` : ''}{row.overdue > 0 ? ` · Overdue ${rupee(row.overdue)}` : ''}
        </Text>
      </View>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {err ? <Text style={s.err}>{err}</Text> : null}
        {ok ? <Text style={s.ok}>{ok}</Text> : null}
        {items === null ? <Text style={s.muted}>Loading…</Text> : (
          <>
            {pending.length > 0 && <Text style={s.section}>SCHEDULED</Text>}
            {pending.map((f) => (
              <View key={f.id} style={[s.item, f.is_overdue && s.itemLate]}>
                <View style={s.icon}><Ionicons name={ICON[f.channel] || 'ellipse-outline'} size={16} color={COLORS.link} /></View>
                <View style={s.flex}>
                  <View style={s.row}>
                    <Text style={s.itemTitle}>{f.channel_label} · {fmtWhen(f.scheduled_at)}</Text>
                    {f.is_overdue ? <Badge label="Overdue" tone="danger" /> : null}
                  </View>
                  {f.note ? <Text style={s.text}>{f.note}</Text> : null}
                  <Text style={s.meta}>Assigned to {f.assigned_to?.name || '—'} · by {f.created_by || '—'}</Text>
                  {closing?.id === f.id ? (
                    <View style={s.closeBox}>
                      <TextInput style={[s.input, s.multi]} multiline placeholder="What happened? e.g. Will pay inst 3 on Friday"
                        placeholderTextColor={COLORS.textTertiary} value={closing.outcome}
                        onChangeText={(v) => setClosing({ ...closing, outcome: v })} />
                      <TextInput style={s.input} keyboardType="numeric" placeholder="Promised amount (₹, optional)"
                        placeholderTextColor={COLORS.textTertiary} value={closing.promised_amount}
                        onChangeText={(v) => setClosing({ ...closing, promised_amount: v.replace(/[^0-9.]/g, '') })} />
                      <Text style={s.label}>Promised by</Text>
                      <DateField value={closing.promised_on} onChange={(v) => setClosing({ ...closing, promised_on: v })} placeholder="Optional" compact />
                      <Text style={s.label}>Next follow-up</Text>
                      <DateField value={closing.next_date} onChange={(v) => setClosing({ ...closing, next_date: v })} placeholder="Optional" compact />
                      <View style={s.actions}>
                        <Button title="Back" variant="secondary" size="sm" onPress={() => setClosing(null)} disabled={busy} />
                        <Button title="Mark done" variant="success" size="sm" onPress={close} loading={busy} disabled={!closing.outcome.trim()} />
                      </View>
                    </View>
                  ) : mayManage ? (
                    <View style={s.actions}>
                      <Button title="Cancel" variant="secondary" size="sm" disabled={busy}
                        onPress={() => send(AR_ENDPOINTS.followUp(f.id), 'PATCH', { status: 'cancelled' }, 'Follow-up cancelled')} />
                      <Button title="Log outcome" icon="checkmark-circle-outline" size="sm" disabled={busy}
                        onPress={() => setClosing({ id: f.id, outcome: '', promised_amount: '', promised_on: '', next_date: '' })} />
                    </View>
                  ) : null}
                </View>
              </View>
            ))}

            {mayManage ? <Text style={s.section}>NEW FOLLOW-UP</Text> : null}
            {mayManage ? <View style={s.newBox}>
              <View style={s.chips}>
                {CHANNELS.map((c) => <Chip key={c.value} on={draft.channel === c.value} label={c.label} icon={c.icon} onPress={() => setDraft({ ...draft, channel: c.value })} />)}
              </View>
              <Text style={s.label}>Date</Text>
              <DateField value={draft.date} onChange={(v) => setDraft({ ...draft, date: v })} compact />
              <Text style={s.label}>Time</Text>
              <View style={s.chips}>
                {TIMES.map(([v, l]) => <Chip key={v} on={draft.time === v} label={l} onPress={() => setDraft({ ...draft, time: v })} />)}
              </View>
              {people.length > 1 ? (
                <>
                  <Text style={s.label}>Assign to</Text>
                  <FilterSelect label="Assign to" value={draft.assigned_to} onChange={(v) => setDraft({ ...draft, assigned_to: v })}
                    options={people.map((p) => ({ value: String(p.id), label: String(p.id) === String(me) ? `${p.name} (me)` : p.name }))} />
                </>
              ) : null}
              <TextInput style={s.input} placeholder="Note — e.g. Remind about inst 2 and interest" placeholderTextColor={COLORS.textTertiary}
                value={draft.note} onChangeText={(v) => setDraft({ ...draft, note: v })} />
              <Button title="Schedule" icon="calendar-outline" onPress={schedule} loading={busy} disabled={!draft.date} full />
            </View> : null}

            {past.length > 0 && <Text style={s.section}>HISTORY</Text>}
            {past.map((f) => (
              <View key={f.id} style={[s.item, f.status === 'cancelled' && s.dim]}>
                <View style={s.icon}><Ionicons name={ICON[f.channel] || 'ellipse-outline'} size={16} color={COLORS.link} /></View>
                <View style={s.flex}>
                  <View style={s.row}>
                    <Text style={s.itemTitle}>{f.channel_label} · {fmtWhen(f.done_at || f.scheduled_at)}</Text>
                    <Badge label={f.status === 'done' ? 'Done' : 'Cancelled'} tone={f.status === 'done' ? 'success' : 'neutral'} />
                  </View>
                  {f.outcome ? <Text style={s.text}>{f.outcome}</Text> : null}
                  {f.promised_amount != null ? (
                    <Text style={s.promise}>Promised {rupee(f.promised_amount)}{f.promised_on ? ` by ${dmy(f.promised_on)}` : ''}</Text>
                  ) : null}
                  <Text style={s.meta}>{f.done_by ? `By ${f.done_by}` : `Scheduled by ${f.created_by || '—'}`}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </FormSheet>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  dim: { opacity: 0.6 },
  head: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 2 },
  scroll: { flexShrink: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  err: { color: COLORS.error, fontSize: 13, marginVertical: 8 },
  ok: { color: COLORS.success, fontSize: 13, fontWeight: '700', marginVertical: 8 },
  muted: { color: COLORS.textSecondary, fontSize: 13, paddingVertical: 14 },
  section: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: COLORS.textSecondary, marginTop: 16, marginBottom: 8 },
  item: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, marginBottom: 8 },
  itemLate: { borderColor: COLORS.error2, backgroundColor: COLORS.errorBg },
  icon: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.accentSoft, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  itemTitle: { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary },
  text: { fontSize: 13, color: COLORS.textPrimary, marginTop: 4, lineHeight: 18 },
  promise: { fontSize: 12.5, fontWeight: '700', color: COLORS.success, marginTop: 4 },
  meta: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 4 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  closeBox: { marginTop: 10, gap: 8 },
  newBox: { padding: 14, borderRadius: 18, backgroundColor: COLORS.surfaceAlt, gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipOn: { borderColor: COLORS.link, backgroundColor: COLORS.accentSoft },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  chipTextOn: { color: COLORS.link, fontWeight: '700' },
  label: { fontSize: 11.5, fontWeight: '700', color: COLORS.textSecondary, marginTop: 2 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary, backgroundColor: COLORS.inputBg },
  multi: { minHeight: 64, textAlignVertical: 'top' },
});
