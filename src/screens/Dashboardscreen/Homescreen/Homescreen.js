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
import ChangePasswordModal from '../../../components/ChangePasswordModal';
import { getBaseUrl, SALES_ENDPOINTS, NOTIFICATION_ENDPOINTS } from '../../../constants/api';
import { apiFetch } from '../../../utils/apiFetch';
import { COLORS, CARD_SHADOW as THEME_SHADOW } from '../../../constants/theme';

const { width } = Dimensions.get('window');

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_HEADERS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const BG    = COLORS.screenBg;
const NAVY  = COLORS.navy;
const TEXT  = COLORS.textPrimary;
const MUTED = COLORS.textSecondary;
const LINK  = COLORS.link;

const CARD = {
  backgroundColor: COLORS.cardBg,
  borderRadius: 18,
  ...THEME_SHADOW,
};

const CAL_CELL = Math.floor((width - 40 - 32) / 7);

const HomeScreen = () => {
  const navigation = useNavigation();
  const dispatch   = useDispatch();
  const { loading, user, stats, weeklyAttendance, monthlyAttendance, monthlyLoading } =
    useSelector(s => s.dashboard);
  const authUser = useSelector(s => s.auth.user);  // carries is_approver

  const today = new Date();

  const [attendanceTab,  setAttendanceTab]  = useState('month');
  const [calYear,        setCalYear]        = useState(today.getFullYear());
  const [calMonth,       setCalMonth]       = useState(today.getMonth() + 1);
  const [selectedDay,    setSelectedDay]    = useState(null);
  const [refreshing,     setRefreshing]     = useState(false);
  const [profileVisible,  setProfileVisible]  = useState(false);
  const [changePwVisible, setChangePwVisible] = useState(false);
  const [profileUser,     setProfileUser]     = useState(null);
  const [profileLoading,  setProfileLoading]  = useState(false);

  // Telecaller / STM self-availability (auto-resets after 12h; reflected in Sales admin Distribution).
  const _desig = (user?.designation || authUser?.designation || '').toLowerCase();
  const isTcOrStm = _desig.includes('telecaller') || _desig.includes('tele caller')
    || _desig.includes('stm') || _desig.includes('sales team') || _desig.includes('sales executive');
  const [avail,     setAvail]     = useState(null);   // { is_available, expires_at }
  const [availBusy, setAvailBusy] = useState(false);
  const [unread,    setUnread]    = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      apiFetch(NOTIFICATION_ENDPOINTS.list).then(r => (r.ok ? r.json() : null)).then((d) => { if (alive && d) setUnread(d.unread || 0); }).catch(() => {});
      return () => { alive = false; };
    }, [])
  );

  const fetchAvailability = useCallback(async () => {
    if (!isTcOrStm) return;
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(SALES_ENDPOINTS.availabilityMe, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAvail(await res.json());
    } catch (_) {}
  }, [isTcOrStm]);

  useEffect(() => { fetchAvailability(); }, [fetchAvailability]);

  async function toggleAvailability(makeAvailable) {
    setAvailBusy(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res = await fetch(SALES_ENDPOINTS.availabilityMe, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ is_available: makeAvailable }),
      });
      if (res.ok) setAvail(await res.json());
    } catch (_) {}
    setAvailBusy(false);
  }

  function availResetsLabel() {
    if (!avail?.expires_at) return '';
    const ms = new Date(avail.expires_at) - new Date();
    if (ms <= 0) return '';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `resets in ${h}h ${m}m` : `resets in ${m}m`;
  }

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
    }, [dispatch]),
  );

  useEffect(() => {
    if (!loading) setRefreshing(false);
  }, [loading]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchDashboard());
    fetchAvailability();
    if (attendanceTab === 'month') dispatch(fetchMonthlyAttendance(calYear, calMonth));
  }, [dispatch, attendanceTab, calYear, calMonth, fetchAvailability]);

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
    { label: 'Work Today',  value: stats?.work_today       ?? '--:--', icon: 'time-outline',      iconBg: COLORS.linkBg, iconColor: COLORS.link },
    { label: 'This Week',   value: stats?.worked_this_week ?? '--:--', icon: 'bar-chart-outline',  iconBg: COLORS.infoBg, iconColor: COLORS.info },
    { label: 'Leaves Left', value: stats?.leaves_available ?? '0',     icon: 'calendar-outline',   iconBg: COLORS.warningBg, iconColor: COLORS.warningAlt },
    { label: 'Leaves Used', value: stats?.leaves_utilised  ?? '0',     icon: 'clipboard-outline',  iconBg: COLORS.warningBg, iconColor: COLORS.warning },
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
            <TouchableOpacity
              onPress={() => { setUnread(0); navigation.navigate('Modules', { screen: 'SalesNotifications', initial: false }); }}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: COLORS.white,
                justifyContent: 'center', alignItems: 'center',
                shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.18, shadowRadius: 10, elevation: 3,
              }}>
              <Ionicons name="notifications-outline" size={20} color={TEXT} />
              {unread > 0 && (
                <View style={{
                  position: 'absolute', top: 4, right: 4,
                  minWidth: 16, height: 16, paddingHorizontal: 3, borderRadius: 8,
                  backgroundColor: COLORS.error, alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>{unread > 99 ? '99+' : unread}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openProfile}
              style={{
                width: 40, height: 40, borderRadius: 20,
                backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: COLORS.powderBlue }}>{initials}</Text>
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

        {/* ── Quick Actions ── */}
        <View style={{
          marginHorizontal: 20, marginBottom: 28, padding: 16,
          backgroundColor: COLORS.white, borderRadius: 20,
          shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12, shadowRadius: 12, elevation: 3,
        }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT, marginBottom: 14 }}>Quick Actions</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {[
              { key: 'sign-in', label: 'Sign In', icon: 'log-in-outline', color: COLORS.success, backgroundColor: COLORS.successBg, action: authenticateAndNavigate },
              { key: 'sign-out', label: 'Sign Out', icon: 'log-out-outline', color: COLORS.error, backgroundColor: COLORS.screenBg, action: authenticateAndNavigate },
              { key: 'apply-leave', label: 'Apply Leave', icon: 'calendar-outline', color: COLORS.link, backgroundColor: COLORS.linkBg, action: () => navigation.navigate('Leave') },
              ...(authUser?.is_approver ? [{
                key: 'leave-approvals', label: 'Leave\nApprovals', icon: 'checkmark-done-outline', color: COLORS.link, backgroundColor: COLORS.screenBg,
                action: () => navigation.navigate('LeaveApprovals'),
              }] : []),
            ].map((a) => (
              <TouchableOpacity
                key={a.key}
                style={{ flex: 1, minWidth: 0, alignItems: 'center' }}
                onPress={a.action}
                activeOpacity={0.75}
              >
                <View style={{
                  width: 52, height: 52, borderRadius: 16, backgroundColor: a.backgroundColor,
                  alignItems: 'center', justifyContent: 'center', marginBottom: 8,
                }}>
                  <Ionicons name={a.icon} size={24} color={a.color} />
                </View>
                <Text
                  numberOfLines={2}
                  style={{ color: TEXT, fontSize: 10, lineHeight: 13, fontWeight: '700', textAlign: 'center', minHeight: 26 }}
                >
                  {a.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Availability (Telecaller / STM) ── */}
        {isTcOrStm && (
          <View style={{
            marginHorizontal: 20, marginBottom: 28, padding: 16,
            backgroundColor: COLORS.white, borderRadius: 20,
            shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12, shadowRadius: 12, elevation: 3,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: TEXT }}>Availability</Text>
              {avail?.is_available && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.successBg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success }} />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.success }}>Available today</Text>
                </View>
              )}
            </View>

            {avail?.is_available ? (
              <>
                <Text style={{ fontSize: 12, color: MUTED, fontWeight: '500', marginBottom: 14 }}>
                  You're in today's lead distribution pool{availResetsLabel() ? ` · ${availResetsLabel()}` : ''}.
                </Text>
                <TouchableOpacity
                  onPress={() => toggleAvailability(false)}
                  disabled={availBusy}
                  activeOpacity={0.85}
                  style={{
                    alignSelf: 'flex-start',
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: COLORS.screenBg, borderWidth: 1.5, borderColor: COLORS.border,
                    borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14,
                  }}
                >
                  <Ionicons name="close-circle-outline" size={16} color={MUTED} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: MUTED }}>{availBusy ? 'Updating…' : 'Mark Unavailable'}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 12, color: MUTED, fontWeight: '500', marginBottom: 14 }}>
                  Mark yourself available to receive leads today. Resets automatically after 12 hours.
                </Text>
                <TouchableOpacity
                  onPress={() => toggleAvailability(true)}
                  disabled={availBusy}
                  activeOpacity={0.85}
                  style={{
                    alignSelf: 'flex-start',
                    flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: COLORS.success, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.white} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.white }}>{availBusy ? 'Saving…' : 'Mark Available Today'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* ── Attendance Section ── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT }}>Attendance</Text>
          </View>

          {/* Tab Switcher */}
          <View style={{
            flexDirection: 'row', backgroundColor: COLORS.surfaceAlt,
            borderRadius: 12, padding: 4, marginBottom: 16,
          }}>
            {['today', 'week', 'month'].map(tab => (
              <TouchableOpacity
                key={tab}
                style={{
                  flex: 1, paddingVertical: 8, borderRadius: 10,
                  alignItems: 'center',
                  backgroundColor: attendanceTab === tab ? COLORS.white : 'transparent',
                  shadowColor: attendanceTab === tab ? COLORS.shadow : 'transparent',
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
                    { icon: 'time-outline',  label: 'In Time',  value: todayRecord.in_time,  color: COLORS.success },
                    { icon: 'time-outline',  label: 'Out Time', value: todayRecord.out_time, color: COLORS.warning },
                    { icon: 'timer-outline', label: 'Total',    value: todayRecord.total,    color: COLORS.link },
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
                      {i < 2 && <View style={{ width: 1, height: 60, backgroundColor: COLORS.surfaceAlt }} />}
                    </React.Fragment>
                  ))}
                </View>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: COLORS.linkBg, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                    <Ionicons name="home-outline" size={28} color={COLORS.link} />
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
                    <View style={{ height: 1, backgroundColor: COLORS.surfaceAlt, width: '100%', marginBottom: 8 }} />
                    {[{ label: 'In', value: a.in_time }, { label: 'Out', value: a.out_time }].map((t, ti) => (
                      <View key={ti} style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 3 }}>
                        <Text style={{ fontSize: 10, color: MUTED, fontWeight: '600' }}>{t.label}</Text>
                        <Text style={{ fontSize: 10, color: TEXT, fontWeight: '600' }}>{t.value || '--'}</Text>
                      </View>
                    ))}
                    <View style={{ height: 1, backgroundColor: COLORS.surfaceAlt, width: '100%', marginVertical: 4 }} />
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
                  style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center' }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={18} color={NAVY} />
                </TouchableOpacity>
                <Text style={{ fontSize: 15, fontWeight: '800', color: NAVY }}>
                  {MONTH_NAMES[calMonth - 1]} {calYear}
                </Text>
                <TouchableOpacity
                  onPress={nextMonth}
                  style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center' }}
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
                          backgroundColor: isSelected ? NAVY : isToday ? COLORS.linkBg : 'transparent',
                        }}
                        onPress={() => setSelectedDay(isSelected ? null : day)}
                        activeOpacity={0.7}
                      >
                        <Text style={{
                          fontSize: 13, fontWeight: isToday || isSelected ? '800' : '600',
                          color: isSelected ? COLORS.white : isToday ? NAVY : TEXT,
                        }}>
                          {day}
                        </Text>
                        <Text style={{
                          fontSize: 9, fontWeight: '700', marginTop: 2,
                          color: isSelected
                            ? 'rgba(255,255,255,0.80)'
                            : rec?.total && rec.total !== '00:00' ? COLORS.success : COLORS.divider,
                        }}>
                          {rec?.total ?? '00:00'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Legend */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.surfaceAlt }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.success }}>08:30</Text>
                  <Text style={{ fontSize: 12, color: MUTED }}>= Present</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: COLORS.divider }}>00:00</Text>
                  <Text style={{ fontSize: 12, color: MUTED }}>= Absent</Text>
                </View>
              </View>

              {/* Selected Day Detail */}
              {selectedDay && (
                <View style={{ marginTop: 14, backgroundColor: COLORS.screenBg, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border }}>
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
                            <Text style={{ fontSize: 16, fontWeight: '800', color: item.accent ? COLORS.success : TEXT }}>{item.value || '--'}</Text>
                          </View>
                          {i < 2 && <View style={{ width: 1, height: 36, backgroundColor: COLORS.border }} />}
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
            backgroundColor: COLORS.white,
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            paddingHorizontal: 24, paddingBottom: 40,
            transform: [{ translateY: profileSheetY }],
          }}>

            {/* Drag handle — PanResponder here only, no competing children */}
            <View
              {...profilePanResponder.panHandlers}
              style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 16 }}
            >
              <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.divider }} />
            </View>

            {/* Title */}
            <Text style={{ fontSize: 18, fontWeight: '800', color: TEXT, marginBottom: 20 }}>User Details</Text>

            {/* Details list */}
            <View style={{ backgroundColor: COLORS.screenBg, borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
              {profileLoading ? (
                <ActivityIndicator color={NAVY} style={{ marginVertical: 32 }} />
              ) : userDetails.map((item, i) => (
                <View key={i} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 14,
                  paddingHorizontal: 16, paddingVertical: 14,
                  borderBottomWidth: i < userDetails.length - 1 ? 1 : 0,
                  borderBottomColor: COLORS.surfaceAlt,
                }}>
                  <View style={{
                    width: 40, height: 40, borderRadius: 12,
                    backgroundColor: COLORS.linkBg,
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

            {/* Change Password */}
            <TouchableOpacity
              onPress={() => { setProfileVisible(false); setChangePwVisible(true); }}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border,
                borderRadius: 14, paddingVertical: 14, marginBottom: 10,
              }}
            >
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.textPrimary }}>Change Password</Text>
            </TouchableOpacity>

            {/* Sign Out */}
            <TouchableOpacity
              onPress={handleLogout}
              activeOpacity={0.85}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                backgroundColor: COLORS.screenBg, borderWidth: 1.5, borderColor: COLORS.errorBg,
                borderRadius: 14, paddingVertical: 14,
              }}
            >
              <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.error }}>Sign Out</Text>
            </TouchableOpacity>

          </Animated.View>
        </View>
      </Modal>

      <ChangePasswordModal visible={changePwVisible} onClose={() => setChangePwVisible(false)} />

    </SafeAreaView>
  );
};

export default HomeScreen;
