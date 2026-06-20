import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import {
  updateCompany, resetUpdateCompany,
  createCompany, resetCreateCompany,
} from '../../redux/actions/companiesActions';
import { COLORS } from '../../constants/theme';
import styles from '../UserManagement/createStyles';

export default function EditCompanyScreen({ navigation, route }) {
  const company = route?.params?.company ?? null;
  const isEdit  = !!company;

  const dispatch = useDispatch();
  const {
    updating, updateError, updateSuccess,
    creating, createError, createSuccess,
  } = useSelector((s) => s.companies);

  const busy    = isEdit ? updating  : creating;
  const success = isEdit ? updateSuccess : createSuccess;
  const err     = isEdit ? updateError   : createError;

  const [code,      setCode]      = useState(company?.code ?? '');
  const [name,      setName]      = useState(company?.name ?? '');
  const [email,     setEmail]     = useState(company?.email ?? '');
  const [phone,     setPhone]     = useState(company?.phone ?? '');
  const [codeError, setCodeError] = useState('');

  useEffect(() => {
    if (success) {
      dispatch(isEdit ? resetUpdateCompany() : resetCreateCompany());
      navigation.goBack();
    }
  }, [success]);

  useEffect(() => {
    if (err) {
      if (err.toLowerCase().includes('code')) {
        setCodeError(err);
      } else {
        Alert.alert('Error', err);
      }
      dispatch(isEdit ? resetUpdateCompany() : resetCreateCompany());
    }
  }, [err]);

  const handleSubmit = () => {
    const trimCode = code.trim().toUpperCase();
    const trimName = name.trim();
    if (!trimCode) return Alert.alert('Validation', 'Company code is required.');
    if (!trimName) return Alert.alert('Validation', 'Company name is required.');
    setCodeError('');
    if (isEdit) {
      dispatch(updateCompany(company.id, { code: trimCode, name: trimName }));
    } else {
      dispatch(createCompany({ code: trimCode, name: trimName, email: email.trim(), phone: phone.trim() }));
    }
  };

  const avatarInitial = name.trim() ? name.trim()[0].toUpperCase() : '?';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Company' : 'New Company'}</Text>
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
          {isEdit && (
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={12} color={COLORS.secondary} />
              <Text style={styles.editBadgeText}>Editing</Text>
            </View>
          )}
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

        {/* Email — only for create */}
        {!isEdit && (
          <>
            <Text style={styles.label}>EMAIL (OPTIONAL)</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="company@example.com"
                placeholderTextColor={COLORS.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.label}>PHONE (OPTIONAL)</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="call-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="+91 98765 43210"
                placeholderTextColor={COLORS.textSecondary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </>
        )}

        {/* Warning — only on edit */}
        {isEdit && (
          <View style={warnStyle.box}>
            <Ionicons name="warning-outline" size={16} color={COLORS.warning} style={{ marginRight: 8, marginTop: 1 }} />
            <Text style={warnStyle.text}>
              Changing the company code will update the login code for all users of this company.
            </Text>
          </View>
        )}

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, busy && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons
                name={isEdit ? 'checkmark-circle-outline' : 'business-outline'}
                size={18}
                color={COLORS.white}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.submitBtnText}>{isEdit ? 'Update Company' : 'Create Company'}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const warnStyle = {
  box: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    backgroundColor: COLORS.warningBg,
    borderRadius:    10,
    padding:         12,
    marginTop:       20,
    marginBottom:    4,
  },
  text: {
    flex:       1,
    fontSize:   12,
    color:      COLORS.warning,
    lineHeight: 18,
  },
};
