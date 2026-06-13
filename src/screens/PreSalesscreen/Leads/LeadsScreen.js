import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StatusBar, Image, TextInput, Modal, Animated,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { COLORS } from '../../../constants/theme';
import images from '../../../constants/images';
import { STATUS_META } from '../../../constants/presalesMockData';
import { fetchPresalesLeads } from '../../../redux/actions/presalesActions';
import BulkUploadModal from './BulkUploadModal';
import styles from './styles';

const STATUS_FILTERS = ['All', 'New', 'Cold', 'Warm', 'Lost'];

const initials = (name) =>
  name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status] || STATUS_META.New;
  return (
    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
      <Text style={[styles.badgeText, { color: meta.color }]}>{status}</Text>
    </View>
  );
};

const LeadCard = ({ item, onPress }) => {
  const meta = STATUS_META[item.status] || STATUS_META.New;
  return (
    <TouchableOpacity
      style={[styles.leadCard, { borderLeftColor: meta.color }]}
      onPress={() => onPress(item)}
      activeOpacity={0.85}
    >
      <View style={styles.leadCardRow}>
        <View style={[styles.avatar, { backgroundColor: meta.color }]}>
          <Text style={styles.avatarText}>{initials(item.name)}</Text>
        </View>
        <View style={styles.leadCardInfo}>
          <Text style={styles.leadName}>{item.name}</Text>
          <Text style={styles.leadPhone}>{item.phone}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>

      <View style={styles.leadCardMeta}>
        <View style={styles.metaChip}>
          <Text style={styles.metaChipText}>{item.projectName}</Text>
        </View>
        <View style={styles.metaChip}>
          <Text style={styles.metaChipText}>{item.source}</Text>
        </View>
        <Text style={styles.timeAgo}>{item.timeAgo}</Text>
      </View>

      <View style={styles.leadCardFooter}>
        <Text style={styles.budget}>{item.budget}</Text>
        <Text style={styles.assignedTo}>Assigned: {item.assignedTo}</Text>
      </View>
    </TouchableOpacity>
  );
};

