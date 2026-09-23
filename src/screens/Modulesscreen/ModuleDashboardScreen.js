import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, CARD_SHADOW } from '../../constants/theme';
import common from '../../styles/common';
import DashboardRoleFilter from '../../components/DashboardRoleFilter';
import { BASE_URL } from '../../constants/api';
import { apiFetch } from '../../utils/apiFetch';
import { useSelector } from 'react-redux';
import { dashboardFor } from '../../lib/roles';

// Every module opens on its Dashboard — the same tab the website shows. The
// modules whose dashboard is still to be written get this one, so the tab sits
// in the same place everywhere.
export default function ModuleDashboardScreen({ navigation, route }) {
  const { name = 'Module', module = '' } = route?.params || {};
  const user = useSelector((st) => st.auth.user);
  const isAdmin = user?.role === 'Admin' || user?.is_staff;
  const [preview, setPreview] = useState('');
  const [options, setOptions] = useState([]);
  useEffect(() => {
    apiFetch(`${BASE_URL}/api/auth/designations/capabilities/`)
      .then((r) => r.json())
      .then((d) => setOptions((d?.dashboards || [])
        .filter((x) => x.module === module)
        .map((x) => ({ key: x.value, role: x.role, label: x.label }))))
      .catch(() => {});
  }, [module]);
  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <StatusBar barStyle={COLORS.statusBar} backgroundColor={COLORS.surface} />
      <View style={common.header}>
        <Pressable onPress={() => navigation.goBack()} style={common.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </Pressable>
        <View style={s.flex}>
          <Text style={common.headerTitle}>{name}</Text>
          <Text style={s.sub}>Dashboard</Text>
        </View>
      </View>
      {isAdmin ? (
        <DashboardRoleFilter options={options} value={preview || dashboardFor(user, module)}
          onChange={setPreview} module={module} />
      ) : null}
      <ScrollView contentContainerStyle={common.scroll}>
        <View style={s.card}>
          <Ionicons name="bar-chart-outline" size={22} color={COLORS.textSecondary} />
          <Text style={s.title}>This dashboard is still being built</Text>
          <Text style={s.body}>The module&apos;s other tabs are on the previous screen.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  sub: { fontSize: 12.5, color: COLORS.textSecondary },
  card: { alignItems: 'center', gap: 8, padding: 24, marginTop: 8, borderRadius: RADIUS.lg,
          backgroundColor: COLORS.cardBg, borderWidth: 1, borderColor: COLORS.cardBorder, ...CARD_SHADOW },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  body: { fontSize: 12.5, color: COLORS.textSecondary, textAlign: 'center' },
});
