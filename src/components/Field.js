import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

/** Shared form-field styling so every input across the app looks identical. */
export const inputStyle = {
  borderWidth: 1.5,
  borderColor: COLORS.border,
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 12,
  fontSize: 15,
  color: COLORS.textPrimary,
  backgroundColor: COLORS.inputBg,
};

/** Label + arbitrary control (use for dropdowns / custom inputs). */
export function Field({ label, required, children, style }) {
  return (
    <View style={[styles.field, style]}>
      {label ? (
        <Text style={styles.label}>
          {label}{required ? <Text style={styles.req}> *</Text> : null}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

/** Label + styled TextInput in one. */
export function TextField({ label, required, style, ...props }) {
  return (
    <Field label={label} required={required}>
      <TextInput placeholderTextColor={COLORS.textTertiary} style={[inputStyle, style]} {...props} />
    </Field>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  req: { color: COLORS.error },
});
