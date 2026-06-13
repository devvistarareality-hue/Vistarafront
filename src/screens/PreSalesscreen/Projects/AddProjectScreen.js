import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, Image, TextInput, Modal, FlatList,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../../constants/theme';
import images from '../../../constants/images';
import { PROJECT_TYPES, PROJECT_STATUSES } from '../../../constants/presalesMockData';
import { PRESALES_ENDPOINTS } from '../../../constants/api';
import Toast from '../../../components/Toast';
import styles from './styles';

const Field = ({ label, children, required }) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}{required && <Text style={styles.required}> *</Text>}</Text>
    {children}
  </View>
);

const PickerField = ({ label, value, placeholder, options, onSelect, required }) => {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} required={required}>
      <TouchableOpacity style={styles.pickerBtn} onPress={() => setVisible(true)} activeOpacity={0.8}>
        <Text style={value ? styles.pickerValue : styles.pickerPlaceholder}>
          {value || placeholder}
        </Text>
        <Text style={styles.pickerArrow}>›</Text>
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setVisible(false)} activeOpacity={1}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerSheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => { onSelect(item); setVisible(false); }}
                >
                  <Text style={styles.pickerOptionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </Field>
  );
};

const AddProjectScreen = () => {
  const navigation = useNavigation();
  const [form, setForm] = useState({
    name: '', location: '', type: '', units: '',
    priceRange: '', status: 'Active', description: '',
  });
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.location.trim() || !form.type) {
      setToast({ visible: true, message: 'Please fill Name, Location and Type.', type: 'error' });
      return;
    }
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res   = await fetch(PRESALES_ENDPOINTS.projects, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          name:        form.name.trim(),
          location:    form.location.trim(),
          type:        form.type,
          units:       parseInt(form.units) || 0,
          price_range: form.priceRange.trim(),
          status:      form.status || 'Active',
          description: form.description.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ visible: true, message: 'Project added successfully!', type: 'success' });
        setTimeout(() => navigation.goBack(), 1600);
      } else {
        const msg = data.name?.[0] || data.detail || 'Failed to add project.';
        setToast({ visible: true, message: msg, type: 'error' });
      }
    } catch {
      setToast({ visible: true, message: 'Network error. Try again.', type: 'error' });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Image source={images.backIcon} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Project</Text>
        <View style={{ width: 30 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.formScroll}
        keyboardShouldPersistTaps="handled"
      >

        <View style={styles.formCard}>
          <Text style={styles.formSection}>Project Details</Text>

          <Field label="Project Name" required>
            <TextInput
              style={styles.input}
              placeholder="e.g. Vistara Heights"
              placeholderTextColor="#BBB"
              value={form.name}
              onChangeText={(v) => set('name', v)}
            />
          </Field>

          <Field label="Location" required>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ahmedabad, Gujarat"
              placeholderTextColor="#BBB"
              value={form.location}
              onChangeText={(v) => set('location', v)}
            />
          </Field>

          <PickerField
            label="Project Type"
            required
            placeholder="Select type"
            value={form.type}
            options={PROJECT_TYPES}
            onSelect={(v) => set('type', v)}
          />

          <Field label="Total Units">
            <TextInput
              style={styles.input}
              placeholder="e.g. 120"
              placeholderTextColor="#BBB"
              keyboardType="numeric"
              value={form.units}
              onChangeText={(v) => set('units', v)}
            />
          </Field>

          <Field label="Price Range">
            <TextInput
              style={styles.input}
              placeholder="e.g. ₹45L – ₹85L"
              placeholderTextColor="#BBB"
              value={form.priceRange}
              onChangeText={(v) => set('priceRange', v)}
            />
          </Field>

          <PickerField
            label="Status"
            placeholder="Select status"
            value={form.status}
            options={PROJECT_STATUSES}
            onSelect={(v) => set('status', v)}
          />

          <Field label="Description">
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Brief project description..."
              placeholderTextColor="#BBB"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={form.description}
              onChangeText={(v) => set('description', v)}
            />
          </Field>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
          <Text style={styles.submitBtnText}>Add Project</Text>
        </TouchableOpacity>

      </ScrollView>
      </KeyboardAvoidingView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((p) => ({ ...p, visible: false }))}
      />
    </SafeAreaView>
  );
};

export default AddProjectScreen;
