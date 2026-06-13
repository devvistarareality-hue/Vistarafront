import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';

const BG = {
  success: '#2E7D32',
  error:   '#C62828',
  info:    '#1565C0',
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

  return (
    <Animated.View style={[styles.container, { backgroundColor: BG[type] ?? BG.info, transform: [{ translateY }], opacity }]}>
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
    borderRadius: 10,
    paddingVertical:   12,
    paddingHorizontal: 16,
    zIndex:       999,
    elevation:    8,
    shadowColor:  '#000',
    shadowOpacity: 0.2,
    shadowOffset:  { width: 0, height: 2 },
    shadowRadius:  4,
  },
  message: {
    color:      '#fff',
    fontSize:   14,
    fontWeight: '600',
    textAlign:  'center',
  },
});

export default Toast;
