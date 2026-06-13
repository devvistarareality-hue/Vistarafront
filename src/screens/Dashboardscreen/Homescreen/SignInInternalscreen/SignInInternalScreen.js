import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Circle, Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ATTENDANCE_ENDPOINTS } from '../../../../constants/api';
import styles from './styles';

// ── Office location & geofence ──────────────────────────────────
const OFFICE = {
  latitude:  23.1318,
  longitude: 72.5691,
  radius:    500,
};

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

const formatTime = (d) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

const formatDate = (d) =>
  `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;

const parseTimeStr = (str) => {
  if (!str) return null;
  const [h, m, s] = str.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, s || 0, 0);
  return d;
};

const SignInInternalScreen = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [locLoading, setLocLoading]     = useState(true);
  const [inGeofence, setInGeofence]     = useState(false);
  const [signedIn, setSignedIn]         = useState(false);
  const [inTime, setInTime]             = useState(null);
  const [outTime, setOutTime]           = useState(null);
  const [workSeconds, setWorkSeconds]   = useState(0);
  const [remarks, setRemarks]           = useState('');
  const [moreDetail, setMoreDetail]     = useState(false);
  const [submitting, setSubmitting]     = useState(false);

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

  // Restore today's sign-in state from backend
  const loadTodayRecord = async () => {
    try {
      const token    = await AsyncStorage.getItem('access_token');
      const response = await fetch(ATTENDANCE_ENDPOINTS.today, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.in_time) {
        const inDate = parseTimeStr(data.in_time);
        setInTime(inDate);
        if (data.signed_in) {
          setSignedIn(true);
          const elapsed = Math.floor((Date.now() - inDate.getTime()) / 1000);
          setWorkSeconds(elapsed > 0 ? elapsed : 0);
          timerRef.current = setInterval(() => setWorkSeconds(s => s + 1), 1000);
        } else if (data.out_time) {
          setOutTime(parseTimeStr(data.out_time));
        }
      }
    } catch {
      // non-fatal — screen still works without restoring state
    }
  };

  const onPosition = ({ coords }) => {
    const { latitude, longitude } = coords;
    setUserLocation({ latitude, longitude });
    setInGeofence(getDistance(latitude, longitude, OFFICE.latitude, OFFICE.longitude) <= OFFICE.radius);
    setLocLoading(false);
    mapRef.current?.animateToRegion(
      { latitude, longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 },
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
        const inDate = parseTimeStr(data.in_time);
        setInTime(inDate);
        setSignedIn(true);
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

  const handleSignOut = async () => {
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
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        Alert.alert('Sign Out Failed', data.detail || 'Could not sign out.');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const workHours = () => {
    const h = String(Math.floor(workSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((workSeconds % 3600) / 60)).padStart(2, '0');
    return `${h}:${m}`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Live Map */}
      <View style={styles.mapCard}>
        {locLoading ? (
          <View style={styles.mapLoader}>
            <ActivityIndicator size="large" color="#1E4080" />
            <Text style={styles.locLoadingText}>Getting your location...</Text>
          </View>
        ) : (
          <MapView
            ref={mapRef}
            style={styles.map}
            showsUserLocation
            showsMyLocationButton={false}
            initialRegion={{
              latitude:      userLocation?.latitude  ?? OFFICE.latitude,
              longitude:     userLocation?.longitude ?? OFFICE.longitude,
              latitudeDelta:  0.012,
              longitudeDelta: 0.012,
            }}
          >
            <Circle
              center={{ latitude: OFFICE.latitude, longitude: OFFICE.longitude }}
              radius={OFFICE.radius}
              strokeColor={inGeofence ? '#2E7D32' : '#C62828'}
              strokeWidth={2}
              fillColor={inGeofence ? 'rgba(46,125,50,0.12)' : 'rgba(198,40,40,0.10)'}
            />
            <Marker
              coordinate={{ latitude: OFFICE.latitude, longitude: OFFICE.longitude }}
              title="Office"
              pinColor="#1E4080"
            />
          </MapView>
        )}

        {!locLoading && (
          <View style={[styles.mapStatusBar, { backgroundColor: inGeofence ? '#2E7D32' : '#C62828' }]}>
            <View style={styles.locDot} />
            <Text style={styles.mapStatusText}>
              {inGeofence ? '✓  Inside Office Zone' : '✗  Outside Office Zone (500 m radius)'}
            </Text>
            {userLocation && (
              <Text style={styles.mapCoordsText}>
                {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Work Hours & Status */}
      <View style={styles.statusRow}>
        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>WORK HOURS</Text>
          <Text style={styles.statusValue}>{workHours()}</Text>
        </View>
        <View style={[styles.statusBox, styles.statusBoxRight]}>
          <Text style={styles.statusLabel}>STATUS</Text>
          <Text style={styles.statusValue}>{signedIn ? 'Signed In' : outTime ? 'Signed Out' : 'Not Signed In'}</Text>
        </View>
      </View>

      {/* Details Card */}
      <View style={styles.card}>
        <View style={styles.timeRow}>
          <View style={[styles.timeBox, { marginRight: 8 }]}>
            <Text style={styles.timeLabel}>IN TIME</Text>
            <Text style={styles.timeValue}>{inTime ? formatTime(inTime) : '00:00:00'}</Text>
          </View>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>OUT TIME</Text>
            <Text style={styles.timeValue}>{outTime ? formatTime(outTime) : '00:00:00'}</Text>
          </View>
        </View>

        <Text style={styles.fieldLabel}>Date*</Text>
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>{formatDate(today)}</Text>
          <Text>📅</Text>
        </View>
        <View style={styles.divider} />

        <Text style={styles.fieldLabel}>Remarks</Text>
        <TextInput
          style={styles.remarksInput}
          placeholder="Enter remarks..."
          placeholderTextColor="#aaa"
          value={remarks}
          onChangeText={setRemarks}
          multiline
        />
        <View style={styles.divider} />

        <TouchableOpacity style={styles.expandBtn} onPress={() => setMoreDetail(!moreDetail)}>
          <Text style={styles.expandText}>MORE DETAIL</Text>
          <Text style={styles.expandArrow}>{moreDetail ? '∧' : '∨'}</Text>
        </TouchableOpacity>
        {moreDetail && (
          <View style={styles.moreDetail}>
            <Text style={styles.moreDetailText}>Total: {workHours()}</Text>
          </View>
        )}
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomRow}>
        <TouchableOpacity
          style={[styles.bottomBtn, styles.signOutBtn, (!signedIn || submitting) && styles.btnDisabled]}
          onPress={handleSignOut}
          disabled={!signedIn || submitting}
          activeOpacity={0.8}
        >
          {submitting && !signedIn ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.bottomBtnText}>SIGN OUT</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomBtn, styles.checkInBtn, (!inGeofence || signedIn || submitting) && styles.btnDisabled]}
          onPress={handleSignIn}
          disabled={!inGeofence || signedIn || submitting}
          activeOpacity={0.8}
        >
          {submitting && signedIn === false ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.bottomBtnText}>
              {locLoading ? 'LOCATING...' : inGeofence ? 'CHECK IN' : 'OUT OF ZONE'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

export default SignInInternalScreen;
