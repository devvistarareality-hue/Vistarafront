import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/theme';
import { SALES_ENDPOINTS } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import FormSheet from '../../components/FormSheet';
import { Button } from '../../components/ui';
import { DateField } from '../AR/arShared';
import { explainApiError, explainNetworkError } from '../../lib/apiError';

// "Edit visit" — correct a completed site visit's date, outcome or remarks (mirrors
// the web's Edit site visit). Offered when the server says this person may
// (sv.can_edit: the STM who did it, their managers, admins). A reason is required;
// the change lands on the lead's history and the activity log.
const OUTCOMES = [
  { value: 'hot', label: 'Hot', color: COLORS.error },
  { value: 'warm', label: 'Warm', color: COLORS.warning },
  { value: 'cold', label: 'Cold', color: COLORS.link },
  { value: 'not_interested', label: 'Not Interested', color: COLORS.textSecondary },
];

const localYmd = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function EditVisitSheet({ visit, onClose, onSaved }) {
  const [date, setDate] = useState('');
  const [outcome, setOutcome] = useState('');
  const [remarks, setRemarks] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visit) return;
    setDate(localYmd(visit.visited_at)); setOutcome(visit.outcome || '');
    setRemarks(visit.remarks || ''); setReason(''); setErr('');
  }, [visit]);

  async function save() {
    if (!reason.trim()) { setErr('Say why the visit is being changed.'); return; }
    setSaving(true); setErr('');
    try {
      const res = await apiFetch(SALES_ENDPOINTS.siteVisitEdit(visit.id), {
        method: 'POST', body: JSON.stringify({ visited_at: date, outcome, remarks, reason: reason.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(explainApiError(res, d, 'Could not save the visit.')); setSaving(false); return; }
      setSaving(false);
      onSaved?.(d);
      onClose();
    } catch (e) { setErr(explainNetworkError(e)); setSaving(false); }
  }

  return (
    <FormSheet visible={!!visit} onClose={() => !saving && onClose()}>
      {visit ? (
        <ScrollView style={s.scroll} contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>Edit site visit</Text>
          <Text style={s.sub}>{visit.lead_name} · {visit.lead_phone}{visit.stm_name ? ` · ${visit.stm_name}` : ''}</Text>

          <Text style={s.label}>Visit date</Text>
          <DateField value={date} onChange={setDate} maxToday />

          <Text style={s.label}>Outcome</Text>
          <View style={s.outs}>
            {OUTCOMES.map((o) => {
              const on = outcome === o.value;
              return (
                <Pressable key={o.value} onPress={() => setOutcome(o.value)}
                  style={[s.out, { borderColor: o.color }, on && { backgroundColor: o.color }]}>{/* inline-ok: outcome colour */}
                  <Text style={[s.outText, { color: on ? COLORS.white : o.color }]}>{o.label}</Text>{/* inline-ok: outcome colour */}
                </Pressable>
              );
            })}
          </View>

          <Text style={s.label}>Remarks</Text>
          <TextInput style={[s.input, s.area]} value={remarks} onChangeText={setRemarks} multiline
            placeholderTextColor={COLORS.textTertiary} />

          <Text style={s.label}>Why are you changing it? *</Text>
          <TextInput style={s.input} value={reason} onChangeText={setReason}
            placeholder="e.g. Picked the wrong date" placeholderTextColor={COLORS.textTertiary} />
          <Text style={s.note}>The change and your reason are saved on the lead's history and the activity log.</Text>

          {err ? <Text style={s.err}>{err}</Text> : null}
          <View style={s.foot}>
            <Button title="Cancel" variant="secondary" onPress={onClose} disabled={saving} style={s.flex} />
            <Button title="Save changes" loading={saving} disabled={!reason.trim() || !date} onPress={save} style={s.flex} />
          </View>
        </ScrollView>
      ) : null}
    </FormSheet>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexShrink: 1 },
  body: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2, marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginTop: 14, marginBottom: 6 },
  outs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  out: { flexGrow: 1, minWidth: '45%', paddingVertical: 10, borderRadius: 14, borderWidth: 1.5, alignItems: 'center' },
  outText: { fontSize: 13, fontWeight: '700' },
  input: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
           fontSize: 14, color: COLORS.textPrimary, backgroundColor: COLORS.surface },
  area: { minHeight: 80, textAlignVertical: 'top' },
  note: { fontSize: 11.5, color: COLORS.textSecondary, marginTop: 8 },
  err: { fontSize: 13, color: COLORS.error, marginTop: 10 },
  foot: { flexDirection: 'row', gap: 10, marginTop: 18 },
});
