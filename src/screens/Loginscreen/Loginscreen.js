import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView,
  TouchableWithoutFeedback, Keyboard, Alert, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { login } from '../../redux/actions/authActions';
import styles from './styles';

const LoginScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { companyCode } = route.params || {};

  const dispatch = useDispatch();
  const { loginLoading, user, loginError } = useSelector((s) => s.auth);

  const [userCode, setUserCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) navigation.navigate('Dashboard');
  }, [user]);

  useEffect(() => {
    if (loginError) Alert.alert('Login Failed', loginError);
  }, [loginError]);

  const handleLogin = () => {
    if (!userCode.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter both email and password.');
      return;
    }
    dispatch(login(companyCode, userCode.trim(), password));
  };

  const canLogin = userCode.trim().length > 0 && password.trim().length > 0 && !loginLoading;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#182350" />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Header Banner ── */}
          <View style={styles.header}>
            <View style={styles.logoBox}>
              <Ionicons name="grid" size={30} color="#FFFFFF" />
            </View>
            <Text style={styles.brandName}>Vistara</Text>
            <Text style={styles.brandTag}>ERP PLATFORM</Text>
            <Text style={styles.brandSub}>Real Estate Management</Text>
          </View>

          {/* ── Form Card ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSub}>Sign in to your workspace</Text>

            {/* Email / User Code */}
            <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
            <View style={styles.inputRow}>
              <Ionicons name="mail-outline" size={20} color="#8492A6" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@vistararealty.com"
                placeholderTextColor="#C0CAD8"
                value={userCode}
                onChangeText={setUserCode}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loginLoading}
              />
            </View>

            {/* Password */}
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <View style={styles.inputRow}>
              <Ionicons name="lock-closed-outline" size={20} color="#8492A6" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Enter your password"
                placeholderTextColor="#C0CAD8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loginLoading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye' : 'eye-outline'} size={20} color="#8492A6" />
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.btn, !canLogin && styles.btnDisabled]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={!canLogin}
            >
              {loginLoading
                ? <ActivityIndicator color="#FFFFFF" />
                : <Text style={styles.btnText}>Sign In</Text>
              }
            </TouchableOpacity>

            {/* Back + Register */}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              disabled={loginLoading}
            >
              <Ionicons name="arrow-back" size={16} color="#8492A6" style={{ marginRight: 6 }} />
              <Text style={styles.backText}>Back to Company Code</Text>
            </TouchableOpacity>

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity>
                <Text style={styles.registerLink}>Register</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
