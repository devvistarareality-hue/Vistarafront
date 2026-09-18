import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text } from 'react-native';
import { COLORS } from '../constants/theme';

// Premium bouncing-ball-on-steps loader — native port of the Uiverse (alexruix)
// loader used on the website.
const STEPS = [{ x: 75, y: 18 }, { x: 40, y: 58 }, { x: 5, y: 98 }];
const BALL_COLOR = COLORS.isDark ? '#FF7A3D' : '#2F6DB5';
const STEP_COLOR = COLORS.isDark ? '#2A2422' : '#B9CDE4';

export default function AppLoader({ label, size = 1, style, fullScreen = false }) {
  const step = useRef(new Animated.Value(0)).current;
  const ball = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const a = Animated.loop(Animated.timing(step, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }));
    const b = Animated.loop(Animated.sequence([
      Animated.timing(ball, { toValue: 1, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(ball, { toValue: 0, duration: 500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    a.start(); b.start();
    return () => { a.stop(); b.stop(); };
  }, []);

  const bars = [
    // new step fading in at the top
    { from: STEPS[0], to: STEPS[0], fade: [0, 1] },
    { from: STEPS[0], to: STEPS[1], fade: [1, 1] },
    { from: STEPS[1], to: STEPS[2], fade: [1, 1] },
    // bottom step fading out
    { from: STEPS[2], to: STEPS[2], fade: [1, 0] },
  ];

  const body = (
    <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]} accessibilityRole="progressbar">
      <View style={{ width: 120, height: 120, transform: [{ scale: size }] }}>
        {bars.map((b, i) => (
          <Animated.View key={i} style={{
            position: 'absolute', left: 0, top: 0, width: 45, height: 7, borderRadius: 4, backgroundColor: STEP_COLOR,
            opacity: step.interpolate({ inputRange: [0, 1], outputRange: b.fade }),
            transform: [
              { translateX: step.interpolate({ inputRange: [0, 1], outputRange: [b.from.x, b.to.x] }) },
              { translateY: step.interpolate({ inputRange: [0, 1], outputRange: [b.from.y, b.to.y] }) },
            ],
          }} />
        ))}
        <Animated.View style={{
          position: 'absolute', left: 50, top: 60, width: 30, height: 30, borderRadius: 15, backgroundColor: BALL_COLOR,
          shadowColor: BALL_COLOR, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 4,
          transform: [
            { translateY: ball.interpolate({ inputRange: [0, 1], outputRange: [0, -62] }) },
            { scaleY: ball.interpolate({ inputRange: [0, 0.15, 0.4, 1], outputRange: [0.72, 1.15, 1, 1] }) },
            { scaleX: ball.interpolate({ inputRange: [0, 0.15, 0.4, 1], outputRange: [1.12, 0.85, 1, 1] }) },
          ],
        }} />
      </View>
      {label ? <Text style={{ marginTop: 6, fontSize: 13, fontWeight: '600', color: COLORS.textSecondary }}>{label}</Text> : null}
    </View>
  );
  if (!fullScreen) return body;
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.screenBg }}>{body}</View>;
}
