import { StyleSheet, Dimensions } from 'react-native';
import { COLORS, CARD_SHADOW } from '../../../constants/theme';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.screenBg },
  scrollContent: { paddingBottom: 32 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.navy,
    paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: COLORS.white },
  headerRight: { width: 36 },

  sectionCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 18,
    marginHorizontal: 20,
    marginBottom: 16,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  sectionHeader: { paddingHorizontal: 18, paddingVertical: 14 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: {
    fontSize: 12, fontWeight: '800', color: COLORS.white,
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
  buttonText: { fontSize: 11, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },
});

export default styles;
