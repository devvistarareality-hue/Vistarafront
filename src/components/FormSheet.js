import React from 'react';
import { Modal, View, Pressable, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

/**
 * Reusable rounded bottom-sheet modal.
 *
 * Slides up from the bottom over a dim backdrop with rounded top corners.
 * The sheet HUGS its content: short forms render a short sheet, long forms
 * grow up to `maxHeight` and then scroll (give the inner ScrollView
 * `style={{ flexShrink: 1 }}` so it can shrink/scroll).
 *
 *   <FormSheet visible={open} onClose={close}>
 *     <Header/>
 *     <ScrollView style={{ flexShrink: 1 }}>…</ScrollView>
 *   </FormSheet>
 */
export default function FormSheet({ visible, onClose, children, maxHeight = '92%' }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.kav, { maxHeight }]}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
            <View style={styles.handle} />
            {children}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay },
  kav: { width: '100%' },
  sheet: {
    backgroundColor: COLORS.screenBg,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  handle: {
    alignSelf: 'center',
    width: 44, height: 5, borderRadius: 3,
    backgroundColor: COLORS.textTertiary,
    marginTop: 10, marginBottom: 6,
  },
});
