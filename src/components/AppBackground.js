import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Easing, View, AccessibilityInfo } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect, Circle } from 'react-native-svg';
import { COLORS } from '../constants/theme';

// App-wide backdrop matching the website: a warm (dark) / blue (light) glow from
// the top, a cool haze on the right and a faint lift bottom-left. Drawn once
// behind the navigator; screens are transparent so it shows through.
const SCENE = COLORS.isDark
  ? { top: '#0B0908', bottom: '#030303', glow: '#FF6020', glowO: 0.30, haze: '#BEC8D7', hazeO: 0.10, lift: '#FF6E2D', liftO: 0.06 }
  // Light has to carry as much blue as dark carries ember, so the glow is deeper
  // and the sheet is tinted rather than near-white.
  : { top: '#EAF2FC', bottom: '#D6E4F5', glow: '#2668BA', glowO: 0.42, haze: '#6096D6', hazeO: 0.30, lift: '#2F6DB5', liftO: 0.20 };

// Blurred gradient bubbles drifting slowly (same idea as the website's backdrop).
const BUBBLES = COLORS.isDark
  ? [{ c: '#FF6020', o: 0.22, size: 360, x: '48%', y: -120, dx: 50, dy: 40, t: 17000 },
     { c: '#FFA05A', o: 0.12, size: 300, x: '62%', y: 280, dx: -40, dy: 60, t: 21000 },
     { c: '#AAB9D7', o: 0.08, size: 320, x: '-20%', y: 520, dx: 60, dy: -40, t: 19000 },
     { c: '#C83C14', o: 0.14, size: 220, x: '10%', y: 180, dx: 40, dy: 50, t: 23000 }]
  : [{ c: '#2668BA', o: 0.34, size: 360, x: '48%', y: -120, dx: 50, dy: 40, t: 17000 },
     { c: '#6096D6', o: 0.36, size: 300, x: '62%', y: 280, dx: -40, dy: 60, t: 21000 },
     { c: '#4CAABE', o: 0.22, size: 320, x: '-20%', y: 520, dx: 60, dy: -40, t: 19000 },
     { c: '#1F5490', o: 0.24, size: 220, x: '10%', y: 180, dx: 40, dy: 50, t: 23000 }];

function Bubble({ b, i, still }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) return undefined;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: b.t, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: b.t, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [still]);
  const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [0, b.dx] });
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, b.dy] });
  const scale = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.08, 0.96] });
  return (
    <Animated.View pointerEvents="none" renderToHardwareTextureAndroid shouldRasterizeIOS style={{ position: 'absolute', left: b.x, top: b.y, width: b.size, height: b.size, transform: [{ translateX }, { translateY }, { scale }] }}>
      <Svg width={b.size} height={b.size}>
        <Defs>
          <RadialGradient id={`bub${i}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor={b.c} stopOpacity={b.o} />
            <Stop offset="0.55" stopColor={b.c} stopOpacity={b.o * 0.45} />
            <Stop offset="1" stopColor={b.c} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={b.size / 2} cy={b.size / 2} r={b.size / 2} fill={`url(#bub${i})`} />
      </Svg>
    </Animated.View>
  );
}

function Bubbles() {
  const [still, setStill] = React.useState(false);
  useEffect(() => { AccessibilityInfo.isReduceMotionEnabled?.().then((r) => setStill(!!r)).catch(() => {}); }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {BUBBLES.map((b, i) => <Bubble key={i} b={b} i={i} still={still} />)}
    </View>
  );
}

function AppBackgroundImpl() {
  const s = SCENE;
  return (
    <>
    <View style={StyleSheet.absoluteFill} pointerEvents="none" renderToHardwareTextureAndroid shouldRasterizeIOS>
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" pointerEvents="none">
      <Defs>
        <LinearGradient id="base" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={s.top} />
          <Stop offset="1" stopColor={s.bottom} />
        </LinearGradient>
        <RadialGradient id="glow" cx="0.6" cy="-0.06" rx="0.95" ry="0.42" fx="0.6" fy="-0.06">
          <Stop offset="0" stopColor={s.glow} stopOpacity={s.glowO} />
          <Stop offset="0.45" stopColor={s.glow} stopOpacity={s.glowO * 0.25} />
          <Stop offset="1" stopColor={s.glow} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="haze" cx="1.04" cy="0.42" rx="0.75" ry="0.45" fx="1.04" fy="0.42">
          <Stop offset="0" stopColor={s.haze} stopOpacity={s.hazeO} />
          <Stop offset="1" stopColor={s.haze} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="lift" cx="-0.06" cy="1.04" rx="0.8" ry="0.35" fx="-0.06" fy="1.04">
          <Stop offset="0" stopColor={s.lift} stopOpacity={s.liftO} />
          <Stop offset="1" stopColor={s.lift} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#base)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#haze)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#lift)" />
    </Svg>
    </View>
    <Bubbles />
    </>
  );
}

const AppBackground = React.memo(AppBackgroundImpl);
export default AppBackground;
