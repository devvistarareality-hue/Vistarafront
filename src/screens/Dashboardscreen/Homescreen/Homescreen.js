import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator, Dimensions, RefreshControl,
  Modal, Pressable, StyleSheet, Animated, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { fetchDashboard, fetchMonthlyAttendance } from '../../../redux/actions/dashboardActions';
import { logout } from '../../../redux/actions/authActions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from '../../../constants/api';

const { width } = Dimensions.get('window');

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_HEADERS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const BG    = '#F5F6FA';
const NAVY  = '#182350';
const TEXT  = '#1A1A2E';
const MUTED = '#8492A6';
const LINK  = '#3D5AFE';

const CARD = {
  backgroundColor: '#FFFFFF',
  borderRadius: 18,
  shadowColor: '#B8C4D6',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.20,
  shadowRadius: 12,
  elevation: 4,
};

const CAL_CELL = Math.floor((width - 40 - 32) / 7);

const HomeScreen = () => {
  const navigation = useNavigation();
  const dispatch   = useDispatch();
  const { loading, user, stats, weeklyAttendance, monthlyAttendance, monthlyLoading } =
    useSelector(s => s.dashboard);

  const today = new Date();

  const [attendanceTab,  setAttendanceTab]  = useState('month');
  const [calYear,        setCalYear]        = useState(today.getFullYear());
  const [calMonth,       setCalMonth]       = useState(today.getMonth() + 1);
  const [selectedDay,    setSelectedDay]    = useState(null);
  const [refreshing,     setRefreshing]     = useState(false);
  const [profileVisible,  setProfileVisible]  = useState(false);
  const [profileUser,     setProfileUser]     = useState(null);
  const [profileLoading,  setProfileLoading]  = useState(false);

  const profileSheetY = useRef(new Animated.Value(0)).current;

  const closeProfileSheet = () => {
    Animated.timing(profileSheetY, { toValue: 700, duration: 220, useNativeDriver: true }).start(() => {
      setProfileVisible(false);
    });
  };

  const profilePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { profileSheetY.stopAnimation(); },
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) profileSheetY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          Animated.timing(profileSheetY, { toValue: 700, duration: 200, useNativeDriver: true }).start(() => {
            setProfileVisible(false);
          });
        } else {
          Animated.spring(profileSheetY, {
            toValue: 0, useNativeDriver: true, overshootClamping: true,
          }).start();
        }
      },
    })
  ).current;

  const handleLogout = () => {
    setProfileVisible(false);
    dispatch(logout());
  };

  async function openProfile() {
    setProfileVisible(true);
    setProfileLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res   = await fetch(`${getBaseUrl()}/api/auth/me/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setProfileUser(await res.json());
    } catch (_) {}
    setProfileLoading(false);
  }

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchDashboard());
      const interval = setInterval(() => dispatch(fetchDashboard()), 30000);
      return () => clearInterval(interval);
    }, [dispatch]),
  );

  useEffect(() => {
    if (!loading) setRefreshing(false);
  }, [loading]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchDashboard());
    if (attendanceTab === 'month') dispatch(fetchMonthlyAttendance(calYear, calMonth));
  }, [dispatch, attendanceTab, calYear, calMonth]);

  useEffect(() => {
    if (attendanceTab === 'month') {
      dispatch(fetchMonthlyAttendance(calYear, calMonth));
      setSelectedDay(null);
    }
  }, [attendanceTab, calYear, calMonth]);

  useEffect(() => {
    if (profileVisible) {
      profileSheetY.setValue(700);
      Animated.spring(profileSheetY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    }
  }, [profileVisible]);

  const authenticateAndNavigate = async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled  = await LocalAuthentication.isEnrolledAsync();
      if (!hasHardware || !isEnrolled) {
        Alert.alert('Biometrics Unavailable', 'Please set up fingerprint or face unlock in device settings.');
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
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  const initials = user?.name
    ? user.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const todayStr    = `${String(today.getDate()).padStart(2,'0')} ${MONTHS_SHORT[today.getMonth()]}`;
  const todayRecord = weeklyAttendance.find(a => a.date === todayStr) || null;
  const attendance  = weeklyAttendance.length > 0
    ? weeklyAttendance
    : Array(6).fill({ date: '--', day: '--', in_time: '--:--', out_time: '--:--', total: '--:--' });

  const prevMonth = () => {
    if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); }
    else setCalMonth(m => m + 1);
  };

  const buildCalendarCells = () => {
    const firstDay      = new Date(calYear, calMonth - 1, 1).getDay();
    const leadingBlanks = (firstDay + 6) % 7;
    const daysInMonth   = new Date(calYear, calMonth, 0).getDate();
    const cells = [];
    for (let i = 0; i < leadingBlanks; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  };

  const calCells     = buildCalendarCells();
  const recordMap    = {};
  (monthlyAttendance?.records || []).forEach(r => { recordMap[r.day] = r; });
  const selectedRecord = selectedDay ? recordMap[selectedDay] : null;

  const statCards = [
    { label: 'Work Today',  value: stats?.work_today       ?? '--:--', icon: 'time-outline',      iconBg: '#E8EEFF', iconColor: '#3D5AFE' },
    { label: 'This Week',   value: stats?.worked_this_week ?? '--:--', icon: 'bar-chart-outline',  iconBg: '#E0F7FA', iconColor: '#0097A7' },
    { label: 'Leaves Left', value: stats?.leaves_available ?? '0',     icon: 'calendar-outline',   iconBg: '#FFF8E1', iconColor: '#F9A825' },
    { label: 'Leaves Used', value: stats?.leaves_utilised  ?? '0',     icon: 'clipboard-outline',  iconBg: '#FFF3E0', iconColor: '#E65100' },
  ];

  const p = profileUser || user;
  const userDetails = [
    { icon: 'person-outline',          label: 'Full Name',          value: p?.name },
    { icon: 'id-card-outline',         label: 'Employee Code',      value: p?.user_code },
    { icon: 'call-outline',            label: 'Phone',              value: p?.phone },
    { icon: 'mail-outline',            label: 'Email',              value: p?.email },
    { icon: 'business-outline',        label: 'Organisation',       value: p?.company_name },
    { icon: 'folder-outline',          label: 'Department',         value: p?.department },
    { icon: 'briefcase-outline',       label: 'Designation',        value: p?.designation },
    { icon: 'people-circle-outline',   label: 'Reporting Manager',  value: p?.reporting_manager?.name },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[NAVY]}
            tintColor={NAVY}
          />
        }
      >

        {/* ── Top Bar ── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20, paddingTop: 14, paddingBottom: 22,
        }}>
          <View>
            <Text style={{ fontSize: 12, color: MUTED, fontWeight: '500' }}>Welcome back 👋</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: TEXT }}>{user?.name || '—'}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TouchableOpacity style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: '#FFFFFF',
              justifyContent: 'center', alignItems: 'center',
              shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18, shadowRadius: 10, elevation: 3,
            }}>
              <Ionicons name="notifications-outline" size={20} color={TEXT} />
              <View style={{
                position: 'absolute', top: 8, right: 8,
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: '#EF4444',
              }} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openProfile}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#AFD2FA' }}>{initials}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Stat Cards ── */}
        <View style={{ paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
          {statCards.map((s, i) => (
            <View key={i} style={{ width: '47%', ...CARD, padding: 16 }}>
              <View style={{
                width: 44, height: 44, borderRadius: 14,
                backgroundColor: s.iconBg,
                justifyContent: 'center', alignItems: 'center', marginBottom: 12,
              }}>
                <Ionicons name={s.icon} size={22} color={s.iconColor} />
              </View>
              <Text style={{ fontSize: 22, fontWeight: '800', color: TEXT, marginBottom: 2 }}>{s.value}</Text>
              <Text style={{ fontSize: 12, color: MUTED, fontWeight: '500' }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Action Buttons ── */}
        <View style={{ paddingHorizontal: 20, flexDirection: 'row', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Sign In',     icon: 'log-in-outline',   color: '#2E7D32', action: authenticateAndNavigate },
            { label: 'Sign Out',    icon: 'log-out-outline',  color: '#EF4444', action: authenticateAndNavigate },
            { label: 'Apply Leave', icon: 'calendar-outline', color: '#3D5AFE', action: () => navigation.navigate('Leave') },
          ].map((a, i) => (
            <TouchableOpacity
              key={i}
              style={{
                flex: 1, backgroundColor: a.color, borderRadius: 14,
                paddingVertical: 14, alignItems: 'center',
                shadowColor: a.color, shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.30, shadowRadius: 8, elevation: 4,
              }}
              onPress={a.action} activeOpacity={0.85}
            >
              <Ionicons name={a.icon} size={20} color="#FFFFFF" style={{ marginBottom: 4 }} />
              <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700', textAlign: 'center' }}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Attendance Section ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT }}>Attendance</Text>
          </View>

          {/* Tab Switcher */}
          <View style={{
            flexDirection: 'row', backgroundColor: '#EAECF2',
            borderRadius: 12, padding: 4, marginBottom: 16,
          }}>
            {['today', 'week', 'month'].map(tab => (
              <TouchableOpacity
                key={tab}
                style={{
                  flex: 1, paddingVertical: 8, borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: attendanceTab === tab ? '#FFFFFF' : 'transparent',
                  shadowColor: attendanceTab === tab ? '#B8C4D6' : 'transparent',
                  shadowOpacity: attendanceTab === tab ? 0.10 : 0,
                  shadowRadius: 4, elevation: attendanceTab === tab ? 2 : 0,
                }}
                onPress={() => setAttendanceTab(tab)} activeOpacity={0.8}
              >
                <Text style={{
                  fontSize: 13, fontWeight: '700',
                  color: attendanceTab === tab ? NAVY : MUTED,
                }}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Today View */}
          {attendanceTab === 'today' && (
            <View style={{ ...CARD, padding: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: NAVY, marginBottom: 20, textAlign: 'center' }}>
                {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              {todayRecord ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  {[
                    { icon: 'time-outline',  label: 'In Time',  value: todayRecord.in_time,  color: '#2E7D32' },
                    { icon: 'time-outline',  label: 'Out Time', value: todayRecord.out_time, color: '#E65100' },
                    { icon: 'timer-outline', label: 'Total',    value: todayRecord.total,    color: '#3D5AFE' },
                  ].map((item, i) => (
                    <React.Fragment key={i}>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <View style={{
                          width: 40, height: 40, borderRadius: 12,
                          backgroundColor: item.color + '18',
                          justifyContent: 'center', alignItems: 'center', marginBottom: 8,
                        }}>
                          <Ionicons name={item.icon} size={20} color={item.color} />
                        </View>
                        <Text style={{ fontSize: 11, color: MUTED, fontWeight: '600', marginBottom: 4 }}>{item.label}</Text>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: item.color }}>{item.value}</Text>
                      </View>
                      {i < 2 && <View style={{ width: 1, height: 60, backgroundColor: '#F0F0F0' }} />}
                    </React.Fragment>
                  ))}
                </View>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: '#E8EEFF', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                    <Ionicons name="home-outline" size={28} color="#3D5AFE" />
                  </View>
                  <Text style={{ fontSize: 14, color: MUTED, fontWeight: '500' }}>No attendance recorded today</Text>
                </View>
              )}
            </View>
          )}

          {/* Week View */}
          {attendanceTab === 'week' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {attendance.map((a, i) => {
                const parts = a.date?.split(' ') || [];
                return (
                  <View key={i} style={{ ...CARD, padding: 12, marginRight: 10, width: 92, alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: NAVY, letterSpacing: 0.5 }}>
                      {(a.day || '--').slice(0, 3).toUpperCase()}
                    </Text>
                    <Text style={{ fontSize: 10, color: MUTED, marginBottom: 8, marginTop: 2 }}>
                      {parts[0] || '--'} {parts[1] || ''}
                    </Text>
                    <View style={{ height: 1, backgroundColor: '#F0F0F0', width: '100%', marginBottom: 8 }} />
                    {[{ label: 'In', value: a.in_time }, { label: 'Out', value: a.out_time }].map((t, ti) => (
                      <View key={ti} style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 3 }}>
                        <Text style={{ fontSize: 10, color: MUTED, fontWeight: '600' }}>{t.label}</Text>
                        <Text style={{ fontSize: 10, color: TEXT, fontWeight: '600' }}>{t.value || '--'}</Text>
                      </View>
                    ))}
                    <View style={{ height: 1, backgroundColor: '#F0F0F0', width: '100%', marginVertical: 4 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                      <Text style={{ fontSize: 10, color: LINK, fontWeight: '700' }}>Total</Text>
                      <Text style={{ fontSize: 10, color: LINK, fontWeight: '700' }}>{a.total || '--'}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Month Calendar View */}
          {attendanceTab === 'month' && (
            <View style={{ ...CARD, padding: 16 }}>
              {/* Month Navigator */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={prevMonth}
                  style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0F4F8', justifyContent: 'center', alignItems: 'center' }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={18} color={NAVY} />
                </TouchableOpacity>
                <Text style={{ fontSize: 15, fontWeight: '800', color: NAVY }}>
                  {MONTH_NAMES[calMonth - 1]} {calYear}
                </Text>
                <TouchableOpacity
                  onPress={nextMonth}
                  style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F0F4F8', justifyContent: 'center', alignItems: 'center' }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={18} color={NAVY} />
                </TouchableOpacity>
              </View>

              {/* Day Headers */}
              <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                {DAY_HEADERS.map(d => (
                  <Text key={d} style={{ width: CAL_CELL, textAlign: 'center', fontSize: 11, fontWeight: '700', color: MUTED }}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* Calendar Grid */}
              {monthlyLoading ? (
                <ActivityIndicator size="small" color={NAVY} style={{ marginVertical: 24 }} />
              ) : (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {calCells.map((day, idx) => {
                    if (!day) return <View key={`b-${idx}`} style={{ width: CAL_CELL, height: CAL_CELL + 14 }} />;
                    const rec        = recordMap[day];
                    const isToday    = day === today.getDate() && calMonth === today.getMonth() + 1 && calYear === today.getFullYear();
                    const isSelected = selectedDay === day;
                    return (
                      <TouchableOpacity
                        key={day}
                        style={{
                          width: CAL_CELL, height: CAL_CELL + 14,
                          alignItems: 'center', justifyContent: 'center', marginBottom: 2,
                          borderRadius: 10,
                          backgroundColor: isSelected ? NAVY : isToday ? '#EEF4FF' : 'transparent',
                        }}
                        onPress={() => setSelectedDay(isSelected ? null : day)}
                        activeOpacity={0.7}
                      >
                        <Text style={{
                          fontSize: 13, fontWeight: isToday || isSelected ? '800' : '600',
                          color: isSelected ? '#FFFFFF' : isToday ? NAVY : TEXT,
                        }}>
                          {day}
                        </Text>
                        <Text style={{
                          fontSize: 9, fontWeight: '700', marginTop: 2,
                          color: isSelected
                            ? 'rgba(255,255,255,0.80)'
                            : rec?.total && rec.total !== '00:00' ? '#2E7D32' : '#D0D5DD',
                        }}>
                          {rec?.total ?? '00:00'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Legend */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#2E7D32' }}>08:30</Text>
                  <Text style={{ fontSize: 12, color: MUTED }}>= Present</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#D0D5DD' }}>00:00</Text>
                  <Text style={{ fontSize: 12, color: MUTED }}>= Absent</Text>
                </View>
              </View>

              {/* Selected Day Detail */}
              {selectedDay && (
                <View style={{ marginTop: 14, backgroundColor: '#F8FAFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E4EAF2' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: NAVY, marginBottom: 14, textAlign: 'center' }}>
                    {new Date(calYear, calMonth - 1, selectedDay)
                      .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </Text>
                  {selectedRecord?.present ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      {[
                        { label: 'In Time',  value: selectedRecord.in_time },
                        { label: 'Out Time', value: selectedRecord.out_time },
                        { label: 'Total',    value: selectedRecord.total, accent: true },
                      ].map((item, i) => (
                        <React.Fragment key={i}>
                          <View style={{ flex: 1, alignItems: 'center' }}>
                            <Text style={{ fontSize: 11, color: MUTED, fontWeight: '600', marginBottom: 4 }}>{item.label}</Text>
                            <Text style={{ fontSize: 16, fontWeight: '800', color: item.accent ? '#2E7D32' : TEXT }}>{item.value || '--'}</Text>
                          </View>
                          {i < 2 && <View style={{ width: 1, height: 36, backgroundColor: '#E0E8F0' }} />}
                        </React.Fragment>
                      ))}
                    </View>
                  ) : (
                    <Text style={{ fontSize: 13, color: MUTED, textAlign: 'center', paddingVertical: 6 }}>
                      No attendance recorded
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}
        </View>

      </ScrollView>

      {/* ── Profile Modal ── */}
      <Modal
        visible={profileVisible}
        transparent
        animationType="none"
        onRequestClose={closeProfileSheet}
      >
        <View style={{ flex: 1 }}>

          {/* Dark backdrop — tap anywhere outside sheet to close */}
          <TouchableOpacity
            style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
            activeOpacity={1}
            onPress={closeProfileSheet}
          />

          {/* Sheet — position:absolute so it sits cleanly on top of backdrop */}
          <Animated.View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: '#fff',
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingHorizontal: 24, paddingBottom: 40,
            transform: [{ translateY: profileSheetY }],
          }}>

            {/* Drag handle — PanResponder here only, no competing children */}
            <View
              {...profilePanResponder.panHandlers}
              style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 16 }}
            >
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDE3F0' }} />
            </View>

            {/* Title */}
            <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT, marginBottom: 20 }}>User Details</Text>

            {/* Details list */}
            <View style={{ backgroundColor: '#F5F6FA', borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
              {profileLoading ? (
                <ActivityIndicator color={NAVY} style={{ marginVertical: 32 }} />
              ) : userDetails.map((item, i) => (
                <View key={i} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  paddingHorizontal: 16, paddingVertical: 14,
                  borderBottomWidth: i < userDetails.length - 1 ? 1 : 0,
                  borderBottomColor: '#E8ECF4',
                }}>
                  <View style={{
                    width: 40, height: 40, borderRadius: 12,
                    backgroundColor: '#E8EEFF',
                    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
                  }}>
                    <Ionicons name={item.icon} size={20} color={LINK} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>
                      {item.label}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: TEXT }}>
                      {item.value || '—'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Sign Out */}
            <TouchableOpacity
              onPress={handleLogout}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: '#FECACA',
                borderRadius: 14, paddingVertical: 14,
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#EF4444' }}>Sign Out</Text>
            </TouchableOpacity>

          </Animated.View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default HomeScreen;