/* ── Filter bottom sheet ── */
const FilterSheet = ({ visible, onClose, filters, onApply, assignees, projectNames }) => {
  const slideY = useRef(new Animated.Value(500)).current;
  const [local, setLocal] = useState(filters);

  React.useEffect(() => {
    if (visible) {
      setLocal(filters);
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    } else {
      Animated.timing(slideY, { toValue: 500, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  const ChipRow = ({ label, options, selected, onSelect }) => (
    <View style={styles.fsSection}>
      <Text style={styles.fsSectionTitle}>{label}</Text>
      <View style={styles.fsChips}>
        {options.map((opt) => {
          const isActive = selected === opt;
          const meta     = STATUS_META[opt];
          const activeBg = meta?.color || COLORS.primary;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.fsChip, isActive && { backgroundColor: activeBg, borderColor: activeBg }]}
              onPress={() => onSelect(opt)}
              activeOpacity={0.8}
            >
              <Text style={[styles.fsChipText, isActive && { color: '#fff' }]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const activeCount =
    (local.status   !== 'All' ? 1 : 0) +
    (local.assignee !== 'All' ? 1 : 0) +
    (local.project  !== 'All' ? 1 : 0);

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.sheetOverlay}>
        <TouchableOpacity style={styles.sheetBackdrop} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[styles.filterSheet, { transform: [{ translateY: slideY }] }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.fsHeader}>
            <Text style={styles.fsTitle}>Filters</Text>
            {activeCount > 0 && (
              <TouchableOpacity onPress={() => setLocal({ status: 'All', assignee: 'All', project: 'All' })}>
                <Text style={styles.fsClear}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
            <ChipRow label="Status"      options={STATUS_FILTERS} selected={local.status}   onSelect={(v) => setLocal((p) => ({ ...p, status: v }))} />
            <ChipRow label="Assigned To" options={assignees}      selected={local.assignee} onSelect={(v) => setLocal((p) => ({ ...p, assignee: v }))} />
            <ChipRow label="Project"     options={projectNames}   selected={local.project}  onSelect={(v) => setLocal((p) => ({ ...p, project: v }))} />
          </ScrollView>
          <View style={styles.fsFooter}>
            <TouchableOpacity style={styles.fsCancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.fsCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.fsApplyBtn}
              onPress={() => { onApply(local); onClose(); }}
              activeOpacity={0.85}
            >
              <Text style={styles.fsApplyText}>
                Apply{activeCount > 0 ? ` (${activeCount})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

/* ── Main screen ── */
const LeadsScreen = () => {
  const navigation    = useNavigation();
  const route         = useRoute();
  const dispatch      = useDispatch();
  const initialFilter = route.params?.initialFilter || 'All';

  const { loading, data: leadsData } = useSelector((s) => s.presales.leads);

  const [filters,        setFilters]        = useState({ status: initialFilter, assignee: 'All', project: 'All' });
  const [search,         setSearch]         = useState('');
  const [showFilter,     setShowFilter]     = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchPresalesLeads());
    }, []),
  );

  const assignees = useMemo(
    () => ['All', ...Array.from(new Set(leadsData.map((l) => l.assignedTo).filter(Boolean)))],
    [leadsData],
  );
  const projectNames = useMemo(
    () => ['All', ...Array.from(new Set(leadsData.map((l) => l.projectName).filter(Boolean)))],
    [leadsData],
  );

  const filtered = useMemo(() => {
    let list = leadsData;
    if (filters.status   !== 'All') list = list.filter((l) => l.status      === filters.status);
    if (filters.assignee !== 'All') list = list.filter((l) => l.assignedTo  === filters.assignee);
    if (filters.project  !== 'All') list = list.filter((l) => l.projectName === filters.project);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) => l.name.toLowerCase().includes(q) || l.phone.includes(q) || l.projectName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [filters, search, leadsData]);

  const counts = useMemo(() => ({
    All:  leadsData.length,
    New:  leadsData.filter((l) => l.status === 'New').length,
    Cold: leadsData.filter((l) => l.status === 'Cold').length,
    Warm: leadsData.filter((l) => l.status === 'Warm').length,
    Lost: leadsData.filter((l) => l.status === 'Lost').length,
  }), [leadsData]);

  const activeFilterCount =
    (filters.status   !== 'All' ? 1 : 0) +
    (filters.assignee !== 'All' ? 1 : 0) +
    (filters.project  !== 'All' ? 1 : 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Image source={images.backIcon} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Leads {filtered.length !== leadsData.length ? `(${filtered.length})` : ''}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity
            style={[styles.filterIconBtn, activeFilterCount > 0 && styles.filterIconBtnActive]}
            onPress={() => setShowFilter(true)}
          >
            <Text style={[styles.filterIconText, activeFilterCount > 0 && { color: '#fff' }]}>{'⚙'}</Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterIconBtn} onPress={() => setShowBulkUpload(true)}>
            <Text style={styles.filterIconText}>{'↑'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('PreSalesAddLead')}>
            <Image source={images.plusIcon} style={styles.addIcon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone, project..."
          placeholderTextColor="#AAA"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Status quick-filter tabs */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => {
          const isActive = filters.status === f;
          const meta     = STATUS_META[f];
          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterTab,
                isActive && { backgroundColor: meta?.color || COLORS.primary, borderColor: meta?.color || COLORS.primary },
              ]}
              onPress={() => setFilters((p) => ({ ...p, status: f }))}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>{f}</Text>
              <View style={[styles.filterCount, isActive && { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                <Text style={[styles.filterCountText, isActive && { color: '#fff' }]}>{counts[f]}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Active assignee/project chips */}
      {(filters.assignee !== 'All' || filters.project !== 'All') && (
        <View style={styles.activeFiltersRow}>
          {filters.assignee !== 'All' && (
            <TouchableOpacity style={styles.activeFilterChip} onPress={() => setFilters((p) => ({ ...p, assignee: 'All' }))}>
              <Text style={styles.activeFilterChipText}>{'👤'} {filters.assignee}  ×</Text>
            </TouchableOpacity>
          )}
          {filters.project !== 'All' && (
            <TouchableOpacity style={styles.activeFilterChip} onPress={() => setFilters((p) => ({ ...p, project: 'All' }))}>
              <Text style={styles.activeFilterChipText}>{'🏗'} {filters.project}  ×</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Loading */}
      {loading && leadsData.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LeadCard item={item} onPress={(lead) => navigation.navigate('PreSalesLeadDetail', { lead })} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No leads found.</Text>
            </View>
          }
        />
      )}

      <FilterSheet
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        filters={filters}
        onApply={setFilters}
        assignees={assignees}
        projectNames={projectNames}
      />

      <BulkUploadModal
        visible={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onSuccess={() => dispatch(fetchPresalesLeads())}
      />
    </SafeAreaView>
  );
};

export default LeadsScreen;
