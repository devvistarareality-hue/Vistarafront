import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import styles from './styles';

const DashboardScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { companyCode, userCode } = route.params || {};

  const handleLogout = () => {
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.navy} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={18} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeIconRow}>
              <View style={styles.welcomeIcon}>
                <Ionicons name="checkmark-circle" size={32} color="#2E7D32" />
              </View>
            </View>
            <Text style={styles.welcomeTitle}>Welcome!</Text>
            <Text style={styles.infoText}>
              User Code: <Text style={styles.infoValue}>{userCode}</Text>
            </Text>
            <Text style={styles.infoText}>
              Company Code: <Text style={styles.infoValue}>{companyCode}</Text>
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="rgba(255,255,255,0.7)" style={{ marginBottom: 8 }} />
            <Text style={styles.infoBoxText}>
              You have successfully logged in to your account.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DashboardScreen;
