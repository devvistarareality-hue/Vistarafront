import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, Modal,
  StatusBar, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import MapView, { Circle, Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ATTENDANCE_ENDPOINTS } from '../../../../constants/api';
import { COLORS } from '../../../../constants/theme';

// ── Office geofence ──────────────────────────────────────────────────
const OFFICE = { latitude: 23.1318, longitude: 72.5691, radius: 500 };

const getDistance = (lat1, lng1, lat2, lng2) => {
  const R    = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// 12-hour format with AM/PM
const fmt12h = (d) => {
  if (!d) return '--:-- --';
  const h      = d.getHours();
  const m      = String(d.getMinutes()).padStart(2, '0');
  const s      = String(d.getSeconds()).padStart(2, '0');
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = String(h % 12 || 12).padStart(2, '0');
  return `${hour12}:${m}:${s} ${period}`;
};

const parseTimeStr = (str) => {
  if (!str) return null;
  const [h, m, s] = str.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, s || 0, 0);
  return d;
};

const fmtHHMM = (d) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// ── Component ────────────────────────────────────────────────────────
export default function SignInInternalScreen({ navigation }) {
  const [userLocation, setUserLocation] = useState(null);
  const [locLoading, setLocLoading]     = useState(true);
  const [inGeofence, setInGeofence]     = useState(false);

  // Attendance state
  const [signedIn, setSignedIn]     = useState(false); // signed in for the day
  const [signedOut, setSignedOut]   = useState(false); // signed out for the day
  const [onBreak, setOnBreak]       = useState(false); // on break
  const [inTime, setInTime]         = useState(null);
  const [outTime, setOutTime]       = useState(null);
  const [workSeconds, setWorkSeconds] = useState(0);
  const [remarks, setRemarks]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modify attendance
  const [showModify, setShowModify]       = useState(false);
  const [modDate, setModDate]             = useState(new Date());
  const [modInTime, setModInTime]         = useState(() => { const d = new Date(); d.setHours(9, 0, 0, 0); return d; });
  const [modOutTime, setModOutTime]       = useState(() => { const d = new Date(); d.setHours(18, 0, 0, 0); return d; });
  const [pickerShowing, setPickerShowing] = useState(null);
  const [modifying, setModifying]         = useState(false);

  const watchIdRef = useRef(null);
  const timerRef   = useRef(null);
  const mapRef     = useRef(null);
  const today      = new Date();

  useEffect(() => {
    startLocation();
    loadTodayRecord();
    return () => {
      if (watchIdRef.current) watchIdRef.current.remove();
      if (timerRef.current)   clearInterval(timerRef.current);
    };
  }, []);

  const loadTodayRecord = async () => {
    try {
      const token    = await AsyncStorage.getItem('access_token');
      const response = await fetch(ATTENDANCE_ENDPOINTS.today, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.in_time) {
        setInTime(parseTimeStr(data.in_time));
        if (data.signed_in) {
          // Currently signed in — restore timer
          const inDate  = parseTimeStr(data.in_time);
          const elapsed = Math.floor((Date.now() - inDate.getTime()) / 1000);
          setSignedIn(true);
          setWorkSeconds(elapsed > 0 ? elapsed : 0);
          timerRef.current = setInterval(() => setWorkSeconds(s => s + 1), 1000);
        } else if (data.out_time) {
          // Signed out for the day
          setOutTime(parseTimeStr(data.out_time));
          setSignedOut(true);
        }
      }
    } catch {}
  };

  const onPosition = ({ coords }) => {
    const { latitude, longitude } = coords;
    setUserLocation({ latitude, longitude });
    setInGeofence(getDistance(latitude, longitude, OFFICE.latitude, OFFICE.longitude) <= OFFICE.radius);
    setLocLoading(false);
    const midLat  = (latitude + OFFICE.latitude) / 2;
    const midLng  = (longitude + OFFICE.longitude) / 2;
    const latDelta = Math.max(Math.abs(latitude - OFFICE.latitude) * 3.2, 0.010);
    const lngDelta = Math.max(Math.abs(longitude - OFFICE.longitude) * 3.2, 0.010);
    mapRef.current?.animateToRegion(
      { latitude: midLat, longitude: midLng, latitudeDelta: latDelta, longitudeDelta: lngDelta },
      600,
    );
  };

  const startLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location is required to sign in.');
      setLocLoading(false);
      return;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    onPosition(pos);
    watchIdRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 3, timeInterval: 2000 },
      onPosition,
    );
  };

  // ── Sign In (start of day) ──────────────────────────────────────────
  const handleSignIn = async () => {
    if (!inGeofence) {
      Alert.alert('Outside Office Zone', 'You must be within the office area to sign in.');
      return;
    }
    setSubmitting(true);
    try {
      const token    = await AsyncStorage.getItem('access_token');
      const response = await fetch(ATTENDANCE_ENDPOINTS.signIn, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setInTime(parseTimeStr(data.in_time));
        setSignedIn(true);
        setSignedOut(false);
        setOnBreak(false);
        setWorkSeconds(0);
        timerRef.current = setInterval(() => setWorkSeconds(s => s + 1), 1000);
      } else {
        Alert.alert('Sign In Failed', data.detail || 'Could not sign in.');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Sign Out (end of day) ───────────────────────────────────────────
  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out for the day?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive', onPress: async () => {
          setSubmitting(true);
          try {
            const token    = await AsyncStorage.getItem('access_token');
            const response = await fetch(ATTENDANCE_ENDPOINTS.signOut, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
              setOutTime(parseTimeStr(data.out_time));
              setSignedIn(false);
              setSignedOut(true);
              setOnBreak(false);
              if (timerRef.current) clearInterval(timerRef.current);
              navigation.navigate('PostSignOut');
            } else {
              Alert.alert('Sign Out Failed', data.detail || 'Could not sign out.');
            }
          } catch {
            Alert.alert('Error', 'Network error. Please try again.');
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  // ── Check Out (go on break) — pauses timer ──────────────────────────
  const handleBreakOut = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setOnBreak(true);
  };

  // ── Check In (return from break) — resumes timer ────────────────────
  const handleBreakIn = () => {
    setOnBreak(false);
    timerRef.current = setInterval(() => setWorkSeconds(s => s + 1), 1000);
  };

  // ── Modify attendance ───────────────────────────────────────────────
  const handleModifySubmit = async () => {
    const inTotal  = modInTime.getHours() * 60 + modInTime.getMinutes();
    const outTotal = modOutTime.getHours() * 60 + modOutTime.getMinutes();
    if (inTotal >= outTotal) {
      Alert.alert('Invalid Time', 'Out time must be after in time.');
      return;
    }
    setModifying(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const res   = await fetch(ATTENDANCE_ENDPOINTS.modify, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          date:     modDate.toISOString().split('T')[0],
          in_time:  fmtHHMM(modInTime),
          out_time: fmtHHMM(modOutTime),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Attendance modified successfully.');
        setShowModify(false);
        loadTodayRecord();
      } else {
        Alert.alert('Error', data.detail || 'Failed to modify attendance.');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setModifying(false);
    }
  };

  const workHours = () => {
    const h = String(Math.floor(workSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((workSeconds % 3600) / 60)).padStart(2, '0');
    return `${h}:${m}`;
  };

  // ── Derived status ──────────────────────────────────────────────────
  const statusText  = signedOut ? 'Signed Out' : onBreak ? 'On Break' : signedIn ? 'Working' : 'Not Started';
  const statusColor = signedOut ? COLORS.navy  : onBreak ? COLORS.warning : signedIn ? COLORS.success : COLORS.gold;
  const statusBg    = signedOut ? COLORS.linkBg    : onBreak ? COLORS.warningBg : signedIn ? COLORS.successBg      : COLORS.warningBg;

  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Attendance</Text>
        <TouchableOpacity style={s.iconBtn} onPress={() => setShowModify(true)}>
          <Ionicons name="create-outline" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

        {/* ── Stat cards ── */}
        <View style={s.statsRow}>
          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: COLORS.linkBg }]}>
              <Ionicons name="time-outline" size={20} color={COLORS.link} />
            </View>
            <Text style={s.statLabel}>WORK HOURS</Text>
            <Text style={s.statValue}>{workHours()}</Text>
          </View>

          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: statusBg }]}>
              <Ionicons
                name={
                  signedOut ? 'exit-outline' :
                  onBreak   ? 'pause-circle-outline' :
                  signedIn  ? 'checkmark-circle-outline' :
                  'ellipse-outline'
                }
                size={20}
                color={statusColor}
              />
            </View>
            <Text style={s.statLabel}>STATUS</Text>
            <Text style={[s.statValue, { color: statusColor, fontSize: 13 }]}>{statusText}</Text>
          </View>

          <View style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: COLORS.warningBg }]}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.warningAlt} />
            </View>
            <Text style={s.statLabel}>TODAY</Text>
            <Text style={[s.statValue, { fontSize: 12 }]}>
              {today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
            </Text>
          </View>
        </View>

        {/* ── Map ── */}
        <View style={s.sectionLabel}>
          <Ionicons name="location-outline" size={13} color={COLORS.textSecondary} />
          <Text style={s.sectionLabelText}>LIVE LOCATION</Text>
        </View>

        <View style={s.mapCard}>
          {locLoading ? (
            <View style={s.mapLoader}>
              <ActivityIndicator size="large" color={COLORS.navy} />
              <Text style={s.mapLoaderText}>Getting your location...</Text>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              style={s.map}
              showsUserLocation
              showsMyLocationButton={false}
              initialRegion={{
                latitude: OFFICE.latitude, longitude: OFFICE.longitude,
                latitudeDelta: 0.010, longitudeDelta: 0.010,
              }}
              onMapReady={() => { if (userLocation) onPosition({ coords: userLocation }); }}
            >
              <Circle
                center={{ latitude: OFFICE.latitude, longitude: OFFICE.longitude }}
                radius={OFFICE.radius}
                strokeColor={inGeofence ? COLORS.success : COLORS.error}
                strokeWidth={3}
                fillColor={inGeofence ? 'rgba(46,125,50,0.22)' : 'rgba(239,68,68,0.18)'}
              />
               <Marker coordinate={{ latitude: OFFICE.latitude, longitude: OFFICE.longitude }} title="Office" pinColor={COLORS.navy} />
              {userLocation && (
                <Marker coordinate={userLocation} title="You" anchor={{ x: 0.5, y: 0.5 }}>
                  <View style={s.userDot}>
                    <View style={s.userDotInner} />
                  </View>
                </Marker>
              )}
            </MapView>
          )}
          <View style={[s.geofenceBadge, { backgroundColor: inGeofence ? COLORS.success : COLORS.error }]}>
            <View style={s.geofenceDot} />
            <Text style={s.geofenceBadgeText}>
              {inGeofence ? 'Inside Office Zone' : 'Outside Office Zone  (500 m radius)'}
            </Text>
            {userLocation && (
              <Text style={s.geofenceCoords}>
                {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
              </Text>
            )}
          </View>
        </View>

        {/* ── Attendance details ── */}
        <View style={s.sectionLabel}>
          <Ionicons name="clipboard-outline" size={13} color={COLORS.textSecondary} />
          <Text style={s.sectionLabelText}>TODAY'S ATTENDANCE</Text>
        </View>

        <View style={s.card}>
          <View style={s.timeRow}>
            {/* In Time */}
            <View style={[s.timeChip, { backgroundColor: COLORS.successBg }]}>
              <View style={[s.timeChipIcon, { backgroundColor: COLORS.shadow }]}>
                <Ionicons name="log-in-outline" size={16} color={COLORS.success} />
              </View>
              <Text style={[s.timeChipLabel, { color: COLORS.success }]}>IN TIME</Text>
              <Text style={s.timeChipValue}>{fmt12h(inTime)}</Text>
            </View>
            {/* Out Time */}
            <View style={[s.timeChip, { backgroundColor: COLORS.screenBg }]}>
              <View style={[s.timeChipIcon, { backgroundColor: COLORS.errorBg }]}>
                <Ionicons name="log-out-outline" size={16} color={COLORS.error} />
              </View>
              <Text style={[s.timeChipLabel, { color: COLORS.error }]}>OUT TIME</Text>
              <Text style={s.timeChipValue}>{fmt12h(outTime)}</Text>
            </View>
          </View>

          <View style={s.divider} />

          <View style={s.fieldRow}>
            <View style={[s.fieldIcon, { backgroundColor: COLORS.warningBg }]}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.warningAlt} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldRowLabel}>Date</Text>
              <Text style={s.fieldRowValue}>
                {today.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>
          </View>

          <View style={s.divider} />

          <View style={s.fieldRow}>
            <View style={[s.fieldIcon, { backgroundColor: COLORS.linkBg }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={COLORS.link} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldRowLabel}>Remarks</Text>
              <TextInput
                style={s.remarksInput}
                placeholder="Add remarks (optional)"
                placeholderTextColor={COLORS.textSecondary}
                value={remarks}
                onChangeText={setRemarks}
                multiline
              />
            </View>
          </View>
        </View>

        {/* ── Action Buttons ── */}
        <View style={s.btnSection}>

          {/* ── NOT SIGNED IN → Show Sign In ── */}
          {!signedIn && !signedOut && (
            <TouchableOpacity
              style={[s.primaryBtn, s.signInBtn, (locLoading || submitting || !inGeofence) && s.btnDisabled]}
              onPress={handleSignIn}
              disabled={locLoading || submitting || !inGeofence}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={22} color={COLORS.white} />
                  <Text style={s.primaryBtnText}>
                    {locLoading ? 'Locating...' : !inGeofence ? 'Outside Zone' : 'Sign In'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* ── SIGNED IN & WORKING → Show Check Out (break) + Sign Out ── */}
          {signedIn && !onBreak && (
            <View style={s.actionRow}>
              <TouchableOpacity
                style={[s.actionBtn, s.breakBtn, submitting && s.btnDisabled]}
                onPress={handleBreakOut}
                disabled={submitting}
                activeOpacity={0.85}
              >
                <Ionicons name="pause-circle-outline" size={22} color={COLORS.white} />
                <Text style={s.actionBtnText}>Check Out</Text>
                <Text style={s.actionBtnSub}>Break</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.actionBtn, s.signOutBtn, submitting && s.btnDisabled]}
                onPress={handleSignOut}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <>
                    <Ionicons name="exit-outline" size={22} color={COLORS.powderBlue} />
                    <Text style={s.actionBtnText}>Sign Out</Text>
                    <Text style={s.actionBtnSub}>End Day</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ── ON BREAK → Show Check In (return) ── */}
          {signedIn && onBreak && (
            <View style={s.breakBanner}>
              <View style={s.breakBannerLeft}>
                <Ionicons name="pause-circle" size={28} color={COLORS.warning} />
                <View>
                  <Text style={s.breakBannerTitle}>On Break</Text>
                  <Text style={s.breakBannerSub}>Timer is paused</Text>
                </View>
              </View>
              <TouchableOpacity
                style={s.resumeBtn}
                onPress={handleBreakIn}
                activeOpacity={0.85}
              >
                <Ionicons name="play-circle-outline" size={20} color={COLORS.white} />
                <Text style={s.resumeBtnText}>Check In</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── SIGNED OUT → Day complete banner ── */}
          {signedOut && (
            <View style={s.completedBanner}>
              <Ionicons name="checkmark-circle" size={26} color={COLORS.success} />
              <View>
                <Text style={s.completedTitle}>Day Complete</Text>
                <Text style={s.completedSub}>See you tomorrow!</Text>
              </View>
            </View>
          )}

        </View>

      </ScrollView>

      {/* ── Modify Attendance Modal ── */}
      <Modal visible={showModify} animationType="slide" transparent onRequestClose={() => setShowModify(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <View style={s.modalHeaderLeft}>
                <View style={[s.statIcon, { backgroundColor: COLORS.linkBg, marginRight: 10 }]}>
                  <Ionicons name="create-outline" size={18} color={COLORS.link} />
                </View>
                <View>
                  <Text style={s.modalTitle}>Modify Attendance</Text>
                  <Text style={s.modalSubtitle}>Correct a past attendance record</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowModify(false)} style={s.iconBtn}>
                <Ionicons name="close" size={18} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={s.divider} />

            <Text style={s.modFieldLabel}>DATE</Text>
            <TouchableOpacity style={s.modFieldRow} onPress={() => setPickerShowing('date')} activeOpacity={0.8}>
              <View style={[s.fieldIcon, { backgroundColor: COLORS.warningBg }]}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.warningAlt} />
              </View>
              <Text style={s.modFieldValue}>
                {modDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <Text style={s.modFieldLabel}>IN TIME</Text>
            <TouchableOpacity style={s.modFieldRow} onPress={() => setPickerShowing('in')} activeOpacity={0.8}>
              <View style={[s.fieldIcon, { backgroundColor: COLORS.successBg }]}>
                <Ionicons name="log-in-outline" size={16} color={COLORS.success} />
              </View>
              <Text style={s.modFieldValue}>{fmtHHMM(modInTime)}</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <Text style={s.modFieldLabel}>OUT TIME</Text>
            <TouchableOpacity style={s.modFieldRow} onPress={() => setPickerShowing('out')} activeOpacity={0.8}>
              <View style={[s.fieldIcon, { backgroundColor: COLORS.screenBg }]}>
                <Ionicons name="log-out-outline" size={16} color={COLORS.error} />
              </View>
              <Text style={s.modFieldValue}>{fmtHHMM(modOutTime)}</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.saveBtn, modifying && { opacity: 0.7 }]}
              onPress={handleModifySubmit}
              disabled={modifying}
              activeOpacity={0.85}
            >
              {modifying ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={s.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {pickerShowing === 'date' && (
        <DateTimePicker value={modDate} mode="date" maximumDate={new Date()}
          onChange={(_, d) => { setPickerShowing(null); if (d) setModDate(d); }} />
      )}
      {pickerShowing === 'in' && (
        <DateTimePicker value={modInTime} mode="time" is24Hour
          onChange={(_, t) => { setPickerShowing(null); if (t) setModInTime(t); }} />
      )}
      {pickerShowing === 'out' && (
        <DateTimePicker value={modOutTime} mode="time" is24Hour
          onChange={(_, t) => { setPickerShowing(null); if (t) setModOutTime(t); }} />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: COLORS.screenBg },
  scrollContent: { paddingBottom: 40 },

  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceAlt },
  iconBtn:     { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },

  sectionLabel:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginTop: 20, marginBottom: 8 },
  sectionLabelText: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.8 },

  statsRow:  { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginTop: 16 },
  statCard:  { flex: 1, backgroundColor: COLORS.white, borderRadius: 14, padding: 12, alignItems: 'center', elevation: 2, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 8 },
  statIcon:  { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statLabel: { fontSize: 9, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.6, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },

  mapCard:       { marginHorizontal: 16, borderRadius: 14, overflow: 'hidden', backgroundColor: COLORS.white, elevation: 2, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 8 },
  map:           { width: '100%', height: 210 },
  mapLoader:     { height: 210, justifyContent: 'center', alignItems: 'center', gap: 10, backgroundColor: COLORS.screenBg },
  mapLoaderText: { fontSize: 13, color: COLORS.textSecondary },
  geofenceBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, gap: 8, flexWrap: 'wrap' },
  geofenceDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.white },
  userDot:       { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(66,133,244,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.white },
  userDotInner:  { width: 11, height: 11, borderRadius: 6, backgroundColor: COLORS.link },
  geofenceBadgeText: { color: COLORS.white, fontWeight: '700', fontSize: 12, flex: 1 },
  geofenceCoords:    { color: 'rgba(255,255,255,0.75)', fontSize: 10 },

  card:    { marginHorizontal: 16, backgroundColor: COLORS.white, borderRadius: 14, padding: 16, elevation: 2, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 8 },
  divider: { height: 1, backgroundColor: COLORS.surfaceAlt, marginVertical: 12 },

  timeRow:       { flexDirection: 'row', gap: 10, marginBottom: 4 },
  timeChip:      { flex: 1, borderRadius: 12, padding: 12, alignItems: 'center' },
  timeChipIcon:  { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  timeChipLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  timeChipValue: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },

  fieldRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  fieldIcon:     { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  fieldRowLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 3 },
  fieldRowValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  remarksInput:  { fontSize: 14, color: COLORS.textPrimary, paddingTop: 0, minHeight: 36 },

  // ── Button section ──
  btnSection: { marginHorizontal: 16, marginTop: 20 },

  // Sign In — full width
  primaryBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 14, paddingVertical: 17, elevation: 3, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
  primaryBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  signInBtn:      { backgroundColor: COLORS.success, shadowColor: COLORS.success },

  // Sign Out + Check Out — side by side
  actionRow:     { flexDirection: 'row', gap: 12 },
  actionBtn:     { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 16, elevation: 3, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
  breakBtn:      { backgroundColor: COLORS.warning, shadowColor: COLORS.warning },
  signOutBtn:    { backgroundColor: COLORS.navy, shadowColor: COLORS.navy },
  actionBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '700', marginTop: 4 },
  actionBtnSub:  { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '500', marginTop: 2 },

  btnDisabled: { opacity: 0.40 },

  // Break banner
  breakBanner:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.warningBg, borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: COLORS.warningAlt },
  breakBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  breakBannerTitle:{ fontSize: 15, fontWeight: '700', color: COLORS.warning },
  breakBannerSub:  { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  resumeBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.success, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  resumeBtnText:   { color: COLORS.white, fontSize: 13, fontWeight: '700' },

  // Day complete banner
  completedBanner: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.successBg, borderRadius: 14, padding: 18, borderWidth: 1.5, borderColor: COLORS.textTertiary },
  completedTitle:  { fontSize: 15, fontWeight: '700', color: COLORS.success },
  completedSub:    { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  // Modify Modal
  modalOverlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.40)' },
  modalSheet:      { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  modalTitle:      { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  modalSubtitle:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  modFieldLabel:   { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.6, marginBottom: 6, marginTop: 14 },
  modFieldRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.screenBg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  modFieldValue:   { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  saveBtn:         { marginTop: 24, backgroundColor: COLORS.navy, borderRadius: 14, paddingVertical: 15, alignItems: 'center', elevation: 3, shadowColor: COLORS.navy, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6 },
  saveBtnText:     { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});
