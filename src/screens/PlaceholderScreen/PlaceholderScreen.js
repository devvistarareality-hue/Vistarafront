import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CARD_SHADOW } from '../../constants/theme';

export default function PlaceholderScreen({ navigation, route }) {
  const title = route?.params?.title || 'Module';

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.body}>
        <View style={s.iconCircle}>
          <Ionicons name="construct-outline" size={48} color={COLORS.textSecondary} />
        </View>
        <Text style={s.title}>Coming Soon</Text>
        <Text style={s.subtitle}>{title} module is currently under development.</Text>
        <Text style={s.note}>Check back soon for updates.</Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.screenBg },
  header:      { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBg, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F3FA' },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0F3FA', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  body:        { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  iconCircle:  { width: 100, height: 100, borderRadius: 50, backgroundColor: '#EEF1F7', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title:       { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 10 },
  subtitle:    { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  note:        { fontSize: 12, color: '#B0BAC9', textAlign: 'center' },
});
