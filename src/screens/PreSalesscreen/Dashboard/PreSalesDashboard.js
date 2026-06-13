import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, Image, FlatList, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { COLORS } from '../../../constants/theme';
import images from '../../../constants/images';
import { STATUS_META } from '../../../constants/presalesMockData';
import { fetchPresalesDashboard } from '../../../redux/actions/presalesActions';
import styles from './styles';

const STAT_STYLE = [
  { label: 'Total Leads', key: 'total', color: '#1E4080', light: '#E8EDF6', filter: 'All'  },
  { label: 'New',         key: 'new',   color: '#1565C0', light: '#E3F2FD', filter: 'New'  },
  { label: 'Warm',        key: 'warm',  color: '#E65100', light: '#FFF3E0', filter: 'Warm' },
  { label: 'Lost',        key: 'lost',  color: '#B71C1C', light: '#FFEBEE', filter: 'Lost' },
];

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

const LeadRow = ({ item, onPress }) => (
  <TouchableOpacity style={styles.leadRow} onPress={() => onPress(item)} activeOpacity={0.8}>
    <View style={[styles.avatar, { backgroundColor: STATUS_META[item.status]?.color || '#1E4080' }]}>
      <Text style={styles.avatarText}>{initials(item.name)}</Text>
    </View>
    <View style={styles.leadInfo}>
      <Text style={styles.leadName}>{item.name}</Text>
      <Text style={styles.leadSub}>{item.phone}  ·  {item.projectName}</Text>
    </View>
    <View style={styles.leadRight}>
      <StatusBadge status={item.status} />
      <Text style={styles.timeAgo}>{item.timeAgo}</Text>
    </View>
  </TouchableOpacity>
);

const ProjectCard = ({ item, onPress }) => (
  <TouchableOpacity style={styles.projectCard} onPress={() => onPress(item)} activeOpacity={0.85}>
    <View style={styles.projectCardTop}>
      <Text style={styles.projectCardName} numberOfLines={1}>{item.name}</Text>
      <View style={[
        styles.projectTypeBadge,
        { backgroundColor: item.type === 'Commercial' ? '#E3F2FD' : '#E8F5E9' },
      ]}>
        <Text style={[
          styles.projectTypeBadgeText,
          { color: item.type === 'Commercial' ? '#0D47A1' : '#1B5E20' },
        ]}>{item.type}</Text>
      </View>
    </View>
    <Text style={styles.projectCardLocation}>{item.location}</Text>
    <Text style={styles.projectCardPrice}>{item.priceRange}</Text>
    <View style={styles.projectCardFooter}>
      <Text style={styles.projectCardLeads}>{item.leadCount} Leads</Text>
      <View style={[
        styles.projectStatusDot,
        { backgroundColor: item.status === 'Active' ? '#4CAF50' : '#FF9800' },
      ]} />
      <Text style={styles.projectStatusText}>{item.status}</Text>
    </View>
  </TouchableOpacity>
);

const PreSalesDashboard = () => {
  const navigation = useNavigation();
  const dispatch   = useDispatch();
  const { loading, stats, recentLeads, teamQueue, activeProjects } =
    useSelector((s) => s.presales.dashboard);

  useEffect(() => {
    dispatch(fetchPresalesDashboard());
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Image source={images.backIcon} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pre Sales</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => navigation.navigate('PreSalesProjects')}
          >
            <Text style={styles.headerBtnText}>Projects</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerBtn, styles.headerBtnAccent]}
            onPress={() => navigation.navigate('PreSalesLeads')}
          >
            <Text style={[styles.headerBtnText, { color: '#fff' }]}>Leads</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && !stats ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F4F6FA' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {STAT_STYLE.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.statCard, { backgroundColor: s.light }]}
                onPress={() => navigation.navigate('PreSalesLeads', { initialFilter: s.filter })}
                activeOpacity={0.75}
              >
                <Text style={[styles.statValue, { color: s.color }]}>
                  {stats ? stats[s.key] : 0}
                </Text>
                <Text style={[styles.statLabel, { color: s.color }]}>{s.label}</Text>
                <Text style={[styles.statTapHint, { color: s.color }]}>View →</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recent Leads */}
          {recentLeads.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Leads</Text>
                <TouchableOpacity onPress={() => navigation.navigate('PreSalesLeads')}>
                  <Text style={styles.viewAll}>View All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.card}>
                {recentLeads.map((lead, idx) => (
                  <View key={lead.id}>
                    <LeadRow
                      item={lead}
                      onPress={(item) => navigation.navigate('PreSalesLeadDetail', { lead: item })}
                    />
                    {idx < recentLeads.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Active Projects */}
          {activeProjects.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Active Projects</Text>
                <TouchableOpacity onPress={() => navigation.navigate('PreSalesProjects')}>
                  <Text style={styles.viewAll}>View All</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={activeProjects}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.projectList}
                renderItem={({ item }) => (
                  <ProjectCard item={item} onPress={() => {}} />
                )}
              />
            </View>
          )}

          {/* Team Queue */}
          {teamQueue.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Team Queue</Text>
              </View>
              <View style={styles.card}>
                {teamQueue.map((member, idx) => (
                  <View key={member.id}>
                    <TouchableOpacity
                      style={styles.teamRow}
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate('PreSalesLeads')}
                    >
                      <View style={[styles.teamAvatar, {
                        backgroundColor: member.role === 'STM' ? '#EDE7F6' : '#E3F2FD',
                      }]}>
                        <Text style={[styles.teamInitials, {
                          color: member.role === 'STM' ? '#4527A0' : '#0D47A1',
                        }]}>{member.initials}</Text>
                      </View>
                      <View style={styles.teamInfo}>
                        <Text style={styles.teamName}>{member.name}</Text>
                        <View style={[styles.teamRoleBadge, {
                          backgroundColor: member.role === 'STM' ? '#EDE7F6' : '#E3F2FD',
                        }]}>
                          <Text style={[styles.teamRoleText, {
                            color: member.role === 'STM' ? '#4527A0' : '#0D47A1',
                          }]}>{member.role}</Text>
                        </View>
                      </View>
                      <View style={styles.teamLeadBadge}>
                        <Text style={styles.teamLeadCount}>{member.leadCount}</Text>
                        <Text style={styles.teamLeadLabel}>leads</Text>
                      </View>
                      <View style={[styles.teamBar, { width: `${Math.min((member.leadCount / 15) * 100, 100)}%` }]} />
                    </TouchableOpacity>
                    {idx < teamQueue.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </View>
            </View>
          )}

        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default PreSalesDashboard;
