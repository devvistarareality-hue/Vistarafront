/**
 * The CP Leads / CP Details toggle — the mobile half of
 * web/src/app/m/[module]/_CpTabs.js.
 *
 * All Leads has had this pair since the directory landed; Site Visits and
 * Follow-Ups now carry the same one, because each of those also has two
 * audiences — the partner's leads, and the partner themselves.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { COLORS } from '../constants/theme';

const TABS = [
  { key: 'leads', label: 'CP Leads' },
  { key: 'details', label: 'CP Details' },
];

export default function CpTabs({ value, onChange }) {
  return (
    <View style={st.wrap}>
      <View style={st.pills}>
        {TABS.map((t) => {
          const on = value === t.key;
          return (
            <TouchableOpacity key={t.key} onPress={() => onChange(t.key)}
              style={[st.pill, on && st.pillOn]}>
              <Text style={[st.pillText, on && st.pillTextOn]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 12 },
  pills: { flexDirection: 'row', alignSelf: 'flex-start', gap: 2, padding: 4,
           borderRadius: 14, backgroundColor: COLORS.surfaceAlt },
  pill: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 10, backgroundColor: 'transparent' },
  pillOn: { backgroundColor: COLORS.surface },
  pillText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  pillTextOn: { color: COLORS.textPrimary },
});
