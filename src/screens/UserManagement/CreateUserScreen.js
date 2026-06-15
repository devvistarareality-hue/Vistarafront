import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  createUser, resetCreateUser,
  updateUser, resetUpdateUser,
} from '../../redux/actions/userManagementActions';
import { COLORS } from '../../constants/theme';
import styles from './createStyles';

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

function firstConsonantFrom(str, startIdx) {
  for (let i = startIdx; i < str.length; i++) {
    if (!VOWELS.has(str[i])) return str[i];
  }
  return str[startIdx] || 'X';
}

function generateUserCodePrefix(companyCode) {
  const code = (companyCode || '').toLowerCase().replace(/[^a-z]/g, '');
  if (code.length < 3) return (code + 'XXX').slice(0, 3).toUpperCase();
  const n = code.length;
  const c1 = firstConsonantFrom(code, 0);
  const c2 = firstConsonantFrom(code, Math.floor(n * 0.4));
  const c3 = firstConsonantFrom(code, Math.floor(n * 0.8));
  return (c1 + c2 + c3).toUpperCase();
}

const ROLES   = ['Admin', 'Sales', 'Pre-Sales', 'HR', 'Exec'];
const MODULES = ['Sales', 'Pre-Sales', 'HR', 'Execution', 'Purchase', 'Land'];

const MODULE_ICONS = {
  Sales:      'pencil-outline',
  'Pre-Sales':'filter-outline',
  HR:         'account-group-outline',
  Execution:  'wrench-outline',
  Purchase:   'cart-outline',
  Land:       'terrain',
};

const ROLE_AVATAR_COLOR = {
  Admin:       '#182350',
  Sales:       '#F9A825',
  'Pre-Sales': '#0097A7',
  HR:          '#3D5AFE',
  Exec:        '#7B1FA2',
};

