import React from 'react';
import { View, Text, StatusBar, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS } from '../../../constants/theme';
import styles from './styles';

const SECTIONS = [
  {
    title: 'IT ADMIN SETUP',
    color: '#E67E22',
    lightColor: '#FEF0E0',
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
    color: '#00897B',
    lightColor: '#E0F5F3',
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
    color: '#7B1FA2',
    lightColor: '#F3E5F5',
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

const AdminScreen = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>ERP ADMIN @ Strategic ERP</Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.sectionCard}>
            <View style={[styles.sectionHeader, { backgroundColor: section.color }]}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
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
    </View>
  );
};

export default AdminScreen;
