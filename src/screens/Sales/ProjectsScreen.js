'use strict';
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal, ScrollView,
  TextInput, Switch, StyleSheet, ActivityIndicator, Alert,
  StatusBar, RefreshControl, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { SALES_ENDPOINTS } from '../../constants/api';
import { uploadToSupabase } from '../../utils/supabaseStorage';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import FormSheet from '../../components/FormSheet';

const NAVY = COLORS.navy; const BLUE = COLORS.link; const BG = COLORS.screenBg; const TEXT = COLORS.textPrimary; const MUTED = COLORS.textSecondary;

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

const PROJECT_TYPES = ['Plotted', 'Apartment', 'Villa', 'Commercial', 'Mixed', 'Industrial', 'Residential', 'Plots'];

async function pickAndUpload(folder, setUploading) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo library access.'); return null; }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.85 });
  if (result.canceled) return null;
  const asset = result.assets[0];
  setUploading(true);
  try {
    return await uploadToSupabase(asset.uri, asset.mimeType || 'image/jpeg', folder);
  } catch (e) { Alert.alert('Upload failed', e.message); return null; }
  finally { setUploading(false); }
}

/* ─── Plot Stats Bar ─── */
function PlotStats({ counts }) {
  if (!counts || !counts.total) return null;
  const { sold = 0, hold = 0, available = 0, total = 0 } = counts;
  const soldPct = Math.round((sold / total) * 100);
  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        {[
          { label: 'Total',     val: total,     color: TEXT },
          { label: 'Available', val: available,  color: COLORS.success },
          { label: 'Hold',      val: hold,       color: COLORS.warning },
          { label: 'Sold',      val: sold,       color: COLORS.error },
        ].map(s => (
          <View key={s.label} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: s.color }}>{s.val}</Text>
            <Text style={{ fontSize: 9, color: MUTED, fontWeight: '600' }}>{s.label}</Text>
          </View>
        ))}
      </View>
      <View style={{ height: 5, borderRadius: 4, backgroundColor: COLORS.surfaceAlt, overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${soldPct}%`, backgroundColor: BLUE, borderRadius: 4 }} />
      </View>
      <Text style={{ fontSize: 10, color: MUTED, textAlign: 'right', marginTop: 3 }}>{soldPct}% sold</Text>
    </View>
  );
}

/* ─── Project Card ─── */
function ProjectCard({ project, onEdit, onManage }) {
  const pc = project.plot_counts || {};
  return (
    <View style={[cardStyle, { marginHorizontal: 16, marginBottom: 16, overflow: 'hidden' }]}>
      {/* Cover image with type + status badge overlaid */}
      <View style={{ position: 'relative', height: 160, backgroundColor: COLORS.surfaceAlt }}>
        {project.cover_image_url ? (
          <Image source={{ uri: project.cover_image_url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name="business-outline" size={36} color={COLORS.shadow} />
          </View>
        )}
        <View style={{ position: 'absolute', top: 10, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          {project.project_type ? (
            <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.90)' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED }}>{project.project_type}</Text>
            </View>
          ) : <View />}
          <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, backgroundColor: project.is_active ? COLORS.successBg : COLORS.errorBg }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: project.is_active ? COLORS.success : COLORS.error }}>
              {project.is_active ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <View style={{ padding: 14, borderTopWidth: 1.5, borderTopColor: COLORS.surfaceAlt }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT, marginBottom: 2 }}>{project.name}</Text>
            {project.location ? <Text style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>📍 {project.location}</Text> : null}
            {project.tagline ? <Text style={{ fontSize: 11, color: COLORS.textTertiary, fontStyle: 'italic', marginBottom: 4 }} numberOfLines={1}>{project.tagline}</Text> : null}
            {(project.total_area || project.price_range || project.possession) ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {project.total_area  && <View style={metaChip}><Text style={metaChipTxt}>{project.total_area}</Text></View>}
                {project.price_range && <View style={metaChip}><Text style={metaChipTxt}>{project.price_range}</Text></View>}
                {project.possession  && <View style={metaChip}><Text style={metaChipTxt}>📅 {project.possession}</Text></View>}
              </View>
            ) : null}
          </View>
          <TouchableOpacity onPress={() => onEdit(project)} style={{ padding: 8, borderRadius: 10, backgroundColor: COLORS.surfaceAlt, marginTop: 2 }}>
            <Ionicons name="pencil-outline" size={16} color={MUTED} />
          </TouchableOpacity>
        </View>

        <PlotStats counts={project.plot_counts} />

        {project.lead_count > 0 ? (
          <Text style={{ fontSize: 12, color: BLUE, fontWeight: '700', marginTop: 6 }}>{project.lead_count} leads</Text>
        ) : null}

        <TouchableOpacity onPress={() => onManage(project)}
          style={{ marginTop: 12, paddingVertical: 10, backgroundColor: NAVY, borderRadius: 10, alignItems: 'center' }}>
          <Text style={{ color: COLORS.white, fontSize: 13, fontWeight: '700' }}>Manage Plots →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ─── Field helpers ─── */
const FieldLabel = ({ label }) => (
  <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>{label}</Text>
);
const Field = ({ label, children }) => (
  <View style={{ marginBottom: 14 }}>
    <FieldLabel label={label} />
    {children}
  </View>
);
const inp = { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: TEXT, backgroundColor: COLORS.white };

function TypeDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)}
        style={{ ...inp, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 14, color: value ? TEXT : MUTED }}>{value || 'Select type'}</Text>
        <Ionicons name="chevron-down" size={16} color={MUTED} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 40 }}
          activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={{ backgroundColor: COLORS.white, borderRadius: 14, overflow: 'hidden' }}>
            {PROJECT_TYPES.map((t, i) => (
              <TouchableOpacity key={t} onPress={() => { onChange(t); setOpen(false); }}
                style={{ paddingHorizontal: 20, paddingVertical: 14, backgroundColor: value === t ? COLORS.surfaceAlt : COLORS.white,
                  borderBottomWidth: i < PROJECT_TYPES.length - 1 ? 1 : 0, borderBottomColor: COLORS.border }}>
                <Text style={{ fontSize: 15, color: value === t ? NAVY : TEXT, fontWeight: value === t ? '700' : '400' }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

/* ─── Plot Wizard (shared between Add and Edit) ─── */
function PlotWizard({ hasTypes, setHasTypes, noTypePlots, setNoTypePlots, plotTypes, updateType, addType, removeType }) {
  const validTypes     = plotTypes.filter(pt => pt.name.trim() && Number(pt.from) && Number(pt.to) && Number(pt.to) >= Number(pt.from));
  const totalTypePlots = validTypes.reduce((s, pt) => s + Number(pt.to) - Number(pt.from) + 1, 0);

  return (
    <View>
      {/* Toggle */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Text style={{ fontSize: 13, color: TEXT, fontWeight: '600', flex: 1 }}>Does this project have plot types?</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[['No', false], ['Yes', true]].map(([label, val]) => (
            <TouchableOpacity key={label} onPress={() => setHasTypes(val)}
              style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5,
                borderColor: hasTypes === val ? (val ? BLUE : NAVY) : COLORS.border,
                backgroundColor: hasTypes === val ? (val ? BLUE : NAVY) : COLORS.white }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: hasTypes === val ? COLORS.white : MUTED }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {!hasTypes ? (
        <View>
          <FieldLabel label="Number of Plots" />
          <TextInput value={noTypePlots} onChangeText={setNoTypePlots} keyboardType="numeric"
            placeholder="e.g. 20" style={{ ...inp, maxWidth: 160 }} />
          {Number(noTypePlots) > 0 && (
            <View style={{ marginTop: 8, padding: 10, backgroundColor: COLORS.screenBg, borderRadius: 8 }}>
              <Text style={{ fontSize: 12, color: BLUE }}>Will create <Text style={{ fontWeight: '700' }}>{noTypePlots}</Text> plots numbered 1 to {noTypePlots}</Text>
            </View>
          )}
        </View>
      ) : (
        <View>
          {/* Column headers */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
            <Text style={{ flex: 1, fontSize: 10, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase' }}>Type Name</Text>
            <Text style={{ width: 70, fontSize: 10, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase' }}>From #</Text>
            <Text style={{ width: 70, fontSize: 10, fontWeight: '700', color: COLORS.textTertiary, textTransform: 'uppercase' }}>To #</Text>
            <View style={{ width: 28 }} />
          </View>
          {plotTypes.map((pt, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <TextInput value={pt.name} onChangeText={v => updateType(i, 'name', v)} placeholder="e.g. A" style={[inp, { flex: 1 }]} />
              <TextInput value={pt.from} onChangeText={v => updateType(i, 'from', v)} keyboardType="numeric" placeholder="1" style={[inp, { width: 70 }]} />
              <TextInput value={pt.to}   onChangeText={v => updateType(i, 'to',   v)} keyboardType="numeric" placeholder="10" style={[inp, { width: 70 }]} />
              <TouchableOpacity onPress={() => removeType(i)} disabled={plotTypes.length === 1}
                style={{ width: 28, alignItems: 'center' }}>
                <Ionicons name="close-circle" size={20} color={plotTypes.length > 1 ? COLORS.error : COLORS.border} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={addType}
            style={{ borderWidth: 1.5, borderColor: BLUE, borderStyle: 'dashed', borderRadius: 9, paddingVertical: 8, alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: BLUE }}>+ Add Type</Text>
          </TouchableOpacity>
          {validTypes.length > 0 && (
            <View style={{ padding: 12, backgroundColor: COLORS.screenBg, borderRadius: 10, borderWidth: 1, borderColor: COLORS.surfaceAlt }}>
              {validTypes.map(pt => (
                <Text key={pt.name} style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>
                  <Text style={{ fontWeight: '700', color: TEXT }}>{pt.name}</Text>{': '}{pt.name}{pt.from} → {pt.name}{pt.to}
                  {'  '}({Number(pt.to) - Number(pt.from) + 1} plots)
                </Text>
              ))}
              <Text style={{ fontSize: 12, fontWeight: '700', color: NAVY, marginTop: 6, borderTopWidth: 1, borderTopColor: COLORS.surfaceAlt, paddingTop: 6 }}>
                Total: {totalTypePlots} plots
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

/* ─── Add / Edit Modal ─── */
function AddEditModal({ visible, project, onClose, onSaved }) {
  const editing = !!project;

  const [form, setForm] = useState({
    name: '', location: '', project_type: 'Plotted', tagline: '', rera: '',
    total_area: '', total_plots: '', price_range: '', possession: '', description: '',
    cover_image_url: '', master_plan_url: '', is_active: true,
  });
  const [saving,         setSaving]         = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPlan,  setUploadingPlan]  = useState(false);

  // Plot wizard state
  const [hasTypes,    setHasTypes]    = useState(false);
  const [noTypePlots, setNoTypePlots] = useState('');
  const [plotTypes,   setPlotTypes]   = useState([{ name: '', from: '1', to: '' }]);
  const [addingMore,  setAddingMore]  = useState(false);

  // Editable type names for edit mode
  const [editableTypes, setEditableTypes] = useState([]);

  useEffect(() => {
    if (visible) {
      if (project) {
        setForm({
          name:            project.name            || '',
          location:        project.location        || '',
          project_type:    project.project_type    || 'Plotted',
          tagline:         project.tagline         || '',
          rera:            project.rera            || '',
          total_area:      project.total_area      || '',
          total_plots:     project.total_plots     ? String(project.total_plots) : '',
          price_range:     project.price_range     || '',
          possession:      project.possession      || '',
          description:     project.description     || '',
          cover_image_url: project.cover_image_url || '',
          master_plan_url: project.master_plan_url || '',
          is_active:       project.is_active !== undefined ? project.is_active : true,
        });
        setEditableTypes((project.plot_type_plans || []).map(pt => ({ original: pt.name, current: pt.name })));
      } else {
        setForm({ name: '', location: '', project_type: 'Plotted', tagline: '', rera: '', total_area: '', total_plots: '', price_range: '', possession: '', description: '', cover_image_url: '', master_plan_url: '', is_active: true });
        setHasTypes(false); setNoTypePlots(''); setPlotTypes([{ name: '', from: '1', to: '' }]);
        setEditableTypes([]);
      }
      setAddingMore(false);
    }
  }, [project, visible]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const addType    = ()         => setPlotTypes(p => [...p, { name: '', from: '1', to: '' }]);
  const removeType = i          => setPlotTypes(p => p.filter((_, idx) => idx !== i));
  const updateType = (i, k, v) => setPlotTypes(p => p.map((t, idx) => idx === i ? { ...t, [k]: v } : t));

  function buildPlots() {
    if (hasTypes) {
      const arr = [];
      for (const pt of plotTypes) {
        const name = pt.name.trim();
        const from = Number(pt.from), to = Number(pt.to);
        if (!name || !from || !to || to < from) continue;
        for (let n = from; n <= to; n++) arr.push({ number: `${name}${n}`, cluster_type: name });
      }
      return arr;
    }
    const count = Number(noTypePlots);
    if (!count || count < 1) return [];
    return Array.from({ length: count }, (_, i) => ({ number: String(i + 1), cluster_type: '' }));
  }

  async function save() {
    if (!form.name.trim()) { Alert.alert('Required', 'Project name is required.'); return; }
    setSaving(true);
    try {
      const headers = await authHeaders();
      const plots      = (!editing || addingMore) ? buildPlots() : [];
      const totalPlots = editing ? (form.total_plots ? parseInt(form.total_plots) : 0) : plots.length;

      // New project: send total_plots=0 so backend _sync_plots() skips auto-creation
      const body = { ...form, total_plots: editing ? totalPlots : 0 };
      const url    = editing ? SALES_ENDPOINTS.project(project.id) : SALES_ENDPOINTS.projects;
      const method = editing ? 'PATCH' : 'POST';
      const res    = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json(); Alert.alert('Error', JSON.stringify(e)); setSaving(false); return; }
      const data = await res.json();

      // Rename cluster_types on plots (edit mode)
      if (editing) {
        const renames = editableTypes.filter(t => t.original !== t.current && t.current.trim());
        for (const r of renames) {
          await fetch(SALES_ENDPOINTS.plotsRenameType, {
            method: 'POST', headers,
            body: JSON.stringify({ project_id: data.id, old_name: r.original, new_name: r.current.trim() }),
          });
        }
        if (renames.length > 0) {
          const updatedPlans = (project.plot_type_plans || []).map(pt => {
            const rename = renames.find(r => r.original === pt.name);
            return rename ? { ...pt, name: rename.current.trim() } : pt;
          });
          await fetch(SALES_ENDPOINTS.project(data.id), {
            method: 'PATCH', headers, body: JSON.stringify({ plot_type_plans: updatedPlans }),
          });
        }
      }

      // Bulk create plots
      if (plots.length > 0) {
        const bulkRes = await fetch(SALES_ENDPOINTS.plotsBulk, {
          method: 'POST', headers, body: JSON.stringify({ project_id: data.id, plots }),
        });
        if (!bulkRes.ok) {
          const e = await bulkRes.json().catch(() => ({}));
          Alert.alert('Plot creation failed', JSON.stringify(e));
          setSaving(false); return;
        }
        const newTotal = editing ? totalPlots + plots.length : plots.length;
        await fetch(SALES_ENDPOINTS.project(data.id), {
          method: 'PATCH', headers, body: JSON.stringify({ total_plots: newTotal }),
        });
      }

      // Fetch fresh data
      let finalData = data;
      try {
        const r = await fetch(SALES_ENDPOINTS.project(data.id), { headers });
        if (r.ok) finalData = await r.json();
      } catch { /* use data */ }

      onSaved(finalData, editing);
      onClose();
    } catch (e) { Alert.alert('Network error', e.message); }
    finally { setSaving(false); }
  }

  return (
    <FormSheet visible={visible} onClose={onClose}>
          {/* Header */}
          <View style={{ backgroundColor: COLORS.surface, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <TouchableOpacity onPress={onClose} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="close" size={18} color={TEXT} />
              </TouchableOpacity>
              <TouchableOpacity onPress={save} disabled={saving}
                style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: NAVY, borderRadius: 10, opacity: saving ? 0.6 : 1 }}>
                {saving ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 13 }}>Save</Text>}
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>{editing ? 'Edit Project' : 'New Project'}</Text>
            <Text style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{editing ? 'Update project details' : 'Fill in the project details below'}</Text>
          </View>

          <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            <Field label="Project Name *">
              <TextInput value={form.name} onChangeText={v => set('name', v)} placeholder="e.g. Vistara Gardens Phase 2" style={inp} />
            </Field>

            <Field label="Tagline">
              <TextInput value={form.tagline} onChangeText={v => set('tagline', v)} placeholder="Where Nature Meets Luxury" style={inp} />
            </Field>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Field label="Location">
                  <TextInput value={form.location} onChangeText={v => set('location', v)} placeholder="City / Area" style={inp} />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Type">
                  <TypeDropdown value={form.project_type} onChange={v => set('project_type', v)} />
                </Field>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Field label="RERA No.">
                  <TextInput value={form.rera} onChangeText={v => set('rera', v)} placeholder="REG/…" style={inp} />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Total Area">
                  <TextInput value={form.total_area} onChangeText={v => set('total_area', v)} placeholder="e.g. 12 acres" style={inp} />
                </Field>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Field label="Price Range">
                  <TextInput value={form.price_range} onChangeText={v => set('price_range', v)} placeholder="₹45L – ₹1.2Cr" style={inp} />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Possession Date">
                  <TextInput value={form.possession} onChangeText={v => set('possession', v)} placeholder="Dec 2026" style={inp} />
                </Field>
              </View>
            </View>

            <Field label="Description">
              <TextInput value={form.description} onChangeText={v => set('description', v)} placeholder="Project overview…"
                style={[inp, { minHeight: 80, textAlignVertical: 'top' }]} multiline />
            </Field>

            {/* Cover Image */}
            <Field label="Cover Image">
              {form.cover_image_url ? (
                <View>
                  <Image source={{ uri: form.cover_image_url }} style={{ width: '100%', height: 160, borderRadius: 10, backgroundColor: COLORS.surfaceAlt }} resizeMode="cover" />
                  <TouchableOpacity onPress={() => set('cover_image_url', '')}
                    style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="close" size={16} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={async () => { const url = await pickAndUpload('erp/projects/covers', setUploadingCover); if (url) set('cover_image_url', url); }} disabled={uploadingCover}
                  style={{ borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 24, alignItems: 'center', backgroundColor: COLORS.white }}>
                  {uploadingCover ? <ActivityIndicator color={BLUE} /> : <>
                    <Ionicons name="image-outline" size={28} color={COLORS.shadow} />
                    <Text style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>Tap to upload cover image</Text>
                  </>}
                </TouchableOpacity>
              )}
            </Field>

            {/* Master Plan */}
            <Field label="Master Plan">
              {form.master_plan_url ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: COLORS.screenBg, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border }}>
                  <Ionicons name="document-text-outline" size={22} color={BLUE} style={{ marginRight: 10 }} />
                  <Text style={{ flex: 1, fontSize: 12, color: BLUE, fontWeight: '600' }} numberOfLines={1}>Master plan uploaded ✓</Text>
                  <TouchableOpacity onPress={() => set('master_plan_url', '')}>
                    <Ionicons name="close-circle-outline" size={20} color={MUTED} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={async () => { const url = await pickAndUpload('erp/projects/masterplans', setUploadingPlan); if (url) set('master_plan_url', url); }} disabled={uploadingPlan}
                  style={{ borderWidth: 1.5, borderColor: COLORS.border, borderStyle: 'dashed', borderRadius: 10, paddingVertical: 20, alignItems: 'center', backgroundColor: COLORS.white }}>
                  {uploadingPlan ? <ActivityIndicator color={BLUE} /> : <>
                    <Ionicons name="map-outline" size={28} color={COLORS.shadow} />
                    <Text style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>Upload master plan image</Text>
                  </>}
                </TouchableOpacity>
              )}
            </Field>

            {/* Active toggle */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.white, borderRadius: 10, padding: 14, borderWidth: 1.5, borderColor: COLORS.border, marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>Active</Text>
                <Text style={{ fontSize: 11, color: MUTED }}>Visible to sales team</Text>
              </View>
              <Switch value={form.is_active} onValueChange={v => set('is_active', v)} trackColor={{ false: COLORS.border, true: NAVY }} />
            </View>

            {/* ── PLOT SETUP ── */}
            <View style={{ borderTopWidth: 1.5, borderTopColor: COLORS.surfaceAlt, paddingTop: 16, marginBottom: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
                Plot Setup
              </Text>

              {editing ? (
                /* Edit mode: show existing types as editable chips + total count + add-more option */
                <View style={{ gap: 14 }}>
                  {editableTypes.length > 0 && (
                    <View>
                      <FieldLabel label="Plot Types — tap to rename" />
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                        {editableTypes.map((t, i) => (
                          <View key={i}>
                            <TextInput
                              value={t.current}
                              onChangeText={v => setEditableTypes(prev => prev.map((x, xi) => xi === i ? { ...x, current: v } : x))}
                              style={{
                                fontSize: 12, fontWeight: '700', paddingHorizontal: 14, paddingVertical: 6,
                                borderRadius: 20, textAlign: 'center',
                                backgroundColor: t.original !== t.current ? COLORS.warningBg : COLORS.purpleBg,
                                color: t.original !== t.current ? COLORS.warning : COLORS.purple,
                                borderWidth: 1.5,
                                borderColor: t.original !== t.current ? COLORS.goldBg : COLORS.shadow,
                                minWidth: 70,
                              }}
                            />
                            {t.original !== t.current && (
                              <View style={{ position: 'absolute', top: -6, right: -4, backgroundColor: COLORS.warning, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 }}>
                                <Text style={{ color: COLORS.white, fontSize: 8, fontWeight: '700' }}>renamed</Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                      {editableTypes.some(t => t.original !== t.current) && (
                        <Text style={{ fontSize: 11, color: COLORS.warning, marginTop: 6 }}>⚠ Renaming will update all plots with that type name.</Text>
                      )}
                    </View>
                  )}

                  <View>
                    <FieldLabel label="Total Plots / Units" />
                    <TextInput value={form.total_plots} onChangeText={v => set('total_plots', v)} keyboardType="numeric"
                      placeholder="e.g. 36" style={{ ...inp, maxWidth: 200 }} />
                  </View>

                  <TouchableOpacity onPress={() => setAddingMore(m => !m)}
                    style={{ borderWidth: 1.5, borderColor: addingMore ? COLORS.error : BLUE, borderStyle: 'dashed', borderRadius: 9, paddingVertical: 8, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: addingMore ? COLORS.error : BLUE }}>
                      {addingMore ? '✕ Cancel adding plots' : '+ Add More Plots'}
                    </Text>
                  </TouchableOpacity>

                  {addingMore && (
                    <PlotWizard hasTypes={hasTypes} setHasTypes={setHasTypes}
                      noTypePlots={noTypePlots} setNoTypePlots={setNoTypePlots}
                      plotTypes={plotTypes} updateType={updateType} addType={addType} removeType={removeType} />
                  )}
                </View>
              ) : (
                /* Add mode: full wizard */
                <PlotWizard hasTypes={hasTypes} setHasTypes={setHasTypes}
                  noTypePlots={noTypePlots} setNoTypePlots={setNoTypePlots}
                  plotTypes={plotTypes} updateType={updateType} addType={addType} removeType={removeType} />
              )}
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>
    </FormSheet>
  );
}

/* ─── Main Screen ─── */
export default function ProjectsScreen() {
  const [projects,     setProjects]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editProject,  setEditProject]  = useState(null);
  const navigation = require('@react-navigation/native').useNavigation();

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(SALES_ENDPOINTS.projects, { headers });
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : (data.results || []));
      }
    } catch (e) { console.warn(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved(saved, isEdit) {
    setProjects(prev => isEdit
      ? prev.map(p => p.id === saved.id ? saved : p)
      : [saved, ...prev]);
  }

  function openAdd()        { setEditProject(null); setModalVisible(true); }
  function openEdit(proj)   { setEditProject(proj); setModalVisible(true); }
  function openManage(proj) { navigation.navigate('ManagePlots', { projectId: proj.id }); }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={NAVY} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="arrow-back" size={20} color={NAVY} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>Projects</Text>
          <Text style={{ fontSize: 12, color: MUTED }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity onPress={openAdd}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: NAVY, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 }}>
          <Ionicons name="add" size={18} color={COLORS.white} />
          <Text style={{ color: COLORS.white, fontWeight: '700', fontSize: 13 }}>Add Project</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={projects}
        keyExtractor={p => String(p.id)}
        renderItem={({ item }) => <ProjectCard project={item} onEdit={openEdit} onManage={openManage} />}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[NAVY]} tintColor={NAVY} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Ionicons name="business-outline" size={52} color={COLORS.divider} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: MUTED, marginTop: 12 }}>No projects yet</Text>
            <Text style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>Tap "Add Project" to create one</Text>
          </View>
        }
      />

      <AddEditModal visible={modalVisible} project={editProject}
        onClose={() => setModalVisible(false)} onSaved={handleSaved} />
    </SafeAreaView>
  );
}

const cardStyle = { backgroundColor: COLORS.cardBg, borderRadius: 16, ...CARD_SHADOW };
const metaChip  = { backgroundColor: COLORS.surfaceAlt, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 };
const metaChipTxt = { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary };
