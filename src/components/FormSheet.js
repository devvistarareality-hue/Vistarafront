import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Pressable, Keyboard, Platform, Dimensions, Animated, StyleSheet } from 'react-native';
import SheetHandle from './SheetHandle';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

function resolveMaxHeight(maxHeight, windowHeight) {
  if (typeof maxHeight === 'string' && maxHeight.trim().endsWith('%')) {
    return (parseFloat(maxHeight) / 100) * windowHeight;
  }
  return maxHeight;
}

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
  // KeyboardAvoidingView's automatic resize/padding doesn't reliably reach a
  // React Native <Modal> — the modal renders in its own separate native
  // window on Android, so the OS-level keyboard-resize measurement it relies
  // on never sees it (confirmed: 'height' behavior still left the keyboard
  // covering the whole sheet). Tracking the keyboard's own height directly
  // and (a) pushing the sheet up by that amount and (b) shrinking its own
  // height budget by the same amount works regardless, since neither step
  // depends on any layout measurement of the modal's position — just the
  // keyboard event's reported height.
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates?.height || 0));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  // Swipe the top bar down to close: the sheet follows the finger, then either
  // slides away or springs back.
  const dragY = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (visible) dragY.setValue(0); }, [visible]);
  const springBack = () => Animated.spring(dragY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
  const dismiss = () => Animated.timing(dragY, { toValue: Dimensions.get('window').height, duration: 180, useNativeDriver: true })
    .start(() => onClose?.());

  const windowHeight = Dimensions.get('window').height;
  const baseMaxHeight = resolveMaxHeight(maxHeight, windowHeight);
  const effectiveMaxHeight = keyboardHeight ? Math.max(baseMaxHeight - keyboardHeight, 200) : baseMaxHeight;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.kav, { maxHeight: effectiveMaxHeight, marginBottom: keyboardHeight }]}>
          <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom, transform: [{ translateY: dragY }] }]}>{/* inline-ok: safe-area inset and drag offset */}
            <SheetHandle onMove={(dy) => dragY.setValue(dy)} onClose={dismiss} onCancel={springBack} />
            {children}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Scrim on the root so the content behind the sheet is clearly dimmed (not messy).
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: `rgba(${COLORS.inkRgb},0.4)` },
  backdrop: { ...StyleSheet.absoluteFillObject },  // transparent — tap target to close
  kav: { width: '100%' },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    // Allow the sheet to shrink to the kav's maxHeight so a tall inner ScrollView
    // (flexShrink:1) gets a bounded height and can actually scroll.
    flexShrink: 1,
  },
});
