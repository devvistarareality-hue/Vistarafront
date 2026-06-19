import React from 'react';
import { View, Text, TouchableOpacity, StatusBar, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ApprovalsScreen from './ApprovalsScreen/ApprovalsScreen';
import { COLORS } from '../../../constants/theme';
import images from '../../../constants/images';
import styles from './styles';

const LeaveApprovalsScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image source={images.backIcon} style={styles.backIconImage} />
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
