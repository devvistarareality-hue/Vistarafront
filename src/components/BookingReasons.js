// Why a booking was rejected (Sales / CP stage) or cancelled — both are required when
// the action is taken. Same as the website's sales/_ReasonNote.js.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

const when = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : ` · ${d.toLocaleDateString('en-GB')}`;
};

export default function BookingReasons({ b }) {
  const cancelled = String(b.approval_status || '').toUpperCase() === 'CANCELLED';
  if (cancelled && (b.cancelled_reason || b.cancelled_by_name)) {
    return (
      <View style={[s.box, s.boxCancel]}>
        <Text style={[s.head, s.headCancel]}>CANCELLED{b.cancelled_by_name ? ` BY ${String(b.cancelled_by_name).toUpperCase()}` : ''}{when(b.cancelled_at)}</Text>
        <Text style={s.body}>{b.cancelled_reason || 'No reason was recorded (cancelled before reasons were required).'}</Text>
      </View>
    );
  }
  if (!cancelled && b.status === 'rejected' && b.accounts_status !== 'rejected' && (b.rejected_reason || b.rejected_by_name)) {
    return (
      <View style={s.box}>
        <Text style={s.head}>REJECTED{b.rejected_by_name ? ` BY ${String(b.rejected_by_name).toUpperCase()}` : ''}{when(b.rejected_at)}</Text>
        <Text style={s.body}>{b.rejected_reason || 'No reason was recorded (rejected before reasons were required).'}</Text>
      </View>
    );
  }
  return null;
}

const s = StyleSheet.create({
  box: { marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: COLORS.errorBg },
  boxCancel: { backgroundColor: COLORS.surfaceAlt },
  head: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4, color: COLORS.error },
  headCancel: { color: COLORS.textSecondary },
  body: { fontSize: 13, color: COLORS.textPrimary, marginTop: 2 },
});
