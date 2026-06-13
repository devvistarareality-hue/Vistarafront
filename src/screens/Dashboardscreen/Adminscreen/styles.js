import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#F5F6FA' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },

  pageTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A2E', marginBottom: 20 },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#B8C4D6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionHeader: { paddingHorizontal: 18, paddingVertical: 14 },
  sectionTitle:  {
    fontSize: 12, fontWeight: '800', color: '#FFFFFF',
    letterSpacing: 0.8, textTransform: 'uppercase',
  },

  groupContainer: { paddingHorizontal: 14, paddingVertical: 12 },
  groupTitle: {
    fontSize: 11, fontWeight: '700', marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },

  buttonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: {
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    minWidth: (width - 40 - 28 - 8) / 3,
    alignItems: 'center',
  },
  buttonText: { fontSize: 11, fontWeight: '600', color: '#1A1A2E', textAlign: 'center' },
});

export default styles;
