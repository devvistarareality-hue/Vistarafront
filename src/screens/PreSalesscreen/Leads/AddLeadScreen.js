import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, Image, TextInput, Modal, FlatList,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../../constants/theme';
import images from '../../../constants/images';
import { SOURCES, STATUSES } from '../../../constants/presalesMockData';
import { PRESALES_ENDPOINTS } from '../../../constants/api';
import { fetchPresalesProjects } from '../../../redux/actions/presalesActions';
import { toApiDate, formatFollowupDate } from '../../../utils/followupHelpers';
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
              keyExtractor={(item) => String(item?.id || item)}
              renderItem={({ item }) => {
                const label = item?.name || item;
                return (
                  <TouchableOpacity
                    style={styles.pickerOption}
                    onPress={() => { onSelect(item); setVisible(false); }}
                  >
                    <Text style={styles.pickerOptionText}>{label}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </Field>
  );
};

const AddLeadScreen = () => {
  const navigation = useNavigation();
  const dispatch   = useDispatch();
  const { data: projects } = useSelector((s) => s.presales.projects);

  const [form, setForm] = useState({
    name: '', phone: '', email: '', project: null,
    source: '', status: 'New', budget: '', notes: '',
  });
  const [followupDate,     setFollowupDate]     = useState(null);
  const [showDatePicker,   setShowDatePicker]   = useState(false);
  const [submitting,       setSubmitting]       = useState(false);
  const [toast,            setToast]            = useState({ visible: false, message: '', type: 'success' });

  useEffect(() => {
    if (projects.length === 0) dispatch(fetchPresalesProjects());
  }, []);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.project) {
      setToast({ visible: true, message: 'Please fill Name, Phone and Project.', type: 'error' });
      return;
    }
    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res   = await fetch(PRESALES_ENDPOINTS.leads, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          name:    form.name.trim(),
          phone:   form.phone.trim(),
          email:   form.email.trim(),
          project: form.project.id,
          source:  form.source || 'Walk-in',
          status:  form.status || 'New',
          budget:        form.budget.trim(),
          notes:         form.notes.trim(),
          next_followup: toApiDate(followupDate),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ visible: true, message: 'Lead added successfully!', type: 'success' });
        setTimeout(() => navigation.goBack(), 1600);
      } else {
        const msg = data.phone?.[0] || data.name?.[0] || data.detail || 'Failed to add lead.';
        setToast({ visible: true, message: msg, type: 'error' });
      }
    } catch {
      setToast({ visible: true, message: 'Network error. Try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Image source={images.backIcon} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Lead</Text>
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
          <Text style={styles.formSection}>Personal Info</Text>

          <Field label="Full Name" required>
            <TextInput
              style={styles.input}
              placeholder="e.g. Rajesh Sharma"
              placeholderTextColor="#BBB"
              value={form.name}
              onChangeText={(v) => set('name', v)}
            />
          </Field>

          <Field label="Phone Number" required>
            <TextInput
              style={styles.input}
              placeholder="+91 XXXXX XXXXX"
              placeholderTextColor="#BBB"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(v) => set('phone', v)}
            />
          </Field>

          <Field label="Email">
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              placeholderTextColor="#BBB"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(v) => set('email', v)}
            />
          </Field>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formSection}>Lead Info</Text>

          <PickerField
            label="Project"
            required
            placeholder="Select project"
            value={form.project?.name}
            options={projects}
            onSelect={(p) => set('project', p)}
          />

          <PickerField
            label="Lead Source"
            required
            placeholder="Select source"
            value={form.source}
            options={SOURCES}
            onSelect={(s) => set('source', s)}
          />

          <PickerField
            label="Initial Status"
            placeholder="Select status"
            value={form.status}
            options={STATUSES}
            onSelect={(s) => set('status', s)}
          />

          <Field label="Budget Range">
            <TextInput
              style={styles.input}
              placeholder="e.g. ₹50L – ₹70L"
              placeholderTextColor="#BBB"
              value={form.budget}
              onChangeText={(v) => set('budget', v)}
            />
          </Field>

          <Field label="Notes">
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Any additional notes..."
              placeholderTextColor="#BBB"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={form.notes}
              onChangeText={(v) => set('notes', v)}
            />
          </Field>

          <Field label="Next Follow-up Date">
            <TouchableOpacity
              style={styles.pickerBtn}
              onPress={() => {
                if (Platform.OS === 'android') {
                  DateTimePickerAndroid.open({
                    value:       followupDate || new Date(),
                    mode:        'date',
                    minimumDate: new Date(),
                    onChange:    (event, date) => {
                      if (event.type === 'set' && date) setFollowupDate(date);
                    },
                  });
                } else {
                  setShowDatePicker(true);
                }
              }}
              activeOpacity={0.8}
            >
              <Text style={followupDate ? styles.pickerValue : styles.pickerPlaceholder}>
                {followupDate ? formatFollowupDate(followupDate) : 'Select date (optional)'}
              </Text>
              {followupDate ? (
                <TouchableOpacity
                  onPress={() => setFollowupDate(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ fontSize: 16, color: '#AAA' }}>✕</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.pickerArrow}>›</Text>
              )}
            </TouchableOpacity>
          </Field>

          {Platform.OS === 'ios' && showDatePicker && (
            <DateTimePicker
              value={followupDate || new Date()}
              mode="date"
              display="spinner"
              minimumDate={new Date()}
              onChange={(_event, date) => {
                setShowDatePicker(false);
                if (date) setFollowupDate(date);
              }}
            />
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>{submitting ? 'Adding...' : 'Add Lead'}</Text>
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

export default AddLeadScreen;
