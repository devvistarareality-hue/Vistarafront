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
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../../redux/actions/authActions';
import { COLORS } from '../../constants/theme';
import images from '../../constants/images';
import styles from './styles';

const LoginScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { companyCode } = route.params || {};

  const dispatch = useDispatch();
  const { loginLoading, user, loginError } = useSelector((state) => state.auth);

  const [userCode, setUserCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // When login successful, navigate to Dashboard
  useEffect(() => {
    if (user) {
      navigation.navigate('Dashboard');
    }
  }, [user]);

  // Show error alert if login fails
  useEffect(() => {
    if (loginError) {
      Alert.alert('Login Failed', loginError);
    }
  }, [loginError]);

  const handleLogin = () => {
    if (!userCode.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter both user code and password.');
      return;
    }
    dispatch(login(companyCode, userCode.trim(), password));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.content}>
            {/* Logo */}
            <Image
              source={images.splashLogo}
              style={styles.logo}
              resizeMode="contain"
            />

            {/* Company Code Display */}
            <View style={styles.companyCodeBox}>
              <Text style={styles.companyCodeLabel}>Company Code:</Text>
              <Text style={styles.companyCodeValue}>{companyCode}</Text>
            </View>

            {/* User Code Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>User Code</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter user code"
                placeholderTextColor={COLORS.lightGray}
                value={userCode}
                onChangeText={setUserCode}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loginLoading}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter password"
                  placeholderTextColor={COLORS.lightGray}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loginLoading}
                />
                <TouchableOpacity
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eyeIconText}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[
                styles.loginButton,
                (!userCode.trim() || !password.trim() || loginLoading) && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              activeOpacity={0.8}
              disabled={loginLoading}
            >
              {loginLoading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              disabled={loginLoading}
            >
              <Text style={styles.backButtonText}>← Back to Company Code</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
