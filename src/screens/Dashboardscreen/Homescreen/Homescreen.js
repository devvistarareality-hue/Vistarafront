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
  const { loading, user, stats, weeklyAttendance } = useSelector(s => s.dashboard);

  useEffect(() => { dispatch(fetchDashboard()); }, []);

  const authenticateAndNavigate = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled  = await LocalAuthentication.isEnrolledAsync();
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
    : Array(6).fill({ date: '--', day: '--', in_time: '--:--', out_time: '--:--', total: '--:--' });

  const statCards = [
    { label: 'Work Today',   value: stats?.work_today        ?? '--:--', icon: '⏱', color: '#27AE60' },
    { label: 'This Week',    value: stats?.worked_this_week  ?? '--:--', icon: '📊', color: '#2980B9' },
    { label: 'Leaves Left',  value: stats?.leaves_available  ?? '0',     icon: '🏖', color: '#F39C12' },
    { label: 'Leaves Used',  value: stats?.leaves_utilised   ?? '0',     icon: '📋', color: '#E74C3C' },
  ];

  const userDetails = [
    { icon: '🔑', label: 'Employee Code', value: user?.user_code },
    { icon: '🏢', label: 'Organisation',  value: user?.organisation },
    { icon: '🗂',  label: 'Department',    value: user?.department },
    { icon: '💼', label: 'Designation',   value: user?.designation },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor="#0F2A44" />

      {/* ── Hero Header ── */}
      <View style={styles.header}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
        </View>
        <Text style={styles.userName}>{user?.name || '—'}</Text>
        <Text style={styles.userRole}>{user?.designation || '—'}</Text>
        <View style={styles.orgBadge}>
          <View style={styles.orgDot} />
          <Text style={styles.orgText}>{user?.organisation || 'Organisation'}</Text>
        </View>
        <View style={styles.headerCurve} />
      </View>

      {/* ── Stat Cards ── */}
      <View style={styles.statsGrid}>
        {statCards.map((s, i) => (
          <View key={i} style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: s.color + '20' }]}>
              <Text style={styles.statIcon}>{s.icon}</Text>
            </View>
            <Text style={styles.statValue}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Action Buttons ── */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#27AE60' }]} onPress={authenticateAndNavigate} activeOpacity={0.85}>
          <Text style={styles.actionIcon}>↩</Text>
          <Text style={styles.actionText}>Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E74C3C' }]} onPress={authenticateAndNavigate} activeOpacity={0.85}>
          <Text style={styles.actionIcon}>↪</Text>
          <Text style={styles.actionText}>Sign Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2980B9' }]} onPress={() => navigation.navigate('Leave')} activeOpacity={0.85}>
          <Text style={styles.actionIcon}>📅</Text>
          <Text style={styles.actionText}>Apply Leave</Text>
        </TouchableOpacity>
      </View>

      {/* ── Weekly Attendance ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Attendance</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {attendance.map((a, i) => {
            const parts    = a.date?.split(' ') || [];
            const datePart = parts[1] || parts[0] || '--';
            return (
              <View key={i} style={styles.dayCard}>
                <Text style={styles.dayName}>{(a.day || '--').slice(0, 3).toUpperCase()}</Text>
                <Text style={styles.dayDate}>{datePart}</Text>
                <View style={styles.dayDivider} />
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>In</Text>
                  <Text style={styles.timeValue}>{a.in_time || '--'}</Text>
                </View>
                <View style={styles.timeRow}>
                  <Text style={styles.timeLabel}>Out</Text>
                  <Text style={styles.timeValue}>{a.out_time || '--'}</Text>
                </View>
                <View style={[styles.timeRow, styles.totalRowCard]}>
                  <Text style={styles.totalLabelCard}>Total</Text>
                  <Text style={styles.totalValueCard}>{a.total || '--'}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* ── User Details ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Details</Text>
        <View style={styles.detailCard}>
          {userDetails.map((item, i, arr) => (
            <View key={i}>
              <View style={styles.detailRow}>
                <Text style={styles.detailIcon}>{item.icon}</Text>
                <View style={styles.detailText}>
                  <Text style={styles.detailLabel}>{item.label}</Text>
                  <Text style={styles.detailValue}>{item.value || '—'}</Text>
                </View>
              </View>
              {i < arr.length - 1 && <View style={styles.detailDivider} />}
            </View>
          ))}
        </View>
      </View>

      <View style={{ height: 28 }} />
    </ScrollView>
  );
};

export default HomeScreen;
