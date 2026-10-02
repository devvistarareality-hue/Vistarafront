import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, CARD_SHADOW } from '../constants/theme';

// Tone colours for a department card — the same three the module cards use.
export const DEPT_TONES = {
  blue: { fg: COLORS.link, bg: COLORS.accentSoft },
  green: { fg: COLORS.success, bg: COLORS.successBg },
  peach: { fg: COLORS.warning, bg: COLORS.warningBg },
};

// One department on a home screen: icon, title, description, and its parts as
// chips when it holds more than one.
export function DepartmentCard({ group, onPress }) {
  const t = DEPT_TONES[group.tone] || DEPT_TONES.blue;
  const several = group.modules.length > 1 || group.open.length > group.modules.length;
  return (
    <TouchableOpacity activeOpacity={0.85} style={st.card} onPress={onPress}>
      <View style={st.row}>
        <View style={[st.icon, { backgroundColor: t.bg }]}>{/* inline-ok: department tone */}
          <MaterialCommunityIcons name={group.icon} size={24} color={t.fg} />
        </View>
        <View style={st.body}>
          <Text style={st.title} numberOfLines={1}>{group.title}</Text>
          <Text style={st.desc} numberOfLines={2}>{group.desc}</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={t.fg} />
      </View>
      {several ? (
        <View style={st.chips}>
          {group.parts.map((p) => (
            <Text key={p.key} style={[st.chip, p.soon && st.chipSoon]}>{p.title}{p.soon ? ' · soon' : ''}</Text>
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

// One part inside a department screen.
export function PartCard({ part, tone, onPress }) {
  const t = DEPT_TONES[tone] || DEPT_TONES.blue;
  return (
    <TouchableOpacity activeOpacity={part.soon ? 1 : 0.85} disabled={part.soon} style={[st.card, part.soon && st.soon]} onPress={onPress}>
      <View style={st.row}>
        <View style={[st.icon, { backgroundColor: t.bg }]}>{/* inline-ok: department tone */}
          <MaterialCommunityIcons name={part.icon} size={24} color={t.fg} />
        </View>
        <View style={st.body}>
          <Text style={st.title} numberOfLines={1}>{part.title}</Text>
          <Text style={st.desc} numberOfLines={2}>{part.desc}</Text>
        </View>
        {part.soon ? <Text style={st.soonTag}>SOON</Text> : <MaterialCommunityIcons name="chevron-right" size={22} color={t.fg} />}
      </View>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: COLORS.cardBg, borderRadius: 22, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: COLORS.cardBorder, ...CARD_SHADOW },
  soon: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  desc: { fontSize: 12.5, color: COLORS.textSecondary, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  chip: { fontSize: 11.5, fontWeight: '700', color: COLORS.textSecondary, backgroundColor: COLORS.surfaceAlt,
          paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, overflow: 'hidden' },
  chipSoon: { backgroundColor: 'transparent', borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border },
  soonTag: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: COLORS.textSecondary },
});
