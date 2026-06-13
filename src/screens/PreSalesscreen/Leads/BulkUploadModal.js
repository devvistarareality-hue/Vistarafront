import React, { useState, useRef } from 'react';
import {
  View, Text, Modal, TouchableOpacity, Animated,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../../constants/theme';
import { PRESALES_ENDPOINTS } from '../../../constants/api';

const COLUMNS = [
  { name: 'Name *',         note: 'Required' },
  { name: 'Phone *',        note: 'Required — must be unique' },
  { name: 'Email',          note: 'Optional' },
  { name: 'Project',        note: 'Must match an existing project name exactly' },
  { name: 'Source',         note: 'Walk-in / Phone / Online / Reference / Email' },
  { name: 'Status',         note: 'New / Cold / Warm / Lost  (default: New)' },
  { name: 'Budget',         note: 'e.g. 60L – 70L' },
  { name: 'Notes',          note: 'Any remarks' },
  { name: 'Next Followup',  note: 'YYYY-MM-DD  e.g. 2026-07-15' },
];

const BulkUploadModal = ({ visible, onClose, onSuccess }) => {
  const slideY = useRef(new Animated.Value(600)).current;

  const [phase,       setPhase]       = useState('guide');  // guide | uploading | result
  const [result,      setResult]      = useState(null);
  const [fileName,    setFileName]    = useState('');
  const [downloading, setDownloading] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setPhase('guide');
      setResult(null);
      setFileName('');
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    } else {
      Animated.timing(slideY, { toValue: 600, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  const downloadTemplate = async () => {
    setDownloading(true);
    try {
      const dest = FileSystem.documentDirectory + 'leads_upload_template.xlsx';
      const { status } = await FileSystem.downloadAsync(PRESALES_ENDPOINTS.leadUploadTemplate, dest);
      if (status === 200) {
        Alert.alert('Downloaded!', 'Template saved successfully.', [{ text: 'OK' }]);
      } else {
        throw new Error('Download failed');
      }
    } catch {
      Alert.alert('Error', 'Could not download template. Check your connection.');
    } finally {
      setDownloading(false);
    }
  };

  const pickAndUpload = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
        ],
        copyToCacheDirectory: true,
      });

      if (picked.canceled) return;

      const file = picked.assets[0];
      setFileName(file.name);
      setPhase('uploading');

      const token    = await AsyncStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('file', {
        uri:  file.uri,
        name: file.name,
        type: file.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const res  = await fetch(PRESALES_ENDPOINTS.leadBulkUpload, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
        body:    formData,
      });
      const data = await res.json();

      if (!res.ok && data.created === undefined) {
        setResult({ error: data.detail || 'Upload failed. Check the file format.' });
      } else {
        setResult(data);
        if ((data.created || 0) > 0) onSuccess();
      }
      setPhase('result');
    } catch {
      setResult({ error: 'Could not read the file. Make sure it is a valid .xlsx file.' });
      setPhase('result');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }] }]}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Bulk Upload Leads</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── Guide ── */}
          {phase === 'guide' && (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>

              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>📋 How to prepare your Excel file</Text>
                <Text style={styles.infoSub}>
                  Create a .xlsx file in Google Sheets or Excel.{'\n'}
                  Row 1 must be the column headers exactly as shown below.{'\n'}
                  Row 2 onwards = lead data.
                </Text>
              </View>

              {/* Column table */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.tableCellHead, { flex: 1.2 }]}>Column</Text>
                <Text style={[styles.tableCell, styles.tableCellHead, { flex: 2 }]}>Notes</Text>
              </View>
              {COLUMNS.map((c, i) => (
                <View key={c.name} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, styles.colName, { flex: 1.2 }]}>{c.name}</Text>
                  <Text style={[styles.tableCell, styles.colNote, { flex: 2 }]}>{c.note}</Text>
                </View>
              ))}

              {/* Sample row */}
              <View style={styles.sampleBox}>
                <Text style={styles.sampleTitle}>Example Row</Text>
                <Text style={styles.sampleRow}>
                  Rajesh Sharma  |  +91 98765 43210  |  Walk-in  |  New  |  Vistara Heights
                </Text>
              </View>

              <TouchableOpacity
                style={styles.templateBtn}
                onPress={downloadTemplate}
                disabled={downloading}
                activeOpacity={0.8}
              >
                <Text style={styles.templateBtnText}>
                  {downloading ? 'Downloading…' : '⬇  Download Sample Template'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.uploadBtn} onPress={pickAndUpload} activeOpacity={0.85}>
                <Text style={styles.uploadBtnText}>📂  Pick Excel File & Upload</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* ── Uploading ── */}
          {phase === 'uploading' && (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.uploadingText}>Uploading {fileName}…</Text>
              <Text style={styles.uploadingSubText}>Validating and creating leads</Text>
            </View>
          )}

          {/* ── Result ── */}
          {phase === 'result' && result && (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
              {result.error ? (
                <View style={styles.resultBoxError}>
                  <Text style={styles.resultErrorText}>⚠  {result.error}</Text>
                </View>
              ) : (
                <>
                  <View style={styles.resultStats}>
                    <View style={[styles.resultStat, { backgroundColor: '#E8F5E9' }]}>
                      <Text style={[styles.resultStatNum, { color: '#2E7D32' }]}>{result.created}</Text>
                      <Text style={styles.resultStatLbl}>Created</Text>
                    </View>
                    <View style={[styles.resultStat, { backgroundColor: '#FFEBEE' }]}>
                      <Text style={[styles.resultStatNum, { color: '#C62828' }]}>{result.failed}</Text>
                      <Text style={styles.resultStatLbl}>Failed</Text>
                    </View>
                    <View style={[styles.resultStat, { backgroundColor: '#E8EDF6' }]}>
                      <Text style={[styles.resultStatNum, { color: '#1E4080' }]}>{result.total}</Text>
                      <Text style={styles.resultStatLbl}>Total Rows</Text>
                    </View>
                  </View>

                  {result.errors?.length > 0 && (
                    <View style={styles.errorsSection}>
                      <Text style={styles.errorsSectionTitle}>Failed Rows</Text>
                      {result.errors.map((e, i) => (
                        <View key={i} style={styles.errorRow}>
                          <Text style={styles.errorRowNum}>Row {e.row}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.errorRowName}>{e.name}</Text>
                            <Text style={styles.errorRowMsg}>{e.error}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}

              <View style={styles.resultActions}>
                {(result.error || result.failed > 0) && (
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => { setPhase('guide'); setResult(null); }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.retryBtnText}>Try Again</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 32, maxHeight: '90%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD',
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12,
  },
  title:     { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  closeBtn:  { padding: 4 },
  closeText: { fontSize: 18, color: '#AAA' },

  body: { paddingHorizontal: 20 },

  infoBox: {
    backgroundColor: '#EEF2FF', borderRadius: 12,
    padding: 14, marginBottom: 16,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  infoSub:   { fontSize: 12, color: '#666' },

  tableHeader: {
    flexDirection: 'row', backgroundColor: COLORS.primary,
    borderRadius: 8, marginBottom: 2, paddingHorizontal: 10, paddingVertical: 8,
  },
  tableCellHead: { color: '#fff', fontWeight: '700' },
  tableRow:    { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8 },
  tableRowAlt: { backgroundColor: '#F7F9FF' },
  tableCell:   { fontSize: 12 },
  colName:     { fontWeight: '700', color: '#1A1A2E' },
  colNote:     { color: '#555' },

  sampleBox: {
    marginTop: 12, marginBottom: 8,
    backgroundColor: '#FFFDE7', borderRadius: 10,
    padding: 12, borderLeftWidth: 3, borderLeftColor: '#F9A825',
  },
  sampleTitle: { fontSize: 11, fontWeight: '700', color: '#F9A825', marginBottom: 4 },
  sampleRow:   { fontSize: 12, color: '#555', lineHeight: 18 },

  templateBtn: {
    marginTop: 12, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.primary,
    alignItems: 'center', marginBottom: 10,
  },
  templateBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },

  uploadBtn: {
    paddingVertical: 14, borderRadius: 12,
    backgroundColor: COLORS.primary, alignItems: 'center',
    marginBottom: 8, elevation: 3,
    shadowColor: COLORS.primary, shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 }, shadowRadius: 6,
  },
  uploadBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  centerBox: { paddingVertical: 48, alignItems: 'center', paddingHorizontal: 20 },
  uploadingText:    { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginTop: 16 },
  uploadingSubText: { fontSize: 13, color: '#888', marginTop: 4 },

  resultStats: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  resultStat:  { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  resultStatNum: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  resultStatLbl: { fontSize: 11, fontWeight: '600', color: '#555' },

  resultBoxError: {
    backgroundColor: '#FFEBEE', borderRadius: 12, padding: 16, marginBottom: 16,
  },
  resultErrorText: { fontSize: 14, color: '#C62828', fontWeight: '600' },

  errorsSection:      { marginBottom: 16 },
  errorsSectionTitle: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8 },
  errorRow: {
    flexDirection: 'row', gap: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#F5F5F5',
  },
  errorRowNum:  { width: 44, fontSize: 11, fontWeight: '700', color: '#888', paddingTop: 2 },
  errorRowName: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 2 },
  errorRowMsg:  { fontSize: 12, color: '#B71C1C' },

  resultActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  retryBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#DDD', alignItems: 'center',
  },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: '#555' },
  doneBtn: {
    flex: 2, paddingVertical: 13, borderRadius: 12,
    backgroundColor: COLORS.primary, alignItems: 'center', elevation: 2,
  },
  doneBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

export default BulkUploadModal;
