import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import useGeolocation from './hooks/useGeolocation';
import useAttendance from './hooks/useAttendance';
import { formatTime, formatDate } from './utils/timeUtils';
import styles from './SignInStyles';

const SignInScreen = () => {
  const { userLocation, locLoading, inGeofence } = useGeolocation();
  const { signedIn, inTime, outTime, workHours, handleSignIn, handleSignOut } = useAttendance();
  const [remarks, setRemarks] = useState('');
  const [moreDetail, setMoreDetail] = useState(false);

  const today = new Date();

  const onSignIn = () => {
    if (!inGeofence) {
      Alert.alert('Outside Office Zone', 'You must be within the office area to sign in.');
      return;
    }
    handleSignIn(inGeofence);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Location Status ── */}
      <View style={styles.locationCard}>
        {locLoading ? (
          <View style={styles.locLoadingRow}>
            <ActivityIndicator size="small" color="#1E4080" />
            <Text style={styles.locLoadingText}>Getting your location...</Text>
          </View>
        ) : (
          <View style={styles.locStatusRow}>
            <View style={[styles.locDot, { backgroundColor: inGeofence ? '#2E7D32' : '#C62828' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.locStatusTitle}>
                {inGeofence ? 'Inside Office Zone' : 'Outside Office Zone'}
              </Text>
              {userLocation && (
                <Text style={styles.locCoords}>
                  {userLocation.latitude.toFixed(5)}, {userLocation.longitude.toFixed(5)}
                </Text>
              )}
            </View>
            <Text style={styles.locIcon}>{inGeofence ? '✓' : '✗'}</Text>
          </View>
        )}
      </View>

      {/* ── Work Hours & Status ── */}
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

      {/* ── Details Card ── */}
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
          <Text style={styles.calIcon}>📅</Text>
        </View>
        <View style={styles.divider} />

        <View style={styles.timeRow}>
          <View style={[styles.timeBox, { marginRight: 8 }]}>
            <Text style={styles.timeLabel}>DAILY STATUS</Text>
            <Text style={styles.timeValueMuted}>No</Text>
          </View>
          <View style={styles.timeBox}>
            <Text style={styles.timeLabel}>DAILY EXPENSES</Text>
            <Text style={styles.timeValueMuted}>0</Text>
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
          <Text style={styles.expandBtnText}>MODIFY ATTENDANCE</Text>
          <Text style={styles.expandBtnArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.expandBtn} onPress={() => setMoreDetail(!moreDetail)}>
          <Text style={styles.expandBtnText}>MORE DETAIL</Text>
          <Text style={styles.expandBtnArrow}>{moreDetail ? '∧' : '∨'}</Text>
        </TouchableOpacity>
        {moreDetail && (
          <View style={styles.moreDetailContent}>
            <Text style={styles.moreDetailText}>Break: 00:00</Text>
            <Text style={styles.moreDetailText}>Total: 00:00</Text>
          </View>
        )}
      </View>

      {/* ── Bottom Buttons ── */}
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
          onPress={onSignIn}
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

export default SignInScreen;
