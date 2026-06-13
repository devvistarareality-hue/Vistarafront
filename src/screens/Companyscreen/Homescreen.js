import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { verifyCompany } from '../../redux/actions/authActions';
import { COLORS } from '../../constants/theme';
import images from '../../constants/images';
import styles from './styles';

const HomeScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { companyLoading, company, companyError } = useSelector((state) => state.auth);

  const [companyCode, setCompanyCode] = useState('');

  // When company verified successfully, navigate to Login
  useEffect(() => {
    if (company) {
      navigation.navigate('Login', { companyCode: company.code });
    }
  }, [company]);

  // Show error alert if verification fails
  useEffect(() => {
    if (companyError) {
      Alert.alert('Invalid Company', companyError);
    }
  }, [companyError]);

  const handleSubmit = () => {
    if (!companyCode.trim()) {
      Alert.alert('Required', 'Please enter a company code.');
      return;
    }
    dispatch(verifyCompany(companyCode.trim()));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Logo */}
          <Image
            source={images.splashLogo}
            style={styles.logo}
            resizeMode="contain"
          />

          {/* Company Code Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Company Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter company code"
              placeholderTextColor={COLORS.lightGray}
              value={companyCode}
              onChangeText={setCompanyCode}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!companyLoading}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!companyCode.trim() || companyLoading) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            activeOpacity={0.8}
            disabled={companyLoading}
          >
            {companyLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default HomeScreen;
