import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';
import { SALES_ENDPOINTS } from '../constants/api';
import { apiFetch } from '../utils/apiFetch';
import AppLoader from './AppLoader';

// Add Lead, step 1: the number first. Every lead already on that number is listed
// project by project, with who holds it on each side (telecaller / STM) and where
// each stands. Picking one works on THAT lead (the form opens on its project and
// saving updates it); "Add in another project", or a number nobody has, opens the
// empty form. Mirrors vistaraweb/src/components/LeadNumberCheck.js.
const pretty = (s) => (s ? s.replace(/_/g, ' ') : '');

export default function LeadNumberCheck({ initialPhone = '', onPick, onNew }) {
  const [phone, setPhone] = useState(initialPhone);
  const [rows, setRows] = useState(null);
  const [busy, setBusy] = useState(false);
  const digits = phone.replace(/\D/g, '');

  useEffect(() => {
    setRows(null);
    if (digits.length < 10) return undefined;
    let alive = true;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await apiFetch(`${SALES_ENDPOINTS.leadSearch}?search=${digits.slice(-10)}`);
        const list = res.ok ? await res.json() : [];
        if (alive) setRows((Array.isArray(list) ? list : []).sort((a, b) => (a.project_name || '').localeCompare(b.project_name || '')));
      } catch (e) { if (alive) setRows([]); }
      if (alive) setBusy(false);
    }, 400);
    return () => { alive = false; clearTimeout(t); };
  }, [digits]);

  return (
    <ScrollView style={st.wrap} contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
      <Text style={st.label}>Phone number</Text>
      <TextInput style={st.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoFocus
        placeholder="10-digit mobile" placeholderTextColor={COLORS.textTertiary} />
      <Text style={st.hint}>We check this number first, so the same client is not added twice.</Text>

      {busy ? <AppLoader size={0.5} style={st.loader} /> : null}

      {!busy && rows && rows.length === 0 ? (
        <View style={st.none}>
          <Text style={st.noneText}>No lead has this number yet.</Text>
          <TouchableOpacity style={st.primary} onPress={() => onNew(phone)}><Text style={st.primaryText}>Continue</Text></TouchableOpacity>
        </View>
      ) : null}

      {!busy && rows && rows.length > 0 ? (
        <View>
          <Text style={st.found}>This number already has {rows.length} lead{rows.length === 1 ? '' : 's'}. Pick one to work on it, or add it to another project.</Text>
          {rows.map((r) => {
            const closed = ['closed', 'lost'].includes(r.status);
            return (
              <TouchableOpacity key={String(r.id)} style={[st.row, closed && st.rowClosed]} onPress={() => onPick(r)}>
                <Text style={st.proj}>{r.project_name || 'No project'}{r.is_cp ? ' · CP' : ''}</Text>
                <Text style={st.name}>{r.name}</Text>
                <Text style={st.side}><Text style={st.sideKey}>Telecaller: </Text>{r.telecaller_name ? `${r.telecaller_name}${r.telecaller_status ? ` · ${pretty(r.telecaller_status)}` : ''}` : 'None assigned'}</Text>
                <Text style={st.side}><Text style={st.sideKey}>{r.is_cp ? 'CP' : 'STM'}: </Text>{r.stm_name ? `${r.stm_name}${r.stm_status ? ` · ${pretty(r.stm_status)}` : ''}` : 'None assigned'}</Text>
                <Text style={st.status}>{closed ? `${pretty(r.status)} — picking it starts a new lead` : pretty(r.status)}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={st.secondary} onPress={() => onNew(phone)}><Text style={st.secondaryText}>Add in another project</Text></TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  wrap: { flexShrink: 1 },
  content: { padding: 20 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 12,
           fontSize: 16, color: COLORS.textPrimary, backgroundColor: COLORS.surface },
  hint: { fontSize: 11.5, color: COLORS.textTertiary, marginTop: 6, marginBottom: 14 },
  loader: { marginVertical: 16 },
  none: { padding: 14, borderRadius: 14, backgroundColor: COLORS.surfaceAlt, gap: 10 },
  noneText: { fontSize: 13, color: COLORS.textSecondary },
  found: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 10 },
  row: { padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface, marginBottom: 8, gap: 2 },
  rowClosed: { opacity: 0.75 },
  proj: { fontSize: 13, fontWeight: '800', color: COLORS.link },
  name: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  side: { fontSize: 12, color: COLORS.textSecondary, textTransform: 'capitalize' },
  sideKey: { fontWeight: '700', color: COLORS.textPrimary },
  status: { fontSize: 11, color: COLORS.textTertiary, textTransform: 'capitalize', marginTop: 2 },
  primary: { borderRadius: 14, padding: 12, alignItems: 'center', backgroundColor: COLORS.panel },
  primaryText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  secondary: { marginTop: 4, borderRadius: 14, padding: 12, alignItems: 'center', backgroundColor: COLORS.surfaceAlt },
  secondaryText: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
});
