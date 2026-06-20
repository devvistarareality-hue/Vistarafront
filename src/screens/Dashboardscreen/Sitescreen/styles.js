import { StyleSheet } from 'react-native';
import { COLORS, CARD_SHADOW } from '../../../constants/theme';

export default StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.screenBg },
  scrollContent: { flexGrow: 1, paddingBottom: 28 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surfaceAlt,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  headerRight: { width: 36 },

  comingSoonCard: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    marginHorizontal: 20, marginTop: 40,
    backgroundColor: COLORS.cardBg, borderRadius: 18,
    padding: 40, ...CARD_SHADOW,
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.infoBg,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  comingSoonTitle: {
    fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8,
  },
  comingSoonSub: {
    fontSize: 14, color: COLORS.textSecondary, fontWeight: '500', textAlign: 'center',
  },
});
