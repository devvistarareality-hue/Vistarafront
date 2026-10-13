import React, { useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { logout } from '../../redux/actions/authActions';
import { fetchCompanies } from '../../redux/actions/companiesActions';
import { setAdminCompany } from '../../redux/reducers/adminFilterReducer';
import FilterSelect from '../../components/FilterSelect';
import { COLORS, CARD_SHADOW } from '../../constants/theme';
import ThemeToggle from '../../components/ThemeToggle';
import { useImpersonating } from '../../lib/useImpersonating';
import { groupsFor, openGroup } from '../../lib/moduleGroups';
import { DepartmentCard } from '../../components/Departments';
import { canUseAI } from '../Sales/AskNexoraScreen';


export default function AdminDashboardScreen({ navigation }) {
  const viewingAs = useImpersonating();   // hide Logout while viewing as someone
  const dispatch = useDispatch();
  const user     = useSelector((s) => s.auth.user);
  const { companies } = useSelector((s) => s.companies);
  const companyId = useSelector((s) => s.adminFilter.companyId);
  const isVRLAdmin = user?.role === 'Admin' && user?.company_code === 'VRL';
  // Home shows departments (lib/moduleGroups) rather than every module.
  const groups = groupsFor(user, true);

  useEffect(() => { if (isVRLAdmin) dispatch(fetchCompanies()); }, [isVRLAdmin]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.screenBg} />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.welcomeLabel}>Welcome back</Text>
          <Text style={s.userName} numberOfLines={1}>{user?.name || 'Admin'}</Text>
        </View>
        <View style={s.headerRight}>
          <View style={s.adminBadge}>
            <Ionicons name="shield-checkmark" size={11} color={COLORS.warningAlt} />
            <Text style={s.adminBadgeText}>Administrator</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ThemeToggle compact />
            {!viewingAs && (
            <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* ── Module grid ── */}
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {isVRLAdmin && (
          <View style={{ marginBottom: 20 }}>
            <Text style={[s.sectionTitle, { marginBottom: 8 }]}>VIEWING COMPANY</Text>
            <FilterSelect
              label="All companies"
              value={companyId}
              onChange={(v) => dispatch(setAdminCompany(v))}
              options={[{ value: null, label: 'All companies' }, ...companies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))]}
              style={{ alignSelf: 'flex-start' }}
            />
          </View>
        )}
        {/* Ask Nexora — any question across every module (the web shows it on the admin dashboard too). */}
        {canUseAI(user) && (
          <TouchableOpacity style={s.askCard} activeOpacity={0.8}
            onPress={() => navigation.navigate('AskNexora', { module: 'dashboard' })}>
            <View style={s.askIcon}><Ionicons name="sparkles-outline" size={20} color={COLORS.link} /></View>
            <View style={s.askText}>
              <Text style={s.askTitle}>Ask Nexora</Text>
              <Text style={s.askSub}>Ask anything about your data — or speak it</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
          </TouchableOpacity>
        )}
        <Text style={s.sectionTitle}>DEPARTMENTS</Text>
        {groups.map((g) => (
          <DepartmentCard key={g.key} group={g} onPress={() => openGroup(navigation, g, true)} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  askCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 20, borderRadius: 18,
             borderWidth: 1, borderColor: COLORS.link, backgroundColor: COLORS.accentSoft },
  askIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  askText: { flex: 1 },
  askTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  askSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20 },
  headerLeft:   { flex: 1, marginRight: 12 },
  welcomeLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  userName:     { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 3 },
  headerRight:  { alignItems: 'flex-end', gap: 10 },

  adminBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(217,138,31,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(217,138,31,0.35)' },
  adminBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.warningAlt },
  logoutBtn:      { padding: 8, borderRadius: 14, backgroundColor: COLORS.surfaceAlt },

  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionTitle:  { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.8, marginBottom: 16 },

  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card:      { width: '47%', backgroundColor: COLORS.cardBg, borderRadius: 22, paddingVertical: 18, paddingHorizontal: 12, alignItems: 'center', gap: 8, ...CARD_SHADOW , borderWidth: 1, borderColor: COLORS.cardBorder },
  iconBg:    { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  cardName:  { fontSize: 13.5, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', lineHeight: 18 },
  cardArrow: { fontSize: 12, fontWeight: '700' },
});
