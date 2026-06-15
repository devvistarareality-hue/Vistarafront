import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StatusBar,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { verifyCompany } from '../../redux/actions/authActions';

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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#182350' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#182350" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Header Banner ── */}
        <View style={{
          backgroundColor: '#182350',
          alignItems: 'center',
          paddingTop: 72,
          paddingBottom: 44,
          paddingHorizontal: 20,
        }}>
          <View style={{
            width: 80, height: 80, borderRadius: 24,
            backgroundColor: '#FFFFFF',
            justifyContent: 'center', alignItems: 'center',
            marginBottom: 18,
            shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15, shadowRadius: 10, elevation: 6,
          }}>
            <Image
              source={require('../../../assets/icon.png')}
              style={{ width: 56, height: 56, borderRadius: 14 }}
              resizeMode="contain"
            />
          </View>
          <Text style={{ fontSize: 34, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 }}>
            Vistara
          </Text>
          <Text style={{
            fontSize: 12, fontWeight: '700', color: '#AFD2FA',
            letterSpacing: 3, marginBottom: 8, textTransform: 'uppercase',
          }}>
            ERP Platform
          </Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.50)' }}>
            Real Estate Management
          </Text>
        </View>

        {/* ── Form Card ── */}
        <View style={{
          flex: 1,
          backgroundColor: '#F5F6FA',
          borderTopLeftRadius: 30,
          borderTopRightRadius: 30,
          paddingHorizontal: 24,
          paddingTop: 36,
          paddingBottom: 48,
          minHeight: 380,
        }}>
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#1A1A2E', marginBottom: 6 }}>
            Get Started
          </Text>
          <Text style={{ fontSize: 13, color: '#8492A6', marginBottom: 32, fontWeight: '500' }}>
            Enter your workspace company code
          </Text>

          <Text style={{
            fontSize: 11, fontWeight: '600', color: '#8492A6',
            letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10,
          }}>
            Company Code
          </Text>
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: '#FFFFFF', borderRadius: 16,
            paddingHorizontal: 16, height: 54,
            marginBottom: 28,
            shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18, shadowRadius: 10, elevation: 3,
          }}>
            <Ionicons name="business-outline" size={20} color="#8492A6" style={{ marginRight: 12 }} />
            <TextInput
              style={{ flex: 1, fontSize: 15, color: '#1A1A2E', fontWeight: '500' }}
              placeholder="e.g. VISTARA01"
              placeholderTextColor="#C0CAD8"
              value={companyCode}
              onChangeText={setCompanyCode}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!companyLoading}
            />
          </View>

          <TouchableOpacity
            style={{
              backgroundColor: canSubmit ? '#182350' : '#B0BAC9',
              borderRadius: 16, height: 54,
              justifyContent: 'center', alignItems: 'center',
              shadowColor: canSubmit ? '#182350' : 'transparent',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.28, shadowRadius: 10, elevation: canSubmit ? 4 : 0,
            }}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={!canSubmit}
          >
            {companyLoading
              ? <ActivityIndicator color="#FFFFFF" />
              : <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>Continue</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default HomeScreen;
