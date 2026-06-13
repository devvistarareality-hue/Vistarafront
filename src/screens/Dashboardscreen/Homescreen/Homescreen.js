import React, { useEffect, useState } from 'react';
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
import { fetchDashboard, fetchMonthlyAttendance } from '../../../redux/actions/dashboardActions';
import styles from './styles';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_HEADERS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const HomeScreen = () => {
  const navigation = useNavigation();
  const dispatch   = useDispatch();
  const { loading, user, stats, weeklyAttendance, monthlyAttendance, monthlyLoading } =
    useSelector(s => s.dashboard);

  const today = new Date();

  const [attendanceTab, setAttendanceTab] = useState('month');
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => { dispatch(fetchDashboard()); }, []);

  useEffect(() => {
    if (attendanceTab === 'month') {
      dispatch(fetchMonthlyAttendance(calYear, calMonth));
      setSelectedDay(null);
    }
  }, [attendanceTab, calYear, calMonth]);

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

  // Find today's record from weekly attendance
  const todayStr   = `${String(today.getDate()).padStart(2, '0')} ${MONTHS_SHORT[today.getMonth()]}`;
  const todayRecord = weeklyAttendance.find(a => a.date === todayStr) || null;

  const statCards = [
    { label: 'Work Today',  value: stats?.work_today        ?? '--:--', icon: '⏱', color: '#27AE60' },
    { label: 'This Week',   value: stats?.worked_this_week  ?? '--:--', icon: '📊', color: '#2980B9' },
    { label: 'Leaves Left', value: stats?.leaves_available  ?? '0',     icon: '🏖', color: '#F39C12' },
    { label: 'Leaves Used', value: stats?.leaves_utilised   ?? '0',     icon: '📋', color: '#E74C3C' },
  ];

  const userDetails = [
    { icon: '🔑', label: 'Employee Code', value: user?.user_code },
    { icon: '🏢', label: 'Organisation',  value: user?.organisation },
    { icon: '🗂',  label: 'Department',    value: user?.department },
    { icon: '💼', label: 'Designation',   value: user?.designation },
  ];

  // ── Calendar helpers ──────────────────────────────────────────────
  const prevMonth = () => {
    if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); }
    else setCalMonth(m => m + 1);
  };

  const buildCalendarCells = () => {
    const firstDay     = new Date(calYear, calMonth - 1, 1).getDay(); // 0=Sun
    const leadingBlanks = (firstDay + 6) % 7; // convert to Mon-start
    const daysInMonth  = new Date(calYear, calMonth, 0).getDate();
    const cells = [];
    for (let i = 0; i < leadingBlanks; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  };

  const calCells  = buildCalendarCells();
  const recordMap = {};
  (monthlyAttendance?.records || []).forEach(r => { recordMap[r.day] = r; });
  const selectedRecord = selectedDay ? recordMap[selectedDay] : null;

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

      {/* ── Attendance Section ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Attendance</Text>

        {/* Tab Switcher */}
        <View style={styles.tabRow}>
          {['today', 'week', 'month'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, attendanceTab === tab && styles.tabActive]}
              onPress={() => setAttendanceTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, attendanceTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Today View ── */}
        {attendanceTab === 'today' && (
          <View style={styles.todayCard}>
            <Text style={styles.todayDate}>
              {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </Text>
            {todayRecord ? (
              <View style={styles.todayRow}>
                <View style={styles.todayItem}>
                  <Text style={styles.todayItemIcon}>🕐</Text>
                  <Text style={styles.todayItemLabel}>In Time</Text>
                  <Text style={styles.todayItemValue}>{todayRecord.in_time}</Text>
                </View>
                <View style={styles.todayDivider} />
                <View style={styles.todayItem}>
                  <Text style={styles.todayItemIcon}>🕔</Text>
                  <Text style={styles.todayItemLabel}>Out Time</Text>
                  <Text style={styles.todayItemValue}>{todayRecord.out_time}</Text>
                </View>
                <View style={styles.todayDivider} />
                <View style={styles.todayItem}>
                  <Text style={styles.todayItemIcon}>⏱</Text>
                  <Text style={styles.todayItemLabel}>Total</Text>
                  <Text style={[styles.todayItemValue, { color: '#27AE60' }]}>{todayRecord.total}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.absentBox}>
                <Text style={styles.absentIcon}>🏠</Text>
                <Text style={styles.absentText}>No attendance recorded today</Text>
              </View>
            )}
          </View>
        )}

        {/* ── Week View ── */}
        {attendanceTab === 'week' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {attendance.map((a, i) => {
              const parts    = a.date?.split(' ') || [];
              const datePart = parts[0] || '--';
              const monPart  = parts[1] || '';
              return (
                <View key={i} style={styles.dayCard}>
                  <Text style={styles.dayName}>{(a.day || '--').slice(0, 3).toUpperCase()}</Text>
                  <Text style={styles.dayDate}>{datePart} {monPart}</Text>
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
        )}

        {/* ── Month View ── */}
        {attendanceTab === 'month' && (
          <View style={styles.calendarCard}>
            {/* Month Navigator */}
            <View style={styles.calNav}>
              <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn} activeOpacity={0.7}>
                <Text style={styles.calNavArrow}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.calNavTitle}>{MONTH_NAMES[calMonth - 1]} {calYear}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn} activeOpacity={0.7}>
                <Text style={styles.calNavArrow}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Day Headers */}
            <View style={styles.calDayHeaders}>
              {DAY_HEADERS.map(d => (
                <Text key={d} style={styles.calDayHeader}>{d}</Text>
              ))}
            </View>

            {/* Calendar Grid */}
            {monthlyLoading ? (
              <ActivityIndicator size="small" color="#1E4080" style={{ marginVertical: 24 }} />
            ) : (
              <View style={styles.calGrid}>
                {calCells.map((day, idx) => {
                  if (!day) return <View key={`b-${idx}`} style={styles.calCell} />;
                  const rec       = recordMap[day];
                  const isToday   = day === today.getDate() && calMonth === today.getMonth() + 1 && calYear === today.getFullYear();
                  const isSelected = selectedDay === day;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.calCell,
                        isToday    && styles.calCellToday,
                        isSelected && styles.calCellSelected,
                      ]}
                      onPress={() => setSelectedDay(isSelected ? null : day)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.calDayNum,
                        isToday    && styles.calDayNumToday,
                        isSelected && styles.calDayNumSelected,
                      ]}>
                        {day}
                      </Text>
                      <Text style={[
                        styles.calHours,
                        rec?.total && rec.total !== '00:00' ? styles.calHoursPresent : styles.calHoursAbsent,
                        isSelected && styles.calHoursSelected,
                      ]}>
                        {rec?.total ?? '00:00'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Legend */}
            <View style={styles.calLegend}>
              <View style={styles.legendItem}>
                <Text style={[styles.legendSample, { color: '#27AE60' }]}>08:30</Text>
                <Text style={styles.legendText}>= Hours worked</Text>
              </View>
              <View style={styles.legendItem}>
                <Text style={[styles.legendSample, { color: '#CCC' }]}>00:00</Text>
                <Text style={styles.legendText}>= Absent</Text>
              </View>
            </View>

            {/* Selected Day Detail Panel */}
            {selectedDay && (
              <View style={styles.calDetail}>
                <Text style={styles.calDetailDate}>
                  {new Date(calYear, calMonth - 1, selectedDay)
                    .toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                </Text>
                {selectedRecord?.present ? (
                  <View style={styles.calDetailRow}>
                    <View style={styles.calDetailItem}>
                      <Text style={styles.calDetailLabel}>In Time</Text>
                      <Text style={styles.calDetailValue}>{selectedRecord.in_time || '--'}</Text>
                    </View>
                    <View style={styles.calDetailSep} />
                    <View style={styles.calDetailItem}>
                      <Text style={styles.calDetailLabel}>Out Time</Text>
                      <Text style={styles.calDetailValue}>{selectedRecord.out_time || '--'}</Text>
                    </View>
                    <View style={styles.calDetailSep} />
                    <View style={styles.calDetailItem}>
                      <Text style={styles.calDetailLabel}>Total</Text>
                      <Text style={[styles.calDetailValue, { color: '#27AE60' }]}>{selectedRecord.total || '--'}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.calDetailAbsent}>No attendance recorded</Text>
                )}
              </View>
            )}
          </View>
        )}
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
