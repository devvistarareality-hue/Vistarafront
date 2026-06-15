import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  TextInput, ActivityIndicator, Alert, StyleSheet, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { fetchCompanies, updateCompany, resetUpdateCompany } from '../../redux/actions/companiesActions';
import { COLORS } from '../../constants/theme';

export default function CompanyManagementScreen({ navigation }) {
  const dispatch = useDispatch();
  const { companies, loading, error, updating, updateError, updateSuccess } =
    useSelector((s) => s.companies);

  const [editTarget, setEditTarget] = useState(null);
  const [newCode,    setNewCode]    = useState('');
  const [newName,    setNewName]    = useState('');

  useEffect(() => {
    dispatch(fetchCompanies());
  }, []);

  useEffect(() => {
    if (updateSuccess) {
      dispatch(resetUpdateCompany());
      setEditTarget(null);
    }
  }, [updateSuccess]);

  useEffect(() => {
    if (updateError) {
      Alert.alert('Error', updateError);
      dispatch(resetUpdateCompany());
    }
  }, [updateError]);

  const openEdit = (company) => {
    setNewCode(company.code);
    setNewName(company.name);
    setEditTarget(company);
  };

  const handleSave = () => {
    const code = newCode.trim().toUpperCase();
    const name = newName.trim();
    if (!code) return Alert.alert('Validation', 'Company code cannot be empty.');
    if (!name) return Alert.alert('Validation', 'Company name cannot be empty.');
    if (code === editTarget.code && name === editTarget.name) {
      setEditTarget(null);
      return;
    }
    dispatch(updateCompany(editTarget.id, { code, name }));
  };

  const renderItem = ({ item }) => (
    <View style={s.row}>
      <View style={[s.codeBadge, { backgroundColor: item.is_active ? '#E8EEFF' : '#F5F6FA' }]}>
        <Text style={[s.codeText, { color: item.is_active ? COLORS.primary : COLORS.textSecondary }]}>
          {item.code}
        </Text>
      </View>
      <View style={s.rowInfo}>
        <Text style={s.companyName} numberOfLines={1}>{item.name}</Text>
        <Text style={[s.statusLabel, { color: item.is_active ? COLORS.success : COLORS.textSecondary }]}>
          {item.is_active ? 'Active' : 'Inactive'}
        </Text>
      </View>
      <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)} activeOpacity={0.7}>
        <Ionicons name="pencil-outline" size={17} color={COLORS.secondary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Company Management</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} color={COLORS.primary} size="large" />
      ) : error ? (
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={40} color={COLORS.error} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => dispatch(fetchCompanies())} style={s.retryBtn}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={companies}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="business-outline" size={40} color={COLORS.textSecondary} />
              <Text style={s.emptyText}>No companies found</Text>
            </View>
          }
        />
      )}

      {/* Edit Modal */}
      <Modal
        visible={!!editTarget}
        transparent
        animationType="fade"
        onRequestClose={() => !updating && setEditTarget(null)}
      >
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Ionicons name="business-outline" size={20} color={COLORS.primary} />
              <Text style={s.modalTitle}>Edit Company</Text>
            </View>

            <Text style={s.fieldLabel}>COMPANY CODE</Text>
            <TextInput
              style={s.modalInput}
              value={newCode}
              onChangeText={(v) => setNewCode(v.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
              placeholder="e.g. VISR"
              placeholderTextColor="#C0CAD8"
              editable={!updating}
            />

            <Text style={s.fieldLabel}>COMPANY NAME</Text>
            <TextInput
              style={s.modalInput}
              value={newName}
              onChangeText={setNewName}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={200}
              placeholder="Company name"
              placeholderTextColor="#C0CAD8"
              editable={!updating}
            />

            <Text style={s.warningText}>
              Changing the code updates login credentials for all users of this company.
            </Text>

            <View style={s.modalBtns}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setEditTarget(null)}
                disabled={updating}
              >
                <Text style={s.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={updating}>
                {updating
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.saveText}>Save</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#E0E6F0',
  },
  backBtn:     { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },

  list:      { padding: 16, paddingBottom: 40 },
  separator: { height: 10 },

  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14,
    shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 2,
  },
  codeBadge:   { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 12 },
  codeText:    { fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  rowInfo:     { flex: 1 },
  companyName: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  statusLabel: { fontSize: 12, fontWeight: '500' },
  editBtn:     { padding: 8, borderRadius: 8, backgroundColor: '#E8EEFF' },

  center:    { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  errorText: { fontSize: 14, color: COLORS.error, marginTop: 12, textAlign: 'center' },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 12 },
  retryBtn:  { marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: COLORS.primary, borderRadius: 10 },
  retryText: { color: '#fff', fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', paddingHorizontal: 24 },
  modal:   { backgroundColor: '#fff', borderRadius: 20, padding: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  modalTitle:  { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },

  fieldLabel:  { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.6, marginBottom: 6, marginTop: 4 },
  modalInput: {
    borderWidth: 1.5, borderColor: '#E0E6F0', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15,
    color: COLORS.textPrimary, marginBottom: 12, backgroundColor: '#F8FAFC',
  },
  warningText: {
    fontSize: 12, color: '#E65100', backgroundColor: '#FFF3E0',
    padding: 10, borderRadius: 8, marginBottom: 20, lineHeight: 17,
  },

  modalBtns:  { flexDirection: 'row', gap: 10 },
  cancelBtn:  { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: '#E0E6F0', alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary },
  saveBtn:    { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveText:   { fontSize: 15, fontWeight: '700', color: '#fff' },
});
