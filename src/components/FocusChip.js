// Shown above a list that a notification narrowed to one record — says so, and gives
// the way back to the whole list. Mirrors the website's components/FocusChip.js.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

export default function FocusChip({ what = 'record', found = true, onClear }) {
  return (
    <View style={found ? s.chip : s.chipMissing}>
      <Ionicons name="notifications-outline" size={15} color={found ? COLORS.link : COLORS.warning} />
      <Text style={found ? s.text : s.textMissing}>
        {found ? `Showing the ${what} from your notification` : `That ${what} is not in this list any more`}
      </Text>
      <TouchableOpacity onPress={onClear} hitSlop={8} style={s.btn}><Text style={s.btnText}>Show all</Text></TouchableOpacity>
    </View>
  );
}

const base = { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, marginBottom: 12 };
const s = StyleSheet.create({
  chip: { ...base, backgroundColor: COLORS.accentSoft },
  chipMissing: { ...base, backgroundColor: COLORS.warningBg },
  text: { flex: 1, fontSize: 12.5, fontWeight: '700', color: COLORS.link },
  textMissing: { flex: 1, fontSize: 12.5, fontWeight: '700', color: COLORS.warning },
  btn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  btnText: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
});
