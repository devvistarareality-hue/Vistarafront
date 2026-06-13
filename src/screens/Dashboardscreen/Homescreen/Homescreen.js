import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import * as LocalAuthentication from 'expo-local-authentication';
import { fetchDashboard } from '../../../redux/actions/dashboardActions';
import styles from './styles';

const HomeScreen = () => {
  const navigation = useNavigation();
  const dispatch   = useDispatch();

  const { loading, user, stats, weeklyAttendance } = useSelector(
    (state) => state.dashboard,
  );

  useEffect(() => {
    dispatch(fetchDashboard());
  }, []);

  const authenticateAndNavigate = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert('Biometrics Unavailable', 'Please set up fingerprint or face unlock in your device settings.');
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to continue',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });
      if (result.success) {
        navigation.navigate('SignIn');
      } else if (result.error !== 'user_cancel' && result.error !== 'system_cancel') {
        Alert.alert('Authentication Failed', 'Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Could not authenticate. Please try again.');
    }
  };

  if (loading && !user) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#1E4080" />
      </View>
    );
  }

  const attendance = weeklyAttendance.length > 0
    ? weeklyAttendance
    : Array(6).fill({ date: '--', day: '--', in_time: '00:00', out_time: '00:00', total: '00:00' });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor="#0F2A44" />

      {/* ── Profile Card ── */}
      <View style={styles.profileCard}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarIcon}>👤</Text>
          </View>
        </View>
        <Text style={styles.userName}>{user?.name || '—'}</Text>
        <Text style={styles.userRole}>{user?.designation || '—'}</Text>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Work Today</Text>
            <Text style={styles.statValue}>{stats?.work_today ?? '00:00'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Worked This Week</Text>
            <Text style={styles.statValue}>{stats?.worked_this_week ?? '00:00'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Leaves Available</Text>
            <Text style={styles.statValue}>{stats?.leaves_available ?? '0.0'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Leaves Utilised</Text>
            <Text style={styles.statValue}>{stats?.leaves_utilised ?? '0'}</Text>
          </View>
        </View>
      </View>

      {/* ── Action Buttons ── */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, styles.signInBtn]} onPress={authenticateAndNavigate} activeOpacity={0.8}>
          <Text style={styles.actionBtnIcon}>↩</Text>
          <Text style={styles.actionBtnText}>SIGN IN</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.signOutBtn]} onPress={authenticateAndNavigate} activeOpacity={0.8}>
          <Text style={styles.actionBtnIcon}>↪</Text>
          <Text style={styles.actionBtnText}>SIGN OUT</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.leaveBtn]} activeOpacity={0.8} onPress={() => navigation.navigate('Leave')}>
          <Text style={styles.actionBtnIcon}>📅</Text>
          <Text style={styles.actionBtnText}>APPLY LEAVE</Text>
        </TouchableOpacity>
      </View>

      {/* ── Weekly Attendance Table ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Weekly Attendance</Text>
        <View style={styles.table}>
          {/* Header */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.tableHeader, styles.labelCol]}>Date</Text>
            {attendance.map((d, i) => (
              <View key={i} style={[styles.tableCell, styles.dateCol]}>
                <Text style={styles.tableHeader}>{d.date?.split(' ')[1] || '--'}</Text>
                <Text style={styles.tableHeader}>{d.date?.split(' ')[0] || '--'}</Text>
                <Text style={styles.tableHeader}>{d.day || '--'}</Text>
              </View>
            ))}
          </View>

          {/* In row */}
          <View style={[styles.tableRow, styles.rowBg]}>
            <Text style={[styles.tableCell, styles.labelCol, styles.rowLabel]}>In</Text>
            {attendance.map((a, i) => (
              <Text key={i} style={[styles.tableCell, styles.dateCol, styles.timeText]}>{a.in_time}</Text>
            ))}
          </View>

          {/* Out row */}
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.labelCol, styles.rowLabel]}>Out</Text>
            {attendance.map((a, i) => (
              <Text key={i} style={[styles.tableCell, styles.dateCol, styles.timeText]}>{a.out_time}</Text>
            ))}
          </View>

          {/* Total row */}
          <View style={[styles.tableRow, styles.totalRow]}>
            <Text style={[styles.tableCell, styles.labelCol, styles.totalLabel]}>Total</Text>
            {attendance.map((a, i) => (
              <Text key={i} style={[styles.tableCell, styles.dateCol, styles.totalText]}>{a.total}</Text>
            ))}
          </View>
        </View>
      </View>

      {/* ── User Info ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>User Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>CODE</Text>
          <Text style={styles.infoValue}>{user?.user_code || '—'}</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>ORGANISATION</Text>
          <Text style={styles.infoValue}>{user?.organisation || '—'}</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>DEPARTMENT</Text>
          <Text style={styles.infoValue}>{user?.department || '—'}</Text>
        </View>
        <View style={styles.infoDivider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>DESIGNATION</Text>
          <Text style={styles.infoValue}>{user?.designation || '—'}</Text>
        </View>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

export default HomeScreen;
