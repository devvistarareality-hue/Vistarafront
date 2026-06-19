import React, { useEffect } from 'react';
import { COLORS } from '../../../../constants/theme';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLeaveBalance } from '../../../../redux/actions/leaveBalanceActions';
import styles from './styles';

const TableHeader = () => (
  <View style={styles.tableHeader}>
    <Text style={[styles.headerCell, styles.dateCol]}>Date</Text>
    <Text style={[styles.headerCell, styles.changeCol]}>(+/-)</Text>
    <Text style={[styles.headerCell, styles.balanceCol]}>Balance</Text>
  </View>
);

const Separator = () => <View style={styles.separator} />;

const BalanceRow = ({ item }) => {
  const isPositive = item.change > 0;
  return (
    <View style={styles.row}>
      <View style={styles.dateCol}>
        <Text style={styles.dateText}>{item.leave_date ?? item.date}</Text>
        <Text style={styles.leaveTypeText}>{item.leave_type}</Text>
        <Text style={styles.descriptionText}>{item.description}</Text>
      </View>
      <Text style={[styles.changeCell, styles.changeCol, isPositive ? styles.positive : styles.negative]}>
        {isPositive ? `+${item.change}` : `${item.change}`}
      </Text>
      <Text style={[styles.balanceCell, styles.balanceCol]}>{item.balance}</Text>
    </View>
  );
};

const BalanceScreen = () => {
  const dispatch = useDispatch();
  const {
    balanceLoading,
    balanceLoadingMore,
    balanceData,
    balanceError,
    balancePage,
    balanceHasMore,
    refreshTrigger,
  } = useSelector((s) => s.leaveBalance);

  useEffect(() => {
    dispatch(fetchLeaveBalance(1));
  }, [dispatch, refreshTrigger]);

  const handleLoadMore = () => {
    if (!balanceHasMore || balanceLoading || balanceLoadingMore) return;
    dispatch(fetchLeaveBalance(balancePage + 1));
  };

  const renderFooter = () => {
    if (!balanceLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={COLORS.navyMedium} />
      </View>
    );
  };

  if (balanceLoading && balanceData.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.navyMedium} />
      </View>
    );
  }

  if (balanceError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{balanceError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TableHeader />
      <FlatList
        data={balanceData}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <BalanceRow item={item} />}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={Separator}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No transactions found.</Text>
          </View>
        }
      />
    </View>
  );
};

export default BalanceScreen;
