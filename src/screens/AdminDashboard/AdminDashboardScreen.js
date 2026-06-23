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

const ADMIN_MODULES = [
  { name: 'User Management',    icon: 'account-cog-outline',  color: COLORS.navy, iconBg: COLORS.linkBg, screen: 'UserManagement',     params: undefined },
  { name: 'Company Management', icon: 'domain',               color: COLORS.info, iconBg: COLORS.infoBg, screen: 'CompanyManagement',  params: undefined },
  { name: 'Designation Master', icon: 'tag-multiple-outline', color: COLORS.warning, iconBg: COLORS.warningBg, screen: 'DesignationMaster',  params: undefined },
  { name: 'Sales',              icon: 'storefront-outline',   color: COLORS.warningAlt, iconBg: COLORS.warningBg, screen: 'SalesCRM',           params: undefined },
  { name: 'HR',                 icon: 'account-group-outline',color: COLORS.link, iconBg: COLORS.linkBg, screen: 'MyTeam',  params: { module: 'HR', title: 'My Team · HR' } },
  { name: 'Accounts & Finance', icon: 'wallet-outline',       color: COLORS.success, iconBg: COLORS.successBg, screen: 'MyTeam',  params: { module: 'Accounts & Finance', title: 'My Team · Accounts' } },
  { name: 'Execution',          icon: 'wrench-outline',       color: COLORS.success, iconBg: COLORS.successBg, screen: 'MyTeam',  params: { module: 'Execution', title: 'My Team · Execution' } },
  { name: 'Purchase',           icon: 'cart-outline',         color: COLORS.warning, iconBg: COLORS.warningBg, screen: 'MyTeam',  params: { module: 'Purchase', title: 'My Team · Purchase' } },
  { name: 'Land',               icon: 'terrain',              color: COLORS.purple, iconBg: COLORS.purpleBg, screen: 'MyTeam',  params: { module: 'Land', title: 'My Team · Land' } },
];

export default function AdminDashboardScreen({ navigation }) {
  const dispatch = useDispatch();
  const user     = useSelector((s) => s.auth.user);
  const { companies } = useSelector((s) => s.companies);
  const companyId = useSelector((s) => s.adminFilter.companyId);
  const isVRLAdmin = user?.role === 'Admin' && user?.company_code === 'VRL';

  useEffect(() => { if (isVRLAdmin) dispatch(fetchCompanies()); }, [isVRLAdmin]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />

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
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
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
        <Text style={s.sectionTitle}>ALL MODULES</Text>
        <View style={s.grid}>
          {ADMIN_MODULES.map((mod) => (
            <TouchableOpacity
              key={mod.name}
              style={s.card}
              onPress={() => navigation.navigate(mod.screen, mod.params)}
              activeOpacity={0.8}
            >
              <View style={[s.iconBg, { backgroundColor: mod.iconBg }]}>
                <MaterialCommunityIcons name={mod.icon} size={26} color={mod.color} />
              </View>
              <Text style={s.cardName} numberOfLines={2}>{mod.name}</Text>
              <Text style={[s.cardArrow, { color: mod.color }]}>Open →</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.screenBg },

  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20 },
  headerLeft:   { flex: 1, marginRight: 12 },
  welcomeLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  userName:     { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 3 },
  headerRight:  { alignItems: 'flex-end', gap: 10 },

  adminBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(249,168,37,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(249,168,37,0.35)' },
  adminBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.warningAlt },
  logoutBtn:      { padding: 8, borderRadius: 10, backgroundColor: COLORS.surfaceAlt },

  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionTitle:  { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, letterSpacing: 0.8, marginBottom: 16 },

  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card:      { width: '47%', backgroundColor: COLORS.cardBg, borderRadius: 16, padding: 16, ...CARD_SHADOW },
  iconBg:    { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cardName:  { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10, lineHeight: 20 },
  cardArrow: { fontSize: 12, fontWeight: '700' },
});
