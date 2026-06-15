import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { logout } from '../../redux/actions/authActions';

const ADMIN_MODULES = [
  { name: 'User Management', icon: 'account-cog-outline',  color: '#182350', iconBg: '#E8EEFF', screen: 'UserManagement', params: undefined },
  { name: 'Sales',           icon: 'pencil-outline',        color: '#F9A825', iconBg: '#FFF8E1', screen: 'Placeholder',   params: { title: 'Sales' } },
  { name: 'Pre-Sales',       icon: 'filter-outline',        color: '#0097A7', iconBg: '#E0F7FA', screen: 'Placeholder',   params: { title: 'Pre-Sales' } },
  { name: 'HR',              icon: 'account-group-outline', color: '#3D5AFE', iconBg: '#EEF0FF', screen: 'Placeholder',   params: { title: 'HR' } },
  { name: 'Execution',       icon: 'wrench-outline',        color: '#2E7D32', iconBg: '#E8F5E9', screen: 'Placeholder',   params: { title: 'Execution' } },
  { name: 'Purchase',        icon: 'cart-outline',          color: '#E65100', iconBg: '#FFF3E0', screen: 'Placeholder',   params: { title: 'Purchase' } },
  { name: 'Land',            icon: 'terrain',               color: '#6A1B9A', iconBg: '#F3E5F5', screen: 'Placeholder',   params: { title: 'Land' } },
];

export default function AdminDashboardScreen({ navigation }) {
  const dispatch = useDispatch();
  const user     = useSelector((s) => s.auth.user);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#182350" />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Text style={s.welcomeLabel}>Welcome back</Text>
          <Text style={s.userName} numberOfLines={1}>{user?.name || 'Admin'}</Text>
        </View>
        <View style={s.headerRight}>
          <View style={s.adminBadge}>
            <Ionicons name="shield-checkmark" size={11} color="#F9A825" />
            <Text style={s.adminBadgeText}>Administrator</Text>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Module grid ── */}
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {user?.is_staff && (
          <>
            <Text style={s.sectionTitle}>PLATFORM</Text>
            <View style={s.grid}>
              <TouchableOpacity
                style={s.card}
                onPress={() => navigation.navigate('CompanyManagement')}
                activeOpacity={0.8}
              >
                <View style={[s.iconBg, { backgroundColor: '#E0F7FA' }]}>
                  <MaterialCommunityIcons name="domain" size={26} color="#0097A7" />
                </View>
                <Text style={s.cardName} numberOfLines={2}>Company Management</Text>
                <Text style={[s.cardArrow, { color: '#0097A7' }]}>Open →</Text>
              </TouchableOpacity>
            </View>
            <View style={{ height: 8 }} />
          </>
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
  container: { flex: 1, backgroundColor: '#F5F6FA' },

  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#182350', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 20 },
  headerLeft:   { flex: 1, marginRight: 12 },
  welcomeLabel: { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  userName:     { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 3 },
  headerRight:  { alignItems: 'flex-end', gap: 10 },

  adminBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(249,168,37,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(249,168,37,0.35)' },
  adminBadgeText: { fontSize: 11, fontWeight: '700', color: '#F9A825' },
  logoutBtn:      { padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)' },

  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionTitle:  { fontSize: 11, fontWeight: '700', color: '#8492A6', letterSpacing: 0.8, marginBottom: 16 },

  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card:      { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#B8C4D6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 3 },
  iconBg:    { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cardName:  { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 10, lineHeight: 20 },
  cardArrow: { fontSize: 12, fontWeight: '700' },
});
