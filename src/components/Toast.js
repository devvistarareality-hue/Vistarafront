import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { COLORS, SHADOWS } from '../constants/theme';
import AppIcon from './AppIcon';

// White card with a tinted icon badge — same toast design as the website.
const KIND = {
  success: { icon: 'check-circle', color: COLORS.success,  bg: COLORS.successBg },
  error:   { icon: 'alert',        color: COLORS.error,    bg: COLORS.errorBg },
  info:    { icon: 'info',         color: COLORS.link,     bg: COLORS.linkBg },
};

const Toast = ({ visible, message, type = 'success', duration = 2500, onHide }) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 6 }),
      Animated.timing(opacity,    { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -100, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity,    { toValue: 0,    duration: 250, useNativeDriver: true }),
      ]).start(() => onHide?.());
    }, duration);

    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;
  const kind = KIND[type] ?? KIND.info;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], opacity }]}>
      <View style={[styles.badge, { backgroundColor: kind.bg }]}>
        <AppIcon name={kind.icon} size={18} color={kind.color} />
      </View>
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position:     'absolute',
    top:          12,
    left:         16,
    right:        16,
    flexDirection: 'row',
    alignItems:   'center',
    gap:          12,
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    paddingVertical:   10,
    paddingHorizontal: 12,
    zIndex:       999,
    ...SHADOWS.lg,
  },
  badge: {
    width: 34, height: 34, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  message: {
    flex:       1,
    color:      COLORS.textPrimary,
    fontSize:   14,
    fontWeight: '600',
  },
});

export default Toast;
