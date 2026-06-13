import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS } from '../../constants/theme';
import styles from './styles';

const DashboardScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { companyCode, userCode } = route.params || {};

  const handleLogout = () => {
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome!</Text>
          <Text style={styles.infoText}>
            User Code: <Text style={styles.infoValue}>{userCode}</Text>
          </Text>
          <Text style={styles.infoText}>
            Company Code: <Text style={styles.infoValue}>{companyCode}</Text>
          </Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoBoxText}>
            You have successfully logged in to your account.
          </Text>
        </View>
      </View>
    </View>
  );
};

export default DashboardScreen;