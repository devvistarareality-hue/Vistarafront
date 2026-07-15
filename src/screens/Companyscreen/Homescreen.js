import React, { useState, useEffect } from 'react';
import { COLORS } from '../../constants/theme';
import {
  View, Text, TextInput, TouchableOpacity, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Image,
  StyleSheet, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { verifyCompany } from '../../redux/actions/authActions';

const { width, height } = Dimensions.get('window');

const HomeScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { companyLoading, company, companyError } = useSelector((s) => s.auth);
  const [companyCode, setCompanyCode] = useState('');

  useEffect(() => {
    if (company) navigation.navigate('Login', { companyCode: company.code });
  }, [company]);

  useEffect(() => {
    if (companyError) Alert.alert('Invalid Company', companyError);
  }, [companyError]);

  const handleSubmit = () => {
    if (!companyCode.trim()) {
      Alert.alert('Required', 'Please enter a company code.');
      return;
    }
    dispatch(verifyCompany(companyCode.trim()));
  };

  const canSubmit = companyCode.trim().length > 0 && !companyLoading;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* Deep space gradient background */}
      <LinearGradient
        colors={[COLORS.black, COLORS.navyDark, COLORS.navyDark]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative glow blobs */}
      <View style={s.blobTopRight} />
      <View style={s.blobBottomLeft} />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Header ── */}
        <View style={s.header}>

          {/* Decorative ring behind logo */}
          <View style={s.ring3}>
            <View style={s.ring2}>
              <View style={s.ring1}>
                {/* Logo circle */}
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

          {/* Horizontal gold divider line */}
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
          {/* Gold top accent bar */}
          <View style={s.cardAccent} />

          <Text style={s.cardTitle}>Get Started</Text>
          <Text style={s.cardSub}>Enter your workspace company code</Text>

          <Text style={s.fieldLabel}>COMPANY CODE</Text>
          <View style={s.inputRow}>
            <Ionicons name="business-outline" size={20} color={COLORS.textSecondary} style={{ marginRight: 12 }} />
            <TextInput
              style={s.input}
              placeholder="e.g. VRL"
              placeholderTextColor={COLORS.textTertiary}
              value={companyCode}
              onChangeText={(t) => setCompanyCode(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!companyLoading}
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={!canSubmit}
            style={{ borderRadius: 16, overflow: 'hidden', marginTop: 4 }}
          >
            <LinearGradient
              colors={canSubmit ? [COLORS.navy, COLORS.navyDark] : [COLORS.textTertiary, COLORS.textSecondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.btn}
            >
              {companyLoading
                ? <ActivityIndicator color={COLORS.white} />
                : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.btnText}>Continue</Text>
                    <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                  </View>
                )
              }
            </LinearGradient>
          </TouchableOpacity>

          <View style={s.secureRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.textTertiary} />
            <Text style={s.secureText}>Secured & encrypted connection</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const GOLD = COLORS.error;

const s = StyleSheet.create({
  // ── Decorative blobs ──
  blobTopRight: {
    position: 'absolute', top: -60, right: -60,
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(41,98,255,0.08)',
  },
  blobBottomLeft: {
    position: 'absolute', bottom: 200, left: -80,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(100,160,255,0.06)',
  },

  // ── Header ──
  header: {
    alignItems: 'center',
    paddingTop: 72,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },

  // ── Logo rings ──
  ring3: {
    width: 148, height: 148, borderRadius: 74,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,107,43,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 28,
  },
  ring2: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,107,43,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  ring1: {
    width: 94, height: 94, borderRadius: 47,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5, borderColor: 'rgba(255,107,43,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  logoCircle: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: COLORS.white,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.error, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 14, elevation: 10,
  },
  logoImg: {
    width: 60, height: 60,
  },

  // ── Divider ──
  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 16, width: 160,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,107,43,0.35)' },
  dividerDot:  { width: 5, height: 5, borderRadius: 2.5, backgroundColor: GOLD, marginHorizontal: 8 },

  // ── Text ──
  brandName: {
    fontSize: 36, fontWeight: '800', color: COLORS.white,
    letterSpacing: 1, marginBottom: 6,
  },
  brandTag: {
    fontSize: 11, fontWeight: '700', color: GOLD,
    letterSpacing: 4, marginBottom: 8, textTransform: 'uppercase',
  },
  brandSub: {
    fontSize: 13, color: 'rgba(255,255,255,0.45)',
    fontWeight: '400', letterSpacing: 0.3,
  },

  // ── Card ──
  card: {
    flex: 1,
    backgroundColor: COLORS.screenBg,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
    minHeight: height * 0.50,
    shadowColor: COLORS.black, shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12, shadowRadius: 20, elevation: 10,
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute', top: 0, left: 48, right: 48, height: 3,
    backgroundColor: GOLD, borderBottomLeftRadius: 4, borderBottomRightRadius: 4,
  },
  cardTitle: {
    fontSize: 26, fontWeight: '800', color: COLORS.navyDark, marginBottom: 6, marginTop: 8,
  },
  cardSub: {
    fontSize: 13, color: COLORS.textSecondary, fontWeight: '500', marginBottom: 28,
  },

  // ── Field ──
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.textSecondary,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.white, borderRadius: 16,
    paddingHorizontal: 16, height: 56, marginBottom: 24,
    borderWidth: 1.5, borderColor: COLORS.border,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 3,
  },
  input: {
    flex: 1, fontSize: 15, color: COLORS.navyDark, fontWeight: '600',
    letterSpacing: 1,
  },

  // ── Button ──
  btn: {
    height: 56, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  btnText: {
    color: COLORS.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.5,
  },

  // ── Secure row ──
  secureRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginTop: 20, gap: 6,
  },
  secureText: { fontSize: 12, color: COLORS.textTertiary, fontWeight: '500' },
});

export default HomeScreen;
