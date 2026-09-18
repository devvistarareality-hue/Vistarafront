import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Stop, Rect } from 'react-native-svg';
import { COLORS } from '../constants/theme';

// App-wide backdrop matching the website: a warm (dark) / blue (light) glow from
// the top, a cool haze on the right and a faint lift bottom-left. Drawn once
// behind the navigator; screens are transparent so it shows through.
const SCENE = COLORS.isDark
  ? { top: '#0B0908', bottom: '#030303', glow: '#FF6020', glowO: 0.30, haze: '#BEC8D7', hazeO: 0.10, lift: '#FF6E2D', liftO: 0.06 }
  : { top: '#F8FBFF', bottom: '#E6EEF8', glow: '#3777C4', glowO: 0.22, haze: '#96B4DC', hazeO: 0.30, lift: '#3777C4', liftO: 0.08 };

export default function AppBackground() {
  const s = SCENE;
  return (
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
  );
}
