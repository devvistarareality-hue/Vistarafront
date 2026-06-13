import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Circle, Marker } from 'react-native-maps';
import styles from './styles';

// ── Office location & geofence ──────────────────────────────────
const OFFICE = {
  latitude: 23.1318,
  longitude: 72.5691,
  radius: 500,         // 500 metres — must be within this range to sign in
};

// ── Helpers ─────────────────────────────────────────────────────
const getDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
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

// ── Screen ───────────────────────────────────────────────────────
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

  const watchIdRef = useRef(null);
  const timerRef   = useRef(null);
  const today      = new Date();

  useEffect(() => {
    startLocation();
    return () => {
      if (watchIdRef.current) watchIdRef.current.remove();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const onPosition = ({ coords }) => {
    const { latitude, longitude } = coords;
    setUserLocation({ latitude, longitude });
    setInGeofence(getDistance(latitude, longitude, OFFICE.latitude, OFFICE.longitude) <= OFFICE.radius);
    setLocLoading(false);
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
      { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 5000 },
      onPosition,
    );
  };

  const handleSignIn = () => {
    if (!inGeofence) {
      Alert.alert('Outside Office Zone', 'You must be within the office area to sign in.');
      return;
    }
    setInTime(new Date());
    setSignedIn(true);
    timerRef.current = setInterval(() => setWorkSeconds((s) => s + 1), 1000);
  };

  const handleSignOut = () => {
    setOutTime(new Date());
    setSignedIn(false);
    if (timerRef.current) clearInterval(timerRef.current);
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
            style={styles.map}
            showsUserLocation={true}
            followsUserLocation={true}
            showsMyLocationButton={false}
            initialRegion={{
              latitude: userLocation ? userLocation.latitude : OFFICE.latitude,
              longitude: userLocation ? userLocation.longitude : OFFICE.longitude,
              latitudeDelta: 0.012,
              longitudeDelta: 0.012,
            }}
            region={userLocation ? {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
              latitudeDelta: 0.012,
              longitudeDelta: 0.012,
            } : undefined}
          >
            {/* Office geofence circle */}
            <Circle
              center={{ latitude: OFFICE.latitude, longitude: OFFICE.longitude }}
              radius={OFFICE.radius}
              strokeColor={inGeofence ? '#2E7D32' : '#C62828'}
              strokeWidth={2}
              fillColor={inGeofence ? 'rgba(46,125,50,0.12)' : 'rgba(198,40,40,0.10)'}
            />
            {/* Office pin */}
            <Marker
              coordinate={{ latitude: OFFICE.latitude, longitude: OFFICE.longitude }}
              title="Office"
              pinColor="#1E4080"
            />
          </MapView>
        )}

        {/* Zone status bar at bottom of map */}
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
          <Text style={styles.statusValue}>{signedIn ? 'Signed In' : 'Sign In'}</Text>
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

        <View style={styles.timeRow}>
          <View style={[styles.timeBox, { marginRight: 8 }]}>
            <Text style={styles.timeLabel}>DAILY STATUS</Text>
            <Text style={styles.timeMuted}>No</Text>
          </View>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>DAILY EXPENSES</Text>
            <Text style={styles.timeMuted}>0</Text>
          </View>
        </View>

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

        <TouchableOpacity style={styles.expandBtn}>
          <Text style={styles.expandText}>MODIFY ATTENDANCE</Text>
          <Text style={styles.expandArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.expandBtn} onPress={() => setMoreDetail(!moreDetail)}>
          <Text style={styles.expandText}>MORE DETAIL</Text>
          <Text style={styles.expandArrow}>{moreDetail ? '∧' : '∨'}</Text>
        </TouchableOpacity>
        {moreDetail && (
          <View style={styles.moreDetail}>
            <Text style={styles.moreDetailText}>Break: 00:00</Text>
            <Text style={styles.moreDetailText}>Total: 00:00</Text>
          </View>
        )}
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomRow}>
        <TouchableOpacity
          style={[styles.bottomBtn, styles.signOutBtn, !signedIn && styles.btnDisabled]}
          onPress={handleSignOut}
          disabled={!signedIn}
          activeOpacity={0.8}
        >
          <Text style={styles.bottomBtnText}>SIGN OUT</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomBtn, styles.checkInBtn, (!inGeofence || signedIn) && styles.btnDisabled]}
          onPress={handleSignIn}
          disabled={!inGeofence || signedIn}
          activeOpacity={0.8}
        >
          <Text style={styles.bottomBtnText}>
            {locLoading ? 'LOCATING...' : inGeofence ? 'CHECK IN' : 'OUT OF ZONE'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

export default SignInInternalScreen;
