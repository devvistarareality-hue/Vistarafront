import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Image, Modal, TextInput, Linking, Platform, StyleSheet, Dimensions } from 'react-native';
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

const STATUS = {
  available: { label: 'Available', dot: COLORS.success, bg: COLORS.successBg },
  hold:      { label: 'On Hold',   dot: COLORS.warning, bg: COLORS.warningBg },
  sold:      { label: 'Sold',      dot: COLORS.error,   bg: COLORS.errorBg },
};

const isPdfUrl   = (u) => !!u && u.split('?')[0].toLowerCase().endsWith('.pdf');
const isImageUrl = (u) => !!u && /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(u);

function zoneCenter(zone) {
  if (zone.points?.length) {
    return { cx: zone.points.reduce((s, p) => s + p.x, 0) / zone.points.length,
             cy: zone.points.reduce((s, p) => s + p.y, 0) / zone.points.length };
  }
  return { cx: zone.x + zone.width / 2, cy: zone.y + zone.height / 2 };
}

export default function ClosureViewerScreen({ navigation, route }) {
  const { projectId } = route.params || {};
  const sv   = route.params?.sv || null;
  const user = useSelector((s) => s.auth.user);

  const [project, setProject] = useState(null);
  const [plots,   setPlots]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter,     setFilter]     = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [zoomMaster, setZoomMaster] = useState(false);
  const [sources, setSources] = useState([]);

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

  const zones    = project?.site_map_zones || [];
  const mapImage = project?.site_map_image_url || (isImageUrl(project?.master_plan_url) ? project.master_plan_url : '');
  const hasMap   = !!mapImage && zones.length > 0;

  const counts = useMemo(() => {
    const c = { available: 0, hold: 0, sold: 0 };
    plots.forEach(p => { if (c[p.status] != null) c[p.status]++; });
    return c;
  }, [plots]);
  const total = plots.length;
  const pct   = (n) => (total ? Math.round(n / total * 100) : 0);

  const plotByNumber = useMemo(() => {
    const m = {}; plots.forEach(p => { m[String(p.number)] = p; }); return m;
  }, [plots]);

  const types = useMemo(() => [...new Set(plots.map(p => p.cluster_type).filter(Boolean))].sort(), [plots]);
  const isHidden = (plot) =>
    (filter !== 'all' && plot.status !== filter) ||
    (typeFilter !== 'all' && plot.cluster_type !== typeFilter);
  const shownCount = plots.filter(p => !isHidden(p)).length;

  function pickPlot(plot) {
    if (!plot || plot.status !== 'available') return; // only Available selectable
    setSelected(plot);
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
            {sv ? `Tap an available unit to close for ${sv.lead_name}` : (project.location || 'Units')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
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
                  const cfg = STATUS[plot.status] || STATUS.available;
                  const dim = isHidden(plot);
                  const op = dim ? 0.08 : 1;
                  const { cx, cy } = zoneCenter(zone);
                  const labelText = String(zone.plotNumber).replace(/^[^\d]+/, '') || String(zone.plotNumber);
                  const press = () => pickPlot(plot);
                  return (
                    <React.Fragment key={zone.id}>
                      {zone.points?.length
                        ? <Polygon points={zone.points.map(p => `${p.x},${p.y}`).join(' ')} fill={cfg.dot + '99'} stroke={cfg.dot} strokeWidth="0.5" opacity={op} onPress={press} />
                        : <Rect x={zone.x} y={zone.y} width={zone.width} height={zone.height} rx="0.4" fill={cfg.dot + '99'} stroke={cfg.dot} strokeWidth="0.5" opacity={op} onPress={press} />
                      }
                      <SvgText x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="2.6" fontWeight="bold" fill={COLORS.white} opacity={op} onPress={press}>{labelText}</SvgText>
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
            {!plots.length ? (
              <Text style={{ color: MUTED, fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>No units defined.</Text>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {plots.filter(p => !isHidden(p)).map(plot => {
                  const cfg = STATUS[plot.status] || STATUS.available;
                  const clickable = plot.status === 'available';
                  return (
                    <TouchableOpacity key={plot.id} disabled={!clickable} onPress={() => pickPlot(plot)}
                      style={{ minWidth: 54, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: cfg.dot, backgroundColor: cfg.bg, opacity: clickable ? 1 : 0.55, alignItems: 'center' }}>
                      <Text style={{ fontWeight: '800', fontSize: 13, color: cfg.dot }}>{plot.number}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {selected && (
        <UnitModal plot={selected} project={project} sv={sv} user={user} sources={sources}
          onClose={() => setSelected(null)}
          onClosed={() => navigation.navigate(sv ? 'SalesSiteVisits' : 'SalesMyConversions')} />
      )}

      {/* Enlarged, pannable, tappable unit map */}
      <InteractiveMapModal
        visible={zoomMaster}
        uri={mapImage}
        zones={zones}
        plotByNumber={plotByNumber}
        isHidden={isHidden}
        onPick={(plot) => { setZoomMaster(false); setSelected(plot); }}
        onClose={() => setZoomMaster(false)}
      />
    </SafeAreaView>
  );
}

/* ── Unit detail: floor-plan layouts + record-closure form ── */
function UnitModal({ plot, project, sv, user, sources = [], onClose, onClosed }) {
  const cfg = STATUS[plot.status] || STATUS.available;
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
                <Text style={{ fontSize: 11, fontWeight: '800', color: cfg.dot }}>{cfg.label}</Text>
              </View>
              <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={MUTED} /></TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {/* Unit info */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
              {!!plot.size   && <InfoBox label="Unit Area" value={plot.size} />}
              {!!plot.facing && <InfoBox label="Facing" value={plot.facing} />}
              {!!plot.price  && <InfoBox label="Price" value={plot.price} />}
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

            {/* Booking & closure are both handled by the booking web app
                (own login, auto-LOI, Google Sheet). */}
            <TouchableOpacity onPress={() => { Linking.openURL(BOOKING_SCRIPT_URL).catch(() => {}); }}
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
function InteractiveMapModal({ visible, uri, zones, plotByNumber, isHidden, onPick, onClose }) {
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
          <Text style={{ color: COLORS.white, fontSize: 15, fontWeight: '800' }}>Tap an available unit</Text>
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
                  const cfg = STATUS[plot.status] || STATUS.available;
                  const op = isHidden(plot) ? 0.08 : 1;
                  const { cx, cy } = zoneCenter(zone);
                  const labelText = String(zone.plotNumber).replace(/^[^\d]+/, '') || String(zone.plotNumber);
                  const press = () => { if (plot.status === 'available') onPick(plot); };
                  return (
                    <React.Fragment key={zone.id}>
                      {zone.points?.length
                        ? <Polygon points={zone.points.map(p => `${p.x},${p.y}`).join(' ')} fill={cfg.dot + '99'} stroke={cfg.dot} strokeWidth="0.5" opacity={op} onPress={press} />
                        : <Rect x={zone.x} y={zone.y} width={zone.width} height={zone.height} rx="0.4" fill={cfg.dot + '99'} stroke={cfg.dot} strokeWidth="0.5" opacity={op} onPress={press} />
                      }
                      <SvgText x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="2.4" fontWeight="bold" fill={COLORS.white} opacity={op} onPress={press}>{labelText}</SvgText>
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
