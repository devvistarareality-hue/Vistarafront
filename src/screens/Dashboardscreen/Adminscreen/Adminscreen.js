import React from 'react';
import { View, Text, StatusBar, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, CARD_SHADOW } from '../../../constants/theme';
import styles from './styles';

const SECTIONS = [
  {
    title: 'IT ADMIN SETUP',
    color: COLORS.warningAlt,
    lightColor: COLORS.warningBg,
    icon: 'shield-outline',
    groups: [
      {
        groupTitle: 'Permission',
        items: ['User Management', 'Password', 'Workflow', 'Permission', 'Copy Permission'],
      },
      {
        groupTitle: 'Communication',
        items: [
          'General Setting', 'Status Mail SMS', 'Bulk Mail SMS', 'Email Template',
          'Incoming Mail Integration', 'Account Info', 'Instance Upload',
          'Pending Task Summary', 'ERP Performance Report', 'ERP Service Ticket',
        ],
      },
      {
        groupTitle: 'ERP Development Tools',
        items: [
          'Dashboard', 'Report Development', 'Report Management', 'Mobile Form Dev.',
          'Additional Forms', 'Additional Fields', 'Excel Form', 'Web Form',
          'Folder Structure', 'ERP Store',
        ],
      },
    ],
  },
  {
    title: 'FINANCE SETUP',
    color: COLORS.info,
    lightColor: COLORS.infoBg,
    icon: 'cash-outline',
    groups: [
      {
        groupTitle: null,
        items: [
          'Legal Entity Master', 'Company Master', 'Project Master', 'Sub Project Master',
          'Item Group Master', 'Financial Locking', 'Chart of Account Groups', 'Chart of Ledger',
          'Currency Master', 'Cheque Print Setting', 'Currency Exchange Master',
          'Location Details', 'Other Master', 'Approval Master',
        ],
      },
    ],
  },
  {
    title: 'STATUTORY SETUP',
    color: COLORS.purple,
    lightColor: COLORS.purpleBg,
    icon: 'document-text-outline',
    groups: [
      {
        groupTitle: null,
        items: [
          'Country State Master', 'Rule & Regulations', 'Tax Type Master',
          'Salary Tax Master', 'TDS Master', 'Tax Code Master', 'GST, VAT & Service Tax',
        ],
      },
    ],
  },
];

const SCREEN_NAV = {
  'User Management': 'UserManagement',
};

const AdminScreen = ({ navigation }) => {
  const handleItem = (item) => {
    const screen = SCREEN_NAV[item];
    if (screen) navigation.navigate(screen);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.screenBg} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Setup</Text>
          <View style={styles.headerRight} />
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.sectionCard}>
            <View style={[styles.sectionHeader, { backgroundColor: section.color }]}>
              <View style={styles.sectionHeaderRow}>
                <Ionicons name={section.icon} size={16} color={COLORS.white} />
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
            </View>

            {section.groups.map((group, gIdx) => (
              <View key={gIdx} style={styles.groupContainer}>
                {group.groupTitle && (
                  <Text style={[styles.groupTitle, { color: section.color }]}>
                    {group.groupTitle}
                  </Text>
                )}
                <View style={styles.buttonGrid}>
                  {group.items.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={[styles.button, { backgroundColor: section.lightColor }]}
                      activeOpacity={0.7}
                      onPress={() => handleItem(item)}
                    >
                      <Text style={styles.buttonText} numberOfLines={2}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AdminScreen;
