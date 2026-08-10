import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Image, Modal, TextInput, Linking, Platform, StyleSheet, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSelector } from 'react-redux';
import Svg, { Rect, Polygon, Text as SvgText } from 'react-native-svg';
import { apiFetch } from '../../utils/apiFetch';
import { SALES_ENDPOINTS } from '../../constants/api';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

const NAVY = COLORS.navy; const BLUE = COLORS.link; const BG = COLORS.screenBg;
const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;

// Booking web app (own login + form → records booking, auto-LOI, Google Sheet).
const BOOKING_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbypnmUmBmBIrL5rC6xqSEbLFDvSw1XvES6D-JyL1beY8-AeEREnfvVM_TbbbV1t1i883g/exec';
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, ...CARD_SHADOW };

// Stored as 'road' / 'garden'; shown in full wherever a unit is surfaced.
const FACING_LABEL = { road: 'Road Facing', garden: 'Garden Facing' };

const STATUS = {
  available: { label: 'Available', dot: COLORS.success, bg: COLORS.successBg },
  hold:      { label: 'On Hold',   dot: COLORS.warning, bg: COLORS.warningBg },
  sold:      { label: 'Sold',      dot: COLORS.error,   bg: COLORS.errorBg },
  // A unit with a saved (unsubmitted) draft — same underlying plot.status='hold' as a
  // bare in-progress selection, but shown grey and distinct so the team can tell "someone
  // is mid-paperwork on this" from "someone just tapped it a second ago".
  drafted:   { label: 'Drafted',   dot: COLORS.textSecondary, bg: COLORS.surfaceAlt },
};
// Visual state for a plot, folding in the drafted override — everywhere the map colours
// a unit should go through this instead of indexing STATUS[plot.status] directly.
const plotCfg = (plot) => (plot.drafted_booking_id ? STATUS.drafted : (STATUS[plot.status] || STATUS.available));

const isPdfUrl   = (u) => !!u && u.split('?')[0].toLowerCase().endsWith('.pdf');
const isImageUrl = (u) => !!u && /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(u);

// Visual centre of a zone. Uses the polygon's area centroid (shoelace), not the average
// of its vertices — unit outlines are notched, and a vertex average drifts toward
// wherever points cluster, which floated labels above their unit. Falls back to the
// bounding box for degenerate (zero-area) shapes.
function zoneCenter(zone) {
  const pts = zone.points || [];
  if (pts.length) {
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const bbox = { cx: (Math.min(...xs) + Math.max(...xs)) / 2, cy: (Math.min(...ys) + Math.max(...ys)) / 2 };
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < pts.length; i++) {
      const p0 = pts[i], p1 = pts[(i + 1) % pts.length];
      const cross = p0.x * p1.y - p1.x * p0.y;
      a += cross; cx += (p0.x + p1.x) * cross; cy += (p0.y + p1.y) * cross;
    }
    a *= 0.5;
    if (Math.abs(a) < 1e-9) return bbox;
    return { cx: cx / (6 * a), cy: cy / (6 * a) };
  }
  return { cx: (zone.x || 0) + (zone.width || zone.w || 0) / 2, cy: (zone.y || 0) + (zone.height || zone.h || 0) / 2 };
}

