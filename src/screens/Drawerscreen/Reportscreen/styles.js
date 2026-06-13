import { StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../../../constants/theme';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: width * 0.07,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
});

export default styles;
