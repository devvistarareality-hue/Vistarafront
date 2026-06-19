import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TabView, SceneMap } from 'react-native-tab-view';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import BalanceScreen from './BalanceScreen/BalanceScreen';
import HistoryScreen from './HistoryScreen/HistoryScreen';
import { triggerBalanceRefresh } from '../../../redux/actions/leaveBalanceActions';
import { COLORS } from '../../../constants/theme';
import styles from './styles';

const { width } = Dimensions.get('window');

const renderScene = SceneMap({
  balance: BalanceScreen,
  history: HistoryScreen,
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
          style={[styles.tabItem, isActive && styles.tabItemActive]}
          activeOpacity={0.8}
          onPress={() => onTabPress(index)}
        >
          <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
            {route.title}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const LeaveScreen = () => {
  const navigation = useNavigation();
  const dispatch   = useDispatch();
  const [index, setIndex] = useState(0);

  const routes = BASE_ROUTES;

  const handleIndexChange = (newIndex) => {
    setIndex(newIndex);
    if (newIndex === 0) dispatch(triggerBalanceRefresh());
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar backgroundColor={COLORS.navy} barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave</Text>
        <View style={styles.headerRight} />
      </View>

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

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('RequestLeave')}
      >
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default LeaveScreen;
