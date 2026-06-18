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

const NAVY  = '#182350';
const BLUE  = '#3D5AFE';
const BG    = '#F5F6FA';
const TEXT  = '#1A1A2E';
const MUTED = '#8492A6';
const CARD  = { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#C8D2E8', shadowColor: '#6B80A8', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 5 };

const STATUS_COLORS = {
  available: { bg: '#E8F5E9', text: '#2E7D32', zone: '#22c55e' },
  hold:      { bg: '#FFF3E0', text: '#E65100', zone: '#f59e0b' },
  sold:      { bg: '#FEE2E2', text: '#EF4444', zone: '#ef4444' },
};

async function authHeaders() {
  const token = await AsyncStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

const PROJECT_TYPES = ['Plotted', 'Apartment', 'Villa', 'Commercial', 'Mixed'];

/* ─── Image Picker helper ─── */
async function pickAndUpload(folder, setUploading) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow photo library access.'); return null; }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.85,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  setUploading(true);
  try {
    const mime = asset.mimeType || 'image/jpeg';
    const url  = await uploadToSupabase(asset.uri, mime, folder);
    return url;
  } catch (e) {
    Alert.alert('Upload failed', e.message);
    return null;
  } finally {
    setUploading(false);
  }
}

/* ─── Plot Stats Bar ─── */
function PlotStats({ counts }) {
  if (!counts || !counts.total) return null;
  const sold      = counts.sold      || 0;
  const hold      = counts.hold      || 0;
  const available = counts.available || 0;
  const total     = counts.total     || 0;
  const soldPct   = Math.round((sold / total) * 100);

  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        {[
          { label: 'Total',     val: total,     color: TEXT },
          { label: 'Available', val: available,  color: '#2E7D32' },
          { label: 'Hold',      val: hold,       color: '#E65100' },
          { label: 'Sold',      val: sold,       color: '#EF4444' },
        ].map(s => (
          <View key={s.label} style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: s.color }}>{s.val}</Text>
            <Text style={{ fontSize: 9, color: MUTED, fontWeight: '600' }}>{s.label}</Text>
          </View>
        ))}
      </View>
      <View style={{ height: 5, borderRadius: 4, backgroundColor: '#F0F3FA', overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${soldPct}%`, backgroundColor: BLUE, borderRadius: 4 }} />
      </View>
      <Text style={{ fontSize: 10, color: MUTED, textAlign: 'right', marginTop: 3 }}>{soldPct}% sold</Text>
    </View>
  );
}

/* ─── Project Card ─── */
function ProjectCard({ project, onEdit, onManage }) {
  return (
    <View style={[CARD, { marginHorizontal: 16, marginBottom: 14, overflow: 'hidden' }]}>
      {project.cover_image_url ? (
        <Image source={{ uri: project.cover_image_url }} style={{ width: '100%', height: 140, backgroundColor: '#EEF0F8' }} resizeMode="cover" />
      ) : (
        <View style={{ width: '100%', height: 80, backgroundColor: '#EEF0F8', justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="business-outline" size={32} color="#C0C8D8" />
        </View>
      )}
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT, marginBottom: 2 }}>{project.name}</Text>
            {project.tagline ? <Text style={{ fontSize: 12, color: MUTED, marginBottom: 4 }} numberOfLines={1}>{project.tagline}</Text> : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
              {project.location ? <Text style={{ fontSize: 11, color: MUTED }}>📍 {project.location}</Text> : null}
              {project.project_type ? <Text style={{ fontSize: 11, color: MUTED }}> · {project.project_type}</Text> : null}
              {project.rera ? <Text style={{ fontSize: 11, color: MUTED }}> · RERA: {project.rera}</Text> : null}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {project.total_area   ? <Text style={{ fontSize: 11, color: MUTED }}>{project.total_area}</Text> : null}
              {project.price_range  ? <Text style={{ fontSize: 11, color: MUTED }}>· {project.price_range}</Text> : null}
              {project.possession   ? <Text style={{ fontSize: 11, color: MUTED }}>· Ready {project.possession}</Text> : null}
            </View>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
              backgroundColor: project.is_active ? '#E8F5E9' : '#FEE2E2' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: project.is_active ? '#2E7D32' : '#EF4444' }}>
                {project.is_active ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => onEdit(project)}
              style={{ padding: 6, borderRadius: 8, backgroundColor: '#F0F3FA' }}>
              <Ionicons name="pencil-outline" size={16} color={MUTED} />
            </TouchableOpacity>
          </View>
        </View>

        <PlotStats counts={project.plot_counts} />

        <TouchableOpacity onPress={() => onManage(project)}
          style={{ marginTop: 12, paddingVertical: 10, backgroundColor: NAVY, borderRadius: 10, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>Manage Plots →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ─── Field wrapper ─── */
const FieldLabel = ({ label }) => (
  <Text style={{ fontSize: 10, fontWeight: '700', color: '#B0BAC9', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 }}>{label}</Text>
);
const Field = ({ label, children }) => (
  <View style={{ marginBottom: 14 }}>
    <FieldLabel label={label} />
    {children}
  </View>
);
const inp = {
  borderWidth: 1.5, borderColor: '#E0E6F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
  fontSize: 14, color: TEXT, backgroundColor: '#fff',
};

/* ─── Add / Edit Modal ─── */
function AddEditModal({ visible, project, onClose, onSaved }) {
  const editing = !!project;
  const [form, setForm] = useState({
    name: '', location: '', project_type: 'Plotted', tagline: '', rera: '',
    total_area: '', total_plots: '', price_range: '', possession: '', description: '',
    cover_image_url: '', master_plan_url: '', is_active: true,
  });
  const [saving,        setSaving]        = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPlan,  setUploadingPlan]  = useState(false);

  useEffect(() => {
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
    } else {
      setForm({ name: '', location: '', project_type: 'Plotted', tagline: '', rera: '', total_area: '', total_plots: '', price_range: '', possession: '', description: '', cover_image_url: '', master_plan_url: '', is_active: true });
    }
  }, [project, visible]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    if (!form.name.trim()) { Alert.alert('Required', 'Project name is required.'); return; }
    setSaving(true);
    try {
      const headers = await authHeaders();
      const body = { ...form, total_plots: form.total_plots ? parseInt(form.total_plots) : 0 };
      const url    = editing ? SALES_ENDPOINTS.project(project.id) : SALES_ENDPOINTS.projects;
      const method = editing ? 'PATCH' : 'POST';
      const res    = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (res.ok) { onSaved(await res.json(), editing); onClose(); }
      else { const e = await res.json(); Alert.alert('Error', JSON.stringify(e)); }
    } catch (e) { Alert.alert('Network error', e.message); }
    finally { setSaving(false); }
  }

  async function handleCoverPick() {
    const url = await pickAndUpload('erp/projects/covers', setUploadingCover);
    if (url) set('cover_image_url', url);
  }

  async function handlePlanPick() {
    const url = await pickAndUpload('erp/projects/masterplans', setUploadingPlan);
    if (url) set('master_plan_url', url);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F3FA', backgroundColor: '#fff' }}>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color={MUTED} />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '800', color: TEXT }}>{editing ? 'Edit Project' : 'Add Project'}</Text>
            <TouchableOpacity onPress={save} disabled={saving}
              style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: NAVY, borderRadius: 10, opacity: saving ? 0.6 : 1 }}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Save</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>

            <Field label="Project Name *">
              <TextInput value={form.name} onChangeText={v => set('name', v)} placeholder="e.g. Vistara Gardens Phase 2" style={inp} />
            </Field>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Field label="Location">
                  <TextInput value={form.location} onChangeText={v => set('location', v)} placeholder="City / Area" style={inp} />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Type">
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 0 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {PROJECT_TYPES.map(t => (
                        <TouchableOpacity key={t} onPress={() => set('project_type', t)}
                          style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: form.project_type === t ? NAVY : '#F0F3FA' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: form.project_type === t ? '#fff' : MUTED }}>{t}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </Field>
              </View>
            </View>

            <Field label="Tagline">
              <TextInput value={form.tagline} onChangeText={v => set('tagline', v)} placeholder="Short marketing phrase" style={inp} />
            </Field>

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
                <Field label="Total Plots">
                  <TextInput value={form.total_plots} onChangeText={v => set('total_plots', v)} placeholder="e.g. 35" keyboardType="numeric" style={inp} />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Price Range">
                  <TextInput value={form.price_range} onChangeText={v => set('price_range', v)} placeholder="₹30L – ₹50L" style={inp} />
                </Field>
              </View>
            </View>

            <Field label="Possession">
              <TextInput value={form.possession} onChangeText={v => set('possession', v)} placeholder="e.g. Dec 2025" style={inp} />
            </Field>

            <Field label="Description">
              <TextInput value={form.description} onChangeText={v => set('description', v)} placeholder="Project overview…" style={[inp, { minHeight: 80, textAlignVertical: 'top' }]} multiline />
            </Field>

            {/* Cover Image */}
            <Field label="Cover Image">
              {form.cover_image_url ? (
                <View>
                  <Image source={{ uri: form.cover_image_url }} style={{ width: '100%', height: 160, borderRadius: 10, backgroundColor: '#EEF0F8' }} resizeMode="cover" />
                  <TouchableOpacity onPress={() => set('cover_image_url', '')}
                    style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={handleCoverPick} disabled={uploadingCover}
                  style={{ borderWidth: 1.5, borderColor: '#E0E6F0', borderStyle: 'dashed', borderRadius: 10, paddingVertical: 24, alignItems: 'center', backgroundColor: '#FAFBFF' }}>
                  {uploadingCover ? <ActivityIndicator color={BLUE} /> : <>
                    <Ionicons name="image-outline" size={28} color="#C0C8D8" />
                    <Text style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>Tap to upload cover image</Text>
                  </>}
                </TouchableOpacity>
              )}
            </Field>

            {/* Master Plan */}
            <Field label="Master Plan">
              {form.master_plan_url ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#F8F9FE', borderRadius: 10, borderWidth: 1, borderColor: '#E0E6F0' }}>
                  <Ionicons name="document-text-outline" size={22} color={BLUE} style={{ marginRight: 10 }} />
                  <Text style={{ flex: 1, fontSize: 12, color: BLUE, fontWeight: '600' }} numberOfLines={1}>Master plan uploaded ✓</Text>
                  <TouchableOpacity onPress={() => set('master_plan_url', '')}>
                    <Ionicons name="close-circle-outline" size={20} color={MUTED} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={handlePlanPick} disabled={uploadingPlan}
                  style={{ borderWidth: 1.5, borderColor: '#E0E6F0', borderStyle: 'dashed', borderRadius: 10, paddingVertical: 20, alignItems: 'center', backgroundColor: '#FAFBFF' }}>
                  {uploadingPlan ? <ActivityIndicator color={BLUE} /> : <>
                    <Ionicons name="map-outline" size={28} color="#C0C8D8" />
                    <Text style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>Upload master plan image</Text>
                  </>}
                </TouchableOpacity>
              )}
            </Field>

            {/* Active toggle */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1.5, borderColor: '#E0E6F0', marginBottom: 14 }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>Active</Text>
                <Text style={{ fontSize: 11, color: MUTED }}>Visible to sales team</Text>
              </View>
              <Switch value={form.is_active} onValueChange={v => set('is_active', v)} trackColor={{ false: '#E0E6F0', true: NAVY }} />
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

/* ─── Main Screen ─── */
export default function ProjectsScreen() {
  const [projects,    setProjects]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editProject,  setEditProject]  = useState(null);
  const navigation = require('@react-navigation/native').useNavigation();

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const headers = await authHeaders();
      const res     = await fetch(SALES_ENDPOINTS.projects, { headers });
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
      : [saved, ...prev],
    );
  }

  function openAdd()       { setEditProject(null); setModalVisible(true); }
  function openEdit(proj)  { setEditProject(proj); setModalVisible(true); }
  function openManage(proj){ navigation.navigate('ManagePlots', { projectId: proj.id }); }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={NAVY} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E4E8F0' }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={TEXT} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: TEXT }}>Projects</Text>
          <Text style={{ fontSize: 12, color: MUTED }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity onPress={openAdd}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: NAVY, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 }}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Add Project</Text>
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
            <Ionicons name="business-outline" size={52} color="#DDE3F0" />
            <Text style={{ fontSize: 15, fontWeight: '700', color: MUTED, marginTop: 12 }}>No projects yet</Text>
            <Text style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>Tap "Add Project" to create one</Text>
          </View>
        }
      />

      <AddEditModal
        visible={modalVisible}
        project={editProject}
        onClose={() => setModalVisible(false)}
        onSaved={handleSaved}
      />
    </SafeAreaView>
  );
}
