import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import styles from './styles';

const MODULES = [
  { name: 'Pre Sales',      screen: 'PreSales',    icon: '📈' },
  { name: 'Admin',          screen: 'Admin',       icon: '⚙️' },
  { name: 'Projects',       screen: 'Projects',    icon: '🏗️' },
  { name: 'Sites',          screen: 'Sites',       icon: '📍' },
  { name: 'Contractors',    screen: 'Contractors', icon: '👷' },
  { name: 'Purchase Orders',screen: 'Purchase',    icon: '🛒' },
  { name: 'Inventory',      screen: 'Inventory',   icon: '📦' },
  { name: 'Payments',       screen: 'Payments',    icon: '💳' },
  { name: 'Reports',        screen: 'Reports',     icon: '📊' },
  { name: 'Clients',        screen: 'Clients',     icon: '👥' },
  { name: 'Settings',       screen: 'Settings',    icon: '🔧' },
];

const ModulesScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E4080" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Modules</Text>
        <View style={styles.grid}>
          {MODULES.map((mod) => (
            <TouchableOpacity
              key={mod.screen}
              style={styles.moduleBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(mod.screen)}
            >
              <Text style={styles.moduleIcon}>{mod.icon}</Text>
              <Text style={styles.moduleName}>{mod.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default ModulesScreen;
