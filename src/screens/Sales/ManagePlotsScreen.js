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
import { apiFetch } from '../../utils/apiFetch';
import Svg, { Rect, Polygon, Circle, Text as SvgText, Polyline } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import { SALES_ENDPOINTS } from '../../constants/api';
import { uploadToSupabase } from '../../utils/supabaseStorage';

const { width: SW } = Dimensions.get('window');
import { COLORS, CARD_SHADOW } from '../../constants/theme';
const NAVY = COLORS.navy; const BLUE = COLORS.link; const BG = COLORS.screenBg; const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;
const CARD = { backgroundColor: COLORS.cardBg, borderRadius: 14, ...CARD_SHADOW };

const STATUS_CFG = {
  available: { label: 'Available', color: COLORS.success, bg: COLORS.successBg, border: COLORS.success, zone: COLORS.successAlt },
  hold:      { label: 'Hold',      color: COLORS.warning, bg: COLORS.warningBg, border: COLORS.warning, zone: COLORS.warningAlt },
  sold:      { label: 'Sold',      color: COLORS.error, bg: COLORS.errorBg, border: COLORS.error, zone: COLORS.error },
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
function PlotEditModal({ plot, visible, onClose, onSaved, clusterTypes = [] }) {
  const [plotNo,   setPlotNo]   = useState('');
  const [sizeVal,  setSizeVal]  = useState('');
  const [unit,     setUnit]     = useState('sqft');
  const [constArea, setConstArea] = useState('');
  const [editType, setEditType] = useState('');
  const [saving,   setSaving]   = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);

  useEffect(() => {
    if (plot) {
      const p = parseSizeUnit(plot.size);
      // Strip cluster_type prefix from number display
      const displayNum = plot.cluster_type
        ? plot.number.replace(new RegExp('^' + plot.cluster_type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '')
        : plot.number;
      setPlotNo(displayNum);
      setSizeVal(p.sizeVal);
      setUnit(UNITS.includes(p.unit) ? p.unit : 'sqft');
      setConstArea(plot.construction_area || '');
      setEditType(plot.cluster_type || '');
    }
  }, [plot, visible]);

  async function save() {
    setSaving(true);
    try {
      const combined = sizeVal ? `${sizeVal} ${unit}` : '';
      // Rebuild the full number: type prefix + number
      const fullNumber = editType ? `${editType}${plotNo}` : plotNo;
      const res = await apiFetch(SALES_ENDPOINTS.plot(plot.id), {
        method: 'PATCH',
        body: JSON.stringify({ number: fullNumber, size: combined, construction_area: (constArea || '').trim(), cluster_type: editType }),
      });
      if (res.ok) { onSaved(await res.json()); onClose(); }
      else { Alert.alert('Error', 'Could not save plot.'); }
    } catch (e) { Alert.alert('Network error', e.message); }
    finally { setSaving(false); }
  }

  const inpS = { borderWidth: 1.5, borderColor: COLORS.shadow, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: TEXT, backgroundColor: COLORS.white };
  const lblS = { fontSize: 10, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase', marginBottom: 5 };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: BG, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 }}>
          <View style={{ width: 40, height: 4, backgroundColor: COLORS.divider, borderRadius: 2, alignSelf: 'center', marginBottom: 16 }} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT, marginBottom: 18 }}>Edit Plot Info</Text>

          {/* Size */}
          <Text style={lblS}>Size</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            <TextInput value={sizeVal} onChangeText={setSizeVal} placeholder="e.g. 5000" keyboardType="numeric"
              style={[inpS, { flex: 1 }]} />
            <TouchableOpacity onPress={() => setUnitOpen(true)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: COLORS.purple, borderRadius: 10, paddingHorizontal: 12, backgroundColor: COLORS.surfaceAlt }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.purple }}>{unit}</Text>
              <Ionicons name="chevron-down" size={14} color={COLORS.purple} />
            </TouchableOpacity>
          </View>
          <Modal visible={unitOpen} transparent animationType="slide" onRequestClose={() => setUnitOpen(false)}>
            <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} activeOpacity={1} onPress={() => setUnitOpen(false)}>
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 36 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 12, marginBottom: 4 }} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: TEXT, paddingHorizontal: 16, paddingVertical: 12 }}>Select Unit</Text>
                {UNITS.map(u => (
                  <TouchableOpacity key={u} onPress={() => { setUnit(u); setUnitOpen(false); }}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: COLORS.screenBg }}>
                    <Text style={{ fontSize: 14, color: unit === u ? COLORS.purple : TEXT, fontWeight: unit === u ? '700' : '400' }}>{u}</Text>
                    {unit === u && <Ionicons name="checkmark" size={18} color={COLORS.purple} />}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Construction Area — auto-maps into the booking form */}
          <Text style={lblS}>Construction Area (sq.ft)</Text>
          <TextInput value={constArea} onChangeText={setConstArea} placeholder="e.g. 1200" keyboardType="numeric"
            style={[inpS, { marginBottom: 14 }]} />

          {/* Cluster/Type + Number */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
            <View style={{ flex: 3 }}>
              <Text style={lblS}>Cluster / Type</Text>
              <TouchableOpacity onPress={() => setTypeOpen(true)}
                style={{ ...inpS, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, color: editType ? TEXT : MUTED }}>{editType || '— None —'}</Text>
                <Ionicons name="chevron-down" size={15} color={MUTED} />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 2 }}>
              <Text style={lblS}>Number</Text>
              <TextInput value={plotNo} onChangeText={setPlotNo} placeholder="e.g. 1" style={inpS} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={save} disabled={saving}
              style={{ flex: 1, paddingVertical: 13, backgroundColor: NAVY, borderRadius: 12, alignItems: 'center', opacity: saving ? 0.6 : 1 }}>
              {saving ? <ActivityIndicator color={COLORS.white} size="small" /> : <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 14 }}>Save</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}
              style={{ paddingHorizontal: 20, paddingVertical: 13, backgroundColor: COLORS.surfaceAlt, borderRadius: 12 }}>
              <Text style={{ color: MUTED, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Type picker modal */}
      <Modal visible={typeOpen} transparent animationType="fade" onRequestClose={() => setTypeOpen(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 40 }}
          activeOpacity={1} onPress={() => setTypeOpen(false)}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 14, overflow: 'hidden' }}>
            {['', ...clusterTypes].map((t, i) => (
              <TouchableOpacity key={i} onPress={() => { setEditType(t); setTypeOpen(false); }}
                style={{ paddingHorizontal: 20, paddingVertical: 14, backgroundColor: editType === t ? COLORS.surfaceAlt : COLORS.white,
                  borderBottomWidth: i < clusterTypes.length ? 1 : 0, borderBottomColor: COLORS.surfaceAlt }}>
                <Text style={{ fontSize: 14, color: editType === t ? COLORS.purple : TEXT, fontWeight: editType === t ? '700' : '400' }}>
                  {t || '— None —'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}

/* ────────────────────────────────────────────────
   PLOT CARD
──────────────────────────────────────────────── */
function PlotCard({ plot, onStatusChange, onEdit }) {
  const cfg    = STATUS_CFG[plot.status] || STATUS_CFG.available;
  const [saving, setSaving] = useState(false);

  // Strip cluster_type prefix from displayed number (Ananda1 → 1)
  const displayNum = plot.cluster_type
    ? plot.number.replace(new RegExp('^' + plot.cluster_type.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '')
    : plot.number;

  async function setStatus(s) {
    if (plot.status === s || saving) return;
    setSaving(true);
    await onStatusChange(plot.id, s);
    setSaving(false);
  }

  const cardW = (SW - 48) / 2;

  return (
    <View style={[CARD, { width: cardW, margin: 6, overflow: 'hidden', opacity: saving ? 0.7 : 1 }]}>
      {/* Header row: #number + type badge + status badge + edit */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, padding: 10, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt, flexWrap: 'wrap' }}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT }}>#{displayNum}</Text>
        {plot.cluster_type ? (
          <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: COLORS.purpleBg }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: COLORS.purple }}>{plot.cluster_type}</Text>
          </View>
        ) : null}
        <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: cfg.bg }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: cfg.color }}>{cfg.label}</Text>
          </View>
          <TouchableOpacity onPress={() => onEdit(plot)} style={{ padding: 4 }}>
            <Ionicons name="pencil-outline" size={13} color={MUTED} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Size row — always rendered */}
      <View style={{ paddingHorizontal: 10, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt, minHeight: 24 }}>
        <Text style={{ fontSize: 10, color: plot.size ? MUTED : COLORS.divider, fontStyle: plot.size ? 'normal' : 'italic' }} numberOfLines={1}>
          {plot.size || 'Area not set'}
        </Text>
      </View>

      {/* Status buttons */}
      <View style={{ flexDirection: 'row', padding: 8, gap: 4 }}>
        {Object.entries(STATUS_CFG).map(([s, c]) => (
          <TouchableOpacity key={s} onPress={() => setStatus(s)} disabled={plot.status === s || saving}
            style={{ flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center',
              backgroundColor: plot.status === s ? c.bg : COLORS.white,
              borderWidth: 1.5, borderColor: plot.status === s ? c.border + '80' : COLORS.border }}>
            <Text style={{ fontSize: 9, fontWeight: '700', color: plot.status === s ? c.color : MUTED }}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* ────────────────────────────────────────────────
   PLOT TYPE FLOOR PLANS EDITOR
──────────────────────────────────────────────── */
function PlotTypePlansEditor({ project, plots, onProjectUpdate }) {
  const seedPlans = () => {
    const saved = project.plot_type_plans || [];
    if (saved.length > 0) return saved;
    const types = [...new Set(plots.map(p => p.cluster_type).filter(Boolean))].sort();
    return types.map(name => ({ name, floor_plans: [] }));
  };

  const [plans,         setPlans]         = useState(seedPlans);
  const [activeType,    setActiveType]     = useState(0);
  const [saving,        setSaving]         = useState(false);
  const [uploading,     setUploading]      = useState(false);
  const [newFloorLabel, setNewFloorLabel]  = useState('');
  const [newTypeName,   setNewTypeName]    = useState('');
  const [addingType,    setAddingType]     = useState(false);

  async function persist(updated) {
    setSaving(true);
    const res = await apiFetch(SALES_ENDPOINTS.project(project.id), {
      method: 'PATCH', body: JSON.stringify({ plot_type_plans: updated }),
    });
    if (res.ok) onProjectUpdate(await res.json());
    setSaving(false);
  }

  function addType() {
    const name = newTypeName.trim();
    if (!name) return;
    const updated = [...plans, { name, floor_plans: [] }];
    setPlans(updated); setActiveType(updated.length - 1);
    setNewTypeName(''); setAddingType(false);
    persist(updated);
  }

  function removeType(idx) {
    Alert.alert('Remove type?', `Remove "${plans[idx].name}" and all its floor plans?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        const updated = plans.filter((_, i) => i !== idx);
        setPlans(updated);
        setActiveType(Math.max(0, activeType - (idx <= activeType ? 1 : 0)));
        persist(updated);
      }},
    ]);
  }

  async function addFloor() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const url   = await uploadToSupabase(asset.uri, asset.mimeType || 'image/jpeg', `erp/projects/${project.id}/floor-plans`);
      const label = newFloorLabel.trim() || `Floor ${(plans[activeType]?.floor_plans.length || 0) + 1}`;
      const updated = plans.map((t, i) => i === activeType
        ? { ...t, floor_plans: [...t.floor_plans, { label, url }] } : t);
      setPlans(updated); setNewFloorLabel(''); persist(updated);
    } catch (e) { Alert.alert('Upload failed', e.message); }
    finally { setUploading(false); }
  }

  function removeFloor(typeIdx, floorIdx) {
    const updated = plans.map((t, i) => i === typeIdx
      ? { ...t, floor_plans: t.floor_plans.filter((_, fi) => fi !== floorIdx) } : t);
    setPlans(updated); persist(updated);
  }

  const current = plans[activeType];

  return (
    <View style={[CARD, { marginHorizontal: 16, marginBottom: 16, overflow: 'hidden' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt, backgroundColor: COLORS.white }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6 }}>Plot Type Floor Plans</Text>
        {saving && <ActivityIndicator size="small" color={BLUE} />}
      </View>

      <View style={{ padding: 14 }}>
        {/* Type tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: 'row', marginBottom: 16 }}>
          {plans.map((t, i) => {
            const active = activeType === i;
            return (
              <TouchableOpacity key={i} onPress={() => setActiveType(i)}
                style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, alignItems: 'center', minWidth: 100,
                  backgroundColor: active ? COLORS.surfaceAlt : COLORS.white,
                  borderWidth: 2, borderColor: active ? COLORS.shadow : COLORS.surfaceAlt }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: active ? COLORS.purple : TEXT, marginBottom: 2 }}>{t.name}</Text>
                <Text style={{ fontSize: 11, fontWeight: '600', color: active ? COLORS.textSecondary : MUTED }}>
                  {t.floor_plans.length > 0 ? `${t.floor_plans.length} plan${t.floor_plans.length > 1 ? 's' : ''}` : 'No plans yet'}
                </Text>
              </TouchableOpacity>
            );
          })}
          {addingType ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TextInput autoFocus value={newTypeName} onChangeText={setNewTypeName}
                onSubmitEditing={addType}
                placeholder="Type name" style={{ borderWidth: 1.5, borderColor: COLORS.purple, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, width: 130, color: TEXT }} />
              <TouchableOpacity onPress={addType} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.purple, borderRadius: 10 }}>
                <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 13 }}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setAddingType(false); setNewTypeName(''); }} style={{ padding: 8 }}>
                <Ionicons name="close" size={18} color={MUTED} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setAddingType(true)}
              style={{ paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, alignItems: 'center', minWidth: 100,
                borderWidth: 2, borderColor: COLORS.shadow, borderStyle: 'dashed', backgroundColor: COLORS.screenBg }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textSecondary }}>+ Add Type</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {plans.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 24 }}>
            <Ionicons name="images-outline" size={36} color={COLORS.divider} />
            <Text style={{ fontSize: 13, color: MUTED, marginTop: 8 }}>No plot types yet. Add a type to upload floor plans.</Text>
          </View>
        )}

        {current && (
          <View>
            {/* Floor plan grid */}
            {current.floor_plans.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                {current.floor_plans.map((fp, fi) => (
                  <View key={fi} style={{ width: (SW - 80) / 2 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 }}>{fp.label}</Text>
                      <TouchableOpacity onPress={() => removeFloor(activeType, fi)}>
                        <Ionicons name="close-circle" size={16} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                    <Image source={{ uri: fp.url }} style={{ width: '100%', aspectRatio: 4/3, borderRadius: 10, backgroundColor: COLORS.screenBg }} resizeMode="contain" />
                  </View>
                ))}
              </View>
            )}

            {/* Upload section */}
            <View style={{ backgroundColor: COLORS.screenBg, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.purpleBg }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                Add Floor Plan to "{current.name}"
              </Text>
              <TextInput value={newFloorLabel} onChangeText={setNewFloorLabel}
                placeholder="Floor label (e.g. Ground Floor, 1st Floor…)"
                style={{ borderWidth: 1.5, borderColor: COLORS.divider, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: TEXT, backgroundColor: COLORS.white, marginBottom: 10 }} />
              <TouchableOpacity onPress={addFloor} disabled={uploading}
                style={{ borderWidth: 1.5, borderColor: COLORS.shadow, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 20, alignItems: 'center', backgroundColor: COLORS.white }}>
                {uploading ? <ActivityIndicator color={COLORS.purple} /> : <>
                  <Ionicons name="image-outline" size={26} color={COLORS.shadow} />
                  <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 6 }}>Upload floor plan image</Text>
                </>}
              </TouchableOpacity>
            </View>
          </View>
        )}
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

  // Plots not yet drawn on the map — offered as a pick list instead of free text
  // so zone numbers always match real plots.
  const mappedNums = new Set(zones.map(z => String(z.plotNumber)));
  const unmapped   = plots.filter(p => !mappedNums.has(String(p.number))).map(p => p.number)
    .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

  async function persistZones(newZones) {
    setSaving(true);
    const res = await apiFetch(SALES_ENDPOINTS.project(project.id), {
      method: 'PATCH', body: JSON.stringify({ site_map_zones: newZones }),
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
      const res   = await apiFetch(SALES_ENDPOINTS.project(project.id), {
        method: 'PATCH', body: JSON.stringify({ site_map_image_url: url, site_map_zones: [] }),
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

  async function confirmZone(value) {
    const val = String(value ?? plotInput).trim();
    if (!val) return;
    await persistZones([...zones, { id: Date.now(), plotNumber: val, ...pendingZone }]);
    setPendingZone(null); setPlotInput('');
  }

  async function deleteZone(zoneId) {
    await persistZones(zones.filter(z => z.id !== zoneId));
  }

  function getZoneColor(plotNumber) {
    const pl = plots.find(p => String(p.number) === String(plotNumber));
    if (!pl) return COLORS.goldDark;
    return STATUS_CFG[pl.status]?.zone || COLORS.goldDark;
  }

  /* Convert percent coords to pixel for SVG (viewBox=0 0 100 100 preserveAspectRatio=none) */

  return (
    <View style={[CARD, { marginHorizontal: 16, marginBottom: 16, overflow: 'hidden' }]}>
      {/* Header */}
      <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.white }}>
        <View>
          <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6 }}>Interactive Site Map</Text>
          <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
            {siteMapImage ? `${mappedCount}/${totalPlots} zones mapped` : 'Upload master plan to draw zones'}
          </Text>
        </View>
        {siteMapImage && totalPlots > 0 ? (
          <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
            backgroundColor: mappedCount === totalPlots ? COLORS.successBg : COLORS.screenBg }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: mappedCount === totalPlots ? COLORS.success : BLUE }}>
              {Math.round(mappedCount / totalPlots * 100)}%
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ padding: 14 }}>
        {/* No image — upload button */}
        {!siteMapImage && (
          <TouchableOpacity onPress={uploadSiteMapImage} disabled={uploading}
            style={{ borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 28, alignItems: 'center', backgroundColor: COLORS.white }}>
            {uploading ? <ActivityIndicator color={BLUE} /> : <>
              <Ionicons name="map-outline" size={32} color={COLORS.shadow} />
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
                    paddingVertical: 9, borderRadius: 10, backgroundColor: drawMode === m.id ? NAVY : COLORS.surfaceAlt,
                    borderWidth: 1.5, borderColor: drawMode === m.id ? NAVY : COLORS.border }}>
                  <Ionicons name={m.icon} size={14} color={drawMode === m.id ? COLORS.white : MUTED} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: drawMode === m.id ? COLORS.white : MUTED }}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Instruction */}
            <View style={{ padding: 10, backgroundColor: COLORS.screenBg, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border }}>
              <Text style={{ fontSize: 11, color: COLORS.navyMedium }}>
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
                  <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 12 }}>✓ Done ({polyPoints.length} pts)</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={cancelDraw}
                  style={{ paddingHorizontal: 16, paddingVertical: 9, backgroundColor: COLORS.surfaceAlt, borderRadius: 10 }}>
                  <Text style={{ color: MUTED, fontWeight: '600', fontSize: 12 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Map image with SVG overlay */}
            <View
              ref={imgContainerRef}
              style={{ width: '100%', borderRadius: 10, overflow: 'hidden', backgroundColor: COLORS.black }}
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
                      <SvgText x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="3" fontWeight="bold" fill={COLORS.white}>{zone.plotNumber}</SvgText>
                    </React.Fragment>
                  );
                })}

                {/* Polygon in-progress */}
                {polyPoints.length > 1 && (
                  <Polyline points={polyPoints.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke={BLUE} strokeWidth="0.6" strokeDasharray="2,1.2" />
                )}
                {polyPoints.map((pt, i) => (
                  <Circle key={i} cx={pt.x} cy={pt.y} r="1.5" fill={BLUE} stroke={COLORS.white} strokeWidth="0.4" />
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

            {/* Pick the plot for the drawn zone — tap an unmapped plot (no free text) */}
            {pendingZone && (
              <View style={{ marginTop: 10, padding: 12, backgroundColor: COLORS.screenBg, borderRadius: 10, borderWidth: 1.5, borderColor: BLUE + '40' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: BLUE }}>Tap the plot for this zone</Text>
                  <TouchableOpacity onPress={cancelDraw} style={{ padding: 4 }}>
                    <Ionicons name="close" size={18} color={MUTED} />
                  </TouchableOpacity>
                </View>
                {unmapped.length === 0 ? (
                  <Text style={{ fontSize: 12, color: MUTED }}>All plots already mapped.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
                    {unmapped.map(n => (
                      <TouchableOpacity key={String(n)} onPress={() => confirmZone(n)}
                        style={{ paddingHorizontal: 14, paddingVertical: 9, backgroundColor: COLORS.white, borderRadius: 9, borderWidth: 1.5, borderColor: BLUE + '60' }}>
                        <Text style={{ color: NAVY, fontWeight: '800', fontSize: 13 }}>{n}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
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
                      <Text style={{ fontSize: 11, fontWeight: '700', color: COLORS.error }}>Clear all</Text>
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
      const res     = await apiFetch(SALES_ENDPOINTS.project(project.id), {
        method: 'PATCH', body: JSON.stringify({ master_plan_url: url }),
      });
      if (res.ok) onProjectUpdate(await res.json());
    } catch (e) { Alert.alert('Upload failed', e.message); }
    finally { setUploading(false); }
  }

  const isImg = url => url && /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url);

  return (
    <View style={[CARD, { marginHorizontal: 16, marginBottom: 16, overflow: 'hidden' }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt, backgroundColor: COLORS.white }}>
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
            <Image source={{ uri: project.master_plan_url }} style={{ width: '100%', height: 220, borderRadius: 10, backgroundColor: COLORS.surfaceAlt }} resizeMode="contain" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: COLORS.screenBg, borderRadius: 10 }}>
              <Ionicons name="document-text-outline" size={24} color={BLUE} style={{ marginRight: 10 }} />
              <Text style={{ fontSize: 13, color: BLUE, fontWeight: '600' }}>PDF uploaded — view on web</Text>
            </View>
          )
        ) : (
          <TouchableOpacity onPress={upload} disabled={uploading}
            style={{ borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 24, alignItems: 'center', backgroundColor: COLORS.white }}>
            {uploading ? <ActivityIndicator color={BLUE} /> : <>
              <Ionicons name="map-outline" size={28} color={COLORS.shadow} />
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
      try {
        const [projRes, plotsRes] = await Promise.all([
          apiFetch(SALES_ENDPOINTS.project(projectId)),
          apiFetch(`${SALES_ENDPOINTS.plots}?project=${projectId}`),
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
    const res = await apiFetch(SALES_ENDPOINTS.plot(plotId), {
      method: 'PATCH', body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) { const u = await res.json(); setPlots(prev => prev.map(p => p.id === plotId ? u : p)); }
  }, []);

  const handlePlotUpdate = useCallback(updated => {
    setPlots(prev => prev.map(p => p.id === updated.id ? updated : p));
  }, []);

  const clusterTypes = [...new Set(plots.map(p => p.cluster_type).filter(Boolean))];

  const counts = {
    all:       plots.length,
    available: plots.filter(p => p.status === 'available').length,
    hold:      plots.filter(p => p.status === 'hold').length,
    sold:      plots.filter(p => p.status === 'sold').length,
  };
  const soldPct  = plots.length ? Math.round(counts.sold / plots.length * 100) : 0;
  const filtered = (filter === 'all' ? plots : plots.filter(p => p.status === filter))
    .slice()
    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' }));

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
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT }} numberOfLines={1}>{project.name}</Text>
          {project.location ? <Text style={{ fontSize: 11, color: MUTED }}>{project.location}</Text> : null}
        </View>
        <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: project.is_active ? 'rgba(46,125,50,0.3)' : 'rgba(239,68,68,0.3)', borderWidth: 1, borderColor: project.is_active ? 'rgba(165,214,167,0.5)' : 'rgba(254,202,202,0.5)' }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: project.is_active ? COLORS.textTertiary : COLORS.errorBg }}>
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
                { label: 'Available', val: counts.available, color: COLORS.success },
                { label: 'On Hold',   val: counts.hold,      color: COLORS.warning },
                { label: 'Sold',      val: counts.sold,      color: COLORS.error },
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
                <View style={{ height: 8, borderRadius: 6, backgroundColor: COLORS.surfaceAlt, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${soldPct}%`, backgroundColor: BLUE, borderRadius: 6 }} />
                </View>
              </View>
            )}

            {/* Master Plan */}
            <MasterPlanSection project={project} onProjectUpdate={setProject} />

            {/* Site Map Editor */}
            <SiteMapEditor project={project} plots={plots} onProjectUpdate={setProject} />

            {/* Plot Type Floor Plans */}
            <PlotTypePlansEditor project={project} plots={plots} onProjectUpdate={setProject} />

            {/* Filter tabs + Delete All */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, flexDirection: 'row', marginBottom: plots.length > 0 ? 10 : 0 }}>
                {[
                  { key: 'all',       label: 'All',       color: TEXT,      bg: COLORS.screenBg },
                  { key: 'available', label: 'Available', color: COLORS.success, bg: COLORS.successBg },
                  { key: 'hold',      label: 'Hold',      color: COLORS.warning, bg: COLORS.warningBg },
                  { key: 'sold',      label: 'Sold',      color: COLORS.error, bg: COLORS.errorBg },
                ].map(({ key, label, color, bg }) => (
                  <TouchableOpacity key={key} onPress={() => setFilter(key)}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                      backgroundColor: filter === key ? bg : COLORS.white,
                      borderWidth: 1.5, borderColor: filter === key ? color + '60' : COLORS.border }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: filter === key ? color : MUTED }}>
                      {label} ({counts[key]})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {plots.length > 0 && (
                <TouchableOpacity onPress={async () => {
                  Alert.alert('Delete All Plots', `Delete all ${plots.length} plots for this project? This cannot be undone.`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete All', style: 'destructive', onPress: async () => {
                      const res = await apiFetch(SALES_ENDPOINTS.plotsBulkDelete, {
                        method: 'DELETE', body: JSON.stringify({ project_id: project.id }),
                      });
                      if (res.ok) { setPlots([]); Alert.alert('Done', 'All plots deleted.'); }
                      else { const e = await res.json(); Alert.alert('Error', e.detail || 'Failed to delete plots'); }
                    }},
                  ]);
                }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: COLORS.screenBg, borderWidth: 1.5, borderColor: COLORS.errorBg }}>
                  <Ionicons name="trash-outline" size={15} color={COLORS.errorStrong} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.errorStrong }}>Delete All Plots</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <PlotCard
            plot={item}
            onStatusChange={handleStatusChange}
            onEdit={p => { setEditPlot(p); setEditModalVisible(true); }}
          />
        )}
        key="plots-grid"
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Ionicons name="grid-outline" size={40} color={COLORS.divider} />
            <Text style={{ color: MUTED, marginTop: 12, fontWeight: '600' }}>No plots with this status.</Text>
          </View>
        }
      />

      <PlotEditModal
        plot={editPlot}
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        onSaved={handlePlotUpdate}
        clusterTypes={clusterTypes}
      />
    </SafeAreaView>
  );
}
