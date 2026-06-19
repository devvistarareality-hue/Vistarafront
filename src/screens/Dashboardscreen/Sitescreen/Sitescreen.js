import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CARD_SHADOW } from '../../../constants/theme';
import styles from './styles';

const SitesScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sites</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.comingSoonCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="location-outline" size={40} color="#0097A7" />
          </View>
          <Text style={styles.comingSoonTitle}>Coming Soon</Text>
          <Text style={styles.comingSoonSub}>Sites module is under development</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SitesScreen;
