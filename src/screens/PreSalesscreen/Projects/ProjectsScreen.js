import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StatusBar, Image, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { COLORS } from '../../../constants/theme';
import images from '../../../constants/images';
import { PROJECT_TYPE_META } from '../../../constants/presalesMockData';
import { fetchPresalesProjects } from '../../../redux/actions/presalesActions';
import styles from './styles';

const TYPE_FILTERS = ['All', 'Residential', 'Commercial'];

const ProjectCard = ({ item, onPress }) => {
  const typeMeta = PROJECT_TYPE_META[item.type] || PROJECT_TYPE_META.Residential;
  const isActive  = item.status === 'Active';

  return (
    <TouchableOpacity style={styles.projectCard} onPress={() => onPress(item)} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <View style={styles.cardTopLeft}>
          <Text style={styles.projectName}>{item.name}</Text>
          <Text style={styles.projectLocation}>{item.location}</Text>
        </View>
        <View style={styles.typeBadge}>
          <Text style={[styles.typeBadgeText, { color: typeMeta.color, backgroundColor: typeMeta.bg }]}>
            {item.type}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{item.units}</Text>
          <Text style={styles.statLbl}>Units</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{item.leadCount}</Text>
          <Text style={styles.statLbl}>Leads</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNum, { color: COLORS.primary }]}>{item.priceRange}</Text>
          <Text style={styles.statLbl}>Price Range</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
        <View style={[styles.statusPill, { backgroundColor: isActive ? '#E8F5E9' : '#FFF8E1' }]}>
          <View style={[styles.statusDot, { backgroundColor: isActive ? '#388E3C' : '#F57F17' }]} />
          <Text style={[styles.statusPillText, { color: isActive ? '#388E3C' : '#F57F17' }]}>
            {item.status}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const ProjectsScreen = () => {
  const navigation = useNavigation();
  const dispatch   = useDispatch();
  const { loading, data: projectsData } = useSelector((s) => s.presales.projects);

  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchPresalesProjects());
    }, []),
  );

  const filtered = useMemo(() => {
    let list = typeFilter === 'All' ? projectsData : projectsData.filter((p) => p.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.location.toLowerCase().includes(q),
      );
    }
    return list;
  }, [search, typeFilter, projectsData]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Image source={images.backIcon} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Projects</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('PreSalesAddProject')}>
          <Image source={images.plusIcon} style={styles.addIcon} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or location..."
          placeholderTextColor="#AAA"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Type Filter */}
      <View style={styles.typeFilterRow}>
        {TYPE_FILTERS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeTab, typeFilter === t && styles.typeTabActive]}
            onPress={() => setTypeFilter(t)}
            activeOpacity={0.8}
          >
            <Text style={[styles.typeTabText, typeFilter === t && styles.typeTabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.totalCount}>{filtered.length} project{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      {loading && projectsData.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProjectCard item={item} onPress={() => {}} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No projects found.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

export default ProjectsScreen;
