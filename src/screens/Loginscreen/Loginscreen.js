import React, { useState, useEffect } from 'react';
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
import { login } from '../../redux/actions/authActions';

const { height } = Dimensions.get('window');
const ORANGE = '#FF6B2B';

const LoginScreen = () => {
  const navigation = useNavigation();
  const route      = useRoute();
  const { companyCode } = route.params || {};

  const dispatch = useDispatch();
  const { loginLoading, user, loginError } = useSelector((s) => s.auth);

  const [userCode, setUserCode]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) navigation.navigate('Dashboard');
  }, [user]);

  useEffect(() => {
    if (loginError) Alert.alert('Login Failed', loginError);
  }, [loginError]);

  const handleLogin = () => {
    if (!userCode.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter both user ID and password.');
      return;
    }
    dispatch(login(companyCode, userCode.trim(), password));
  };

  const canLogin = userCode.trim().length > 0 && password.trim().length > 0 && !loginLoading;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor="#050D1A" />

      {/* Deep space gradient */}
      <LinearGradient colors={['#050D1A', '#0C1E3C', '#112240']} style={StyleSheet.absoluteFill} />

      {/* Decorative blobs */}
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
            {/* Concentric orange rings */}
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

            <Text style={s.cardTitle}>Welcome back</Text>
            <Text style={s.cardSub}>Sign in to your workspace</Text>

            {/* User ID */}
            <Text style={s.fieldLabel}>USER ID</Text>
            <View style={s.inputRow}>
              <Ionicons name="person-outline" size={20} color="#6B7A99" style={{ marginRight: 12 }} />
              <TextInput
                style={s.input}
                placeholder="Enter your user ID"
                placeholderTextColor="#B0BAD0"
                value={userCode}
                onChangeText={setUserCode}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loginLoading}
              />
            </View>

            {/* Password */}
            <Text style={s.fieldLabel}>PASSWORD</Text>
            <View style={s.inputRow}>
              <Ionicons name="lock-closed-outline" size={20} color="#6B7A99" style={{ marginRight: 12 }} />
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="Enter your password"
                placeholderTextColor="#B0BAD0"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loginLoading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 6 }}>
                <Ionicons name={showPassword ? 'eye' : 'eye-outline'} size={20} color="#6B7A99" />
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <TouchableOpacity
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={!canLogin}
              style={{ borderRadius: 16, overflow: 'hidden', marginTop: 4 }}
            >
              <LinearGradient
                colors={canLogin ? ['#1A3A6E', '#112240'] : ['#B0BAC9', '#9AA3B2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.btn}
              >
                {loginLoading
                  ? <ActivityIndicator color="#FFFFFF" />
                  : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={s.btnText}>Sign In</Text>
                      <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                    </View>
                  )
                }
              </LinearGradient>
            </TouchableOpacity>

            {/* Back */}
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              disabled={loginLoading}
            >
              <Ionicons name="arrow-back" size={16} color="#8492A6" style={{ marginRight: 6 }} />
              <Text style={s.backText}>Back to Company Code</Text>
            </TouchableOpacity>

            <View style={s.secureRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#A0AABB" />
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
    backgroundColor: '#FFFFFF',
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

  brandName: { fontSize: 34, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1, marginBottom: 6 },
  brandTag:  { fontSize: 11, fontWeight: '700', color: ORANGE, letterSpacing: 4, marginBottom: 8, textTransform: 'uppercase' },
  brandSub:  { fontSize: 13, color: 'rgba(255,255,255,0.45)', fontWeight: '400', letterSpacing: 0.3 },

  card: {
    flex: 1,
    backgroundColor: '#F7F8FC',
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
  cardTitle: { fontSize: 26, fontWeight: '800', color: '#0C1E3C', marginBottom: 6, marginTop: 8 },
  cardSub:   { fontSize: 13, color: '#8492A6', fontWeight: '500', marginBottom: 28 },

  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: '#6B7A99',
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 16,
    paddingHorizontal: 16, height: 56, marginBottom: 22,
    borderWidth: 1.5, borderColor: '#E4E9F2',
    shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 3,
  },
  input: { flex: 1, fontSize: 15, color: '#0C1E3C', fontWeight: '600' },

  btn: {
    height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  btnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  backBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginTop: 20, paddingVertical: 8,
  },
  backText: { fontSize: 13, color: '#8492A6', fontWeight: '500' },

  secureRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginTop: 16, gap: 6,
  },
  secureText: { fontSize: 12, color: '#A0AABB', fontWeight: '500' },
});

export default LoginScreen;
