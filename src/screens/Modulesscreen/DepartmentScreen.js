import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import common from '../../styles/common';
import { groupsFor } from '../../lib/moduleGroups';
import { PartCard } from '../../components/Departments';

// A department (Sales, Accounts & Finance, HR…) and the parts of it this person can
// open — mirrors the web's /admin/g/<key> and /dashboard/g/<key>.
export default function DepartmentScreen({ navigation, route }) {
  const user = useSelector((st) => st.auth.user);
  const { key, asAdmin } = route?.params || {};
  const group = groupsFor(user, asAdmin).find((g) => g.key === key);

  return (
    <SafeAreaView style={common.screen} edges={['top']}>
      <View style={common.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={common.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={s.flex}>
          <Text style={common.headerTitle} numberOfLines={1}>{group?.title || 'Department'}</Text>
          {group ? <Text style={common.headerSub} numberOfLines={1}>{group.desc}</Text> : null}
        </View>
      </View>
      <ScrollView contentContainerStyle={s.body}>
        {!group ? (
          <Text style={s.empty}>This department isn&apos;t available to you.</Text>
        ) : group.parts.map((p) => (
          <PartCard key={p.key} part={p} tone={group.tone} onPress={() => navigation.navigate(p.screen, p.params)} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: 16, paddingBottom: 40 },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 40 },
});
