import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, Image, Modal, TextInput,
  Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../../../constants/theme';
import images from '../../../constants/images';
import { STATUS_META, STATUSES } from '../../../constants/presalesMockData';
import { PRESALES_ENDPOINTS } from '../../../constants/api';
import { normalizeLead } from '../../../utils/presalesNormalize';
import { getFollowupInfo, formatFollowupDate, toApiDate } from '../../../utils/followupHelpers';
import { fetchPresalesTeam } from '../../../redux/actions/presalesActions';
import Toast from '../../../components/Toast';
import TransferModal from './TransferModal';
import styles from './styles';

const initials = (name) =>
  name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

const InfoRow = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || '—'}</Text>
  </View>
);

const ActivityItem = ({ item, isLast }) => (
  <View style={styles.activityItem}>
    <View style={styles.timelineLine}>
      <View style={[
        styles.timelineDot,
        item.type === 'Transfer' && { backgroundColor: '#FF6F00' },
      ]} />
      {!isLast && <View style={styles.timelineConnector} />}
    </View>
    <View style={styles.activityContent}>
      <Text style={[
        styles.activityType,
        item.type === 'Transfer' && { color: '#FF6F00' },
      ]}>{item.type}</Text>
      <Text style={styles.activityNote}>{item.note}</Text>
      <Text style={styles.activityTime}>{item.time}</Text>
    </View>
  </View>
);


