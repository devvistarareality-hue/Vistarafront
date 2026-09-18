import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, Animated, Easing, BackHandler, StyleSheet } from 'react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import AppIcon from './AppIcon';

// Premium replacement for Alert.alert. App.js routes Alert.alert here, so every
// existing call gets the themed dialog without touching the screens.
let push = null;
export const isDialogHostMounted = () => !!push;
export function showDialog(title, message, buttons, options) {
  push?.({ title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }], options: options || {} });
}

function toneOf(d) {
  const text = `${d.title || ''} ${d.message || ''}`.toLowerCase();
  if (d.buttons.some((b) => b.style === 'destructive')) return 'danger';
  if (/(fail|error|could not|couldn't|cannot|can't|invalid|required|denied|missing|unable|not allowed|wrong)/.test(text)) return 'error';
  if (/(success|saved|created|updated|submitted|approved|done|sent|deleted|completed|added)/.test(text)) return 'success';
  return 'info';
}
const TONES = {
  danger:  { icon: 'trash', color: COLORS.error, bg: COLORS.errorBg },
  error:   { icon: 'alert', color: COLORS.error, bg: COLORS.errorBg },
  success: { icon: 'check-circle', color: COLORS.success, bg: COLORS.successBg },
  info:    { icon: 'info', color: COLORS.link, bg: COLORS.linkBg },
};

export function DialogHost() {
  const [queue, setQueue] = useState([]);
  const anim = useRef(new Animated.Value(0)).current;
  const current = queue[0];

  useEffect(() => {
    push = (d) => setQueue((q) => [...q, d]);
    return () => { push = null; };
  }, []);

  useEffect(() => {
    if (!current) return;
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 220, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
  }, [current]);

  const close = (btn) => {
    setQueue((q) => q.slice(1));
    if (btn?.onPress) setTimeout(() => btn.onPress(), 10);
  };
  const onBack = () => {
    if (!current) return false;
    const cancel = current.buttons.find((b) => b.style === 'cancel');
    if (cancel || current.options.cancelable !== false || current.buttons.length === 1) close(cancel || current.buttons[0]);
    return true;
  };

  if (!current) return null;
  const tone = TONES[toneOf(current)];
  const stacked = current.buttons.length > 2;
  // native Alert order: cancel first; keep the affirmative action on the right
  const btns = [...current.buttons].sort((a, b) => (a.style === 'cancel' ? -1 : b.style === 'cancel' ? 1 : 0));

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onBack} statusBarTranslucent>
      <Pressable style={st.backdrop} onPress={() => current.options.cancelable && onBack()}>
        <Animated.View style={[st.card, { transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }] }]}>
          <Pressable>
            <View style={[st.badge, { backgroundColor: tone.bg }]}>
              <AppIcon name={tone.icon} size={24} color={tone.color} />
            </View>
            {current.title ? <Text style={st.title}>{current.title}</Text> : null}
            {current.message ? <Text style={st.message}>{current.message}</Text> : null}
            <View style={[st.actions, stacked && { flexDirection: 'column-reverse' }]}>
              {btns.map((b, i) => {
                const kind = b.style === 'cancel' ? 'ghost' : b.style === 'destructive' ? 'danger' : (btns.length > 1 && i < btns.length - 1 && !stacked ? 'ghost' : 'primary');
                return (
                  <Pressable key={i} onPress={() => close(b)}
                    style={({ pressed }) => [st.btn, stacked ? { alignSelf: 'stretch' } : { flex: 1 }, st[kind], pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}>
                    <Text style={[st.btnText, kind === 'ghost' ? { color: COLORS.textPrimary } : { color: '#fff' }]} numberOfLines={1}>{b.text || 'OK'}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: COLORS.overlay, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 380, backgroundColor: COLORS.surface, borderRadius: 28, padding: 22, borderWidth: COLORS.isDark ? 1 : 0, borderColor: COLORS.border, ...SHADOWS.lg },
  badge: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 6 },
  message: { fontSize: 14, lineHeight: 21, color: COLORS.textSecondary },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  btn: { paddingVertical: 13, paddingHorizontal: 16, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  ghost: { backgroundColor: COLORS.surface3 },
  primary: { backgroundColor: COLORS.primaryButton },
  danger: { backgroundColor: COLORS.errorSolid },
  btnText: { fontSize: 15, fontWeight: '700' },
});
