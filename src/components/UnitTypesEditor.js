import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

// A project's standard unit types — [{type, plot_area, const_area}] — edited as rows.
// Used twice on the project form: EOI Unit Types (before plots exist) and LOI Unit
// Types (a new LOI, or an EOI converted to LOI). Mirrors the web's
// components/UnitTypesEditor.
// `noPlotArea`: the LOI list has no Plot Area — on an LOI the plot is real, and its
// area is the one fixed when the project was mapped.
export default function UnitTypesEditor({ title, hint, value, onChange, copyFrom, inputStyle, noPlotArea = false }) {
  const rows = value || [];
  const update = (i, k, v) => onChange(rows.map((t, idx) => (idx === i ? { ...t, [k]: v } : t)));
  const copyRows = (copyFrom || []).filter((t) => (t.type || '').trim());
  return (
    <View style={s.box}>
      <Text style={s.title}>{title}</Text>
      <Text style={s.hint}>{hint}</Text>
      {rows.map((t, i) => (
        <View key={i} style={s.row}>
          <TextInput value={t.type} onChangeText={(v) => update(i, 'type', v)} placeholder="2 BHK"
            style={StyleSheet.compose(inputStyle, s.typeIn)} />
          {!noPlotArea && <TextInput value={String(t.plot_area || '')} onChangeText={(v) => update(i, 'plot_area', v)} placeholder="Plot"
            keyboardType="numeric" style={StyleSheet.compose(inputStyle, s.numIn)} />}
          <TextInput value={String(t.const_area || '')} onChangeText={(v) => update(i, 'const_area', v)} placeholder="Const"
            keyboardType="numeric" style={StyleSheet.compose(inputStyle, s.numIn)} />
          <TouchableOpacity onPress={() => onChange(rows.filter((_, idx) => idx !== i))}>
            <Ionicons name="close-circle" size={20} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={() => onChange([...rows, noPlotArea ? { type: '', const_area: '' } : { type: '', plot_area: '', const_area: '' }])} style={s.add}>
        <Text style={s.addText}>+ Add Unit Type</Text>
      </TouchableOpacity>
      {copyRows.length > 0 && (
        <TouchableOpacity onPress={() => onChange(copyRows.map((t) => (noPlotArea ? { type: t.type, const_area: t.const_area } : { ...t })))} style={s.add}>
          <Text style={s.addText}>Copy from EOI</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export const cleanUnitTypes = (rows) => (rows || []).filter((t) => (t.type || '').trim());

const s = StyleSheet.create({
  box: { marginTop: 6, marginBottom: 14 },
  title: { fontSize: 11, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  hint: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 6, marginBottom: 8, alignItems: 'center' },
  typeIn: { flex: 1 },
  numIn: { width: 68 },
  add: { borderWidth: 1.5, borderColor: COLORS.warningAlt, borderStyle: 'dashed', borderRadius: 8, paddingVertical: 8, alignItems: 'center', marginTop: 2, marginBottom: 6 },
  addText: { fontSize: 13, fontWeight: '700', color: COLORS.warningAlt },
});
