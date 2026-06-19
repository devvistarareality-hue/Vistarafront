import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import FormSheet from './FormSheet';

/**
 * Reusable dropdown filter chip. Opens a rounded sheet of options.
 *
 *   <FilterSelect label="Department" value={dept} onChange={setDept}
 *     options={[{ value: '', label: 'All Departments' }, ...]} />
 */
export default function FilterSelect({ label, value, options, onChange, style }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => String(o.value) === String(value));
  const isAll = !value;

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.7}
        style={[styles.chip, !isAll && styles.chipActive, style]}>
        <Text numberOfLines={1} style={[styles.chipText, !isAll && styles.chipTextActive]}>
          {selected ? selected.label : label}
        </Text>
        <Ionicons name="chevron-down" size={15} color={isAll ? COLORS.textSecondary : COLORS.white} />
      </TouchableOpacity>

      <FormSheet visible={open} onClose={() => setOpen(false)} maxHeight="60%">
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{label}</Text>
          <TouchableOpacity onPress={() => setOpen(false)}>
            <Ionicons name="close" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flexShrink: 1 }}>
          {options.map((o) => {
            const active = String(o.value) === String(value);
            return (
              <TouchableOpacity key={String(o.value)} style={styles.option}
                onPress={() => { onChange(o.value); setOpen(false); }}>
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{o.label}</Text>
                {active && <Ionicons name="checkmark" size={18} color={COLORS.navy} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </FormSheet>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, maxWidth: 150 },
  chipTextActive: { color: COLORS.white, fontWeight: '700' },

  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.screenBg,
  },
  optionText: { fontSize: 15, color: COLORS.textPrimary },
  optionTextActive: { color: COLORS.navy, fontWeight: '700' },
});
