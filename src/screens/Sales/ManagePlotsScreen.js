'use strict';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, ScrollView,
  TextInput, StyleSheet, ActivityIndicator, Alert, StatusBar,
  Image, Dimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Rect, Polygon, Circle, Text as SvgText, Polyline } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { SALES_ENDPOINTS } from '../../constants/api';
import { uploadToSupabase } from '../../utils/supabaseStorage';

const { width: SW } = Dimensions.get('window');
const NAVY  = '#182350';
const BLUE  = '#3D5AFE';
const BG    = '#F5F6FA';
const TEXT  = '#1A1A2E';
const MUTED = '#8492A6';
const CARD  = { backgroundColor: '#fff', borderRadius: 14, shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 4 };

const STATUS_CFG = {
  available: { label: 'Available', color: '#2E7D32', bg: '#E8F5E9', border: '#2E7D32', zone: '#22c55e' },
  hold:      { label: 'Hold',      color: '#E65100', bg: '#FFF3E0', border: '#E65100', zone: '#f59e0b' },
  sold:      { label: 'Sold',      color: '#EF4444', bg: '#FEE2E2', border: '#EF4444', zone: '#ef4444' },
};

const UNITS  = ['sqft', 'sqmtr', 'sqyrds', 'bigha'];
const BLOCKS = ['A','B','C','D','E','F','G','H'];

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

function parseSizeUnit(str) {
  if (!str) return { sizeVal: '', unit: 'sqft' };
  const found = UNITS.find(u => str.toLowerCase().includes(u));
  if (found) return { sizeVal: str.replace(new RegExp(found, 'i'), '').trim(), unit: found };
  return { sizeVal: str.trim(), unit: 'sqft' };
}

function zoneCenter(zone) {
  if (zone.points?.length) {
    return { cx: zone.points.reduce((s, p) => s + p.x, 0) / zone.points.length,
             cy: zone.points.reduce((s, p) => s + p.y, 0) / zone.points.length };
  }
  return { cx: zone.x + zone.width / 2, cy: zone.y + zone.height / 2 };
}

