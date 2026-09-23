import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';

// The role filter on top of a module's dashboard — the same one the website
// shows. Each module lists the dashboards it has, one per role level, and an
// admin flips between them to see what each role gets. Designation Master →
// Permissions is where one is pinned to a designation; this only changes what
// you are looking at, never what the figures count.
export default function DashboardRoleFilter({ options, value, onChange }) {
  if (!options?.length) return null;
  return (
    <View style={s.wrap}>
      <Text style={s.lead}>Role</Text>
      <Pressable onPress={() => onChange('')} style={[s.chip, !value && s.chipOn]}>
        <Text style={[s.text, !value && s.textOn]}>Mine</Text>
      </Pressable>
      {options.map((o) => (
        <Pressable key={o.key} onPress={() => onChange(o.key)} style={[s.chip, value === o.key && s.chipOn]}>
          <Text style={[s.text, value === o.key && s.textOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6,
          paddingHorizontal: 16, paddingBottom: 8 },
  lead: { fontSize: 11.5, fontWeight: '700', color: COLORS.textSecondary, marginRight: 2 },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: RADIUS.pill, borderWidth: 1,
          borderColor: COLORS.border, backgroundColor: COLORS.surface },
  chipOn: { borderColor: COLORS.link, backgroundColor: COLORS.accentSoft },
  text: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  textOn: { color: COLORS.link },
});
