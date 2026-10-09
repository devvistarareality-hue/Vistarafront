import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';
import { Segmented } from './ui';

// The Source filter on Leads, Site Visits, Follow-Ups, Conversions, My Bookings and
// the dashboard — in the Sales module and the Channel Partner module alike. Mirrors
// the web's components/BookFilter.
//
//   Sales — leads that did not come through a channel partner
//   CP    — leads that did (a partner attached, or Source = "Channel Partner")
//   All   — both
//
// The server splits strictly by where the lead came from, so Sales + CP always
// equals All for whoever is looking. Each module opens on its own book; the choice
// is remembered per module on this phone.
export const BOOK_OPTIONS = [{ value: 'sales', label: 'Sales' }, { value: 'cp', label: 'CP' }, { value: 'all', label: 'All' }];

export function useBook(cpOnly) {
  // The Channel Partner module is the partner book, full stop: no switch there, and
  // the server's own CP rules apply (see backend requested_book).
  const key = cpOnly ? 'nx_book_cp' : 'nx_book_sales';
  const fallback = cpOnly ? 'cp' : 'sales';
  const [book, setBookState] = useState(fallback);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(key).then((v) => {
      if (alive && BOOK_OPTIONS.some((o) => o.value === v)) setBookState(v);
    }).catch(() => {});
    return () => { alive = false; };
  }, [key]);
  const setBook = (b) => {
    setBookState(b);
    AsyncStorage.setItem(key, b).catch(() => {});
  };
  if (cpOnly) return ['cp', () => {}];
  return [book, setBook];
}

export default function BookFilter({ value, onChange, style, hidden }) {
  if (hidden) return null;
  return (
    <View style={[s.row, style]}>
      <Text style={s.label}>SOURCE</Text>
      <Segmented options={BOOK_OPTIONS} value={value} onChange={onChange} style={s.seg} />
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  label: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6, color: COLORS.textSecondary },
  seg: { flex: 1 },
});
