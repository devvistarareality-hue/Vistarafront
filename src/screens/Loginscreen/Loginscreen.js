import React, { useState, useEffect, useRef } from 'react';
import { COLORS } from '../../constants/theme';
import {
  View, Text, TextInput, TouchableOpacity, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView,
  TouchableWithoutFeedback, Keyboard, Alert, ActivityIndicator,
  Image, StyleSheet, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../../constants/api';
import { LOGIN_SUCCESS } from '../../redux/types/authTypes';

// react-native-onesignal is a native module absent in Expo Go; load it lazily
let OneSignal = null;
try { OneSignal = require('react-native-onesignal').OneSignal; } catch (e) {}

const { height } = Dimensions.get('window');
const ORANGE = COLORS.error;

const LoginScreen = () => {
  const navigation = useNavigation();
  const route      = useRoute();
  const { companyCode } = route.params || {};

  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);

  // Credentials step
  const [userCode, setUserCode]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // OTP step
  const [otpStep, setOtpStep]     = useState(false);
  const [otpToken, setOtpToken]   = useState('');
  const [otpEmail, setOtpEmail]   = useState('');
  const [otp, setOtp]             = useState('');
  const [resendSecs, setResendSecs] = useState(30);

  // Shared loading
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (user) navigation.navigate('Dashboard');
  }, [user]);

  // Countdown timer for resend OTP
  const timerRef = useRef(null);
  useEffect(() => {
    if (!otpStep) return;
    timerRef.current = setInterval(() => {
      setResendSecs((s) => {
        if (s <= 1) { clearInterval(timerRef.current); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [otpStep, otpToken]);

  const handleLogin = async () => {
    if (!userCode.trim() || !password.trim()) {
      setError('Please enter both user ID and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${getBaseUrl()}/api/auth/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_code: companyCode,
          user_code: userCode.trim(),
          password,
          platform: 'app',
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.otp_required) {
          setOtpToken(data.otp_token);
          setOtpEmail(data.email || '');
          setOtpStep(true);
          setResendSecs(30);
        } else {
          await AsyncStorage.setItem('access_token', data.tokens.access);
          await AsyncStorage.setItem('refresh_token', data.tokens.refresh);
          dispatch({ type: LOGIN_SUCCESS, payload: data.user });
          try { OneSignal?.login(data.user.user_code); } catch (_) {}
        }
      } else {
        setError(data.detail || 'Invalid credentials.');
      }
    } catch {
      setError('Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { setError('Enter the 6-digit OTP.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${getBaseUrl()}/api/auth/otp/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp_token: otpToken, code: otp, platform: 'app' }),
      });
      const data = await res.json();
      if (res.ok) {
        await AsyncStorage.setItem('access_token', data.tokens.access);
        await AsyncStorage.setItem('refresh_token', data.tokens.refresh);
        dispatch({ type: LOGIN_SUCCESS, payload: data.user });
        try { OneSignal?.login(data.user.user_code); } catch (_) {}
      } else {
        setError(data.detail || 'Invalid OTP.');
      }
    } catch {
      setError('Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${getBaseUrl()}/api/auth/otp/resend/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp_token: otpToken }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpToken(data.otp_token);
        setOtp('');
        setResendSecs(30);
      } else {
        setError(data.detail || 'Could not resend OTP.');
      }
    } catch {
      setError('Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setOtpStep(false);
    setOtpToken('');
    setOtpPhone('');
    setOtpEmail('');
    setOtp('');
    setError('');
  };

  const canSubmit = otpStep
    ? otp.length === 6 && !loading
    : userCode.trim().length > 0 && password.trim().length > 0 && !loading;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      <LinearGradient colors={[COLORS.black, COLORS.navyDark, COLORS.navyDark]} style={StyleSheet.absoluteFill} />
      <View style={s.blobTopRight} />
      <View style={s.blobBottomLeft} />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Header ── */}
          <View style={s.header}>
            <View style={s.ring3}>
              <View style={s.ring2}>
                <View style={s.ring1}>
                  <View style={s.logoCircle}>
                    <Image
                      source={require('../../assets/images/image-WBG.png')}
                      style={s.logoImg}
                      resizeMode="contain"
                    />
                  </View>
                </View>
              </View>
            </View>
            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <View style={s.dividerDot} />
              <View style={s.dividerLine} />
            </View>
            <Text style={s.brandName}>Vistara</Text>
            <Text style={s.brandTag}>ERP PLATFORM</Text>
            <Text style={s.brandSub}>Real Estate Management</Text>
          </View>

          {/* ── Form Card ── */}
          <View style={s.card}>
            <View style={s.cardAccent} />

            {otpStep ? (
              /* ── OTP Step ── */
              <>
                <Text style={s.cardTitle}>Verify OTP</Text>
                <Text style={s.cardSub}>
                  Code sent to{otpEmail ? <Text style={{ fontWeight: '700', color: COLORS.navyDark }}> {otpEmail}</Text> : null}
                </Text>

                <Text style={s.fieldLabel}>ENTER OTP</Text>
                <View style={s.inputRow}>
                  <Ionicons name="key-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 12 }} />
                  <TextInput
                    style={[s.input, { flex: 1, letterSpacing: 8, fontSize: 22, fontWeight: '800' }]}
                    placeholder="- - - - - -"
                    placeholderTextColor={COLORS.textTertiary}
                    value={otp}
                    onChangeText={(v) => { setOtp(v.replace(/[^0-9]/g, '').slice(0, 6)); setError(''); }}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!loading}
                    autoFocus
                  />
                </View>

                {!!error && (
                  <View style={s.errorBox}>
                    <Ionicons name="alert-circle-outline" size={15} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={s.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleVerifyOtp}
                  activeOpacity={0.85}
                  disabled={!canSubmit}
                  style={{ borderRadius: 16, overflow: 'hidden', marginTop: 4 }}
                >
                  <LinearGradient
                    colors={canSubmit ? [COLORS.navy, COLORS.navyDark] : [COLORS.textTertiary, COLORS.textSecondary]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={s.btn}
                  >
                    {loading
                      ? <ActivityIndicator color={COLORS.white} />
                      : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={s.btnText}>Verify OTP</Text>
                          <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} />
                        </View>
                      )
                    }
                  </LinearGradient>
                </TouchableOpacity>

                {/* Resend */}
                <View style={{ alignItems: 'center', marginTop: 18 }}>
                  {resendSecs > 0 ? (
                    <Text style={s.resendTimer}>Resend OTP in {resendSecs}s</Text>
                  ) : (
                    <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                      <Text style={s.resendLink}>Resend OTP</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity style={s.backBtn} onPress={handleBackToLogin} activeOpacity={0.7} disabled={loading}>
                  <Ionicons name="arrow-back" size={16} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={s.backText}>Back to Login</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* ── Credentials Step ── */
              <>
                <Text style={s.cardTitle}>Welcome back</Text>
                <Text style={s.cardSub}>Sign in to your workspace</Text>

                {!!error && (
                  <View style={s.errorBox}>
                    <Ionicons name="alert-circle-outline" size={15} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={s.errorText}>{error}</Text>
                  </View>
                )}

                <Text style={s.fieldLabel}>USER ID</Text>
                <View style={s.inputRow}>
                  <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 12 }} />
                  <TextInput
                    style={s.input}
                    placeholder="Enter your user ID"
                    placeholderTextColor={COLORS.textTertiary}
                    value={userCode}
                    onChangeText={(v) => { setUserCode(v); setError(''); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>

                <Text style={s.fieldLabel}>PASSWORD</Text>
                <View style={s.inputRow}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 12 }} />
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    placeholder="Enter your password"
                    placeholderTextColor={COLORS.textTertiary}
                    value={password}
                    onChangeText={(v) => { setPassword(v); setError(''); }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 6 }}>
                    <Ionicons name={showPassword ? 'eye' : 'eye-outline'} size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={handleLogin}
                  activeOpacity={0.85}
                  disabled={!canSubmit}
                  style={{ borderRadius: 16, overflow: 'hidden', marginTop: 4 }}
                >
                  <LinearGradient
                    colors={canSubmit ? [COLORS.navy, COLORS.navyDark] : [COLORS.textTertiary, COLORS.textSecondary]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={s.btn}
                  >
                    {loading
                      ? <ActivityIndicator color={COLORS.white} />
                      : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={s.btnText}>Sign In</Text>
                          <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                        </View>
                      )
                    }
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.backBtn}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.7}
                  disabled={loading}
                >
                  <Ionicons name="arrow-back" size={16} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                  <Text style={s.backText}>Back to Company Code</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={s.secureRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.textTertiary} />
              <Text style={s.secureText}>Secured & encrypted connection</Text>
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  blobTopRight: {
    position: 'absolute', top: -60, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(255,107,43,0.06)',
  },
  blobBottomLeft: {
    position: 'absolute', bottom: 200, left: -80,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(41,98,255,0.06)',
  },

  header: {
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 44,
    paddingHorizontal: 24,
  },

  ring3: {
    width: 148, height: 148, borderRadius: 74,
    backgroundColor: 'rgba(255,107,43,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,107,43,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 28,
  },
  ring2: {
    width: 118, height: 118, borderRadius: 59,
    backgroundColor: 'rgba(255,107,43,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,107,43,0.28)',
    justifyContent: 'center', alignItems: 'center',
  },
  ring1: {
    width: 92, height: 92, borderRadius: 46,
    backgroundColor: 'rgba(255,107,43,0.10)',
    borderWidth: 1.5, borderColor: 'rgba(255,107,43,0.55)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoCircle: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: COLORS.white,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: ORANGE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 8,
  },
  logoImg: { width: 52, height: 52 },

  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 16, width: 160,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,107,43,0.35)' },
  dividerDot:  { width: 5, height: 5, borderRadius: 2.5, backgroundColor: ORANGE, marginHorizontal: 8 },

  brandName: { fontSize: 34, fontWeight: '800', color: COLORS.white, letterSpacing: 1, marginBottom: 6 },
  brandTag:  { fontSize: 11, fontWeight: '700', color: ORANGE, letterSpacing: 4, marginBottom: 8, textTransform: 'uppercase' },
  brandSub:  { fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: '400', letterSpacing: 0.3 },

  card: {
    flex: 1,
    backgroundColor: COLORS.screenBg,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
    minHeight: height * 0.55,
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute', top: 0, left: 48, right: 48, height: 3,
    backgroundColor: ORANGE, borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
  },
  cardTitle: { fontSize: 26, fontWeight: '800', color: COLORS.navyDark, marginBottom: 6, marginTop: 8 },
  cardSub:   { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500', marginBottom: 28 },

  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.textSecondary,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 16,
    paddingHorizontal: 16, height: 56, marginBottom: 22,
    borderWidth: 1.5, borderColor: COLORS.border,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 3,
  },
  input: { flex: 1, fontSize: 15, color: COLORS.navyDark, fontWeight: '600' },

  btn: {
    height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  btnText: { color: COLORS.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 12, padding: 12, marginBottom: 16,
  },
  errorText: { fontSize: 13, color: '#DC2626', flex: 1 },

  resendTimer: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  resendLink:  { fontSize: 13, color: COLORS.navy, fontWeight: '700', textDecorationLine: 'underline' },

  backBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginTop: 20, paddingVertical: 8,
  },
  backText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },

  secureRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginTop: 16, gap: 6,
  },
  secureText: { fontSize: 12, color: COLORS.textTertiary, fontWeight: '500' },
});

export default LoginScreen;
