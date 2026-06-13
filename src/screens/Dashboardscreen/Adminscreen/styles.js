import { StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../../../constants/theme';

const { width } = Dimensions.get('window');
const BUTTON_WIDTH = (width - 64) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: width * 0.045,
    fontWeight: 'bold',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 16,
  },

  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 3,
  },
  sectionHeader: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: width * 0.042,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },

  groupContainer: {
    padding: 14,
  },
  groupTitle: {
    fontSize: width * 0.036,
    fontWeight: '700',
    marginBottom: 10,
  },

  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  button: {
    width: BUTTON_WIDTH,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  buttonText: {
    color: '#222222',
    fontSize: width * 0.032,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default styles;
