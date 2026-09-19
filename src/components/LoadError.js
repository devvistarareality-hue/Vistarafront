import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, RADIUS } from '../constants/theme';
import AppIcon from './AppIcon';

// A failed load used to leave an empty screen: the catch swallowed the error and
// the list simply stayed empty, indistinguishable from "nothing here yet". This
// says what happened and offers the retry the person would otherwise get by
// backing out and coming in again.
export default function LoadError({ message, onRetry }) {
  return (
    <View style={s.wrap}>
      <View style={s.badge}><AppIcon name="alert" size={22} color={COLORS.error} /></View>
      <Text style={s.title}>Couldn&apos;t load this</Text>
      <Text style={s.text}>{message || 'Check your connection and try again.'}</Text>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry} style={s.btn} activeOpacity={0.8}>
          <Text style={s.btnText}>Try again</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:    { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 28 },
  badge:   { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.errorBg, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title:   { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  text:    { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 19 },
  btn:     { marginTop: 16, paddingVertical: 10, paddingHorizontal: 22, borderRadius: RADIUS.md,
             backgroundColor: COLORS.btnTint, borderWidth: 1, borderColor: COLORS.btnBorder },
  btnText: { fontSize: 13.5, fontWeight: '700', color: COLORS.btnText },
});