export default function ClosureViewerScreen({ navigation, route }) {
  const { projectId } = route.params || {};
  const sv   = route.params?.sv || null;
  const user = useSelector((s) => s.auth.user);
  const isManager = user?.role === 'Admin' || user?.role === 'Manager' || user?.is_staff;

  const [project, setProject] = useState(null);
  const [plots,   setPlots]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]); // multi-select: plot ids to book together
  const [filter,     setFilter]     = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [zoomMaster, setZoomMaster] = useState(false);
  const [sources, setSources] = useState([]);
  const [notice,  setNotice]  = useState(''); // transient banner (unit taken / hold expired)
  const [busyIds, setBusyIds] = useState(() => new Set()); // plot ids with an in-flight hold/release call
  const [draftPanelPlot, setDraftPanelPlot] = useState(null); // drafted unit tapped into

  function flash(text) {
    setNotice(text);
    setTimeout(() => setNotice((n) => (n === text ? '' : n)), 4500);
  }

  useEffect(() => {
    Promise.all([
      apiFetch(SALES_ENDPOINTS.project(projectId)).then(r => r.ok ? r.json() : null).catch(() => null),
      apiFetch(`${SALES_ENDPOINTS.plots}?project=${projectId}`).then(r => r.ok ? r.json() : []).catch(() => []),
      apiFetch(SALES_ENDPOINTS.sources).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([p, pl, src]) => {
      setProject(p);
      setPlots(Array.isArray(pl) ? pl : (pl?.results || []));
      setSources(Array.isArray(src) ? src : (src?.results || []));
      setLoading(false);
    });
  }, [projectId]);

  // Other reps hold/release units live — poll so this rep sees a unit turn orange
  // (or free up again) without a manual refresh.
  useEffect(() => {
    const poll = setInterval(() => {
      apiFetch(`${SALES_ENDPOINTS.plots}?project=${projectId}`).then(r => r.ok ? r.json() : []).then((pl) => {
        const fresh = Array.isArray(pl) ? pl : (pl?.results || []);
        setPlots(fresh);
        const freshById = new Map(fresh.map((p) => [p.id, p]));
        setSelectedIds((ids) => ids.filter((pid) => {
          const fp = freshById.get(pid);
          const stillMine = !!fp && fp.status === 'hold' && (!user?.name || fp.held_by_name === user.name);
          if (!stillMine && fp) flash(`Your hold on Plot ${fp.number} expired or was released — please reselect.`);
          return stillMine;
        }));
      }).catch(() => {});
    }, 30_000);
    return () => clearInterval(poll);
  }, [projectId, user]);

  // A tower is browsed one floor at a time: each floor has its own plan and its own
  // zones, so the map, the unit list and the counts are all scoped to the chosen floor.
  const floorWise = !!project?.floor_wise;
  const allFloors = useMemo(() => (project?.floor_plans || []), [project]);
  // A tower may be one block or several (A, B, C…), each with its own floor count —
  // so pick the block first, then the floor within it.
  const blocks = useMemo(() => {
    const seen = [];
    allFloors.forEach(f => { const b = f.block || ''; if (!seen.includes(b)) seen.push(b); });
    return seen.length ? seen : [''];
  }, [allFloors]);
  // A block's height is quoted the way the trade quotes it — "G+12", ground plus the
  // floors above it — not as a raw floor count. A block with no ground floor falls
  // back to counting.
  const blockHeight = (b) => {
    const fs = allFloors.filter(f => (f.block || '') === b);
    const upper = fs.filter(f => Number(f.floor) > 0).length;
    return fs.some(f => Number(f.floor) === 0) ? `G+${upper}` : `${fs.length}`;
  };
  const [blockIdx, setBlockIdx] = useState(0);
  const activeBlock = blocks[Math.min(blockIdx, blocks.length - 1)] ?? '';
  const floors = useMemo(
    () => allFloors.filter(f => (f.block || '') === activeBlock)
                   .slice().sort((a, b) => (Number(a.floor) || 0) - (Number(b.floor) || 0)),
    [allFloors, activeBlock],
  );
  const [floorIdx, setFloorIdx] = useState(0);
  // Open on the ground floor — that's where a walk-in starts. Re-runs on a block
  // change so switching block lands on its ground floor, not a stale index.
  useEffect(() => {
    if (!floorWise || !floors.length) return;
    const g = floors.findIndex(f => Number(f.floor) === 0);
    setFloorIdx(g >= 0 ? g : 0);
  }, [floorWise, floors.length, activeBlock]);
  const activeFloor = floorWise ? floors[Math.min(floorIdx, Math.max(floors.length - 1, 0))] : null;

  // Units belonging to the chosen floor — by the floor field, falling back to the
  // floor's own numbering run for units created before that field existed.
  const onFloor = (p, f) => {
    if (!f) return true;
    // Both blocks have a floor 1, so the floor number alone is not enough — units
    // carry their block as a prefix ("A-101"), which is what separates them.
    const bp = f.block ? `${f.block}-` : '';
    if (bp && !String(p.number || '').startsWith(bp)) return false;
    if (p.floor !== null && p.floor !== undefined) return Number(p.floor) === Number(f.floor);
    const from = parseInt(f.from, 10), to = parseInt(f.to, 10);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return false;
    const n = String(p.number);
    for (let i = from; i <= to; i++) if (`${f.prefix || ''}${i}` === n) return true;
    return false;
  };
  const visiblePlots = useMemo(
    () => (floorWise && activeFloor ? plots.filter(p => onFloor(p, activeFloor)) : plots),
    [plots, floorWise, activeFloor],
  );

  const zones    = floorWise ? (activeFloor?.zones || []) : (project?.site_map_zones || []);
  const mapImage = floorWise
    ? (activeFloor?.image_url || '')
    : (project?.site_map_image_url || (isImageUrl(project?.master_plan_url) ? project.master_plan_url : ''));
  const hasMap   = !!mapImage && zones.length > 0;

  const counts = useMemo(() => {
    const c = { available: 0, hold: 0, sold: 0 };
    visiblePlots.forEach(p => { if (c[p.status] != null) c[p.status]++; });
    return c;
  }, [visiblePlots]);
  const total = visiblePlots.length;
  const pct   = (n) => (total ? Math.round(n / total * 100) : 0);

  const plotByNumber = useMemo(() => {
    const m = {}; visiblePlots.forEach(p => { m[String(p.number)] = p; }); return m;
  }, [visiblePlots]);

  const types = useMemo(() => [...new Set(visiblePlots.map(p => p.cluster_type).filter(Boolean))].sort(), [visiblePlots]);
  const isHidden = (plot) =>
    (filter !== 'all' && plot.status !== filter) ||
    (typeFilter !== 'all' && plot.cluster_type !== typeFilter);
  // Which floor each selected unit sits on — shown only when the selection spans
  // several, so picking a shop and a flat together reads clearly.
  const floorOf = (p) => { const f = floors.find((x) => onFloor(p, x)); return f ? (f.label || `Floor ${f.floor}`) : ''; };
  const shownCount = visiblePlots.filter(p => !isHidden(p)).length;

  // Multi-select: a client can buy several plots in one booking. Tapping an
  // available unit toggles it; the action bar books all selected together.
  // Selecting soft-locks the unit server-side immediately (turns it orange for every
  // other rep), so two salespeople can't both spend time signing an LOI for the same
  // unit — deselecting (or Clear) releases it again.
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  async function releasePlots(ids) {
    if (!ids.length) return;
    try {
      await apiFetch(SALES_ENDPOINTS.plotsRelease, { method: 'POST', body: JSON.stringify({ plot_ids: ids }) });
    } catch (_) {}
    setPlots((ps) => ps.map((p) => (ids.includes(p.id) ? { ...p, status: 'available', held_by_name: null } : p)));
  }

  // Discard a draft from the map's panel — the drafter or a manager/admin, matching
  // the backend permission on BookingDiscardDraftView.
  async function discardDraftFromPanel(bookingId) {
    setDraftPanelPlot(null);
    try {
      await apiFetch(SALES_ENDPOINTS.bookingDiscard(bookingId), { method: 'POST' });
    } catch (_) {}
    apiFetch(`${SALES_ENDPOINTS.plots}?project=${projectId}`).then(r => r.ok ? r.json() : []).then((pl) => setPlots(Array.isArray(pl) ? pl : (pl?.results || []))).catch(() => {});
  }

  async function pickPlot(plot) {
    if (!plot || busyIds.has(plot.id)) return;
    // A drafted unit is out of the normal select/hold flow entirely — it's not
    // something to select for a new booking. Tapping it opens a small panel: the
    // drafter can resume or discard it, a manager/admin can discard it, anyone else
    // just sees who has it.
    if (plot.drafted_booking_id) {
      setDraftPanelPlot(plot);
      return;
    }
    if (selectedSet.has(plot.id)) {
      setSelectedIds((ids) => ids.filter((x) => x !== plot.id));
      releasePlots([plot.id]);
      return;
    }
    if (plot.status !== 'available') return; // only Available selectable
    setBusyIds((s) => new Set(s).add(plot.id));
    try {
      const res = await apiFetch(SALES_ENDPOINTS.plotsHold, { method: 'POST', body: JSON.stringify({ plot_ids: [plot.id] }) });
      const data = await res.json().catch(() => ({}));
      if (data.held?.includes(plot.id)) {
        setPlots((ps) => ps.map((p) => (p.id === plot.id ? { ...p, status: 'hold', held_by_name: user?.name || p.held_by_name } : p)));
        setSelectedIds((ids) => (ids.includes(plot.id) ? ids : [...ids, plot.id]));
      } else {
        const f = (data.failed || [])[0];
        flash(f?.reason === 'sold'
          ? `Plot ${f.number || plot.number} was just sold — pick a different unit.`
          : `Plot ${f?.number || plot.number} was just selected by another salesperson — pick a different one.`);
        apiFetch(`${SALES_ENDPOINTS.plots}?project=${projectId}`).then(r => r.ok ? r.json() : []).then((pl) => setPlots(Array.isArray(pl) ? pl : (pl?.results || []))).catch(() => {});
      }
    } finally {
      setBusyIds((s) => { const n = new Set(s); n.delete(plot.id); return n; });
    }
  }
  const selPlots = useMemo(() => selectedIds.map((pid) => plots.find((p) => p.id === pid)).filter(Boolean), [selectedIds, plots]);
  const selArea = useMemo(() => selPlots.reduce((a, p) => a + (parseFloat(String(p.size || '').replace(/[^\d.]/g, '')) || 0), 0), [selPlots]);
  function bookSelected() {
    if (!selectedIds.length) return;
    navigation.navigate('BookingForm', {
      project: project?.id, plots: selectedIds.join(','),
      plotNumber: selPlots.map((p) => p.number).join(', '),
      projectName: project?.name, formulaSet: project?.formula_set,
      lead: sv?.lead, client: sv?.lead_name, phone: sv?.lead_phone,
      convertEoi: route.params?.convertEoi,   // carry the source EOI id when converting
    });
  }

  if (loading) return <SafeAreaView style={{ flex: 1, backgroundColor: BG }}><ActivityIndicator size="large" color={BLUE} style={{ marginTop: 60 }} /></SafeAreaView>;
  if (!project) return <SafeAreaView style={{ flex: 1, backgroundColor: BG }}><Text style={{ textAlign: 'center', marginTop: 60, color: MUTED }}>Project not found.</Text></SafeAreaView>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT }} numberOfLines={1}>{project.name}</Text>
          <Text style={{ fontSize: 12, color: sv ? BLUE : MUTED }} numberOfLines={1}>
            {sv ? `Tap units to select for ${sv.lead_name}` : (project.location || 'Tap units to select')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {!!notice && (
          <View style={{ padding: 12, borderRadius: 10, backgroundColor: COLORS.warningBg, borderWidth: 1, borderColor: COLORS.warning, marginBottom: 12 }}>
            <Text style={{ color: '#78350F', fontSize: 13, fontWeight: '600' }}>⚠ {notice}</Text>
          </View>
        )}
        {/* Status filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 10 }}>
          {[['all', 'All'], ['available', 'Available'], ['sold', 'Sold'], ['hold', 'On Hold']].map(([key, label]) => {
            const active = filter === key; const dot = STATUS[key]?.dot;
            return (
              <TouchableOpacity key={key} onPress={() => setFilter(key)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: active ? COLORS.goldDark : COLORS.border, backgroundColor: active ? '#FBF4DF' : COLORS.white }}>
                {dot && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dot }} />}
                <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#8a6d1f' : MUTED }}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {/* Tower: choose the floor first — its plan and its units are what's shown below. */}
        {floorWise && blocks.filter(Boolean).length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 10 }}>
            {blocks.map((b, i) => {
              const active = i === Math.min(blockIdx, blocks.length - 1);
              return (
                <TouchableOpacity key={`b${i}`} onPress={() => { setBlockIdx(i); setFloorIdx(0); }}
                  style={{ paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5,
                    borderColor: active ? BLUE : COLORS.border, backgroundColor: active ? '#EEF1FF' : COLORS.white }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: active ? BLUE : MUTED }}>
                    Block {b || '—'} · {blockHeight(b)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
        {floorWise && floors.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
            {floors.map((f, i) => {
              const active = i === Math.min(floorIdx, floors.length - 1);
              const n = plots.filter((p) => onFloor(p, f)).length;
              return (
                <TouchableOpacity key={i} onPress={() => setFloorIdx(i)}
                  style={{ paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5,
                    borderColor: active ? BLUE : COLORS.border, backgroundColor: active ? '#EEF1FF' : COLORS.white }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: active ? BLUE : MUTED }}>
                    {f.label || `Floor ${f.floor}`} · {n}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Type filters */}
        {types.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
            {['all', ...types].map(t => {
              const active = typeFilter === t;
              return (
                <TouchableOpacity key={t} onPress={() => setTypeFilter(t)}
                  style={{ paddingHorizontal: 13, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: active ? COLORS.goldDark : COLORS.border, backgroundColor: active ? '#FBF4DF' : COLORS.white }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#8a6d1f' : MUTED }}>{t === 'all' ? 'All Types' : t}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Stat cards */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          {[['available', counts.available], ['hold', counts.hold], ['sold', counts.sold]].map(([key, n]) => {
            const cfg = STATUS[key];
            return (
              <View key={key} style={[CARD, { flex: 1, padding: 12 }]}>
                <Text style={{ fontSize: 20, fontWeight: '900', color: TEXT }}>{n}</Text>
                <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{cfg.label} · {pct(n)}%</Text>
                <View style={{ height: 3, borderRadius: 3, backgroundColor: cfg.dot, marginTop: 6, opacity: 0.5 }} />
              </View>
            );
          })}
        </View>

        {/* Interactive map */}
        {hasMap ? (
          <View style={[CARD, { overflow: 'hidden' }]}>
            <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT }}>Interactive Unit Map</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#8a6d1f' }}>Showing {shownCount}/{total}</Text>
                <TouchableOpacity onPress={() => setZoomMaster(true)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.linkBg }}>
                  <Ionicons name="expand-outline" size={15} color={BLUE} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: BLUE }}>Zoom</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ width: '100%' }}>
              <Image source={{ uri: mapImage }} style={{ width: '100%', aspectRatio: 16 / 10 }} resizeMode="contain" />
              <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
                {zones.map(zone => {
                  const plot = plotByNumber[String(zone.plotNumber)];
                  if (!plot) return null;
                  const cfg = plotCfg(plot);
                  const dim = isHidden(plot);
                  const op = dim ? 0.08 : 1;
                  const { cx, cy } = zoneCenter(zone);
                  const labelText = String(zone.plotNumber).replace(/^[^\d]+/, '') || String(zone.plotNumber);
                  const press = () => pickPlot(plot);
                  const isSel = selectedSet.has(plot.id);
                  const fillC = isSel ? '#3D5AFE' : cfg.dot + '99';
                  const strokeC = isSel ? '#1A237E' : cfg.dot;
                  const sw = isSel ? '0.9' : '0.5';
                  return (
                    <React.Fragment key={zone.id}>
                      {zone.points?.length
                        ? <Polygon points={zone.points.map(p => `${p.x},${p.y}`).join(' ')} fill={fillC} stroke={strokeC} strokeWidth={sw} opacity={op} onPress={press} />
                        : <Rect x={zone.x} y={zone.y} width={zone.width} height={zone.height} rx="0.4" fill={fillC} stroke={strokeC} strokeWidth={sw} opacity={op} onPress={press} />
                      }
                      <SvgText x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="2.6" fontWeight="bold" fill={COLORS.white} opacity={op} onPress={press}>{isSel ? `✓${labelText}` : labelText}</SvgText>
                      {/* Drafted units name their drafter right on the map — who
                          everyone else needs to know to ask about the unit. */}
                      {plot.drafted_booking_id && plot.held_by_name && (
                        <SvgText x={cx} y={cy + 3.2} textAnchor="middle" dominantBaseline="middle" fontSize="1.7" fontWeight="700" fill={COLORS.white} opacity={op} onPress={press}>{plot.held_by_name}</SvgText>
                      )}
                    </React.Fragment>
                  );
                })}
              </Svg>
            </View>
          </View>
        ) : (
          <View style={[CARD, { padding: 14 }]}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT, marginBottom: 4 }}>Units</Text>
            <Text style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>No site map drawn. Tap an available unit below.</Text>
            {!visiblePlots.length ? (
              <Text style={{ color: MUTED, fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>No units defined.</Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {visiblePlots.filter(p => !isHidden(p)).map(plot => {
                  const cfg = plotCfg(plot);
                  const isSel = selectedSet.has(plot.id);
                  // Any drafted unit is tappable — it opens the draft panel for everyone,
                  // just with different actions inside depending on who's looking.
                  const clickable = plot.status === 'available' || isSel || !!plot.drafted_booking_id;
                  return (
                    <TouchableOpacity key={plot.id} disabled={!clickable} onPress={() => pickPlot(plot)}
                      style={{ minWidth: 84, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: isSel ? '#1A237E' : cfg.dot, backgroundColor: isSel ? '#3D5AFE' : cfg.bg, opacity: clickable ? 1 : 0.55, alignItems: 'center' }}>
                      <Text style={{ fontWeight: '800', fontSize: 13, color: isSel ? '#fff' : cfg.dot }}>{isSel ? `✓ ${plot.number}` : plot.number}</Text>
                      {/* No plan drawn for this floor, so the chip is the only place these
                          price-affecting details can surface. Same reasoning for who
                          drafted a grey unit: print the name, don't rely on a tap-and-hold. */}
                      {plot.drafted_booking_id && !!plot.held_by_name && <Text style={{ fontSize: 10, fontWeight: '600', marginTop: 2, color: isSel ? '#E8EEFF' : MUTED }}>{plot.held_by_name}</Text>}
                      {!!plot.size && <Text style={{ fontSize: 10, fontWeight: '600', marginTop: 2, color: isSel ? '#E8EEFF' : MUTED }}>{plot.size}</Text>}
                      {!!plot.facing && <Text style={{ fontSize: 10, fontWeight: '600', color: isSel ? '#E8EEFF' : MUTED }}>{FACING_LABEL[plot.facing] || plot.facing}</Text>}
                      {!!(plot.terrace_area || '').trim() && <Text style={{ fontSize: 10, fontWeight: '600', color: isSel ? '#E8EEFF' : MUTED }}>Terrace {plot.terrace_area} sq.yd</Text>}
                      {/* Who is on a booked unit, so the team can see it without opening the plot. */}
                      {!!plot.agent_name && <Text style={{ fontSize: 10, fontWeight: '600', color: isSel ? '#E8EEFF' : MUTED }}>{plot.status === 'hold' ? 'On hold by' : 'Sold by'} {plot.agent_name}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Multi-select action bar — books all selected plots in one booking. */}
      {selPlots.length > 0 && (
        <View style={{ position: 'absolute', left: 12, right: 12, bottom: 16, backgroundColor: COLORS.white, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: COLORS.border, ...CARD_SHADOW }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: TEXT }}>
              {selPlots.length} plot{selPlots.length > 1 ? 's' : ''} selected{selArea > 0 ? ` · ${+selArea.toFixed(2)} area` : ''}
            </Text>
            <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }} numberOfLines={2}>{(() => {
              const fl = [...new Set(selPlots.map(floorOf).filter(Boolean))];
              return (floorWise && fl.length > 1)
                ? fl.map((lbl) => `${lbl}: ${selPlots.filter((p) => floorOf(p) === lbl).map((p) => p.number).join(', ')}`).join('  ·  ')
                : `Plot ${selPlots.map((p) => p.number).join(', ')}`;
            })()}</Text>
          </View>
          <TouchableOpacity onPress={() => { const ids = [...selectedIds]; setSelectedIds([]); releasePlots(ids); }} style={{ paddingHorizontal: 10, paddingVertical: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: MUTED }}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={bookSelected} style={{ backgroundColor: COLORS.success, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11 }}>
            <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 14 }}>{sv ? 'Record Closure' : 'Book'} →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Enlarged, pannable, tappable unit map — multi-select continues here */}
      <InteractiveMapModal
        visible={zoomMaster}
        uri={mapImage}
        zones={zones}
        plotByNumber={plotByNumber}
        isHidden={isHidden}
        selectedSet={selectedSet}
        onPick={(plot) => pickPlot(plot)}
        onClose={() => setZoomMaster(false)}
      />

      {/* Drafted-unit panel — resume (drafter) / discard (drafter or manager/admin). */}
      {!!draftPanelPlot && (() => {
        const p = draftPanelPlot;
        const mine = !!p.held_by_name && p.held_by_name === user?.name;
        const canDiscard = mine || isManager;
        return (
          <Modal visible transparent animationType="fade" onRequestClose={() => setDraftPanelPlot(null)}>
            <TouchableOpacity activeOpacity={1} onPress={() => setDraftPanelPlot(null)}
              style={{ flex: 1, backgroundColor: 'rgba(15,28,46,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <TouchableOpacity activeOpacity={1} onPress={() => {}}
                style={{ backgroundColor: COLORS.white, borderRadius: 18, padding: 22, width: '100%', maxWidth: 360 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 }}>Unit {p.number} · Drafted</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT, marginTop: 4, marginBottom: 18 }}>
                  {p.held_by_name ? `Drafted by ${p.held_by_name}` : 'Drafted'}
                </Text>
                <View style={{ gap: 10 }}>
                  {mine && (
                    <TouchableOpacity onPress={() => { setDraftPanelPlot(null); navigation.navigate('BookingForm', { draft: p.drafted_booking_id }); }}
                      style={{ paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.link, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>▸ Resume</Text>
                    </TouchableOpacity>
                  )}
                  {canDiscard && (
                    <TouchableOpacity onPress={() => Alert.alert('Discard draft?', 'This can\'t be undone.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Discard', style: 'destructive', onPress: () => discardDraftFromPanel(p.drafted_booking_id) },
                    ])}
                      style={{ paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.errorBg, borderWidth: 1.5, borderColor: '#FECACA', alignItems: 'center' }}>
                      <Text style={{ color: COLORS.error, fontWeight: '700', fontSize: 14 }}>✕ Discard Draft</Text>
                    </TouchableOpacity>
                  )}
                  {!canDiscard && (
                    <Text style={{ fontSize: 12, color: MUTED }}>Only {p.held_by_name || 'the drafter'} or a manager can resume or discard this.</Text>
                  )}
                  <TouchableOpacity onPress={() => setDraftPanelPlot(null)}
                    style={{ paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.surfaceAlt, alignItems: 'center' }}>
                    <Text style={{ color: MUTED, fontWeight: '700', fontSize: 13 }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
        );
      })()}
    </SafeAreaView>
  );
}

/* ── Unit detail: floor-plan layouts + record-closure form ── */
function UnitModal({ plot, project, sv, user, sources = [], onClose, onClosed, onBook }) {
  const cfg = plotCfg(plot);
  const typePlans = useMemo(() => {
    const entry = (project.plot_type_plans || []).find(t => t.name === plot.cluster_type);
    return entry?.floor_plans || [];
  }, [project, plot]);
  const booking = !sv; // no site visit → direct booking from the Booking nav

  const [viewing, setViewing] = useState(null);

  function openPlan(url) {
    if (isImageUrl(url)) setViewing(url);
    else Linking.openURL(url).catch(() => {});
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(15,28,46,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: cfg.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
            <View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED }}>Unit No.</Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: TEXT }}>{plot.number}</Text>
            </View>
            <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
              {!!plot.cluster_type && (
                <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: COLORS.white }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#673AB7' }}>{plot.cluster_type}</Text>
                </View>
              )}
              <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: COLORS.white }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: cfg.dot }}>
                  {cfg.label}{plot.held_by_name && plot.status === 'hold' ? ` · ${plot.held_by_name}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={MUTED} /></TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {/* Unit info */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              {!!plot.size   && <InfoBox label="Unit Area" value={plot.size} />}
              {/* Facing and terrace both move the price, so show them here — facing is
                  stored as 'road'/'garden', which reads poorly raw. */}
              {!!plot.facing && <InfoBox label="Facing" value={FACING_LABEL[plot.facing] || plot.facing} />}
              {!!(plot.terrace_area || '').trim() && <InfoBox label="Terrace" value={`${plot.terrace_area} sq.yd`} />}
              {!!plot.price  && <InfoBox label="Price" value={plot.price} />}
              {!!plot.agent_name && <InfoBox label={plot.status === 'hold' ? 'On Hold By' : 'Sold By'} value={plot.agent_name} />}
            </View>

            {/* Floor plan layouts (per-unit only; the map is the master layout) */}
            {typePlans.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', letterSpacing: 0.5, color: MUTED, marginBottom: 8 }}>FLOOR PLAN LAYOUTS</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {typePlans.map((fp, i) => (
                    <TouchableOpacity key={i} onPress={() => openPlan(fp.url)}
                      style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.goldDark + '40', backgroundColor: COLORS.goldDark + '12' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.goldDark }}>🔍 {fp.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Native ERP booking form. */}
            <TouchableOpacity onPress={onBook}
              style={{ backgroundColor: COLORS.success, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
              <Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 15 }}>{booking ? `Book Unit ${plot.number}` : `Record Closure for Unit ${plot.number}`}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Floor plan image viewer — zoomable */}
      <ZoomableImageModal visible={!!viewing} uri={viewing} onClose={() => setViewing(null)} />
    </Modal>
  );
}

/* ── Fullscreen zoomable image (master layout / floor plans) ──
   Dependency-free: iOS gets native pinch via ScrollView maximumZoomScale;
   both platforms get +/- buttons (scale the image) and pan via nested
   ScrollViews when zoomed beyond the screen. */
function ZoomableImageModal({ visible, uri, onClose }) {
  const { width: SW, height: SH } = Dimensions.get('window');
  const [scale, setScale] = useState(1);
  const baseW = SW, baseH = SH * 0.82;
  const w = baseW * scale, h = baseH * scale;
  const zoomIn  = () => setScale(s => Math.min(5, +(s + 0.5).toFixed(1)));
  const zoomOut = () => setScale(s => Math.max(1, +(s - 0.5).toFixed(1)));
  const reset   = () => setScale(1);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} onShow={reset}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
        <ScrollView
          style={{ flex: 1 }}
          maximumZoomScale={5} minimumZoomScale={1} bouncesZoom
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
            {!!uri && <Image source={{ uri }} style={{ width: w, height: h }} resizeMode="contain" />}
          </ScrollView>
        </ScrollView>

        {/* Controls */}
        <View style={{ position: 'absolute', bottom: 40, alignSelf: 'center', flexDirection: 'row', gap: 12, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 30, padding: 8 }}>
          <TouchableOpacity onPress={zoomOut} style={zBtn}><Ionicons name="remove" size={24} color={COLORS.white} /></TouchableOpacity>
          <TouchableOpacity onPress={reset} style={zBtn}><Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 13 }}>{Math.round(scale * 100)}%</Text></TouchableOpacity>
          <TouchableOpacity onPress={zoomIn} style={zBtn}><Ionicons name="add" size={24} color={COLORS.white} /></TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onClose} style={{ position: 'absolute', top: 50, right: 24 }}>
          <Ionicons name="close-circle" size={38} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

/* ── Fullscreen INTERACTIVE map — enlarged, pannable, tappable zones ──
   Solves the "plots too small/congested to tap" problem on the inline map. */
function InteractiveMapModal({ visible, uri, zones, plotByNumber, isHidden, selectedSet, onPick, onClose }) {
  const { width: SW } = Dimensions.get('window');
  const [scale, setScale] = useState(2);
  const [nat, setNat] = useState({ w: 16, h: 10 });
  const w = SW * scale, h = SW * (nat.h / nat.w) * scale;
  const zoomIn  = () => setScale(s => Math.min(6, +(s + 0.5).toFixed(1)));
  const zoomOut = () => setScale(s => Math.max(1, +(s - 0.5).toFixed(1)));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} onShow={() => setScale(2)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.96)' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 10 }}>
          <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: '800' }}>Tap units to select</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close-circle" size={34} color={COLORS.white} /></TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} maximumZoomScale={4} minimumZoomScale={1} bouncesZoom
          showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: w, height: h }}>
              <Image source={{ uri }} style={{ width: w, height: h }} resizeMode="contain"
                onLoad={({ nativeEvent }) => { if (nativeEvent?.source) setNat({ w: nativeEvent.source.width || 16, h: nativeEvent.source.height || 10 }); }} />
              <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
                {zones.map(zone => {
                  const plot = plotByNumber[String(zone.plotNumber)];
                  if (!plot) return null;
                  const cfg = plotCfg(plot);
                  const op = isHidden(plot) ? 0.08 : 1;
                  const { cx, cy } = zoneCenter(zone);
                  const labelText = String(zone.plotNumber).replace(/^[^\d]+/, '') || String(zone.plotNumber);
                  const isSel = selectedSet?.has(plot.id);
                  // onPick is pickPlot from the parent — it already decides what a tap
                  // does (deselect, select-if-available, resume-if-mine-drafted, or
                  // no-op), so this gate just forwards every tap rather than duplicating
                  // that logic (this modal doesn't have the logged-in user to check with).
                  const press = () => onPick(plot);
                  const fillC = isSel ? '#3D5AFE' : cfg.dot + '99';
                  const strokeC = isSel ? '#1A237E' : cfg.dot;
                  const sw = isSel ? '0.9' : '0.5';
                  return (
                    <React.Fragment key={zone.id}>
                      {zone.points?.length
                        ? <Polygon points={zone.points.map(p => `${p.x},${p.y}`).join(' ')} fill={fillC} stroke={strokeC} strokeWidth={sw} opacity={op} onPress={press} />
                        : <Rect x={zone.x} y={zone.y} width={zone.width} height={zone.height} rx="0.4" fill={fillC} stroke={strokeC} strokeWidth={sw} opacity={op} onPress={press} />
                      }
                      <SvgText x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="2.4" fontWeight="bold" fill={COLORS.white} opacity={op} onPress={press}>{isSel ? `✓${labelText}` : labelText}</SvgText>
                    </React.Fragment>
                  );
                })}
              </Svg>
            </View>
          </ScrollView>
        </ScrollView>
        {/* Zoom controls */}
        <View style={{ position: 'absolute', bottom: 40, alignSelf: 'center', flexDirection: 'row', gap: 12, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 30, padding: 8 }}>
          <TouchableOpacity onPress={zoomOut} style={zBtn}><Ionicons name="remove" size={24} color={COLORS.white} /></TouchableOpacity>
          <View style={[zBtn, { width: 56 }]}><Text style={{ color: COLORS.white, fontWeight: '800', fontSize: 13 }}>{Math.round(scale * 100)}%</Text></View>
          <TouchableOpacity onPress={zoomIn} style={zBtn}><Ionicons name="add" size={24} color={COLORS.white} /></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function InfoBox({ label, value }) {
  return (
    <View style={{ flexGrow: 1, minWidth: '46%', backgroundColor: BG, borderRadius: 12, padding: 12 }}>
      <Text style={{ fontSize: 11, color: MUTED, marginBottom: 3 }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>{value}</Text>
    </View>
  );
}

const zBtn = { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' };
const lblS = { fontSize: 11, fontWeight: '700', color: MUTED, letterSpacing: 0.5, marginBottom: 6, marginTop: 8 };
const inpS = { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: TEXT, backgroundColor: COLORS.white };
const pickBtn = { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, backgroundColor: COLORS.white };
