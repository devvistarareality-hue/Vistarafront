import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

export default function PostSignOutScreen({ navigation }) {
  const user      = useSelector((s) => s.auth.user);
  const firstName = user?.name?.trim().split(' ')[0] || 'there';

  return (
    <SafeAreaView style={s.container} edges={['top', 'bottom']}>
      <View style={s.body}>
        <View style={s.successCircle}>
          <Ionicons name="checkmark-circle" size={72} color="#2E7D32" />
        </View>
        <Text style={s.title}>Signed Out</Text>
        <Text style={s.greeting}>Great work today, {firstName}!</Text>
        <Text style={s.detail}>Your attendance has been recorded successfully.</Text>

        <TouchableOpacity style={s.btn} onPress={() => navigation.navigate('Dashboard')}>
          <Ionicons name="home-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <Text style={s.btnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#F5F6FA' },
  body:          { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  successCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 28 },
  title:         { fontSize: 26, fontWeight: '800', color: '#1A1A2E', marginBottom: 8 },
  greeting:      { fontSize: 16, fontWeight: '600', color: '#2E7D32', marginBottom: 10 },
  detail:        { fontSize: 14, color: '#8492A6', textAlign: 'center', lineHeight: 20, marginBottom: 44 },
  btn:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#182350', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  btnText:       { fontSize: 15, fontWeight: '700', color: '#fff' },
});
