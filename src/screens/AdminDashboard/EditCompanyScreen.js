import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { updateCompany, resetUpdateCompany } from '../../redux/actions/companiesActions';
import { COLORS } from '../../constants/theme';
import styles from '../UserManagement/createStyles';

export default function EditCompanyScreen({ navigation, route }) {
  const company = route?.params?.company;
  const dispatch = useDispatch();
  const { updating, updateError, updateSuccess } = useSelector((s) => s.companies);

  const [code, setCode] = useState(company?.code ?? '');
  const [name, setName] = useState(company?.name ?? '');
  const [codeError, setCodeError] = useState('');

  useEffect(() => {
    if (updateSuccess) {
      dispatch(resetUpdateCompany());
      navigation.goBack();
    }
  }, [updateSuccess]);

  useEffect(() => {
    if (updateError) {
      if (updateError.toLowerCase().includes('code')) {
        setCodeError(updateError);
      } else {
        Alert.alert('Error', updateError);
      }
      dispatch(resetUpdateCompany());
    }
  }, [updateError]);

  const handleSubmit = () => {
    const trimCode = code.trim().toUpperCase();
    const trimName = name.trim();
    if (!trimCode) return Alert.alert('Validation', 'Company code is required.');
    if (!trimName) return Alert.alert('Validation', 'Company name is required.');
    setCodeError('');
    dispatch(updateCompany(company.id, { code: trimCode, name: trimName }));
  };

  const avatarInitial = name.trim() ? name.trim()[0].toUpperCase() : '?';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Company</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Preview card */}
        <View style={styles.previewCard}>
          <View style={[styles.previewAvatar, { backgroundColor: COLORS.primary }]}>
            <Text style={styles.previewAvatarText}>{avatarInitial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.previewName} numberOfLines={1}>
              {name.trim() || 'Company Name'}
            </Text>
            <Text style={styles.previewRole}>{code.trim().toUpperCase() || 'CODE'}</Text>
          </View>
          <View style={styles.editBadge}>
            <Ionicons name="pencil" size={12} color={COLORS.secondary} />
            <Text style={styles.editBadgeText}>Editing</Text>
          </View>
        </View>

        {/* Company Code */}
        <Text style={styles.label}>COMPANY CODE</Text>
        <View style={[styles.inputWrap, codeError ? styles.inputError : null]}>
          <Ionicons
            name="id-card-outline"
            size={18}
            color={codeError ? COLORS.error : COLORS.textSecondary}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="e.g. VISR"
            placeholderTextColor={COLORS.textSecondary}
            value={code}
            onChangeText={(v) => { setCode(v.toUpperCase()); setCodeError(''); }}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={20}
          />
        </View>
        {codeError ? (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle" size={13} color={COLORS.error} />
            <Text style={styles.errorMsg}>{codeError}</Text>
          </View>
        ) : null}

        {/* Company Name */}
        <Text style={styles.label}>COMPANY NAME</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="business-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter company name"
            placeholderTextColor={COLORS.textSecondary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={200}
          />
        </View>

        {/* Warning */}
        <View style={warnStyle.box}>
          <Ionicons name="warning-outline" size={16} color="#E65100" style={{ marginRight: 8, marginTop: 1 }} />
          <Text style={warnStyle.text}>
            Changing the company code will update the login code for all users of this company.
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, updating && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={updating}
        >
          {updating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Update Company</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const warnStyle = {
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
    marginBottom: 4,
  },
  text: {
    flex: 1,
    fontSize: 12,
    color: '#E65100',
    lineHeight: 18,
  },
};
