import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { COLORS } from '../../../../constants/theme';

const { width, height } = Dimensions.get('window');
const SHEET_HEIGHT = height * 0.65;

const Row = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value || '—'}</Text>
  </View>
);

const getStatusColor = (status) => {
  switch (status) {
    case 'Approved': return { bg: COLORS.linkBg, text: COLORS.linkPressed };
    case 'Rejected': return { bg: COLORS.errorBg, text: COLORS.errorStrong };
    default:         return { bg: COLORS.goldBg, text: COLORS.warning };
  }
};

const LeaveDetailModal = ({ visible, leave, onClose, onApprove, onReject, actionLoading, canAct = false }) => {
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!leave) return null;

  const statusColor = getStatusColor(leave.status);
  const isPending   = leave.status === 'Pending';

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Leave Details</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
            <Text style={[styles.statusText, { color: statusColor.text }]}>{leave.status}</Text>
          </View>
        </View>

        {/* Details */}
        <View style={styles.details}>
          <Row label="Employee"   value={leave.name} />
          <Row label="Leave Type" value={leave.leave_type} />
          <Row label="Work Type"  value={leave.work_type} />
          <Row label="Day Type"   value={leave.day_type} />
          <Row label="Session"    value={leave.session} />
          <Row label="From Date"  value={leave.from_date} />
          <Row label="To Date"    value={leave.to_date} />
          <Row label="Applied On" value={leave.applied_on} />
          {leave.description ? <Row label="Reason" value={leave.description} /> : null}
        </View>

        {/* Action Buttons — only an authorized approver sees these */}
        {canAct && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.rejectBtn, (!isPending || actionLoading) && styles.btnDisabled]}
              onPress={onReject}
              disabled={!isPending || actionLoading}
              activeOpacity={0.8}
            >
              {actionLoading
                ? <ActivityIndicator color={COLORS.white} size="small" />
                : <Text style={styles.btnText}>Reject</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.approveBtn, (!isPending || actionLoading) && styles.btnDisabled]}
              onPress={onApprove}
              disabled={!isPending || actionLoading}
              activeOpacity={0.8}
            >
              {actionLoading
                ? <ActivityIndicator color={COLORS.white} size="small" />
                : <Text style={styles.btnText}>Approve</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: width * 0.05,
    borderTopRightRadius: width * 0.05,
    paddingHorizontal: width * 0.05,
    paddingBottom: width * 0.06,
  },
  handle: {
    width: width * 0.12,
    height: width * 0.012,
    backgroundColor: COLORS.divider,
    borderRadius: width * 0.01,
    alignSelf: 'center',
    marginTop: width * 0.03,
    marginBottom: width * 0.04,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: width * 0.05,
  },
  title: {
    fontSize: width * 0.05,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: width * 0.035,
    paddingVertical: width * 0.012,
    borderRadius: width * 0.04,
  },
  statusText: {
    fontSize: width * 0.032,
    fontWeight: '600',
  },
  details: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: width * 0.025,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceAlt,
  },
  label: {
    fontSize: width * 0.035,
    color: COLORS.textSecondary,
    flex: 1,
  },
  value: {
    fontSize: width * 0.035,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: width * 0.04,
    marginTop: width * 0.04,
  },
  btn: {
    flex: 1,
    paddingVertical: width * 0.04,
    borderRadius: width * 0.03,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtn: {
    backgroundColor: COLORS.success,
  },
  rejectBtn: {
    backgroundColor: COLORS.errorStrong,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    fontSize: width * 0.04,
    fontWeight: '700',
    color: COLORS.white,
  },
});

export default LeaveDetailModal;