export default function CreateUserScreen({ navigation, route }) {
  const editUser = route?.params?.user ?? null;
  const isEdit   = !!editUser;

  const dispatch = useDispatch();
  const {
    creating, createError, createSuccess,
    updating, updateError, updateSuccess,
  } = useSelector((s) => s.userManagement);
  const loggedInUser   = useSelector((s) => s.auth.user);
  const userCodePrefix = generateUserCodePrefix(loggedInUser?.company_code);

  const busy    = isEdit ? updating  : creating;
  const err     = isEdit ? updateError : createError;
  const success = isEdit ? updateSuccess : createSuccess;

  const [name,            setName]            = useState(editUser?.name            ?? '');
  const [email,           setEmail]           = useState(editUser?.email           ?? '');
  const [userCode,        setUserCode]        = useState(editUser?.user_code       ?? '');
  const [userCodeError,   setUserCodeError]   = useState('');
  const [password,        setPassword]        = useState('');
  const [showPass,        setShowPass]        = useState(false);
  const [changePass,      setChangePass]      = useState(false);
  const [role,            setRole]            = useState(editUser?.role            ?? 'Sales');
  const [modules,         setModules]         = useState(editUser?.modules         ?? ['Sales']);
  const [managerModules,  setManagerModules]  = useState(editUser?.manager_modules ?? []);

  useEffect(() => {
    if (success) {
      dispatch(isEdit ? resetUpdateUser() : resetCreateUser());
      navigation.goBack();
    }
  }, [success]);

  useEffect(() => {
    if (err) {
      // Show user_code duplicate inline; all other errors as alert
      if (err.toLowerCase().includes('user code') || err.toLowerCase().includes('user_code')) {
        setUserCodeError(err);
      } else {
        Alert.alert('Error', err);
      }
      dispatch(isEdit ? resetUpdateUser() : resetCreateUser());
    }
  }, [err]);

  // Remove manager access for deselected modules
  useEffect(() => {
    setManagerModules((prev) => prev.filter((m) => modules.includes(m)));
  }, [modules]);

  const toggleModule  = (mod) => setModules((p) => p.includes(mod) ? p.filter((m) => m !== mod) : [...p, mod]);
  const toggleManager = (mod) => setManagerModules((p) => p.includes(mod) ? p.filter((m) => m !== mod) : [...p, mod]);

  const handleSubmit = () => {
    if (!name.trim())                               return Alert.alert('Validation', 'Full name is required.');
    if (!email.trim())                              return Alert.alert('Validation', 'Email is required.');
    if (!isEdit && password.length < 6)             return Alert.alert('Validation', 'Password must be at least 6 characters.');
    if (isEdit && changePass && password.length < 6) return Alert.alert('Validation', 'New password must be at least 6 characters.');
    if (modules.length === 0)                       return Alert.alert('Validation', 'Select at least one module.');

    if (isEdit) {
      setUserCodeError('');
      const payload = { name, email, user_code: userCode.toUpperCase().trim(), role, modules, manager_modules: managerModules };
      if (changePass && password) payload.password = password;
      dispatch(updateUser(editUser.id, payload));
    } else {
      dispatch(createUser({ name, email, password, role, modules, manager_modules: managerModules, user_code_prefix: userCodePrefix }));
    }
  };

  const avatarInitial = name.trim() ? name.trim()[0].toUpperCase() : '?';
  const avatarBg      = ROLE_AVATAR_COLOR[role] || '#8492A6';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit User' : 'New User'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Preview card */}
        <View style={styles.previewCard}>
          <View style={[styles.previewAvatar, { backgroundColor: avatarBg }]}>
            <Text style={styles.previewAvatarText}>{avatarInitial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.previewName} numberOfLines={1}>{name.trim() || 'Full Name'}</Text>
            <Text style={styles.previewRole}>
              {role}{isEdit && userCode ? `  ·  ${userCode.toUpperCase()}` : ''}
            </Text>
          </View>
          {isEdit && (
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={12} color={COLORS.secondary} />
              <Text style={styles.editBadgeText}>Editing</Text>
            </View>
          )}
        </View>

        {/* Full Name */}
        <Text style={styles.label}>FULL NAME</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter full name"
            placeholderTextColor={COLORS.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* User Code — prefix preview on create, editable on edit */}
        {!isEdit && (
          <>
            <Text style={styles.label}>USER CODE PREFIX</Text>
            <View style={[styles.inputWrap, { backgroundColor: '#F5F6FA' }]}>
              <Ionicons name="id-card-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
              <Text style={[styles.input, { color: COLORS.textPrimary, paddingVertical: 12 }]}>{userCodePrefix}</Text>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, paddingRight: 8 }}>auto</Text>
            </View>
            <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 12, marginLeft: 2 }}>
              Full code will be assigned by system (e.g. {userCodePrefix}001)
            </Text>
          </>
        )}

        {isEdit && (
          <>
            <Text style={styles.label}>USER CODE</Text>
            <View style={[styles.inputWrap, userCodeError ? styles.inputError : null]}>
              <Ionicons name="id-card-outline" size={18} color={userCodeError ? COLORS.error : COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. USR001"
                placeholderTextColor={COLORS.textSecondary}
                value={userCode}
                onChangeText={(v) => { setUserCode(v); setUserCodeError(''); }}
                autoCapitalize="characters"
              />
            </View>
            {userCodeError ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={13} color={COLORS.error} />
                <Text style={styles.errorMsg}>{userCodeError}</Text>
              </View>
            ) : null}
          </>
        )}

        {/* Email */}
        <Text style={styles.label}>EMAIL ADDRESS</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="email@vistararealty.com"
            placeholderTextColor={COLORS.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Password — required on create, optional toggle on edit */}
        {isEdit ? (
          <>
            <TouchableOpacity style={styles.changePassRow} onPress={() => { setChangePass((v) => !v); setPassword(''); }}>
              <Ionicons name={changePass ? 'chevron-down' : 'chevron-forward'} size={14} color={COLORS.secondary} />
              <Text style={styles.changePassText}>{changePass ? 'Cancel password change' : 'Change password'}</Text>
            </TouchableOpacity>
            {changePass && (
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="New password (min. 6 chars)"
                  placeholderTextColor={COLORS.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity onPress={() => setShowPass((v) => !v)}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Min. 6 characters"
                placeholderTextColor={COLORS.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
              />
              <TouchableOpacity onPress={() => setShowPass((v) => !v)}>
                <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Role */}
        <Text style={styles.label}>ROLE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
          {ROLES.map((r) => (
            <TouchableOpacity key={r} style={[styles.pill, role === r && styles.pillActive]} onPress={() => setRole(r)}>
              <Text style={[styles.pillText, role === r && styles.pillTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Module Access */}
        <Text style={styles.label}>MODULE ACCESS</Text>
        <View style={styles.pillGrid}>
          {MODULES.map((mod) => {
            const sel = modules.includes(mod);
            return (
              <TouchableOpacity key={mod} style={[styles.modulePill, sel && styles.modulePillActive]} onPress={() => toggleModule(mod)}>
                <MaterialCommunityIcons name={MODULE_ICONS[mod] || 'circle'} size={13} color={sel ? '#fff' : COLORS.textSecondary} />
                <Text style={[styles.modulePillText, sel && styles.modulePillTextActive]}>{mod}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Manager Access */}
        {modules.length > 0 && (
          <>
            <Text style={styles.label}>MANAGER ACCESS</Text>
            <Text style={styles.managerSubtitle}>Elevated view for modules assigned above</Text>
            <View style={styles.pillGrid}>
              {modules.map((mod) => {
                const isMgr = managerModules.includes(mod);
                return (
                  <TouchableOpacity key={mod} style={[styles.managerPill, isMgr && styles.managerPillActive]} onPress={() => toggleManager(mod)}>
                    <Ionicons name="shield-checkmark-outline" size={13} color={isMgr ? '#E6960A' : COLORS.textSecondary} />
                    <Text style={[styles.managerPillText, isMgr && styles.managerPillTextActive]}>{mod}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Submit */}
        <TouchableOpacity style={[styles.submitBtn, busy && { opacity: 0.7 }]} onPress={handleSubmit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name={isEdit ? 'checkmark-circle-outline' : 'person-add-outline'} size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>{isEdit ? 'Update User' : 'Create User'}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
