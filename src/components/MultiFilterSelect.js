import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';
import FormSheet from './FormSheet';

/**
 * Multi-select filter chip — FilterSelect's look, but ticks several. Mirrors
 * web/src/components/MultiSelect.js. `value` is an array; empty means "all".
 *
 *   <MultiFilterSelect label="All Projects" noun="projects" value={projects}
 *     onChange={setProjects} options={[{ value: '12', label: 'Kalrav' }, …]} />
 *
 * The chip reads "All Projects", the one name picked, or "3 projects". Picks are
 * made in the sheet and applied with Done, so the list doesn't reload per tick.
 */
export default function MultiFilterSelect({ label, noun = 'selected', value = [], options, onChange, style }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState([]);
  useEffect(() => { if (open) setDraft((value || []).map(String)); }, [open]);

  const picked = (value || []).map(String);
  const isAll = picked.length === 0;
  const chipText = isAll ? label
    : picked.length === 1 ? (options.find((o) => String(o.value) === picked[0])?.label ?? `1 ${noun}`)
    : `${picked.length} ${noun}`;
  const toggle = (v) => {
    const k = String(v);
    setDraft((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]));
  };
  const apply = () => { onChange(draft); setOpen(false); };

  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.7}
        style={[styles.chip, !isAll && styles.chipActive, style]}>
        <Text numberOfLines={1} style={[styles.chipText, !isAll && styles.chipTextActive]}>{chipText}</Text>
        <Ionicons name="chevron-down" size={15} color={isAll ? COLORS.textSecondary : COLORS.white} />
      </TouchableOpacity>

      <FormSheet visible={open} onClose={() => setOpen(false)} maxHeight="70%">
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{label}</Text>
          <TouchableOpacity onPress={() => setDraft([])}>
            <Text style={styles.clear}>Clear</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.list}>
          {options.map((o) => {
            const on = draft.includes(String(o.value));
            return (
              <TouchableOpacity key={String(o.value)} style={styles.option} onPress={() => toggle(o.value)}>
                <View style={[styles.box, on && styles.boxOn]}>
                  {on && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                </View>
                <Text style={[styles.optionText, on && styles.optionTextActive]}>{o.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <TouchableOpacity style={styles.done} onPress={apply}>
          <Text style={styles.doneText}>{draft.length ? `Show ${draft.length} selected` : `Show ${label.toLowerCase()}`}</Text>
        </TouchableOpacity>
      </FormSheet>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 22, paddingHorizontal: 14, paddingVertical: 8,
  },
  chipActive: { backgroundColor: COLORS.panel, borderColor: COLORS.navy },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, maxWidth: 150 },
  chipTextActive: { color: COLORS.white, fontWeight: '700' },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  clear: { fontSize: 14, fontWeight: '700', color: COLORS.link },
  list: { flexShrink: 1 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.screenBg,
  },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: COLORS.borderStrong,
         alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: COLORS.panel, borderColor: COLORS.panel },
  optionText: { flex: 1, fontSize: 15, color: COLORS.textPrimary },
  optionTextActive: { color: COLORS.navy, fontWeight: '700' },
  done: { margin: 12, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: COLORS.panel },
  doneText: { fontSize: 15, fontWeight: '800', color: COLORS.white },
});
