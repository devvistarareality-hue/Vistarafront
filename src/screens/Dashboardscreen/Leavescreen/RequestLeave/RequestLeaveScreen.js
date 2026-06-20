import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ScrollView,
  Platform,
  Modal,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../../constants/theme';
import { requestLeave, resetRequestLeave } from '../../../../redux/actions/requestLeaveActions';
import styles from './styles';

const { height } = Dimensions.get('window');

const LEAVE_OPTIONS = ['Paid Leave', 'Sick Leave', 'Casual Leave', 'LOP'];

const LeaveBottomSheet = ({ visible, selected, onSelect, onClose }) => {
  const slideAnim = useRef(new Animated.Value(height)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

      {/* Sheet */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Select Leave Type</Text>

        {LEAVE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option}
            style={styles.sheetOption}
            activeOpacity={0.7}
            onPress={() => { onSelect(option); onClose(); }}
          >
            <Text style={[styles.sheetOptionText, selected === option && styles.sheetOptionTextActive]}>
              {option}
            </Text>
            {selected === option && (
              <View style={styles.sheetCheckDot} />
            )}
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.sheetCancelBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={styles.sheetCancelText}>Cancel</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const LEAVE_TYPE_MAP = {
  'Paid Leave':    'paid_leave',
  'Sick Leave':    'sick_leave',
  'Casual Leave':  'casual_leave',
  'LOP':           'lop',
};

const toISODate = (d) =>
  `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

const RequestLeaveScreen = () => {
  const navigation = useNavigation();
  const dispatch   = useDispatch();
  const { requestLoading, requestSuccess, requestError } = useSelector((s) => s.requestLeave);

  const [workType,        setWorkType]        = useState('Leave');
  const [selectedLeave,   setSelectedLeave]   = useState('Casual Leave');
  const [dayType,         setDayType]         = useState('Full Day');
  const [halfMode,        setHalfMode]        = useState('First Half');
  const [startDate,       setStartDate]       = useState(new Date());
  const [endDate,         setEndDate]         = useState(new Date());
  const [description,     setDescription]     = useState('');
  const [showSheet,       setShowSheet]       = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker,   setShowEndPicker]   = useState(false);

  React.useEffect(() => {
    if (requestSuccess) {
      Alert.alert('Success', 'Leave request submitted successfully.', [
        { text: 'OK', onPress: () => { dispatch(resetRequestLeave()); navigation.goBack(); } },
      ]);
    }
    if (requestError) {
      Alert.alert('Error', requestError, [
        { text: 'OK', onPress: () => dispatch(resetRequestLeave()) },
      ]);
    }
  }, [requestSuccess, requestError]);

  const handleSubmit = () => {
    const payload = {
      work_type:  workType.toLowerCase(),
      leave_type: LEAVE_TYPE_MAP[selectedLeave],
      day_type:   dayType === 'Full Day' ? 'full_day' : 'half_day',
      session:    dayType === 'Half Day'
                    ? (halfMode === 'First Half' ? 'first_half' : 'second_half')
                    : null,
      from_date:  toISODate(startDate),
      to_date:    dayType === 'Full Day' ? toISODate(endDate) : null,
      description,
    };
    dispatch(requestLeave(payload));
  };

  const formatDate = (d) =>
    `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
      .toString().padStart(2, '0')}/${d.getFullYear()}`;

  const handleStartChange = (event, selected) => {
    if (Platform.OS === 'android') setShowStartPicker(false);
    if (selected) setStartDate(selected);
  };

  const handleEndChange = (event, selected) => {
    if (Platform.OS === 'android') setShowEndPicker(false);
    if (selected) setEndDate(selected);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={COLORS.screenBg} barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Leave</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

        {/* Leave / WFH Toggle */}
        <View style={styles.toggleCard}>
          {['Leave', 'WFH'].map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.toggleBtn, workType === opt && styles.toggleBtnActive]}
              onPress={() => setWorkType(opt)}
            >
              <Text style={[styles.toggleText, workType === opt && styles.toggleTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Leave Type Dropdown */}
        <TouchableOpacity style={styles.dropdownCard} activeOpacity={0.8} onPress={() => setShowSheet(true)}>
          <Text style={styles.dropdownLabel}>Leave Type</Text>
          <View style={styles.dropdownRight}>
            <Text style={styles.dropdownValue}>{selectedLeave}</Text>
            <Ionicons name="chevron-down" size={18} color={COLORS.navy} />
          </View>
        </TouchableOpacity>

        {/* Full Day / Half Day Toggle */}
        <View style={styles.toggleCard}>
          {['Full Day', 'Half Day'].map(opt => (
            <TouchableOpacity
              key={opt}
              style={[styles.toggleBtn, dayType === opt && styles.toggleBtnActive]}
              onPress={() => setDayType(opt)}
            >
              <Text style={[styles.toggleText, dayType === opt && styles.toggleTextActive]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* First Half / Second Half */}
        {dayType === 'Half Day' && (
          <View style={styles.toggleCard}>
            {['First Half', 'Second Half'].map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.toggleBtn, halfMode === opt && styles.toggleBtnActive]}
                onPress={() => setHalfMode(opt)}
              >
                <Text style={[styles.toggleText, halfMode === opt && styles.toggleTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Start Date */}
        <TouchableOpacity style={styles.dateCard} onPress={() => setShowStartPicker(true)}>
          <Text style={styles.calendarIcon}>📅</Text>
          <Text style={styles.dateTextFilled}>{formatDate(startDate)}</Text>
        </TouchableOpacity>

        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={handleStartChange}
            minimumDate={new Date()}
          />
        )}

        {/* End Date — Full Day only */}
        {dayType === 'Full Day' && (
          <TouchableOpacity style={styles.dateCard} onPress={() => setShowEndPicker(true)}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.navy} style={{ marginRight: 12 }} />
            <Text style={styles.dateTextFilled}>{formatDate(endDate)}</Text>
          </TouchableOpacity>
        )}

        {showEndPicker && dayType === 'Full Day' && (
          <DateTimePicker
            value={endDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={handleEndChange}
            minimumDate={startDate}
          />
        )}

        {/* Description */}
        <View style={styles.descCard}>
          <TextInput
            style={styles.descInput}
            placeholder="Enter Description"
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

      </ScrollView>

      {/* Submit */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.submitBtn}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={requestLoading}
        >
          {requestLoading
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.submitText}>Submit</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Leave Type Bottom Sheet */}
      <LeaveBottomSheet
        visible={showSheet}
        selected={selectedLeave}
        onSelect={setSelectedLeave}
        onClose={() => setShowSheet(false)}
      />

    </SafeAreaView>
  );
};

export default RequestLeaveScreen;
