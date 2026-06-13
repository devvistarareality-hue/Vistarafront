import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, Modal, TouchableOpacity,
  Animated, ScrollView, StyleSheet, TextInput,
} from 'react-native';
import { COLORS } from '../../../constants/theme';

const ROLE_COLOR = {
  'STM':             { bg: '#EDE7F6', text: '#4527A0' },
  'Sales Executive': { bg: '#E3F2FD', text: '#0D47A1' },
};

const MemberCard = ({ member, selected, onPress }) => {
  const rc = ROLE_COLOR[member.role] || ROLE_COLOR['Sales Executive'];
  return (
    <TouchableOpacity
      style={[styles.memberCard, selected && styles.memberCardSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.memberAvatar, { backgroundColor: selected ? COLORS.primary : '#E8EDF6' }]}>
        <Text style={[styles.memberInitials, { color: selected ? '#fff' : COLORS.primary }]}>
          {member.initials}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.name}</Text>
        <View style={[styles.roleBadge, { backgroundColor: rc.bg }]}>
          <Text style={[styles.roleBadgeText, { color: rc.text }]}>{member.role}</Text>
        </View>
      </View>
      <View style={styles.memberLeads}>
        <Text style={styles.memberLeadCount}>{member.leadCount}</Text>
        <Text style={styles.memberLeadLabel}>leads</Text>
      </View>
      {selected && (
        <View style={styles.selectedCheck}>
          <Text style={styles.selectedCheckText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const TransferModal = ({ visible, onConfirm, onCancel, teamMembers = [] }) => {
  const [mode,     setMode]     = useState('auto');
  const [selected, setSelected] = useState(null);
  const [note,     setNote]     = useState('');
  const slideY = useRef(new Animated.Value(500)).current;

  // Pick team member with fewest leads for auto-assign preview
  const autoAssignee = useMemo(
    () => teamMembers.length > 0
      ? [...teamMembers].sort((a, b) => a.leadCount - b.leadCount)[0]
      : null,
    [teamMembers],
  );

  useEffect(() => {
    if (visible) {
      setSelected(null);
      setNote('');
      setMode('auto');
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    } else {
      Animated.timing(slideY, { toValue: 500, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handleConfirm = () => {
    const assignee = mode === 'auto' ? autoAssignee : selected;
    if (!assignee) return;
    onConfirm(assignee, note.trim());
  };

  const confirmDisabled = mode === 'manual' && !selected;
  const rc = autoAssignee ? (ROLE_COLOR[autoAssignee.role] || ROLE_COLOR['Sales Executive']) : null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          onPress={onCancel}
          activeOpacity={1}
        />
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }] }]}>

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Transfer Lead</Text>
            <Text style={styles.sheetSubtitle}>Assign to a team member and mark as Warm</Text>
          </View>

          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'auto' && styles.modeBtnActive]}
              onPress={() => setMode('auto')}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeBtnText, mode === 'auto' && styles.modeBtnTextActive]}>
                Auto Assign
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === 'manual' && styles.modeBtnActive]}
              onPress={() => setMode('manual')}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeBtnText, mode === 'manual' && styles.modeBtnTextActive]}>
                Manual
              </Text>
            </TouchableOpacity>
          </View>

          {/* Auto mode */}
          {mode === 'auto' && autoAssignee && rc && (
            <View style={styles.autoSection}>
              <Text style={styles.autoLabel}>Next in rotation</Text>
              <View style={styles.autoCard}>
                <View style={[styles.autoAvatar, { backgroundColor: COLORS.primary }]}>
                  <Text style={styles.autoInitials}>{autoAssignee.initials}</Text>
                </View>
                <View style={styles.autoInfo}>
                  <Text style={styles.autoName}>{autoAssignee.name}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: rc.bg, alignSelf: 'flex-start' }]}>
                    <Text style={[styles.roleBadgeText, { color: rc.text }]}>{autoAssignee.role}</Text>
                  </View>
                </View>
                <View style={styles.autoLeads}>
                  <Text style={styles.autoLeadNum}>{autoAssignee.leadCount}</Text>
                  <Text style={styles.autoLeadLbl}>active leads</Text>
                </View>
              </View>
              <Text style={styles.autoHint}>Assigned automatically based on team rotation</Text>
            </View>
          )}

          {/* Manual mode */}
          {mode === 'manual' && (
            <ScrollView style={styles.manualList} showsVerticalScrollIndicator={false}>
              {teamMembers.map((m) => (
                <MemberCard
                  key={m.id}
                  member={m}
                  selected={selected?.id === m.id}
                  onPress={() => setSelected(m)}
                />
              ))}
            </ScrollView>
          )}

          {/* Note input — shared for both modes */}
          <View style={styles.noteSection}>
            <Text style={styles.noteLabel}>
              Remark <Text style={styles.noteOptional}>(optional)</Text>
            </Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Add a note about this transfer..."
              placeholderTextColor="#BBB"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              value={note}
              onChangeText={setNote}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, confirmDisabled && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={confirmDisabled}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmBtnText}>
                {mode === 'auto'
                  ? `Assign to ${autoAssignee?.name?.split(' ')[0]}`
                  : selected ? `Assign to ${selected.name.split(' ')[0]}` : 'Select a person'}
              </Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position:        'absolute',
    top:             0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  sheet: {
    backgroundColor:      '#fff',
    borderTopLeftRadius:  24,
    borderTopRightRadius: 24,
    paddingBottom:        32,
    maxHeight:            '88%',
  },

  sheetHeader:   { alignItems: 'center', paddingTop: 12, paddingBottom: 16, paddingHorizontal: 20 },
  sheetHandle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: '#DDD', marginBottom: 16 },
  sheetTitle:    { fontSize: 18, fontWeight: '800', color: '#1A1A2E', marginBottom: 4 },
  sheetSubtitle: { fontSize: 13, color: '#888', textAlign: 'center' },

  modeToggle: {
    flexDirection:    'row',
    marginHorizontal: 20,
    marginBottom:     16,
    backgroundColor:  '#F0F4FF',
    borderRadius:     12,
    padding:          4,
  },
  modeBtn:           { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  modeBtnActive:     { backgroundColor: COLORS.primary },
  modeBtnText:       { fontSize: 14, fontWeight: '600', color: '#888' },
  modeBtnTextActive: { color: '#fff' },

  /* Auto mode */
  autoSection: { paddingHorizontal: 20, marginBottom: 8 },
  autoLabel: {
    fontSize:      12,
    fontWeight:    '600',
    color:         '#999',
    marginBottom:  10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  autoCard: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: '#F4F7FF',
    borderRadius:    14,
    padding:         14,
    borderWidth:     1.5,
    borderColor:     COLORS.primary,
    marginBottom:    10,
  },
  autoAvatar:   { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  autoInitials: { fontSize: 18, fontWeight: '800', color: '#fff' },
  autoInfo:     { flex: 1 },
  autoName:     { fontSize: 16, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  autoLeads:    { alignItems: 'center' },
  autoLeadNum:  { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  autoLeadLbl:  { fontSize: 10, color: '#888' },
  autoHint:     { fontSize: 12, color: '#AAA', textAlign: 'center' },

  /* Manual mode */
  manualList: { maxHeight: 220, paddingHorizontal: 20 },
  memberCard: {
    flexDirection:   'row',
    alignItems:      'center',
    padding:         12,
    borderRadius:    12,
    marginBottom:    8,
    borderWidth:     1.5,
    borderColor:     '#EEE',
    backgroundColor: '#FAFAFA',
  },
  memberCardSelected: { borderColor: COLORS.primary, backgroundColor: '#F0F4FF' },
  memberAvatar:   { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  memberInitials: { fontSize: 14, fontWeight: '700' },
  memberInfo:     { flex: 1 },
  memberName:     { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  roleBadge:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
  roleBadgeText:  { fontSize: 10, fontWeight: '700' },
  memberLeads:    { alignItems: 'center', marginRight: 8 },
  memberLeadCount: { fontSize: 16, fontWeight: '800', color: '#333' },
  memberLeadLabel: { fontSize: 10, color: '#AAA' },
  selectedCheck:     { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  selectedCheckText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  /* Note input */
  noteSection:   { paddingHorizontal: 20, paddingTop: 12 },
  noteLabel:     { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  noteOptional:  { fontWeight: '400', color: '#AAA' },
  noteInput: {
    backgroundColor:   '#F7F8FA',
    borderRadius:      10,
    borderWidth:       1,
    borderColor:       '#E8E8E8',
    paddingHorizontal: 12,
    paddingVertical:   10,
    fontSize:          14,
    color:             '#333',
    minHeight:         68,
  },

  /* Footer */
  footer: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 14, gap: 12 },
  cancelBtn: {
    flex:            1,
    paddingVertical: 14,
    borderRadius:    12,
    borderWidth:     1.5,
    borderColor:     '#DDD',
    alignItems:      'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#555' },
  confirmBtn: {
    flex:            2,
    paddingVertical: 14,
    borderRadius:    12,
    backgroundColor: COLORS.primary,
    alignItems:      'center',
    elevation:       3,
    shadowColor:     COLORS.primary,
    shadowOpacity:   0.3,
    shadowOffset:    { width: 0, height: 3 },
    shadowRadius:    6,
  },
  confirmBtnDisabled: { backgroundColor: '#B0BEC5', elevation: 0 },
  confirmBtnText:     { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default TransferModal;
