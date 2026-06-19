import React from 'react';
import { View, Text, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ApprovalsScreen from './ApprovalsScreen/ApprovalsScreen';
import { COLORS } from '../../../constants/theme';
import styles from './styles';

const LeaveApprovalsScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar backgroundColor={COLORS.navy} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave Approvals</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        <ApprovalsScreen />
      </View>
    </SafeAreaView>
  );
};

export default LeaveApprovalsScreen;
