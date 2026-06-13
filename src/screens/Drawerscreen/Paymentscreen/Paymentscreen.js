import React from 'react';
import { View, Text, StatusBar } from 'react-native';
import { COLORS } from '../../../constants/theme';
import styles from './styles';

const PaymentScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={styles.content}>
        <Text style={styles.screenTitle}>Payments Screen</Text>
      </View>
    </View>
  );
};

export default PaymentScreen;
