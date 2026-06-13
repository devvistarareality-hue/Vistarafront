import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const CARD = (width - 14 * 3) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  scrollContent: { padding: 14, paddingBottom: 30 },

  heading: {
    fontSize: width * 0.05,
    fontWeight: '700',
    color: '#1E4080',
    marginBottom: 16,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },

  moduleBtn: {
    width: CARD,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  moduleIcon: {
    fontSize: width * 0.1,
    marginBottom: 10,
  },

  moduleName: {
    fontSize: width * 0.035,
    fontWeight: '600',
    color: '#222',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});

export default styles;