/* ────────────────────────────────────────────────
   PLOT EDIT MODAL
──────────────────────────────────────────────── */
function PlotEditModal({ plot, visible, onClose, onSaved }) {
  const [plotNo,  setPlotNo]  = useState('');
  const [sizeVal, setSizeVal] = useState('');
  const [unit,    setUnit]    = useState('sqft');
  const [block,   setBlock]   = useState('');
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (plot) {
      const p = parseSizeUnit(plot.size);
      setPlotNo(String(plot.number)); setSizeVal(p.sizeVal); setUnit(p.unit);
      setBlock(plot.cluster_type || '');
    }
  }, [plot, visible]);

  async function save() {
    setSaving(true);
    try {
      const headers = await authHeaders();
      const combined = sizeVal ? `${sizeVal} ${unit}` : '';
      const res = await fetch(SALES_ENDPOINTS.plot(plot.id), {
        method: 'PATCH', headers, body: JSON.stringify({ number: plotNo, size: combined, cluster_type: block }),
      });
      if (res.ok) { onSaved(await res.json()); onClose(); }
      else { Alert.alert('Error', 'Could not save plot.'); }
    } catch (e) { Alert.alert('Network error', e.message); }
    finally { setSaving(false); }
  }

  const inpS = { borderWidth: 1.5, borderColor: '#E0E6F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: TEXT, backgroundColor: '#fff' };
  const lblS = { fontSize: 10, fontWeight: '700', color: '#B0BAC9', textTransform: 'uppercase', marginBottom: 5 };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: BG, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 }}>
          {/* Handle */}
          <View style={{ width: 40, height: 4, backgroundColor: '#DDE3F0', borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT, marginBottom: 18 }}>Edit Plot</Text>

          <Text style={lblS}>Plot No.</Text>
          <TextInput value={plotNo} onChangeText={setPlotNo} placeholder="e.g. D-1, A1" style={[inpS, { marginBottom: 14 }]} />

          <Text style={lblS}>Size</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            <TextInput value={sizeVal} onChangeText={setSizeVal} placeholder="5000" keyboardType="numeric"
              style={[inpS, { flex: 1 }]} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxWidth: 220 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {UNITS.map(u => (
                  <TouchableOpacity key={u} onPress={() => setUnit(u)}
                    style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
                      backgroundColor: unit === u ? BLUE : '#F0F3FA', borderWidth: 1.5,
                      borderColor: unit === u ? BLUE : '#E0E6F0' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: unit === u ? '#fff' : MUTED }}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <Text style={lblS}>Block</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {BLOCKS.map(b => (
              <TouchableOpacity key={b} onPress={() => setBlock(block === b ? '' : b)}
                style={{ width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: block === b ? NAVY : '#F0F3FA' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: block === b ? '#fff' : MUTED }}>{b}</Text>
              </TouchableOpacity>
            ))}
            <TextInput value={!BLOCKS.includes(block) ? block : ''} onChangeText={setBlock}
              placeholder="Other" style={[inpS, { width: 80, paddingVertical: 8, textAlign: 'center' }]} />
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={save} disabled={saving}
              style={{ flex: 1, paddingVertical: 13, backgroundColor: NAVY, borderRadius: 12, alignItems: 'center', opacity: saving ? 0.6 : 1 }}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Save</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}
              style={{ paddingHorizontal: 20, paddingVertical: 13, backgroundColor: '#F0F3FA', borderRadius: 12 }}>
              <Text style={{ color: MUTED, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ────────────────────────────────────────────────
   PLOT CARD
──────────────────────────────────────────────── */
function PlotCard({ plot, onStatusChange, onEdit }) {
  const cfg    = STATUS_CFG[plot.status] || STATUS_CFG.available;
  const [saving, setSaving] = useState(false);

  async function setStatus(s) {
    if (plot.status === s || saving) return;
    setSaving(true);
    await onStatusChange(plot.id, s);
    setSaving(false);
  }

  const cardW = (SW - 48) / 2;

  return (
    <View style={[CARD, { width: cardW, margin: 6, overflow: 'hidden', opacity: saving ? 0.7 : 1 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, backgroundColor: '#FAFBFF', borderBottomWidth: 1, borderBottomColor: '#F0F3FA' }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT }}>#{plot.number}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: cfg.bg }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: cfg.color }}>{cfg.label}</Text>
          </View>
          <TouchableOpacity onPress={() => onEdit(plot)} style={{ padding: 4 }}>
            <Ionicons name="pencil-outline" size={13} color={MUTED} />
          </TouchableOpacity>
        </View>
      </View>
      {(plot.size || plot.cluster_type) ? (
        <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F0F3FA' }}>
          <Text style={{ fontSize: 10, color: MUTED }} numberOfLines={1}>
            {[plot.size, plot.cluster_type].filter(Boolean).join(' · ')}
          </Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', padding: 8, gap: 4 }}>
        {Object.entries(STATUS_CFG).map(([s, c]) => (
          <TouchableOpacity key={s} onPress={() => setStatus(s)} disabled={plot.status === s || saving}
            style={{ flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center',
              backgroundColor: plot.status === s ? c.bg : '#fff',
              borderWidth: 1.5, borderColor: plot.status === s ? c.border + '80' : '#E0E6F0' }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: plot.status === s ? c.color : MUTED }}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* ────────────────────────────────────────────────
   SITE MAP EDITOR
──────────────────────────────────────────────── */
function SiteMapEditor({ project, plots, onProjectUpdate }) {
  const imgContainerRef = useRef(null);
  const [imgLayout,    setImgLayout]    = useState({ width: 1, height: 1 });
  const [imgNatSize,   setImgNatSize]   = useState({ w: 1, h: 1 });
  const [drawMode,     setDrawMode]     = useState('rect');
  const [polyPoints,   setPolyPoints]   = useState([]);
  const [currentRect,  setCurrentRect]  = useState(null);
  const [pendingZone,  setPendingZone]  = useState(null);
  const [plotInput,    setPlotInput]    = useState('');
  const [saving,       setSaving]       = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const touchStartRef = useRef(null);

  const zones         = project.site_map_zones    || [];
  const isImageUrl    = url => url && /\.(jpg|jpeg|png|webp|gif|svg)(\?|$)/i.test(url);
  const siteMapImage  = isImageUrl(project.master_plan_url)
    ? project.master_plan_url
    : (project.site_map_image_url || '');

  const mappedCount = zones.length;
  const totalPlots  = plots.length;

  async function persistZones(newZones) {
    setSaving(true);
    const headers = await authHeaders();
    const res = await fetch(SALES_ENDPOINTS.project(project.id), {
      method: 'PATCH', headers, body: JSON.stringify({ site_map_zones: newZones }),
    });
    if (res.ok) onProjectUpdate(await res.json());
    setSaving(false);
  }

  async function uploadSiteMapImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled) return;
    setUploading(true);
    try {
      const asset = result.assets[0];
      const url   = await uploadToSupabase(asset.uri, asset.mimeType || 'image/jpeg', 'erp/projects/sitemaps');
      const headers = await authHeaders();
      const res   = await fetch(SALES_ENDPOINTS.project(project.id), {
        method: 'PATCH', headers, body: JSON.stringify({ site_map_image_url: url, site_map_zones: [] }),
      });
      if (res.ok) onProjectUpdate(await res.json());
    } catch (e) { Alert.alert('Upload failed', e.message); }
    finally { setUploading(false); }
  }

  function toPct(x, y) {
    return {
      x: Math.max(0, Math.min(100, (x / imgLayout.width)  * 100)),
      y: Math.max(0, Math.min(100, (y / imgLayout.height) * 100)),
    };
  }

  /* Touch for rectangle draw */
  const touchHandlers = drawMode === 'rect' && siteMapImage && !pendingZone ? {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder:  () => true,
    onResponderGrant: (e) => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      touchStartRef.current = { x, y };
      setCurrentRect({ x, y, width: 0, height: 0 });
    },
    onResponderMove: (e) => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      const s = touchStartRef.current;
      if (!s) return;
      setCurrentRect({ x: Math.min(s.x, x), y: Math.min(s.y, y), width: Math.abs(x - s.x), height: Math.abs(y - s.y) });
    },
    onResponderRelease: (e) => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      const s = touchStartRef.current;
      touchStartRef.current = null;
      if (!s) return;
      const rx = Math.min(s.x, x), ry = Math.min(s.y, y);
      const rw = Math.abs(x - s.x), rh = Math.abs(y - s.y);
      setCurrentRect(null);
      if (rw > 8 && rh > 8) {
        const p = toPct(rx, ry);
        const pw = (rw / imgLayout.width)  * 100;
        const ph = (rh / imgLayout.height) * 100;
        setPendingZone({ x: p.x, y: p.y, width: pw, height: ph });
      }
    },
  } : {};

  function handleImageTap(e) {
    if (drawMode !== 'polygon' || pendingZone) return;
    const { locationX: x, locationY: y } = e.nativeEvent;
    setPolyPoints(prev => [...prev, toPct(x, y)]);
  }

  function finishPolygon() {
    if (polyPoints.length < 3) return;
    setPendingZone({ points: [...polyPoints] });
    setPolyPoints([]);
  }

  function cancelDraw() { setPolyPoints([]); setPendingZone(null); setCurrentRect(null); setPlotInput(''); }

  async function confirmZone() {
    const val = plotInput.trim();
    if (!val) return;
    await persistZones([...zones, { id: Date.now(), plotNumber: val, ...pendingZone }]);
    setPendingZone(null); setPlotInput('');
  }

  async function deleteZone(zoneId) {
    await persistZones(zones.filter(z => z.id !== zoneId));
  }

  function getZoneColor(plotNumber) {
    const pl = plots.find(p => String(p.number) === String(plotNumber));
    if (!pl) return '#B8960C';
    return STATUS_CFG[pl.status]?.zone || '#B8960C';
  }

  /* Convert percent coords to pixel for SVG (viewBox=0 0 100 100 preserveAspectRatio=none) */

  return (
    <View style={[CARD, { marginHorizontal: 16, marginBottom: 16, overflow: 'hidden' }]}>
      {/* Header */}
      <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: '#F0F3FA', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FAFBFF' }}>
        <View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6 }}>Interactive Site Map</Text>
          <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
            {siteMapImage ? `${mappedCount}/${totalPlots} zones mapped` : 'Upload master plan to draw zones'}
          </Text>
        </View>
        {siteMapImage && totalPlots > 0 ? (
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
            backgroundColor: mappedCount === totalPlots ? '#E8F5E9' : '#F0F3FF' }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: mappedCount === totalPlots ? '#2E7D32' : BLUE }}>
              {Math.round(mappedCount / totalPlots * 100)}%
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ padding: 14 }}>
        {/* No image — upload button */}
        {!siteMapImage && (
          <TouchableOpacity onPress={uploadSiteMapImage} disabled={uploading}
            style={{ borderWidth: 1.5, borderColor: '#E0E6F0', borderStyle: 'dashed', borderRadius: 10, paddingVertical: 28, alignItems: 'center', backgroundColor: '#FAFBFF' }}>
            {uploading ? <ActivityIndicator color={BLUE} /> : <>
              <Ionicons name="map-outline" size={32} color="#C0C8D8" />
              <Text style={{ fontSize: 13, color: MUTED, marginTop: 8 }}>
                {project.master_plan_url ? 'Upload site plan image' : 'Upload master plan first'}
              </Text>
            </>}
          </TouchableOpacity>
        )}

        {/* Image + SVG + draw controls */}
        {siteMapImage && (
          <>
            {/* Mode selector */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
              {[
                { id: 'rect',    icon: 'square-outline', label: 'Rectangle' },
                { id: 'polygon', icon: 'shapes-outline',  label: 'Polygon'   },
              ].map(m => (
                <TouchableOpacity key={m.id} onPress={() => { setDrawMode(m.id); cancelDraw(); }}
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
                    paddingVertical: 9, borderRadius: 10, backgroundColor: drawMode === m.id ? NAVY : '#F0F3FA',
                    borderWidth: 1.5, borderColor: drawMode === m.id ? NAVY : '#E0E6F0' }}>
                  <Ionicons name={m.icon} size={14} color={drawMode === m.id ? '#fff' : MUTED} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: drawMode === m.id ? '#fff' : MUTED }}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Instruction */}
            <View style={{ padding: 10, backgroundColor: '#F8F9FF', borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#E0E6F0' }}>
              <Text style={{ fontSize: 11, color: '#5C6BC0' }}>
                {drawMode === 'rect'
                  ? 'Drag on the image to draw a rectangle over a plot, then enter its plot number.'
                  : `Tap each corner of the plot to add vertices.${polyPoints.length >= 3 ? ' Tap "Done" to close the shape.' : ''}`}
                {polyPoints.length > 0 ? ` (${polyPoints.length} pts placed)` : ''}
              </Text>
            </View>

            {/* Polygon finish / cancel */}
            {drawMode === 'polygon' && polyPoints.length >= 3 && !pendingZone && (
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <TouchableOpacity onPress={finishPolygon}
                  style={{ flex: 1, paddingVertical: 9, backgroundColor: NAVY, borderRadius: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>✓ Done ({polyPoints.length} pts)</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={cancelDraw}
                  style={{ paddingHorizontal: 16, paddingVertical: 9, backgroundColor: '#F0F3FA', borderRadius: 10 }}>
                  <Text style={{ color: MUTED, fontWeight: '600', fontSize: 12 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Map image with SVG overlay */}
            <View
              ref={imgContainerRef}
              style={{ width: '100%', borderRadius: 10, overflow: 'hidden', backgroundColor: '#000' }}
              onLayout={e => setImgLayout({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
              {...touchHandlers}
              onStartShouldSetResponder={drawMode === 'polygon' && !pendingZone ? () => true : touchHandlers.onStartShouldSetResponder}
              onResponderRelease={drawMode === 'polygon' && !pendingZone ? (e) => { handleImageTap(e); } : touchHandlers.onResponderRelease}
            >
              <Image
                source={{ uri: siteMapImage }}
                style={{ width: '100%', aspectRatio: imgNatSize.w / imgNatSize.h || 4/3 }}
                resizeMode="contain"
                onLoad={({ nativeEvent }) => {
                  if (nativeEvent?.source) setImgNatSize({ w: nativeEvent.source.width || 4, h: nativeEvent.source.height || 3 });
                }}
              />
              {/* SVG overlay */}
              <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Saved zones */}
                {zones.map(zone => {
                  const color = getZoneColor(zone.plotNumber);
                  const { cx, cy } = zoneCenter(zone);
                  return (
                    <React.Fragment key={zone.id}>
                      {zone.points?.length
                        ? <Polygon points={zone.points.map(p => `${p.x},${p.y}`).join(' ')} fill={color + '55'} stroke={color} strokeWidth="0.6" />
                        : <Rect x={zone.x} y={zone.y} width={zone.width} height={zone.height} fill={color + '55'} stroke={color} strokeWidth="0.6" rx="0.3" />
                      }
                      <SvgText x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="3" fontWeight="bold" fill="#fff">{zone.plotNumber}</SvgText>
                    </React.Fragment>
                  );
                })}

                {/* Polygon in-progress */}
                {polyPoints.length > 1 && (
                  <Polyline points={polyPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={BLUE} strokeWidth="0.6" strokeDasharray="2,1.2" />
                )}
                {polyPoints.map((pt, i) => (
                  <Circle key={i} cx={pt.x} cy={pt.y} r="1.5" fill={BLUE} stroke="#fff" strokeWidth="0.4" />
                ))}

                {/* Live rectangle */}
                {currentRect && (
                  <Rect
                    x={(currentRect.x / imgLayout.width) * 100}
                    y={(currentRect.y / imgLayout.height) * 100}
                    width={(currentRect.width / imgLayout.width) * 100}
                    height={(currentRect.height / imgLayout.height) * 100}
                    fill="rgba(61,90,254,0.12)" stroke={BLUE} strokeWidth="0.5" strokeDasharray="2,1.2" />
                )}

                {/* Pending zone */}
                {pendingZone && (
                  pendingZone.points?.length
                    ? <Polygon points={pendingZone.points.map(p=>`${p.x},${p.y}`).join(' ')} fill="rgba(61,90,254,0.25)" stroke={BLUE} strokeWidth="0.7" />
                    : <Rect x={pendingZone.x} y={pendingZone.y} width={pendingZone.width} height={pendingZone.height} fill="rgba(61,90,254,0.25)" stroke={BLUE} strokeWidth="0.7" rx="0.3" />
                )}
              </Svg>
            </View>

            {/* Plot number input after drawing */}
            {pendingZone && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 12, backgroundColor: '#F0F3FF', borderRadius: 10, borderWidth: 1.5, borderColor: BLUE + '40' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: BLUE }}>Plot No.:</Text>
                <TextInput value={plotInput} onChangeText={setPlotInput} placeholder="e.g. D-1"
                  onSubmitEditing={confirmZone}
                  style={{ flex: 1, borderWidth: 1.5, borderColor: BLUE + '60', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, fontSize: 14, fontWeight: '700', color: TEXT, backgroundColor: '#fff' }} />
                <TouchableOpacity onPress={confirmZone}
                  style={{ paddingHorizontal: 14, paddingVertical: 9, backgroundColor: NAVY, borderRadius: 9 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={cancelDraw} style={{ padding: 6 }}>
                  <Ionicons name="close" size={18} color={MUTED} />
                </TouchableOpacity>
              </View>
            )}

            {/* Zones list */}
            {zones.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: TEXT }}>Saved zones ({zones.length})</Text>
                  {saving ? <ActivityIndicator size="small" color={BLUE} /> :
                    <TouchableOpacity onPress={() => Alert.alert('Clear all?', 'This will delete all zones.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Clear', style: 'destructive', onPress: () => persistZones([]) },
                    ])}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#EF4444' }}>Clear all</Text>
                    </TouchableOpacity>
                  }
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {[...zones].sort((a,b) => String(a.plotNumber).localeCompare(String(b.plotNumber), undefined, { numeric: true })).map(zone => {
                    const color = getZoneColor(zone.plotNumber);
                    return (
                      <TouchableOpacity key={zone.id} onPress={() => deleteZone(zone.id)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4,
                          borderRadius: 8, backgroundColor: color + '18', borderWidth: 1, borderColor: color + '55' }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color }}>{zone.plotNumber}</Text>
                        <Ionicons name="close" size={10} color={color} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={{ fontSize: 10, color: MUTED, marginTop: 6 }}>Tap a zone badge to remove it</Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

/* ────────────────────────────────────────────────
   MASTER PLAN SECTION
──────────────────────────────────────────────── */
function MasterPlanSection({ project, onProjectUpdate }) {
  const [uploading, setUploading] = useState(false);

  async function upload() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled) return;
    setUploading(true);
    try {
      const asset   = result.assets[0];
      const url     = await uploadToSupabase(asset.uri, asset.mimeType || 'image/jpeg', 'erp/projects/masterplans');
      const headers = await authHeaders();
      const res     = await fetch(SALES_ENDPOINTS.project(project.id), {
        method: 'PATCH', headers, body: JSON.stringify({ master_plan_url: url }),
      });
      if (res.ok) onProjectUpdate(await res.json());
    } catch (e) { Alert.alert('Upload failed', e.message); }
    finally { setUploading(false); }
  }

  const isImg = url => url && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);

  return (
    <View style={[CARD, { marginHorizontal: 16, marginBottom: 16, overflow: 'hidden' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F0F3FA', backgroundColor: '#FAFBFF' }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6 }}>Master Plan</Text>
        {project.master_plan_url ? (
          <TouchableOpacity onPress={upload} disabled={uploading}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: BLUE }}>Replace</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={{ padding: 14 }}>
        {project.master_plan_url ? (
          isImg(project.master_plan_url) ? (
            <Image source={{ uri: project.master_plan_url }} style={{ width: '100%', height: 220, borderRadius: 10, backgroundColor: '#EEF0F8' }} resizeMode="contain" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#F8F9FE', borderRadius: 10 }}>
              <Ionicons name="document-text-outline" size={24} color={BLUE} style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 13, color: BLUE, fontWeight: '600' }}>PDF uploaded — view on web</Text>
            </View>
          )
        ) : (
          <TouchableOpacity onPress={upload} disabled={uploading}
            style={{ borderWidth: 1.5, borderColor: '#E0E6F0', borderStyle: 'dashed', borderRadius: 10, paddingVertical: 24, alignItems: 'center', backgroundColor: '#FAFBFF' }}>
            {uploading ? <ActivityIndicator color={BLUE} /> : <>
              <Ionicons name="map-outline" size={28} color="#C0C8D8" />
              <Text style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>Upload master plan</Text>
            </>}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/* ────────────────────────────────────────────────
   MAIN SCREEN
──────────────────────────────────────────────── */
export default function ManagePlotsScreen({ route, navigation }) {
  const { projectId } = route.params;
  const [project,  setProject]  = useState(null);
  const [plots,    setPlots]    = useState([]);
  const [filter,   setFilter]   = useState('all');
  const [loading,  setLoading]  = useState(true);
  const [editPlot, setEditPlot] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const headers = await authHeaders();
      try {
        const [projRes, plotsRes] = await Promise.all([
          fetch(SALES_ENDPOINTS.project(projectId), { headers }),
          fetch(`${SALES_ENDPOINTS.plots}?project=${projectId}`, { headers }),
        ]);
        if (projRes.ok)  setProject(await projRes.json());
        if (plotsRes.ok) {
          const d = await plotsRes.json();
          setPlots(Array.isArray(d) ? d : (d.results || []));
        }
      } catch (e) { console.warn(e); }
      finally { setLoading(false); }
    })();
  }, [projectId]);

  const handleStatusChange = useCallback(async (plotId, newStatus) => {
    const headers = await authHeaders();
    const res = await fetch(SALES_ENDPOINTS.plot(plotId), {
      method: 'PATCH', headers, body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) { const u = await res.json(); setPlots(prev => prev.map(p => p.id === plotId ? u : p)); }
  }, []);

  const handlePlotUpdate = useCallback(updated => {
    setPlots(prev => prev.map(p => p.id === updated.id ? updated : p));
  }, []);

  const counts = {
    all:       plots.length,
    available: plots.filter(p => p.status === 'available').length,
    hold:      plots.filter(p => p.status === 'hold').length,
    sold:      plots.filter(p => p.status === 'sold').length,
  };
  const soldPct  = plots.length ? Math.round(counts.sold / plots.length * 100) : 0;
  const filtered = filter === 'all' ? plots : plots.filter(p => p.status === filter);

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={NAVY} />
    </SafeAreaView>
  );

  if (!project) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: MUTED }}>Project not found.</Text>
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
        <Text style={{ color: BLUE, fontWeight: '700' }}>Go back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F3FA' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT }} numberOfLines={1}>{project.name}</Text>
          {project.location ? <Text style={{ fontSize: 11, color: MUTED }}>{project.location}</Text> : null}
        </View>
        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: project.is_active ? '#E8F5E9' : '#FEE2E2' }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: project.is_active ? '#2E7D32' : '#EF4444' }}>
            {project.is_active ? 'ACTIVE' : 'INACTIVE'}
          </Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={p => String(p.id)}
        numColumns={2}
        columnWrapperStyle={{ paddingHorizontal: 10 }}
        contentContainerStyle={{ paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View>
            {/* Stats row */}
            <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
              {[
                { label: 'Total',     val: plots.length,   color: TEXT },
                { label: 'Available', val: counts.available, color: '#2E7D32' },
                { label: 'On Hold',   val: counts.hold,      color: '#E65100' },
                { label: 'Sold',      val: counts.sold,      color: '#EF4444' },
              ].map(s => (
                <View key={s.label} style={[CARD, { flex: 1, padding: 10, alignItems: 'center' }]}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: s.color }}>{s.val}</Text>
                  <Text style={{ fontSize: 9, color: MUTED, marginTop: 2, fontWeight: '600' }}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Sales progress */}
            {plots.length > 0 && (
              <View style={[CARD, { marginHorizontal: 16, marginBottom: 16, padding: 14 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: TEXT }}>Sales Progress</Text>
                  <Text style={{ fontSize: 12, color: MUTED }}>{soldPct}% sold</Text>
                </View>
                <View style={{ height: 8, borderRadius: 6, backgroundColor: '#F0F3FA', overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${soldPct}%`, backgroundColor: BLUE, borderRadius: 6 }} />
                </View>
              </View>
            )}

            {/* Master Plan */}
            <MasterPlanSection project={project} onProjectUpdate={setProject} />

            {/* Site Map Editor */}
            <SiteMapEditor project={project} plots={plots} onProjectUpdate={setProject} />

            {/* Filter tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8, flexDirection: 'row' }}>
              {[
                { key: 'all',       label: 'All',       color: TEXT,      bg: '#F0F3FF' },
                { key: 'available', label: 'Available', color: '#2E7D32', bg: '#E8F5E9' },
                { key: 'hold',      label: 'Hold',      color: '#E65100', bg: '#FFF3E0' },
                { key: 'sold',      label: 'Sold',      color: '#EF4444', bg: '#FEE2E2' },
              ].map(({ key, label, color, bg }) => (
                <TouchableOpacity key={key} onPress={() => setFilter(key)}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                    backgroundColor: filter === key ? bg : '#fff',
                    borderWidth: 1.5, borderColor: filter === key ? color + '60' : '#E0E6F0' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: filter === key ? color : MUTED }}>
                    {label} ({counts[key]})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        renderItem={({ item }) => (
          <PlotCard
            plot={item}
            onStatusChange={handleStatusChange}
            onEdit={p => { setEditPlot(p); setEditModalVisible(true); }}
          />
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Ionicons name="grid-outline" size={40} color="#DDE3F0" />
            <Text style={{ color: MUTED, marginTop: 12, fontWeight: '600' }}>No plots with this status.</Text>
          </View>
        }
      />

      <PlotEditModal
        plot={editPlot}
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onSaved={handlePlotUpdate}
      />
    </SafeAreaView>
  );
}
