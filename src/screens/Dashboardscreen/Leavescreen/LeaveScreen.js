import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, SceneMap } from 'react-native-tab-view';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import BalanceScreen from './BalanceScreen/BalanceScreen';
import HistoryScreen from './HistoryScreen/HistoryScreen';
import ApprovalsScreen from './ApprovalsScreen/ApprovalsScreen';
import { triggerBalanceRefresh } from '../../../redux/actions/leaveBalanceActions';
import { COLORS } from '../../../constants/theme';
import images from '../../../constants/images';
import styles from './styles';

const { width } = Dimensions.get('window');

const renderScene = SceneMap({
  balance: BalanceScreen,
  history: HistoryScreen,
  approvals: ApprovalsScreen,
});

const BASE_ROUTES = [
  { key: 'balance', title: 'Balance' },
  { key: 'history', title: 'History' },
];

const CustomTabBar = ({ navigationState, onTabPress }) => (
  <View style={styles.tabBar}>
    {navigationState.routes.map((route, index) => {
      const isActive = navigationState.index === index;
      return (
        <TouchableOpacity
          key={route.key}
          style={styles.tabItem}
          activeOpacity={0.8}
          onPress={() => onTabPress(index)}
        >
          <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
            {route.title}
          </Text>
          {isActive && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      );
    })}
  </View>
);

const LeaveScreen = () => {
  const navigation = useNavigation();
  const dispatch   = useDispatch();
  const user       = useSelector((s) => s.auth.user);
  const [index, setIndex] = useState(0);

  // Managers / admins get an extra "Approvals" tab for their team's requests.
  const routes = user?.is_approver
    ? [...BASE_ROUTES, { key: 'approvals', title: 'Approvals' }]
    : BASE_ROUTES;

  const handleIndexChange = (newIndex) => {
    setIndex(newIndex);
    if (newIndex === 0) dispatch(triggerBalanceRefresh());
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Image source={images.backIcon} style={styles.backIconImage} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tab View with custom tab bar */}
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={handleIndexChange}
        initialLayout={{ width }}
        renderTabBar={(props) => (
          <CustomTabBar
            navigationState={props.navigationState}
            onTabPress={handleIndexChange}
          />
        )}
        style={styles.content}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('RequestLeave')}
      >
        <Image source={images.plusIcon} style={styles.fabIcon} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default LeaveScreen;
