import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StatusBar, ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  createUser, resetCreateUser,
  updateUser, resetUpdateUser,
} from '../../redux/actions/userManagementActions';
import { fetchCompanies } from '../../redux/actions/companiesActions';
import { BASE_URL } from '../../constants/api';
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

const ROLES   = ['Manager', 'Employee', 'Intern'];

function AppDropdown({ label, value, options, onChange, placeholder = 'Select…', disabled = false }) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find(o => String(o.value) === String(value));
  return (
    <>
      <TouchableOpacity onPress={() => !disabled && setOpen(true)} activeOpacity={0.8}
        style={[styles.inputWrap, { justifyContent: 'space-between' }, disabled && { opacity: 0.5, backgroundColor: COLORS.screenBg }]}>
        <Text style={{ flex: 1, fontSize: 14, color: selected ? COLORS.textPrimary : COLORS.textSecondary }}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.white, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 36 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginTop: 12, marginBottom: 4 }} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, paddingHorizontal: 16, paddingVertical: 12 }}>{label}</Text>
            {options.map(o => (
              <TouchableOpacity key={String(o.value)} onPress={() => { onChange(o.value); setOpen(false); }}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: 1, borderTopColor: COLORS.screenBg }}>
                <Text style={{ fontSize: 14, color: String(value) === String(o.value) ? COLORS.secondary : COLORS.textPrimary, fontWeight: String(value) === String(o.value) ? '700' : '400' }}>{o.label}</Text>
                {String(value) === String(o.value) && <Ionicons name="checkmark" size={18} color={COLORS.secondary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
const MODULES = ['Sales', 'HR', 'Accounts & Finance', 'Execution', 'Purchase', 'Land'];

const MODULE_ICONS = {
  Sales:      'pencil-outline',
  HR:         'account-group-outline',
  Execution:  'wrench-outline',
  Purchase:   'cart-outline',
  Land:       'terrain',
};

const ROLE_AVATAR_COLOR = {
  Admin:    COLORS.navy,
  Manager:  COLORS.warningAlt,
  Employee: COLORS.link,
  Intern:   COLORS.purple,
};

export default function CreateUserScreen({ navigation, route }) {
  const editUser = route?.params?.user ?? null;
  const isEdit   = !!editUser;

  const dispatch = useDispatch();
  const {
    creating, createError, createSuccess,
    updating, updateError, updateSuccess,
  } = useSelector((s) => s.userManagement);
  const loggedInUser = useSelector((s) => s.auth.user);
  const { companies } = useSelector((s) => s.companies);
  const isVRLAdmin   = loggedInUser?.role === 'Admin' && loggedInUser?.company_code === 'VRL';

  const busy    = isEdit ? updating  : creating;
  const err     = isEdit ? updateError : createError;
  const success = isEdit ? updateSuccess : createSuccess;

  const [name,            setName]            = useState(editUser?.name            ?? '');
  const [email,           setEmail]           = useState(editUser?.email           ?? '');
  const [phone,           setPhone]           = useState(editUser?.phone           ?? '');
  const [userCode,        setUserCode]        = useState(editUser?.user_code       ?? '');
  const [userCodeError,   setUserCodeError]   = useState('');
  const [password,        setPassword]        = useState('');
  const [showPass,        setShowPass]        = useState(false);
  const [changePass,      setChangePass]      = useState(false);
  const [role,            setRole]            = useState(editUser?.role            ?? 'Employee');
  const [designation,     setDesignation]     = useState(editUser?.designation     ?? '');
  const [modules,         setModules]         = useState(editUser?.modules         ?? []);
  const [managerModules,  setManagerModules]  = useState(editUser?.manager_modules ?? []);
  const [adminModules,    setAdminModules]    = useState(editUser?.admin_modules   ?? []);
  const [allDesignations, setAllDesignations] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [reportingManager,    setReportingManager]    = useState(editUser?.reporting_manager ?? null);
  const [allUsers,            setAllUsers]            = useState([]);
  const [showManagerPicker,   setShowManagerPicker]   = useState(false);
  const [managerSearch,       setManagerSearch]       = useState('');

  const userCodePrefix = generateUserCodePrefix(
    isVRLAdmin && selectedCompany ? selectedCompany.code : loggedInUser?.company_code
  );

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        const [desigRes, usersRes] = await Promise.all([
          fetch(`${BASE_URL}/api/auth/designations/`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${BASE_URL}/api/auth/users/`,        { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (desigRes.ok) setAllDesignations(await desigRes.json());
        if (usersRes.ok) setAllUsers(await usersRes.json());
      } catch { /* ignore */ }
    })();
    if (isVRLAdmin && !isEdit) dispatch(fetchCompanies());
  }, []);

  // Available designations for the selected modules, scoped to the relevant company.
  // (Platform admin now receives every company's designations, so filter by company + dedupe by name.)
  const desigCompanyCode = isVRLAdmin
    ? (isEdit ? editUser?.company_code : selectedCompany?.code)
    : null;
  const availableDesignations = (() => {
    let list = allDesignations.filter((d) => modules.includes(d.module));
    if (isVRLAdmin && desigCompanyCode) list = list.filter((d) => d.company_code === desigCompanyCode);
    const seen = new Set();
    return list.filter((d) => (seen.has(d.name) ? false : (seen.add(d.name), true)));
  })();

  // Reset designation if its module is deselected — only after designations have loaded
  useEffect(() => {
    if (allDesignations.length > 0 && designation && !availableDesignations.find((d) => d.name === designation)) {
      setDesignation('');
    }
  }, [modules]);

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

  // Clear reporting manager when selected company changes (VRL admin create mode only)
  useEffect(() => {
    if (!isEdit) setReportingManager(null);
  }, [selectedCompany]);

  // Managers get Manager Access auto-mirrored from Module Access — any Module
  // Access change overwrites Manager Access to match. Other roles just keep
  // Manager Access pruned to a subset of the selected modules.
  useEffect(() => {
    if (role === 'Manager') {
      setManagerModules(modules);
    } else {
      setManagerModules((prev) => prev.filter((m) => modules.includes(m)));
    }
  }, [modules, role]);

  const toggleModule  = (mod) => setModules((p) => p.includes(mod) ? p.filter((m) => m !== mod) : [...p, mod]);
  const toggleManager = (mod) => setManagerModules((p) => p.includes(mod) ? p.filter((m) => m !== mod) : [...p, mod]);
  const toggleAdmin   = (mod) => setAdminModules((p) => p.includes(mod) ? p.filter((m) => m !== mod) : [...p, mod]);

  const handleSubmit = () => {
    if (!name.trim())                               return Alert.alert('Validation', 'Full name is required.');
    if (!email.trim())                              return Alert.alert('Validation', 'Email is required.');
    if (!isEdit && password.length < 6)             return Alert.alert('Validation', 'Password must be at least 6 characters.');
    if (isEdit && changePass && password.length < 6) return Alert.alert('Validation', 'New password must be at least 6 characters.');
    if (modules.length === 0)                       return Alert.alert('Validation', 'Select at least one module.');

    if (isEdit) {
      setUserCodeError('');
      const payload = { name, email, phone, user_code: userCode.toUpperCase().trim(), role, designation, modules, manager_modules: managerModules, admin_modules: adminModules, reporting_manager_id: reportingManager?.id ?? null };
      if (changePass && password) payload.password = password;
      dispatch(updateUser(editUser.id, payload));
    } else {
      if (isVRLAdmin && !selectedCompany) return Alert.alert('Validation', 'Please select a company.');
      const payload = { name, email, phone, password, role, designation, modules, manager_modules: managerModules, admin_modules: adminModules, user_code_prefix: userCodePrefix, reporting_manager_id: reportingManager?.id ?? null };
      if (isVRLAdmin && selectedCompany) payload.company_id = selectedCompany.id;
      dispatch(createUser(payload));
    }
  };

  const avatarInitial = name.trim() ? name.trim()[0].toUpperCase() : '?';
  const avatarBg      = ROLE_AVATAR_COLOR[role] || COLORS.textSecondary;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />

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

        {/* Company selector — VRL admin only, create mode only */}
        {isVRLAdmin && !isEdit && (
          <>
            <Text style={styles.label}>COMPANY</Text>
            <AppDropdown
              label="Select Company"
              value={selectedCompany?.id}
              options={companies.map(c => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
              onChange={v => setSelectedCompany(companies.find(c => c.id === v) || null)}
              placeholder="Select a company…"
            />
            {selectedCompany && (
              <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 12, marginLeft: 2 }}>
                Creating user for: {selectedCompany.name}
              </Text>
            )}
          </>
        )}

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
            <View style={[styles.inputWrap, { backgroundColor: COLORS.screenBg }]}>
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

        {/* Phone */}
        <Text style={styles.label}>PHONE NUMBER</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="call-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter mobile number"
            placeholderTextColor={COLORS.textSecondary}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
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
        <AppDropdown
          label="Select Role"
          value={role}
          options={ROLES.map(r => ({ value: r, label: r }))}
          onChange={setRole}
          placeholder="Select a role…"
        />

        {/* Module Access */}
        <Text style={styles.label}>MODULE ACCESS</Text>
        <View style={styles.pillGrid}>
          {MODULES.map((mod) => {
            const sel = modules.includes(mod);
            return (
              <TouchableOpacity key={mod} style={[styles.modulePill, sel && styles.modulePillActive]} onPress={() => toggleModule(mod)}>
                <MaterialCommunityIcons name={MODULE_ICONS[mod] || 'circle'} size={13} color={sel ? COLORS.white : COLORS.textSecondary} />
                <Text style={[styles.modulePillText, sel && styles.modulePillTextActive]}>{mod}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Designation — shown after module selection */}
        <Text style={styles.label}>DESIGNATION</Text>
        <AppDropdown
          label="Select Designation"
          value={designation}
          options={[
            { value: '', label: 'None' },
            ...availableDesignations.map(d => ({ value: d.name, label: d.name })),
          ]}
          onChange={setDesignation}
          placeholder={modules.length === 0 ? 'Select modules first' : availableDesignations.length === 0 ? 'No designations for selected modules' : 'Select designation…'}
          disabled={availableDesignations.length === 0 && modules.length === 0}
        />

        {/* Reporting Manager */}
        <Text style={styles.label}>REPORTING MANAGER</Text>
        <TouchableOpacity
          style={styles.inputWrap}
          onPress={() => { setManagerSearch(''); setShowManagerPicker(true); }}
          activeOpacity={0.7}
        >
          <Ionicons name="people-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
          <Text style={[styles.input, { paddingVertical: 12, color: reportingManager ? COLORS.textPrimary : COLORS.textSecondary }]}>
            {reportingManager ? `${reportingManager.name}  ·  ${reportingManager.user_code || ''}` : 'Select reporting manager (optional)'}
          </Text>
          {reportingManager ? (
            <TouchableOpacity onPress={() => setReportingManager(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          ) : (
            <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
          )}
        </TouchableOpacity>
        {reportingManager && (
          <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginTop: 4, marginBottom: 4, marginLeft: 2 }}>
            {reportingManager.role}{reportingManager.designation ? `  ·  ${reportingManager.designation}` : ''}
          </Text>
        )}

        {/* Manager Access */}
        {modules.length > 0 && (
          <>
            <Text style={styles.label}>MANAGER ACCESS</Text>
            <Text style={styles.managerSubtitle}>
              {role === 'Manager' ? 'Auto-matches Module Access above' : 'Elevated view for modules assigned above'}
            </Text>
            <View style={styles.pillGrid}>
              {modules.map((mod) => {
                const isMgr = managerModules.includes(mod);
                return (
                  <TouchableOpacity key={mod} style={[styles.managerPill, isMgr && styles.managerPillActive]} onPress={() => toggleManager(mod)}>
                    <Ionicons name="shield-checkmark-outline" size={13} color={isMgr ? COLORS.warningAlt : COLORS.textSecondary} />
                    <Text style={[styles.managerPillText, isMgr && styles.managerPillTextActive]}>{mod}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Admin Access — only for Managers */}
        {role === 'Manager' && (
          <>
            <Text style={styles.label}>ADMIN ACCESS</Text>
            <Text style={styles.managerSubtitle}>Grant admin-level control over selected modules</Text>
            <View style={styles.pillGrid}>
              {MODULES.map((mod) => {
                const isAdmin = adminModules.includes(mod);
                return (
                  <TouchableOpacity key={mod} style={[styles.adminPill, isAdmin && styles.adminPillActive]} onPress={() => toggleAdmin(mod)}>
                    <Ionicons name="shield-outline" size={13} color={isAdmin ? COLORS.white : COLORS.textSecondary} />
                    <Text style={[styles.adminPillText, isAdmin && styles.adminPillTextActive]}>{mod}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Submit */}
        <TouchableOpacity style={[styles.submitBtn, busy && { opacity: 0.7 }]} onPress={handleSubmit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name={isEdit ? 'checkmark-circle-outline' : 'person-add-outline'} size={18} color={COLORS.white} style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>{isEdit ? 'Update User' : 'Create User'}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Reporting Manager Picker Modal */}
      <Modal
        visible={showManagerPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowManagerPicker(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: COLORS.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%' }}>
            {/* Modal header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}>
              <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.textPrimary }}>Select Reporting Manager</Text>
              <TouchableOpacity onPress={() => setShowManagerPicker(false)}>
                <Ionicons name="close" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={{ flexDirection: 'row', alignItems: 'center', margin: 12, backgroundColor: COLORS.screenBg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, fontSize: 14, color: COLORS.textPrimary }}
                placeholder="Search by name or user code..."
                placeholderTextColor={COLORS.textSecondary}
                value={managerSearch}
                onChangeText={setManagerSearch}
                autoCorrect={false}
              />
              {managerSearch.length > 0 && (
                <TouchableOpacity onPress={() => setManagerSearch('')}>
                  <Ionicons name="close-circle" size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* User list */}
            <FlatList
              data={allUsers.filter((u) => {
                if (isEdit && u.id === editUser?.id) return false;
                if (isVRLAdmin && selectedCompany && u.company_code !== selectedCompany.code) return false;
                if (!managerSearch) return true;
                const q = managerSearch.toLowerCase();
                return (
                  u.name?.toLowerCase().includes(q) ||
                  u.user_code?.toLowerCase().includes(q)
                );
              })}
              keyExtractor={(u) => String(u.id)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
              ListEmptyComponent={
                <Text style={{ textAlign: 'center', color: COLORS.textSecondary, padding: 24 }}>No users found</Text>
              }
              renderItem={({ item }) => {
                const selected = reportingManager?.id === item.id;
                return (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: selected ? COLORS.warningBg : COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt }}
                    onPress={() => { setReportingManager(item); setShowManagerPicker(false); }}
                    activeOpacity={0.7}
                  >
                    <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: ROLE_AVATAR_COLOR[item.role] || COLORS.textSecondary, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.white }}>
                        {item.name?.trim()?.[0]?.toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{item.name}</Text>
                      <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 1 }}>
                        {item.user_code}  ·  {item.role}{item.designation ? `  ·  ${item.designation}` : ''}
                      </Text>
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={20} color={COLORS.warningAlt} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
