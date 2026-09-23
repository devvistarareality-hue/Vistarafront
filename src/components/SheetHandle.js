import React, { useRef } from 'react';
import { View, PanResponder, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

// The small bar at the top of a bottom sheet. Swiping it down closes the sheet
// (pull ~50px, or a quick flick). Pass `onMove` to have the sheet follow the
// finger; FormSheet does. Only this bar takes the drag, so the sheet's own
// ScrollView keeps scrolling normally.
export const CLOSE_DISTANCE = 50;
export const CLOSE_VELOCITY = 0.6;

export default function SheetHandle({ onClose, onMove, onCancel, style }) {
  const cb = useRef({});
  cb.current = { onClose, onMove, onCancel };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 3,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => cb.current.onMove?.(Math.max(0, g.dy)),
    onPanResponderRelease: (_, g) => {
      if (g.dy > CLOSE_DISTANCE || g.vy > CLOSE_VELOCITY) cb.current.onClose?.();
      else cb.current.onCancel?.();
    },
    onPanResponderTerminate: () => cb.current.onCancel?.(),
  })).current;
  return (
    <View {...pan.panHandlers} style={[s.zone, style]} accessibilityRole="adjustable" accessibilityLabel="Drag down to close">
      <View style={s.bar} />
    </View>
  );
}

const s = StyleSheet.create({
  zone: { alignSelf: 'stretch', alignItems: 'center', paddingTop: 10, paddingBottom: 10 },
  bar: { width: 44, height: 5, borderRadius: 3, backgroundColor: COLORS.divider },
});
