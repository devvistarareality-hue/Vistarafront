import React, { useState, useRef } from 'react';
import { View, Text, PanResponder } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle, Rect, Text as SvgText } from 'react-native-svg';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const TEXT  = COLORS.textPrimary;
const MUTED = COLORS.textSecondary;
const CARD  = { backgroundColor: COLORS.cardBg, borderRadius: 16, ...CARD_SHADOW };

// Fill every day in [dateFrom, dateTo] so gaps render as 0 (uses local date keys).
export function fillDates(rows, dateFrom, dateTo) {
  const map = {};
  (rows || []).forEach(r => { map[r.date] = r.count; });
  const result = [];
  const cur = new Date(dateFrom + 'T00:00:00');
  const end = new Date(dateTo + 'T00:00:00');
  const localKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  while (cur <= end) {
    const key = localKey(cur);
    result.push({ date: key, count: map[key] ?? 0 });
    cur.setDate(cur.getDate() + 1);
  }
  return result;
}

function MiniAreaChart({ data = [], color, gradId, width }) {
  const H = 110, padL = 28, padR = 8, padT = 8, padB = 22;
  const W = width - padL - padR;
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const [activeIdx, setActiveIdx] = useState(null);

  const shortDate = (s) => { const d = new Date(s + 'T00:00:00'); return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => {
      const x = e.nativeEvent.locationX;
      const idx = Math.round((x - padL) / W * (data.length - 1));
      setActiveIdx(Math.max(0, Math.min(data.length - 1, idx)));
    },
    onPanResponderMove: (e) => {
      const x = e.nativeEvent.locationX;
      const idx = Math.round((x - padL) / W * (data.length - 1));
      setActiveIdx(Math.max(0, Math.min(data.length - 1, idx)));
    },
    onPanResponderRelease: () => setActiveIdx(null),
    onPanResponderTerminate: () => setActiveIdx(null),
  })).current;

  if (!data.length || !width) return null;

  const px = (i) => padL + (i / (data.length - 1 || 1)) * W;
  const py = (v) => padT + (1 - v / maxVal) * (H - padT - padB);
  const linePts = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(d.count).toFixed(1)}`).join(' ');
  const fillPts = `${linePts} L${px(data.length - 1).toFixed(1)},${(H - padB).toFixed(1)} L${padL},${(H - padB).toFixed(1)} Z`;
  const labelIdxs = data.length <= 5 ? data.map((_, i) => i) : [0, Math.floor(data.length * 0.25), Math.floor(data.length * 0.5), Math.floor(data.length * 0.75), data.length - 1];

  const active = activeIdx !== null ? data[activeIdx] : null;
  const activePx = active ? px(activeIdx) : null;
  const activePy = active ? py(active.count) : null;

  const tooltipW = 72, tooltipH = 34;
  const tooltipX = active ? Math.min(Math.max(activePx - tooltipW / 2, padL), padL + W - tooltipW) : 0;
  const tooltipY = active ? Math.max(activePy - tooltipH - 8, padT) : 0;

  return (
    <View {...panResponder.panHandlers}>
      <Svg width={width} height={H}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Line x1={padL} y1={H - padB} x2={padL + W} y2={H - padB} stroke="#F0F3FA" strokeWidth={1} />
        <Path d={fillPts} fill={`url(#${gradId})`} />
        <Path d={linePts} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {labelIdxs.map(i => (
          <SvgText key={i} x={px(i)} y={H - 4} fontSize={9} fill={MUTED} textAnchor="middle">{shortDate(data[i].date)}</SvgText>
        ))}
        <SvgText x={padL - 4} y={padT + 4} fontSize={9} fill={MUTED} textAnchor="end">{maxVal}</SvgText>

        {active && (
          <>
            <Line x1={activePx} y1={padT} x2={activePx} y2={H - padB} stroke={color} strokeWidth={1} strokeDasharray="3 3" />
            <Circle cx={activePx} cy={activePy} r={5} fill={color} stroke="#fff" strokeWidth={2} />
            <Rect x={tooltipX} y={tooltipY} width={tooltipW} height={tooltipH} rx={6} fill="#1A1A2E" />
            <SvgText x={tooltipX + tooltipW / 2} y={tooltipY + 13} fontSize={9} fill="#B0BAD0" textAnchor="middle">{shortDate(active.date)}</SvgText>
            <SvgText x={tooltipX + tooltipW / 2} y={tooltipY + 27} fontSize={13} fontWeight="700" fill="#fff" textAnchor="middle">{active.count}</SvgText>
          </>
        )}
      </Svg>
    </View>
  );
}

export function TrendCard({ title, badge, total, data, color, gradId }) {
  const [width, setWidth] = useState(0);
  return (
    <View style={[CARD, { marginBottom: 12, padding: 16, overflow: 'hidden' }]} onLayout={e => setWidth(e.nativeEvent.layout.width - 32)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <View>
          <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>{title}</Text>
          <Text style={{ fontSize: 26, fontWeight: '800', color: TEXT }}>{total}</Text>
        </View>
        <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: color + '22' }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color }}>{badge}</Text>
        </View>
      </View>
      {width > 0 && data.length > 0
        ? <MiniAreaChart data={data} color={color} gradId={gradId} width={width} />
        : <View style={{ height: 90, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 12, color: MUTED }}>No data</Text></View>
      }
    </View>
  );
}