/* ── Inline status-change sheet ── */
const StatusChangeSheet = ({ visible, targetStatus, note, onChangeNote, onConfirm, onCancel }) => {
  const slideY = useRef(new Animated.Value(400)).current;
  const meta   = STATUS_META[targetStatus] || STATUS_META.New;

  React.useEffect(() => {
    Animated.spring(slideY, {
      toValue:      visible ? 0 : 400,
      useNativeDriver: true,
      bounciness:   4,
    }).start();
  }, [visible]);

  if (!visible && !targetStatus) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} onPress={onCancel} activeOpacity={1} />
          <Animated.View style={[styles.statusSheet, { transform: [{ translateY: slideY }] }]}>
            <View style={styles.sheetHandle} />

            {/* Title */}
            <View style={styles.statusSheetHeader}>
              <Text style={styles.statusSheetTitle}>Mark as</Text>
              <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                <Text style={[styles.badgeText, { color: meta.color, fontSize: 14 }]}>{targetStatus}</Text>
              </View>
            </View>

            {/* Note input */}
            <Text style={styles.noteInputLabel}>Remark <Text style={styles.noteOptional}>(optional)</Text></Text>
            <TextInput
              style={styles.noteInput}
              placeholder={`Add a note about why this lead is ${targetStatus}...`}
              placeholderTextColor="#BBB"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={note}
              onChangeText={onChangeNote}
              autoFocus
            />

            {/* Actions */}
            <View style={styles.sheetFooter}>
              <TouchableOpacity style={styles.sheetCancelBtn} onPress={onCancel} activeOpacity={0.8}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sheetConfirmBtn, { backgroundColor: meta.color }]}
                onPress={onConfirm}
                activeOpacity={0.85}
              >
                <Text style={styles.sheetConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

/* ── Main screen ── */
const LeadDetailScreen = () => {
  const navigation            = useNavigation();
  const route                 = useRoute();
  const dispatch              = useDispatch();
  const { lead: initialLead } = route.params;

  const { data: teamMembers } = useSelector((s) => s.presales.team);

  const [lead,              setLead]              = useState(initialLead);
  const [transferModal,     setTransferModal]     = useState(false);
  const [statusSheet,       setStatusSheet]       = useState({ visible: false, targetStatus: null, note: '' });
  const [toast,             setToast]             = useState({ visible: false, message: '', type: 'success' });

  useEffect(() => {
    if (teamMembers.length === 0) dispatch(fetchPresalesTeam());
  }, []);

  const showToast = (message, type = 'success') =>
    setToast({ visible: true, message, type });

  const apiCall = async (url, method, body) => {
    const token = await AsyncStorage.getItem('access_token');
    const res   = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify(body),
    });
    const data = await res.json();
    return { ok: res.ok, data };
  };

  const handleStatusPress = (newStatus) => {
    if (newStatus === lead.status) return;
    if (newStatus === 'Warm') {
      setTransferModal(true);
    } else {
      setStatusSheet({ visible: true, targetStatus: newStatus, note: '' });
    }
  };

  const handleSheetConfirm = async () => {
    const { targetStatus, note } = statusSheet;
    setStatusSheet({ visible: false, targetStatus: null, note: '' });
    try {
      const { ok, data } = await apiCall(
        PRESALES_ENDPOINTS.leadStatus(lead.id), 'PATCH', { status: targetStatus, note },
      );
      if (ok) {
        setLead(normalizeLead(data));
        showToast(`Status updated to ${targetStatus}.`, 'info');
      } else {
        showToast(data.detail || 'Failed to update status.', 'error');
      }
    } catch {
      showToast('Network error. Try again.', 'error');
    }
  };

  const handleSheetCancel = () =>
    setStatusSheet({ visible: false, targetStatus: null, note: '' });

  const handleTransferConfirm = async (assignee, note) => {
    setTransferModal(false);
    try {
      const { ok, data } = await apiCall(
        PRESALES_ENDPOINTS.leadTransfer(lead.id), 'POST', { assignee_id: assignee.id, note },
      );
      if (ok) {
        setLead(normalizeLead(data));
        showToast(`Lead transferred to ${assignee.name} (${assignee.role}).`, 'success');
      } else {
        showToast(data.detail || 'Transfer failed.', 'error');
      }
    } catch {
      showToast('Network error. Try again.', 'error');
    }
  };

  const openFollowupPicker = () => {
    const current = lead.nextFollowup ? new Date(lead.nextFollowup) : new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value:       current,
        mode:        'date',
        minimumDate: new Date(),
        onChange:    async (event, date) => {
          if (event.type !== 'set' || !date) return;
          const { ok, data } = await apiCall(
            PRESALES_ENDPOINTS.leadFollowup(lead.id), 'PATCH',
            { next_followup: toApiDate(date) },
          );
          if (ok) {
            setLead(normalizeLead(data));
            showToast('Follow-up date updated.', 'success');
          } else {
            showToast(data.detail || 'Failed to update.', 'error');
          }
        },
      });
    } else {
      setShowFollowupPicker(true);
    }
  };

  const clearFollowup = async () => {
    const { ok, data } = await apiCall(
      PRESALES_ENDPOINTS.leadFollowup(lead.id), 'PATCH', { next_followup: null },
    );
    if (ok) {
      setLead(normalizeLead(data));
      showToast('Follow-up date cleared.', 'info');
    }
  };

  const meta = STATUS_META[lead.status] || STATUS_META.New;
  const followupInfo = getFollowupInfo(lead.nextFollowup);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Image source={images.backIcon} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Lead Detail</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={[styles.profileAvatar, { backgroundColor: meta.color }]}>
            <Text style={styles.profileAvatarText}>{initials(lead.name)}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{lead.name}</Text>
            <Text style={styles.profilePhone}>{lead.phone}</Text>
            <View style={[styles.badge, { backgroundColor: meta.bg, marginTop: 6, alignSelf: 'flex-start' }]}>
              <Text style={[styles.badgeText, { color: meta.color }]}>{lead.status}</Text>
            </View>
          </View>
          {lead.status === 'Warm' && (
            <View style={styles.stmFlag}>
              <Text style={styles.stmFlagText}>STM{'\n'}Ready</Text>
            </View>
          )}
        </View>

        {/* Warm transfer banner */}
        {lead.status === 'Warm' && (
          <View style={styles.transferBanner}>
            <Text style={styles.transferBannerIcon}>⚡</Text>
            <Text style={styles.transferBannerText}>
              Assigned to <Text style={{ fontWeight: '800' }}>{lead.assignedTo}</Text> for follow-up
            </Text>
          </View>
        )}

        {/* Status Changer */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Update Status</Text>
          <View style={styles.statusRow}>
            {STATUSES.map((s) => {
              const m = STATUS_META[s];
              const isActive = lead.status === s;
              return (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusChip,
                    { borderColor: m.color },
                    isActive && { backgroundColor: m.color },
                  ]}
                  onPress={() => handleStatusPress(s)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.statusChipText, { color: isActive ? '#fff' : m.color }]}>{s}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.statusHint}>Tap any status to update with a remark</Text>
        </View>

        {/* Follow-up */}
        <View style={styles.sectionCard}>
          <View style={styles.followupHeader}>
            <Text style={styles.sectionCardTitle}>Next Follow-up</Text>
            <TouchableOpacity onPress={openFollowupPicker} activeOpacity={0.8}>
              <Text style={styles.followupEditBtn}>
                {lead.nextFollowup ? 'Change' : '+ Set Date'}
              </Text>
            </TouchableOpacity>
          </View>

          {lead.nextFollowup ? (
            <View style={[styles.followupBadge, { backgroundColor: followupInfo?.bg || '#F4F6FA' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.followupStatus, { color: followupInfo?.color || '#555' }]}>
                  {followupInfo?.label}
                </Text>
                <Text style={styles.followupDate}>
                  {formatFollowupDate(lead.nextFollowup)}
                </Text>
              </View>
              <TouchableOpacity onPress={clearFollowup} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: 16, color: '#AAA' }}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.followupEmpty}>No follow-up scheduled</Text>
          )}

        </View>

        {/* Contact Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Contact Details</Text>
          <InfoRow label="Phone"  value={lead.phone} />
          <InfoRow label="Email"  value={lead.email} />
          <InfoRow label="Source" value={lead.source} />
          <InfoRow label="Added"  value={lead.createdAt} />
        </View>

        {/* Project Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Project Interest</Text>
          <InfoRow label="Project"     value={lead.projectName} />
          <InfoRow label="Budget"      value={lead.budget} />
          <InfoRow label="Assigned To" value={lead.assignedTo} />
        </View>

        {lead.notes ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionCardTitle}>Notes</Text>
            <Text style={styles.notesText}>{lead.notes}</Text>
          </View>
        ) : null}

        {/* Activity Timeline */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Activity Timeline</Text>
          {lead.activities.map((act, idx) => (
            <ActivityItem key={act.id} item={act} isLast={idx === lead.activities.length - 1} />
          ))}
        </View>

      </ScrollView>

      <StatusChangeSheet
        visible={statusSheet.visible}
        targetStatus={statusSheet.targetStatus}
        note={statusSheet.note}
        onChangeNote={(v) => setStatusSheet((p) => ({ ...p, note: v }))}
        onConfirm={handleSheetConfirm}
        onCancel={handleSheetCancel}
      />

      <TransferModal
        visible={transferModal}
        teamMembers={teamMembers}
        onConfirm={handleTransferConfirm}
        onCancel={() => setTransferModal(false)}
      />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast((p) => ({ ...p, visible: false }))}
      />
    </SafeAreaView>
  );
};

export default LeadDetailScreen;
